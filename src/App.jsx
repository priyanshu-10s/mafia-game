import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { GameProvider } from './contexts/GameContext';
import { preloadSounds } from './utils/sounds';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import Admin from './pages/Admin';
import Restart from './pages/Restart';
import DummyUserPanel from '../test-utils/DummyUserPanel';
import './App.css';

function App() {
  useEffect(() => {
    // Preload sounds for faster playback
    preloadSounds();
  }, []);

  return (
    <AuthProvider>
      <GameProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/lobby" element={<Lobby />} />
              <Route path="/game" element={<Game />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/restart" element={<Restart />} />
              <Route path="/test" element={<DummyUserPanel />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </GameProvider>
    </AuthProvider>
  );
}

export default App;
