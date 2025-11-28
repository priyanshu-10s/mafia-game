# 🎭 Mafia Game

A multiplayer Mafia game for friends, built with React, Node.js, and Firebase.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Firebase account

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` with your Firebase configuration (see Firebase Setup Guide)

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

## 📚 Documentation

- **Design Docs**: See `design-docs/` folder (gitignored)
- **Firebase Setup**: See `design-docs/FIREBASE_SETUP.md`

## 🛠️ Tech Stack

- **Frontend**: React + Vite
- **Backend**: Firebase (Firestore + Auth + Hosting)
- **Styling**: CSS (can add Tailwind later)

## 📝 Environment Variables

Create `.env` file with your Firebase config:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_ADMIN_PASSWORD`

## 🎮 Features

- Google Sign-In authentication
- Real-time game state updates
- Mobile-first responsive design
- Role-based gameplay (Mafia, Detective, Doctor, Villagers)

## 📦 Project Structure

```
mafia-game-project/
├── src/
│   ├── components/      # React components
│   ├── pages/          # Page components
│   ├── firebase/       # Firebase configuration
│   ├── utils/          # Utility functions
│   ├── App.jsx         # Main app component
│   └── main.jsx        # Entry point
├── design-docs/        # Design documentation (gitignored)
├── .env                # Environment variables (gitignored)
└── package.json        # Dependencies
```

## 🔥 Firebase Setup

See `design-docs/FIREBASE_SETUP.md` for complete Firebase setup instructions.

## 📄 License

Private project - for friends only!

