import { doc, setDoc, updateDoc, deleteDoc, getDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '../firebase/config';
import { checkWinCondition } from '../utils/gameLogic';
import { getServerTime } from '../utils/serverTime';
import { encryptRole } from '../utils/encryption';

// Staleness threshold from environment variable (default: 30 minutes)
const STALE_TIMEOUT_MINUTES = parseInt(import.meta.env.VITE_STALE_TIMEOUT_MINUTES) || 30;
const STALE_THRESHOLD_MS = STALE_TIMEOUT_MINUTES * 60 * 1000;

// Available lobbies
export const LOBBIES = [
  { id: 'lobby_1', name: 'Lobby 1', icon: '🎭' },
  { id: 'lobby_2', name: 'Lobby 2', icon: '🎪' },
  { id: 'lobby_3', name: 'Lobby 3', icon: '🎯' }
];

// Helper to get/set selected lobby (localStorage for client-side)
export function getSelectedLobby() {
  return localStorage.getItem('selectedLobby') || null;
}

export function setSelectedLobby(lobbyId) {
  if (lobbyId) {
    localStorage.setItem('selectedLobby', lobbyId);
  } else {
    localStorage.removeItem('selectedLobby');
  }
}

export const gameService = {
  // ============================================
  // USER LOBBY TRACKING (Scalable approach)
  // Uses userLobbies/{uid} for O(1) lookup
  // ============================================
  
  // Track user's lobby membership in Firestore
  async setUserLobby(userId, lobbyId) {
    const userLobbyRef = doc(db, 'userLobbies', userId);
    if (lobbyId) {
      await setDoc(userLobbyRef, {
        lobbyId: lobbyId,
        joinedAt: serverTimestamp(),
        lastActive: serverTimestamp()
      });
    } else {
      await deleteDoc(userLobbyRef);
    }
  },

  // Send heartbeat to update lastActive timestamp
  async sendHeartbeat(userId) {
    if (!userId) return;
    
    const userLobbyRef = doc(db, 'userLobbies', userId);
    try {
      const userLobbySnap = await getDoc(userLobbyRef);
      if (userLobbySnap.exists()) {
        await updateDoc(userLobbyRef, {
          lastActive: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Heartbeat error:', error);
    }
  },

  // Cleanup stale players from a lobby using a transaction to avoid race conditions
  async cleanupStalePlayers(lobbyId) {
    if (!lobbyId) return { removed: [], markedDead: [] };

    const gameRef = doc(db, 'games', lobbyId);
    
    // Get current server time by writing to a SINGLE reusable document
    // This prevents accumulation of orphan documents
    const timeCheckRef = doc(db, 'serverTimeCheck', 'reference');
    let serverNow = getServerTime(); // Fallback to client time
    try {
      await setDoc(timeCheckRef, { timestamp: serverTimestamp(), purpose: 'time_reference' });
      const timeSnap = await getDoc(timeCheckRef);
      serverNow = timeSnap.data()?.timestamp?.toMillis() || serverNow;
      // Note: We intentionally DON'T delete this doc - it gets reused on next cleanup
      // This means only 1 document exists in serverTimeCheck collection at most
    } catch (e) {
      console.warn('Could not get server time for cleanup, using client time:', e.message);
    }

    // Pre-fetch game doc and all userLobbies docs for players in the game
    const preCheckSnap = await getDoc(gameRef);
    if (!preCheckSnap.exists()) return { removed: [], markedDead: [] };
    
    const preCheckPlayers = preCheckSnap.data().players || {};
    const playerIds = Object.keys(preCheckPlayers);
    if (playerIds.length === 0) return { removed: [], markedDead: [] };

    // Fetch all userLobbies in parallel
    const userLobbyRefs = playerIds.map(id => doc(db, 'userLobbies', id));
    const userLobbySnaps = await Promise.all(userLobbyRefs.map(ref => getDoc(ref)));
    
    // Build a map of playerId -> lastActive timestamp
    const lastActiveMap = {};
    playerIds.forEach((playerId, index) => {
      const snap = userLobbySnaps[index];
      if (snap.exists()) {
        lastActiveMap[playerId] = snap.data().lastActive?.toMillis() || 0;
      } else {
        lastActiveMap[playerId] = 0; // No doc means definitely stale
      }
    });

    // Use transaction to atomically read game state and update
    const result = await runTransaction(db, async (transaction) => {
      const gameSnap = await transaction.get(gameRef);
      
      if (!gameSnap.exists()) {
        return { removed: [], markedDead: [], deleted: false };
      }

      const game = gameSnap.data();
      const players = game.players || {};
      const currentPlayerIds = Object.keys(players);
      
      if (currentPlayerIds.length === 0) {
        return { removed: [], markedDead: [], deleted: false };
      }

      // Determine stale players based on current game state
      const stalePlayerIds = [];
      for (const playerId of currentPlayerIds) {
        // Only check players that were in our pre-fetch
        // New players (joined after pre-fetch) won't be in lastActiveMap and are NOT stale
        if (lastActiveMap.hasOwnProperty(playerId)) {
          const lastActive = lastActiveMap[playerId];
          const timeSinceActive = serverNow - lastActive;
          if (timeSinceActive > STALE_THRESHOLD_MS) {
            console.log(`Player ${playerId} is stale: inactive for ${Math.round(timeSinceActive / 60000)} minutes`);
            stalePlayerIds.push(playerId);
          }
        }
      }

      if (stalePlayerIds.length === 0) {
        return { removed: [], markedDead: [], deleted: false };
      }

      const removed = [];
      const markedDead = [];
      const updatedPlayers = { ...players };

      if (game.status === 'playing') {
        // During active game: mark stale players as dead (not removed)
        for (const playerId of stalePlayerIds) {
          if (updatedPlayers[playerId]?.isAlive) {
            updatedPlayers[playerId] = {
              ...updatedPlayers[playerId],
              isAlive: false,
              eliminatedReason: 'inactive'
            };
            markedDead.push(playerId);
          }
        }

        // Check if ALL players are now dead/stale
        const anyAlive = Object.values(updatedPlayers).some(p => p.isAlive);
        
        if (!anyAlive) {
          // Everyone is dead/stale - delete game so next joiner starts fresh
          transaction.delete(gameRef);
          console.log(`Game ${lobbyId} deleted - all players were stale`);
          return { removed: [], markedDead, deleted: true, stalePlayerIds };
        } else {
          // Check if game should end after removing stale players
          const winner = checkWinCondition({ ...game, players: updatedPlayers });

          if (winner) {
            transaction.update(gameRef, {
              players: updatedPlayers,
              status: 'ended',
              winner,
              phase: 'ended'
            });
          } else {
            transaction.update(gameRef, { players: updatedPlayers });
          }
        }
      } else {
        // In lobby or ended status: remove players completely
        for (const playerId of stalePlayerIds) {
          delete updatedPlayers[playerId];
          removed.push(playerId);
        }

        // Handle case where all players are removed
        if (Object.keys(updatedPlayers).length === 0) {
          transaction.delete(gameRef);
          return { removed, markedDead: [], deleted: true, stalePlayerIds };
        } else {
          // Transfer host if host was removed
          const updates = { players: updatedPlayers };
          if (stalePlayerIds.includes(game.hostId)) {
            const newHostId = Object.keys(updatedPlayers)[0];
            updates.hostId = newHostId;
          }
          transaction.update(gameRef, updates);
        }
      }

      return { removed, markedDead, deleted: false, stalePlayerIds };
    });

    // Clear userLobby tracking for stale players AFTER transaction commits
    // This is done outside the transaction since userLobbies is a separate collection
    // and we want to ensure the game state update succeeded first
    if (result.stalePlayerIds && result.stalePlayerIds.length > 0) {
      await Promise.all(
        result.stalePlayerIds.map(playerId => this.clearUserLobby(playerId))
      );
    }

    if (result.removed.length > 0 || result.markedDead.length > 0) {
      console.log(`Cleanup in ${lobbyId}: removed ${result.removed.length}, marked dead ${result.markedDead.length}`);
    }

    return { removed: result.removed, markedDead: result.markedDead };
  },

  // Clear user's lobby tracking
  async clearUserLobby(userId) {
    const userLobbyRef = doc(db, 'userLobbies', userId);
    try {
      await deleteDoc(userLobbyRef);
    } catch (error) {
      // Ignore if doesn't exist
    }
  },

  // Find which lobby a user is in - O(1) single read!
  async findUserLobby(userId) {
    const userLobbyRef = doc(db, 'userLobbies', userId);
    const userLobbySnap = await getDoc(userLobbyRef);
    
    if (userLobbySnap.exists()) {
      return userLobbySnap.data().lobbyId;
    }
    return null;
  },

  // ============================================
  // LOBBY INFO
  // ============================================

  async getLobbyInfo(lobbyId) {
    const gameRef = doc(db, 'games', lobbyId);
    const gameSnap = await getDoc(gameRef);
    
    if (!gameSnap.exists()) {
      return {
        status: 'empty',
        playerCount: 0,
        hostName: null
      };
    }
    
    const data = gameSnap.data();
    const players = Object.values(data.players || {});
    const host = players.find(p => p.uid === data.hostId);
    
    return {
      status: data.status,
      playerCount: players.length,
      hostName: host?.name || null
    };
  },

  async getAllLobbiesStatus() {
    // Parallel reads for all lobby statuses
    const results = await Promise.all(
      LOBBIES.map(lobby => this.getLobbyInfo(lobby.id))
    );
    
    const statuses = {};
    LOBBIES.forEach((lobby, idx) => {
      statuses[lobby.id] = results[idx];
    });
    return statuses;
  },

  // ============================================
  // JOIN / LEAVE GAME
  // ============================================

  async joinGame(user, lobbyId) {
    if (!lobbyId) {
      throw new Error('No lobby selected');
    }

    // Check if user is already in another lobby (single read!)
    const currentLobby = await this.findUserLobby(user.uid);
    if (currentLobby && currentLobby !== lobbyId) {
      // Remove user from the other lobby first
      await this.leaveGame(user.uid, currentLobby);
    }

    // Cleanup stale players before joining
    await this.cleanupStalePlayers(lobbyId);

    const gameRef = doc(db, 'games', lobbyId);
    
    // Maximally distinct color palette - ordered by visual difference
    // First 8 colors are highly distinct (for small games)
    // Extended palette adds more variety for larger games
    const colors = [
      // Primary distinct colors (first 8 are maximally different)
      '#E53935', // Red
      '#1E88E5', // Blue  
      '#43A047', // Green
      '#FB8C00', // Orange
      '#8E24AA', // Purple
      '#E91E63', // Pink (replaced cyan - too similar to blue)
      '#FFD600', // Yellow
      '#6D4C41', // Brown
      // Extended palette (still distinct from above)
      '#00ACC1', // Cyan (moved here for larger games)
      '#3949AB', // Indigo
      '#00897B', // Teal
      '#7CB342', // Lime
      '#F4511E', // Deep Orange
      '#5E35B1', // Deep Purple
      '#039BE5', // Light Blue
      '#C0CA33', // Yellow-Green
      '#546E7A', // Blue Grey
      '#EC407A', // Light Pink
      '#26A69A', // Medium Teal
      '#AB47BC', // Medium Purple
    ];

    // Helper function to pick the most distinct available color
    const pickDistinctColor = (usedColors) => {
      const availableColors = colors.filter(c => !usedColors.includes(c));
      if (availableColors.length === 0) {
        // All colors used, just pick any
        return colors[Math.floor(Math.random() * colors.length)];
      }
      // For small games (few used colors), pick from the first available in the ordered list
      // This ensures early players get maximally distinct colors
      if (usedColors.length < 8) {
        return availableColors[0];
      }
      // For larger games, pick randomly from remaining
      return availableColors[Math.floor(Math.random() * availableColors.length)];
    };

    // Use transaction to atomically join the game
    const playerData = await runTransaction(db, async (transaction) => {
      const gameSnap = await transaction.get(gameRef);

      if (!gameSnap.exists()) {
        // Create new game with this user as first player and host
        const color = colors[0]; // First player gets first color
        const newPlayer = {
          uid: user.uid,
          name: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          color: color,
          ready: false,
          isAlive: true,
          role: null,
          isSpectator: false
        };

        transaction.set(gameRef, {
          status: 'lobby',
          hostId: user.uid,
          players: { [user.uid]: newPlayer },
          lobbyId: lobbyId,
          settings: {
            numMafia: 2,
            hasDetective: true,
            hasDoctor: true,
            dayTimer: 5,
            nightTimer: 1,
            revealOnDeath: false,
            mafiaProbability: {}
          },
          createdAt: serverTimestamp()
        });

        return newPlayer;
      }

      const gameData = gameSnap.data();
      const players = { ...gameData.players };
      const isGameInProgress = gameData.status === 'playing' || gameData.status === 'ended';

      // If user already exists in the game, just return their data
      if (players[user.uid]) {
        return players[user.uid];
      }

      // Add new player with distinct color
      const usedColors = Object.values(players).map(p => p.color).filter(Boolean);
      const color = pickDistinctColor(usedColors);

      // If game is in progress, add as dead spectator (villager role)
      const newPlayer = {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        color: color,
        ready: false,
        isAlive: !isGameInProgress,
        role: isGameInProgress ? 'villager' : null,
        isSpectator: isGameInProgress
      };

      players[user.uid] = newPlayer;

      // Auto-assign as host if no host exists and game is not in progress
      const currentHostId = gameData.hostId;
      const shouldBecomeHost = !isGameInProgress && (!currentHostId || !players[currentHostId]);

      transaction.update(gameRef, {
        players: players,
        ...(shouldBecomeHost && { hostId: user.uid })
      });

      return newPlayer;
    });

    // Track user's lobby membership in Firestore
    const userLobbyRef = doc(db, 'userLobbies', user.uid);
    await setDoc(userLobbyRef, {
      lobbyId: lobbyId,
      joinedAt: serverTimestamp(),
      lastActive: serverTimestamp()
    });

    // Store the selected lobby locally
    setSelectedLobby(lobbyId);

    return playerData;
  },

  async leaveGame(userId, lobbyId) {
    if (!lobbyId) lobbyId = getSelectedLobby();
    if (!lobbyId) return;

    const gameRef = doc(db, 'games', lobbyId);

    // Use transaction to atomically leave the game
    await runTransaction(db, async (transaction) => {
      const gameSnap = await transaction.get(gameRef);

      if (!gameSnap.exists()) {
        return; // Game doesn't exist, nothing to leave
      }

      const gameData = gameSnap.data();
      const players = { ...gameData.players };
      
      if (!players[userId]) {
        return; // User not in this game
      }

      delete players[userId];

      if (Object.keys(players).length === 0) {
        transaction.delete(gameRef);
      } else {
        const updates = { players };
        if (gameData.hostId === userId) {
          const newHostId = Object.keys(players)[0];
          updates.hostId = newHostId;
        }
        transaction.update(gameRef, updates);
      }
    });

    // Clear user's lobby tracking
    await this.clearUserLobby(userId);

    // Clear local selected lobby
    setSelectedLobby(null);
  },

  async kickPlayer(hostId, targetUserId, lobbyId) {
    if (!lobbyId) lobbyId = getSelectedLobby();
    if (!lobbyId) throw new Error('No lobby selected');

    const gameRef = doc(db, 'games', lobbyId);

    // Use transaction to atomically kick the player
    await runTransaction(db, async (transaction) => {
      const gameSnap = await transaction.get(gameRef);

      if (!gameSnap.exists()) {
        throw new Error('Game not found');
      }

      const gameData = gameSnap.data();
      
      if (gameData.hostId !== hostId) {
        throw new Error('Only host can kick players');
      }

      const players = { ...gameData.players };
      
      if (!players[targetUserId]) {
        throw new Error('Player not found in game');
      }

      delete players[targetUserId];
      transaction.update(gameRef, { players });
    });

    // Clear kicked user's lobby tracking
    await this.clearUserLobby(targetUserId);
  },

  // ============================================
  // GAME SETTINGS
  // ============================================

  async updateSettings(hostId, settings, lobbyId) {
    if (!lobbyId) lobbyId = getSelectedLobby();
    if (!lobbyId) throw new Error('No lobby selected');

    const gameRef = doc(db, 'games', lobbyId);
    const gameSnap = await getDoc(gameRef);

    if (!gameSnap.exists() || gameSnap.data().hostId !== hostId) {
      throw new Error('Only host can update settings');
    }

    await updateDoc(gameRef, {
      settings: { ...gameSnap.data().settings, ...settings }
    });
  },

  // ============================================
  // GAME FLOW
  // ============================================

  async startGame(hostId, lobbyId) {
    if (!lobbyId) lobbyId = getSelectedLobby();
    if (!lobbyId) throw new Error('No lobby selected');

    const gameRef = doc(db, 'games', lobbyId);
    
    // Use a consistent start time for encryption key (generated before transaction)
    const gameStartTime = getServerTime();

    // Use transaction to atomically start the game
    await runTransaction(db, async (transaction) => {
      const gameSnap = await transaction.get(gameRef);

      if (!gameSnap.exists()) {
        throw new Error('Game not found');
      }

      const gameData = gameSnap.data();

      if (gameData.hostId !== hostId) {
        throw new Error('Only host can start game');
      }

      if (gameData.status === 'playing') {
        throw new Error('Game already in progress');
      }

      const players = Object.values(gameData.players);
      
      if (players.length < 4) {
        throw new Error('Need at least 4 players to start');
      }

      const roles = this.assignRoles(players, gameData.settings);
      const playersWithRoles = {};
      
      players.forEach((player, index) => {
        playersWithRoles[player.uid] = {
          ...player,
          role: encryptRole(roles[index], lobbyId, gameStartTime),
          isAlive: true
        };
      });

      const nightEndTime = gameStartTime + ((gameData.settings?.nightTimer || 1) * 60 * 1000);

      transaction.update(gameRef, {
        status: 'playing',
        phase: 'night',
        round: 1,
        players: playersWithRoles,
        actions: {},
        votes: {},
        gameStartTime, // Store for decryption
        nightStartTime: gameStartTime,
        nightEndTime
      });
    });
  },

  assignRoles(players, settings) {
    const numPlayers = players.length;
    const numMafia = Math.min(settings.numMafia || 2, Math.floor(numPlayers / 3));
    const mafiaProbability = settings.mafiaProbability || {};
    
    const playersCopy = [...players];
    const assignedRoles = new Array(numPlayers).fill(null);
    
    const playerWeights = playersCopy.map((p, idx) => ({
      index: idx,
      weight: mafiaProbability[p.uid] ?? 50
    }));
    
    playerWeights.sort((a, b) => b.weight - a.weight);
    
    const mafiaIndices = [];
    for (let i = 0; i < numMafia; i++) {
      const eligiblePlayers = playerWeights.filter(
        pw => !mafiaIndices.includes(pw.index)
      );
      
      if (eligiblePlayers.length === 0) break;
      
      const totalWeight = eligiblePlayers.reduce((sum, pw) => sum + pw.weight, 0);
      let random = Math.random() * totalWeight;
      
      for (const pw of eligiblePlayers) {
        random -= pw.weight;
        if (random <= 0) {
          mafiaIndices.push(pw.index);
          assignedRoles[pw.index] = 'mafia';
          break;
        }
      }
    }
    
    const remainingIndices = playersCopy
      .map((_, idx) => idx)
      .filter(idx => !mafiaIndices.includes(idx));
    
    for (let i = remainingIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remainingIndices[i], remainingIndices[j]] = [remainingIndices[j], remainingIndices[i]];
    }
    
    let specialRoleIdx = 0;
    
    if (settings.hasDetective && specialRoleIdx < remainingIndices.length) {
      assignedRoles[remainingIndices[specialRoleIdx]] = 'detective';
      specialRoleIdx++;
    }
    
    if (settings.hasDoctor && specialRoleIdx < remainingIndices.length) {
      assignedRoles[remainingIndices[specialRoleIdx]] = 'doctor';
      specialRoleIdx++;
    }
    
    for (let i = 0; i < numPlayers; i++) {
      if (assignedRoles[i] === null) {
        assignedRoles[i] = 'villager';
      }
    }
    
    return assignedRoles;
  },

  async submitAction(userId, actionType, targetId, lobbyId) {
    if (!lobbyId) lobbyId = getSelectedLobby();
    if (!lobbyId) throw new Error('No lobby selected');

    const gameRef = doc(db, 'games', lobbyId);
    
    await runTransaction(db, async (transaction) => {
      const gameSnap = await transaction.get(gameRef);

      if (!gameSnap.exists()) {
        throw new Error('Game not found');
      }

      const gameData = gameSnap.data();
      const player = gameData.players[userId];

      if (!player || !player.isAlive) {
        throw new Error('Player not in game or dead');
      }

      const actions = { ...(gameData.actions || {}) };
      
      if (targetId === 'skip') {
        delete actions[userId];
      } else {
        actions[userId] = {
          type: actionType,
          targetId: targetId,
          timestamp: Date.now() // Use Date.now() in transactions (serverTimestamp not allowed)
        };
      }

      transaction.update(gameRef, { actions });
    });
    
    setTimeout(() => {
      import('../utils/gameProcessor').then(({ processGamePhase }) => {
        processGamePhase(lobbyId);
      });
    }, 1000);
  },

  async submitVote(userId, targetId, lobbyId) {
    if (!lobbyId) lobbyId = getSelectedLobby();
    if (!lobbyId) throw new Error('No lobby selected');

    const gameRef = doc(db, 'games', lobbyId);
    
    await runTransaction(db, async (transaction) => {
      const gameSnap = await transaction.get(gameRef);

      if (!gameSnap.exists()) {
        throw new Error('Game not found');
      }

      const gameData = gameSnap.data();
      const player = gameData.players[userId];

      if (!player || !player.isAlive) {
        throw new Error('Player not in game or dead');
      }

      const votes = { ...(gameData.votes || {}) };
      
      if (targetId === 'skip') {
        delete votes[userId];
      } else {
        votes[userId] = {
          targetId: targetId,
          timestamp: Date.now() // Use Date.now() in transactions (serverTimestamp not allowed)
        };
      }

      transaction.update(gameRef, { votes });
    });
    
    setTimeout(() => {
      import('../utils/gameProcessor').then(({ processGamePhase }) => {
        processGamePhase(lobbyId);
      });
    }, 1000);
  },

  async resetGame(hostId, lobbyId) {
    if (!lobbyId) lobbyId = getSelectedLobby();
    if (!lobbyId) throw new Error('No lobby selected');

    const gameRef = doc(db, 'games', lobbyId);

    // Use transaction to atomically reset the game
    await runTransaction(db, async (transaction) => {
      const gameSnap = await transaction.get(gameRef);

      if (!gameSnap.exists()) {
        throw new Error('No game to reset');
      }

      const gameData = gameSnap.data();

      if (gameData.hostId !== hostId) {
        throw new Error('Only host can reset game');
      }

      // Keep all players but reset their game-specific state
      const resetPlayers = {};
      Object.values(gameData.players || {}).forEach(player => {
        resetPlayers[player.uid] = {
          uid: player.uid,
          name: player.name,
          email: player.email,
          photoURL: player.photoURL,
          color: player.color,
          ready: false,
          isAlive: true,
          role: null,
          isSpectator: false
        };
      });

      // Reset game to lobby state, keeping players and settings
      transaction.set(gameRef, {
        status: 'lobby',
        hostId: hostId,
        players: resetPlayers,
        lobbyId: lobbyId,
        settings: gameData.settings || {
          numMafia: 2,
          hasDetective: true,
          hasDoctor: true,
          dayTimer: 5,
          nightTimer: 1,
          revealOnDeath: false,
          mafiaProbability: {}
        },
        createdAt: serverTimestamp()
      });
    });
    
    // Note: Don't clear userLobbies tracking - players stay in the lobby
  },

  // ============================================
  // ADMIN FUNCTIONS
  // ============================================

  async assignHost(lobbyId, email) {
    const gameRef = doc(db, 'games', lobbyId);
    const gameSnap = await getDoc(gameRef);

    if (!gameSnap.exists()) {
      throw new Error('No game found in this lobby');
    }

    const gameData = gameSnap.data();
    const players = gameData.players || {};
    
    const hostPlayer = Object.values(players).find(p => p.email === email);
    
    if (!hostPlayer) {
      throw new Error('Player with this email not found in lobby');
    }

    await updateDoc(gameRef, {
      hostId: hostPlayer.uid
    });

    return hostPlayer;
  }
};
