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
      status: 'night',
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
    const roles = [];

    for (let i = 0; i < numMafia; i++) {
      roles.push('mafia');
    }

    if (settings.hasDetective) {
      roles.push('detective');
    }

    if (settings.hasDoctor) {
      roles.push('doctor');
    }

    while (roles.length < numPlayers) {
      roles.push('villager');
    }

    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }

    return roles;
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
  }
};

