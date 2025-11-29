# Firebase Setup Guide for Mafia Game

Complete step-by-step guide to set up Firebase for your Mafia game.

---

## 1. Create Firebase Project

### Step 1: Go to Firebase Console
1. Visit [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**

### Step 2: Configure Project
1. **Project name**: `mafia-game` (or your preferred name)
2. Click **Continue**
3. **Google Analytics**: Optional (can disable for simplicity)
4. Click **Create project**
5. Wait for setup to complete
6. Click **Continue** to enter dashboard

---

## 2. Set Up Firebase Authentication

### Enable Google Sign-In

1. In Firebase Console, go to **Build** → **Authentication**
2. Click **Get started**
3. Go to **Sign-in method** tab
4. Click on **Google** provider
5. Toggle to **Enable**
6. **Project support email**: Select your email
7. Click **Save**

### Configure OAuth Consent Screen (if needed)
1. If prompted, go to Google Cloud Console
2. Configure OAuth consent screen
3. Add your email as test user
4. Save and continue

**Done!** Google Sign-In is now enabled.

---

## 3. Set Up Firestore Database

### Create Database

1. In Firebase Console, go to **Build** → **Firestore Database**
2. Click **Create database**
3. **Location**: Choose closest to you (can't change later)
   - Recommended: `us-central` or your region
4. **Security rules**: Start in **Test mode**
   - We'll add proper rules later
5. Click **Enable**

### Database Structure

Your database will auto-create collections when you write data. The structure will be:

```
firestore/
  └── games/
      └── current_game/
          ├── status: "lobby"
          ├── hostId: "user123"
          ├── round: 1
          ├── phase: "night"
          ├── settings: {...}
          ├── players/          (subcollection)
          │   ├── user123/
          │   ├── user456/
          │   └── ...
          ├── actions/          (subcollection)
          │   ├── action1/
          │   └── ...
          └── votes/            (subcollection)
              ├── vote1/
              └── ...
```

**No manual setup needed** - collections created on first write.

---

## 4. Set Up Firebase Hosting

### Initialize Hosting

1. In Firebase Console, go to **Build** → **Hosting**
2. Click **Get started**
3. Follow the wizard (or do via CLI later)

### We'll configure this during development setup

---

## 5. Security Rules ⚠️ OPTIONAL - Skip for Now

**For Development:**
- ✅ **You can skip this section** and use **Test Mode** initially
- ✅ Test Mode allows all reads/writes (perfect for development)
- ✅ You can add proper security rules later when requirements are finalized

**For Production:**
- ⚠️ **You MUST add security rules** before deploying to production
- ⚠️ Without rules, anyone can read/write your database
- ⚠️ Security rules protect your data and prevent abuse

### Quick Start: Use Test Mode

When creating Firestore, you selected **"Start in test mode"** - this is perfect for now!

**Test Mode Rules** (already active):
```javascript
// Allows all reads/writes for 30 days
allow read, write: if request.time < timestamp.date(2024, 12, 31);
```

**This means:**
- ✅ You can develop freely
- ✅ No security restrictions during development
- ✅ Perfect for testing and iteration
- ⚠️ Remember to add proper rules before production!

### Add Security Rules Later (When Ready)

When your game requirements are finalized, come back and add proper security rules. You can find example rules in the **"Security Rules Reference"** section at the end of this document.

**For now:** Continue with development using Test Mode! 🚀

---

## 6. Get Firebase Config

### Web App Configuration

1. In Firebase Console, click ⚙️ **Project Settings**
2. Scroll down to **Your apps** section
3. Click **Web** icon (`</>`)
4. **App nickname**: `mafia-game-web`
5. **Firebase Hosting**: Check this box
6. Click **Register app**
7. **Copy the config object** - you'll need this!

It will look like:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "mafia-game-xxxxx.firebaseapp.com",
  projectId: "mafia-game-xxxxx",
  storageBucket: "mafia-game-xxxxx.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

**Save this config** - you'll add it to your React app.

---

## 7. Optional: Set Up Cloud Functions (for later)

Not needed for MVP, but if you want server-side logic:

1. Go to **Build** → **Functions**
2. Click **Get started**
3. Upgrade to **Blaze plan** (pay-as-you-go)
   - Still free for small usage
   - Required for outbound network requests

---

## 8. Firebase CLI Setup (Local Development)

### Install Firebase CLI

```bash
npm install -g firebase-tools
```

### Login to Firebase

```bash
firebase login
```

This opens browser for authentication.

### Initialize Firebase in Your Project

```bash
cd mafia-game-project
firebase init
```

**Select these features:**
- [x] Firestore
- [x] Hosting
- [ ] Functions (optional for later)

**Firestore Setup:**
- Use default `firestore.rules`
- Use default `firestore.indexes.json`

**Hosting Setup:**
- Public directory: `build` (for React)
- Configure as SPA: **Yes**
- Set up automatic builds: **No** (for now)
- Overwrite index.html: **No**

This creates:
```
mafia-game-project/
├── .firebaserc
├── firebase.json
├── firestore.rules
└── firestore.indexes.json
```

---

## 9. Environment Variables Setup

### Create `.env` file in your React project

```bash
# .env
REACT_APP_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
REACT_APP_FIREBASE_AUTH_DOMAIN=mafia-game-xxxxx.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=mafia-game-xxxxx
REACT_APP_FIREBASE_STORAGE_BUCKET=mafia-game-xxxxx.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789012
REACT_APP_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# Admin password (for admin panel)
REACT_APP_ADMIN_PASSWORD=your-secure-password-here
```

**Add to `.gitignore`:**
```
.env
.env.local
```

---

## 10. Firebase SDK Installation (React)

### Install Dependencies

```bash
npm install firebase
```

### Create Firebase Config File

Create `src/firebase/config.js`:

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
```

---

## 11. Test Firebase Connection

### Create Test Component

Create `src/components/FirebaseTest.jsx`:

```javascript
import { useEffect, useState } from 'react';
import { db, auth, googleProvider } from '../firebase/config';
import { signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

function FirebaseTest() {
  const [user, setUser] = useState(null);
  const [testResult, setTestResult] = useState('');

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
      setTestResult('✅ Authentication successful!');
    } catch (error) {
      setTestResult('❌ Auth error: ' + error.message);
    }
  };

  const testFirestore = async () => {
    try {
      // Write test data
      await setDoc(doc(db, 'test', 'connection'), {
        message: 'Hello Firebase!',
        timestamp: new Date()
      });
      
      // Read it back
      const docSnap = await getDoc(doc(db, 'test', 'connection'));
      if (docSnap.exists()) {
        setTestResult('✅ Firestore working! Data: ' + docSnap.data().message);
      }
    } catch (error) {
      setTestResult('❌ Firestore error: ' + error.message);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Firebase Connection Test</h2>
      
      <button onClick={handleGoogleSignIn}>
        Test Google Sign-In
      </button>
      
      <button onClick={testFirestore}>
        Test Firestore
      </button>
      
      {user && <p>Logged in as: {user.displayName}</p>}
      {testResult && <p>{testResult}</p>}
    </div>
  );
}

export default FirebaseTest;
```

Run your React app and test both buttons!

---

## 12. Deployment Setup

### Deploy to Firebase Hosting

```bash
# Build React app
npm run build

# Deploy to Firebase
firebase deploy --only hosting
```

Your app will be live at:
```
https://mafia-game-xxxxx.web.app
```

### Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

---

## 13. Important Configuration Files

### `firebase.json`

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "hosting": {
    "public": "build",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

### `.firebaserc`

```json
{
  "projects": {
    "default": "mafia-game-xxxxx"
  }
}
```

---

## 14. Admin Panel Password Setup

Since you want password-protected admin panel:

### Option 1: Environment Variable (Recommended)

In `.env`:
```
REACT_APP_ADMIN_PASSWORD=mafia2024secure
```

In your admin panel:
```javascript
const isValidPassword = (password) => {
  return password === process.env.REACT_APP_ADMIN_PASSWORD;
};
```

### Option 2: Firestore Document (More Secure)

Store hashed password in Firestore:

```javascript
// One-time setup
import bcrypt from 'bcryptjs';

const hashedPassword = await bcrypt.hash('your-password', 10);
await setDoc(doc(db, 'admin', 'config'), {
  passwordHash: hashedPassword
});

// Then verify
const adminConfig = await getDoc(doc(db, 'admin', 'config'));
const isValid = await bcrypt.compare(password, adminConfig.data().passwordHash);
```

---

## 15. Checklist Summary

- [ ] Create Firebase project
- [ ] Enable Google Authentication
- [ ] Create Firestore Database (test mode)
- [ ] Set up Firebase Hosting
- [ ] ~~Configure security rules~~ (Skip for now - use test mode)
- [ ] Get Firebase config
- [ ] Install Firebase CLI
- [ ] Initialize Firebase in project
- [ ] Install Firebase SDK in React
- [ ] Create Firebase config file
- [ ] Add environment variables
- [ ] Test authentication
- [ ] Test Firestore read/write
- [ ] Deploy to hosting
- [ ] Add security rules before production (later)

---

## 16. Useful Firebase CLI Commands

```bash
# Login
firebase login

# List projects
firebase projects:list

# Select project
firebase use mafia-game-xxxxx

# Deploy everything
firebase deploy

# Deploy only hosting
firebase deploy --only hosting

# Deploy only rules
firebase deploy --only firestore:rules

# View logs
firebase functions:log

# Open hosting URL
firebase open hosting:site

# Emulator (for local testing)
firebase emulators:start
```

---

## 17. Cost Monitoring

### View Usage

1. Firebase Console → **Usage and billing**
2. Monitor:
   - Firestore reads/writes
   - Authentication requests
   - Hosting bandwidth

### Set Budget Alert (Optional)

1. Go to **Google Cloud Console**
2. **Billing** → **Budgets & alerts**
3. Set budget (e.g., $5/month)
4. Get email alerts at 50%, 90%, 100%

---

## 16. Security Rules Reference (For Later)

When you're ready to add security rules (before production), here's a template you can customize based on your final requirements:

### Basic Template

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper: Check if user is signed in
    function isSignedIn() {
      return request.auth != null;
    }
    
    // Your game-specific rules here
    // Customize based on your final requirements
    
    match /games/{gameId} {
      // Example: Only authenticated users can read
      allow read: if isSignedIn();
      
      // Example: Only host can update
      // allow update: if isHost(gameId);
      
      // Add more rules as needed...
    }
  }
}
```

**Note:** This is just a template. Update it based on your final game requirements and security needs.

---

## Next Steps

1. **Complete Firebase setup** (steps 1-8)
2. **Skip security rules for now** (use test mode)
3. **Test connection** (step 11)
4. **Start React development** with Firebase integrated
5. **Deploy when ready** (step 12)
6. **Add security rules** before production (when requirements are final)

All set! 🚀 Firebase is free for your usage level and perfect for this game.

