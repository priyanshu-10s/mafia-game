import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

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

export async function createDummyUsers() {
  const gameRef = doc(db, 'games', 'current_game');
  const gameSnap = await getDoc(gameRef);

  let players = {};
  
  if (gameSnap.exists()) {
    players = gameSnap.data().players || {};
  } else {
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
        revealOnDeath: false
      },
      createdAt: new Date()
    });
  }

  DUMMY_USERS.forEach(user => {
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
  });

  await updateDoc(gameRef, {
    players: players,
    hostId: DUMMY_USERS[0].uid
  });

  console.log('✅ Dummy users created:', DUMMY_USERS.map(u => u.name).join(', '));
  return DUMMY_USERS;
}

export async function removeDummyUsers() {
  const gameRef = doc(db, 'games', 'current_game');
  const gameSnap = await getDoc(gameRef);

  if (!gameSnap.exists()) {
    console.log('No game found');
    return;
  }

  const players = { ...gameSnap.data().players };
  const dummyUids = DUMMY_USERS.map(u => u.uid);
  
  dummyUids.forEach(uid => {
    delete players[uid];
  });

  const updates = { players };
  
  if (dummyUids.includes(gameSnap.data().hostId)) {
    const remainingUids = Object.keys(players);
    if (remainingUids.length > 0) {
      updates.hostId = remainingUids[0];
    } else {
      updates.hostId = null;
    }
  }

  await updateDoc(gameRef, updates);
  console.log('✅ Dummy users removed');
}

export { DUMMY_USERS };

