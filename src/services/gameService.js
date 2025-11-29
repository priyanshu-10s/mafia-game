import { doc, setDoc, updateDoc, deleteDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

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
        joinedAt: serverTimestamp()
      });
    } else {
      await deleteDoc(userLobbyRef);
    }
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

    const gameRef = doc(db, 'games', lobbyId);
    const gameSnap = await getDoc(gameRef);

    if (!gameSnap.exists()) {
      await setDoc(gameRef, {
        status: 'lobby',
        hostId: null,
        players: {},
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
    }

    const gameData = gameSnap.exists() ? gameSnap.data() : {};
    const players = gameData.players || {};
    const isGameInProgress = gameData.status === 'playing' || gameData.status === 'ended';

    if (!players[user.uid]) {
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#E74C3C', '#3498DB', '#2ECC71', '#9B59B6', '#E67E22', '#1ABC9C', '#34495E', '#F39C12', '#E91E63', '#00BCD4', '#8BC34A'];
      const usedColors = Object.values(players).map(p => p.color).filter(Boolean);
      const availableColors = colors.filter(c => !usedColors.includes(c));
      const color = availableColors[Math.floor(Math.random() * availableColors.length)] || colors[Math.floor(Math.random() * colors.length)];

      // If game is in progress, add as dead spectator (villager role)
      players[user.uid] = {
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

      await updateDoc(gameRef, {
        players: players
      });
    }

    // Track user's lobby membership in Firestore
    const userLobbyRef = doc(db, 'userLobbies', user.uid);
    await setDoc(userLobbyRef, {
      lobbyId: lobbyId,
      joinedAt: serverTimestamp()
    });

    // Store the selected lobby locally
    setSelectedLobby(lobbyId);

    return players[user.uid];
  },

  async leaveGame(userId, lobbyId) {
    if (!lobbyId) lobbyId = getSelectedLobby();
    if (!lobbyId) return;

    const gameRef = doc(db, 'games', lobbyId);
    const gameSnap = await getDoc(gameRef);

    if (gameSnap.exists()) {
      const gameData = gameSnap.data();
      const players = { ...gameData.players };
      delete players[userId];

      if (Object.keys(players).length === 0) {
        await deleteDoc(gameRef);
      } else {
        const updates = { players };
        if (gameData.hostId === userId) {
          const newHostId = Object.keys(players)[0];
          updates.hostId = newHostId;
        }
        await updateDoc(gameRef, updates);
      }
    }

    // Clear user's lobby tracking
    await this.clearUserLobby(userId);

    // Clear local selected lobby
    setSelectedLobby(null);
  },

  async kickPlayer(hostId, targetUserId, lobbyId) {
    if (!lobbyId) lobbyId = getSelectedLobby();
    if (!lobbyId) throw new Error('No lobby selected');

    const gameRef = doc(db, 'games', lobbyId);
    const gameSnap = await getDoc(gameRef);

    if (!gameSnap.exists() || gameSnap.data().hostId !== hostId) {
      throw new Error('Only host can kick players');
    }

    const gameData = gameSnap.data();
    const players = { ...gameData.players };
    delete players[targetUserId];

    await updateDoc(gameRef, { players });

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
    const gameSnap = await getDoc(gameRef);

    if (!gameSnap.exists() || gameSnap.data().hostId !== hostId) {
      throw new Error('Only host can start game');
    }

    const gameData = gameSnap.data();
    const players = Object.values(gameData.players);
    
    if (players.length < 4) {
      throw new Error('Need at least 4 players to start');
    }

    const roles = this.assignRoles(players, gameData.settings);
    const playersWithRoles = {};
    
    players.forEach((player, index) => {
      playersWithRoles[player.uid] = {
        ...player,
        role: roles[index],
        isAlive: true
      };
    });

    const nightEndTime = Date.now() + ((gameData.settings?.nightTimer || 1) * 60 * 1000);

    await updateDoc(gameRef, {
      status: 'playing',
      phase: 'night',
      round: 1,
      players: playersWithRoles,
      actions: {},
      votes: {},
      nightStartTime: Date.now(),
      nightEndTime
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
    const gameSnap = await getDoc(gameRef);

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
        timestamp: serverTimestamp()
      };
    }

    await updateDoc(gameRef, { actions });
    
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
    const gameSnap = await getDoc(gameRef);

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
        timestamp: serverTimestamp()
      };
    }

    await updateDoc(gameRef, { votes });
    
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
    const gameSnap = await getDoc(gameRef);

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
    await setDoc(gameRef, {
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
