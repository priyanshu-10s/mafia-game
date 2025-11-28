import { doc, setDoc, updateDoc, deleteDoc, collection, addDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

const GAME_ID = 'current_game';

export const gameService = {
  async joinGame(user) {
    const gameRef = doc(db, 'games', GAME_ID);
    const gameSnap = await getDoc(gameRef);

    if (!gameSnap.exists()) {
      await setDoc(gameRef, {
        status: 'lobby',
        hostId: null,
        players: {},
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

    if (!players[user.uid]) {
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#E74C3C', '#3498DB', '#2ECC71', '#9B59B6', '#E67E22', '#1ABC9C', '#34495E', '#F39C12', '#E91E63', '#00BCD4', '#8BC34A'];
      const usedColors = Object.values(players).map(p => p.color).filter(Boolean);
      const availableColors = colors.filter(c => !usedColors.includes(c));
      const color = availableColors[Math.floor(Math.random() * availableColors.length)] || colors[Math.floor(Math.random() * colors.length)];

      players[user.uid] = {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        color: color,
        ready: false,
        isAlive: true,
        role: null
      };

      await updateDoc(gameRef, {
        players: players
      });
    }

    return players[user.uid];
  },

  async leaveGame(userId) {
    const gameRef = doc(db, 'games', GAME_ID);
    const gameSnap = await getDoc(gameRef);

    if (!gameSnap.exists()) return;

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
  },

  async kickPlayer(hostId, targetUserId) {
    const gameRef = doc(db, 'games', GAME_ID);
    const gameSnap = await getDoc(gameRef);

    if (!gameSnap.exists() || gameSnap.data().hostId !== hostId) {
      throw new Error('Only host can kick players');
    }

    const gameData = gameSnap.data();
    const players = { ...gameData.players };
    delete players[targetUserId];

    await updateDoc(gameRef, { players });
  },

  async updateSettings(hostId, settings) {
    const gameRef = doc(db, 'games', GAME_ID);
    const gameSnap = await getDoc(gameRef);

    if (!gameSnap.exists() || gameSnap.data().hostId !== hostId) {
      throw new Error('Only host can update settings');
    }

    await updateDoc(gameRef, {
      settings: { ...gameSnap.data().settings, ...settings }
    });
  },

  async startGame(hostId) {
    const gameRef = doc(db, 'games', GAME_ID);
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

  async submitAction(userId, actionType, targetId) {
    const gameRef = doc(db, 'games', GAME_ID);
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
    actions[userId] = {
      type: actionType,
      targetId: targetId,
      timestamp: serverTimestamp()
    };

    await updateDoc(gameRef, { actions });
    
    setTimeout(() => {
      import('../utils/gameProcessor').then(({ processGamePhase }) => {
        processGamePhase();
      });
    }, 1000);
  },

  async submitVote(userId, targetId) {
    const gameRef = doc(db, 'games', GAME_ID);
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
    votes[userId] = {
      targetId: targetId,
      timestamp: serverTimestamp()
    };

    await updateDoc(gameRef, { votes });
    
    setTimeout(() => {
      import('../utils/gameProcessor').then(({ processGamePhase }) => {
        processGamePhase();
      });
    }, 1000);
  },

  async resetGame(hostId) {
    const gameRef = doc(db, 'games', GAME_ID);
    const gameSnap = await getDoc(gameRef);

    if (!gameSnap.exists()) {
      throw new Error('No game to reset');
    }

    if (gameSnap.data().hostId !== hostId) {
      throw new Error('Only host can reset game');
    }

    await setDoc(gameRef, {
      status: 'lobby',
      hostId: hostId,
      players: {},
      settings: gameSnap.data().settings || {
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
};

