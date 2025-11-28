import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { gameService } from '../services/gameService';
import './GameEnd.css';

function GameEnd({ game, player }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const winner = game.winner || 'unknown';
  const isWinner = (player.role === 'mafia' && winner === 'mafia') ||
                   (player.role !== 'mafia' && winner === 'villagers');

  const handleLeave = async () => {
    try {
      await gameService.leaveGame(user.uid);
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Leave error:', error);
    }
  };

  return (
    <div className="game-end-container">
      <div className="game-end-content">
        <div className={`winner-banner ${isWinner ? 'winner' : 'loser'}`}>
          <h1>{isWinner ? '🎉 Victory!' : '💀 Defeat'}</h1>
          <h2>{winner === 'mafia' ? 'Mafia Wins!' : 'Villagers Win!'}</h2>
        </div>

        <div className="your-role">
          <p>Your role was:</p>
          <div className="role-badge" style={{ 
            backgroundColor: player.role === 'mafia' ? '#EF4444' : '#3B82F6' 
          }}>
            {player.role === 'mafia' ? '🔫 Mafia' : 
             player.role === 'detective' ? '🔍 Detective' :
             player.role === 'doctor' ? '💉 Doctor' : '👤 Villager'}
          </div>
        </div>

        <button className="btn-leave" onClick={handleLeave}>
          Return to Home
        </button>
      </div>
    </div>
  );
}

export default GameEnd;

