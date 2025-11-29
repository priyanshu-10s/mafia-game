import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Available lobbies (same as in gameService)
export const LOBBIES = [
  { id: 'lobby_1', name: 'Lobby 1', icon: '🎭' },
  { id: 'lobby_2', name: 'Lobby 2', icon: '🎪' },
  { id: 'lobby_3', name: 'Lobby 3', icon: '🎯' }
];

const DUMMY_USERS = [
  {
    uid: 'dummy_user_1',
    name: 'Alice',
    email: 'alice@test.com',
    photoURL: 'https://i.pravatar.cc/150?img=1',
    color: '#FF6B6B'
  },
  {
    uid: 'dummy_user_2',
    name: 'Bob',
    email: 'bob@test.com',
    photoURL: 'https://i.pravatar.cc/150?img=2',
    color: '#4ECDC4'
  },
  {
    uid: 'dummy_user_3',
    name: 'Charlie',
    email: 'charlie@test.com',
    photoURL: 'https://i.pravatar.cc/150?img=3',
    color: '#45B7D1'
  },
  {
    uid: 'dummy_user_4',
    name: 'Diana',
    email: 'diana@test.com',
    photoURL: 'https://i.pravatar.cc/150?img=4',
    color: '#FFA07A'
  },
  {
    uid: 'dummy_user_5',
    name: 'Eve',
    email: 'eve@test.com',
    photoURL: 'https://i.pravatar.cc/150?img=5',
    color: '#98D8C8'
  },
  {
    uid: 'dummy_user_6',
    name: 'Frank',
    email: 'frank@test.com',
    photoURL: 'https://i.pravatar.cc/150?img=6',
    color: '#F7DC6F'
  }
];

export async function createDummyUsers(lobbyId = 'lobby_1') {
  const gameRef = doc(db, 'games', lobbyId);
  const gameSnap = await getDoc(gameRef);

  let players = {};
  
  if (gameSnap.exists()) {
    players = gameSnap.data().players || {};
  } else {
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
        revealOnDeath: false
      },
      createdAt: new Date()
    });
  }

  // Add dummy users to players and create their userLobbies tracking
  for (const user of DUMMY_USERS) {
    players[user.uid] = {
      uid: user.uid,
      name: user.name,
      email: user.email,
      photoURL: user.photoURL,
      color: user.color,
      ready: false,
      isAlive: true,
      role: null
    };

    // Create userLobbies doc so they don't get marked as stale
    const userLobbyRef = doc(db, 'userLobbies', user.uid);
    await setDoc(userLobbyRef, {
      lobbyId: lobbyId,
      joinedAt: serverTimestamp(),
      lastActive: serverTimestamp()
    });
  }

  // Don't change hostId - keep the real user as host
  const currentData = gameSnap.exists() ? gameSnap.data() : {};
  const updates = { players };
  
  // Only set host if there's no current host (and there's a real player)
  if (!currentData.hostId) {
    const realPlayers = Object.keys(players).filter(uid => !uid.startsWith('dummy_'));
    if (realPlayers.length > 0) {
      updates.hostId = realPlayers[0];
    }
  }

  await updateDoc(gameRef, updates);

  console.log(`✅ Dummy users created in ${lobbyId}:`, DUMMY_USERS.map(u => u.name).join(', '));
  return DUMMY_USERS;
}

export async function dummyUsersVote(lobbyId = 'lobby_1') {
  const gameRef = doc(db, 'games', lobbyId);
  const gameSnap = await getDoc(gameRef);

  if (!gameSnap.exists()) {
    throw new Error('No game found in ' + lobbyId);
  }

  const game = gameSnap.data();
  const phase = game.phase;
  const dummyUids = DUMMY_USERS.map(u => u.uid);
  
  // Get alive dummy users
  const aliveDummies = dummyUids.filter(uid => 
    game.players[uid] && game.players[uid].isAlive
  );

  // Get all alive players (for targets)
  const alivePlayers = Object.values(game.players).filter(p => p.isAlive);

  if (phase === 'night') {
    const actions = { ...(game.actions || {}) };
    
    aliveDummies.forEach(uid => {
      const player = game.players[uid];
      // Pick random target (not self)
      const targets = alivePlayers.filter(p => p.uid !== uid);
      const randomTarget = targets[Math.floor(Math.random() * targets.length)];
      
      if (randomTarget) {
        actions[uid] = {
          type: player.role || 'villager',
          targetId: randomTarget.uid,
          timestamp: new Date()
        };
      }
    });

    await updateDoc(gameRef, { actions });
    console.log(`✅ ${aliveDummies.length} dummy users voted (night) in ${lobbyId}`);
    
  } else if (phase === 'day') {
    const votes = { ...(game.votes || {}) };
    
    aliveDummies.forEach(uid => {
      // Pick random target (not self)
      const targets = alivePlayers.filter(p => p.uid !== uid);
      const randomTarget = targets[Math.floor(Math.random() * targets.length)];
      
      if (randomTarget) {
        votes[uid] = {
          targetId: randomTarget.uid,
          timestamp: new Date()
        };
      }
    });

    await updateDoc(gameRef, { votes });
    console.log(`✅ ${aliveDummies.length} dummy users voted (day) in ${lobbyId}`);
  } else {
    throw new Error(`Cannot vote during ${phase || 'lobby'} phase`);
  }

  return aliveDummies.length;
}

export async function removeDummyUsers(lobbyId = 'lobby_1') {
  const gameRef = doc(db, 'games', lobbyId);
  const gameSnap = await getDoc(gameRef);

  if (!gameSnap.exists()) {
    console.log('No game found in ' + lobbyId);
    return;
  }

  const players = { ...gameSnap.data().players };
  const dummyUids = DUMMY_USERS.map(u => u.uid);
  
  // Remove dummy users from players and their userLobbies tracking
  for (const uid of dummyUids) {
    delete players[uid];
    
    // Also delete their userLobbies doc
    const userLobbyRef = doc(db, 'userLobbies', uid);
    try {
      await deleteDoc(userLobbyRef);
    } catch (e) {
      // Ignore if doesn't exist
    }
  }

  const updates = { players };
  
  // If host was somehow a dummy, transfer to a real player
  if (dummyUids.includes(gameSnap.data().hostId)) {
    const realPlayers = Object.keys(players).filter(uid => !uid.startsWith('dummy_'));
    if (realPlayers.length > 0) {
      updates.hostId = realPlayers[0];
    } else {
      updates.hostId = null;
    }
  }

  await updateDoc(gameRef, updates);
  console.log(`✅ Dummy users removed from ${lobbyId}`);
}

export { DUMMY_USERS };
