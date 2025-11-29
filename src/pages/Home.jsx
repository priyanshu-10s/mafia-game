import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import './Home.css';

function Home() {
  const { user, signInWithGoogle, loading: authLoading } = useAuth();
  const { lobbyId, game, player, clearLobby } = useGame();
  const navigate = useNavigate();
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  useEffect(() => {
    if (user && !authLoading) {
      // If user already has a lobby selected and is in a game
      if (lobbyId && player) {
        if (game?.status === 'playing' || game?.status === 'ended') {
          navigate('/game');
        } else {
          navigate('/lobby');
        }
      } else if (lobbyId && !player) {
        // Has lobby but not in game - clear and go to selection
        clearLobby();
        navigate('/select-lobby');
      } else {
        // No lobby selected - go to lobby selection
        navigate('/select-lobby');
      }
    }
  }, [user, authLoading, lobbyId, game, player, navigate, clearLobby]);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  if (authLoading) {
    return (
      <div className="home-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container">
      <div className="home-content">
        <h1 className="home-title">🎭 Mafia Game</h1>
        <p className="home-subtitle">A game of deception</p>

        {!user && (
          <>
            <button className="btn-primary" onClick={handleSignIn}>
              🔐 Sign in with Google
            </button>
            <button className="btn-secondary" onClick={() => setShowHowToPlay(true)}>
              How to Play
            </button>
          </>
        )}

        <div className="version">v2.0.0 - Multi-Lobby</div>
      </div>

      {showHowToPlay && (
        <div className="modal-overlay" onClick={() => setShowHowToPlay(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>How to Play</h2>
            <div className="how-to-play-content">
              <h3>Objective</h3>
              <p><strong>Mafia:</strong> Eliminate all villagers</p>
              <p><strong>Villagers:</strong> Eliminate all mafia</p>

              <h3>Roles</h3>
              <ul>
                <li><strong>Mafia:</strong> Know each other, eliminate one player each night</li>
                <li><strong>Detective:</strong> Investigate one player each night to learn their role</li>
                <li><strong>Doctor:</strong> Save one player each night from elimination</li>
                <li><strong>Villagers:</strong> No special abilities, vote during day</li>
              </ul>

              <h3>Game Flow</h3>
              <ol>
                <li>Choose a lobby to join</li>
                <li>Wait for host to start the game</li>
                <li>Roles are assigned secretly</li>
                <li><strong>Night Phase:</strong> Special roles act</li>
                <li><strong>Day Phase:</strong> Discussion and voting</li>
                <li>Repeat until one team wins</li>
              </ol>
            </div>
            <button className="btn-primary" onClick={() => setShowHowToPlay(false)}>
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
