import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { gameService } from '../services/gameService';
import './GameEnd.css';

function GameEnd({ game, player }) {
  const { user, logout } = useAuth();
  const { isHost } = useGame();
  const navigate = useNavigate();

  const winner = game.winner || 'unknown';
  const isWinner = (player.role === 'mafia' && winner === 'mafia') ||
                   (player.role !== 'mafia' && winner === 'villagers');

  const allPlayers = Object.values(game.players || {});
  const mafiaPlayers = allPlayers.filter(p => p.role === 'mafia');
  const detectivePlayers = allPlayers.filter(p => p.role === 'detective');
  const doctorPlayers = allPlayers.filter(p => p.role === 'doctor');
  const villagerPlayers = allPlayers.filter(p => p.role === 'villager');

  const handlePlayAgain = async () => {
    try {
      await gameService.resetGame(user.uid);
      navigate('/lobby');
    } catch (error) {
      alert(error.message || 'Failed to reset game');
    }
  };

  const handleLeave = async () => {
    try {
      await gameService.leaveGame(user.uid);
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Leave error:', error);
    }
  };

  const renderPlayerList = (players, emoji) => {
    return players.map(p => (
      <div key={p.uid} className={`player-entry ${!p.isAlive ? 'eliminated' : ''}`}>
        <span className="player-color" style={{ backgroundColor: p.color }} />
        <span className="player-name">{p.name}</span>
        {p.uid === user.uid && <span className="you-tag">You</span>}
        {!p.isAlive && <span className="eliminated-tag">(eliminated)</span>}
      </div>
    ));
  };

  return (
    <div className="game-end-container">
      <div className="game-end-content">
        <h1 className="game-over-title">🎉 Game Over! 🎉</h1>
        
        <div className={`winner-banner ${isWinner ? 'winner' : 'loser'}`}>
          <h2>{winner === 'mafia' ? '😈 Mafia Wins!' : '👥 Villagers Win!'}</h2>
          <p>
            {winner === 'mafia' 
              ? 'Mafia equals or outnumbers the villagers!' 
              : 'All Mafia have been eliminated!'}
          </p>
        </div>

        <div className={`your-result ${isWinner ? 'victory' : 'defeat'}`}>
          <span>{isWinner ? '🎉 Victory!' : '💀 Defeat'}</span>
          <span className="your-role">You were {player.role}</span>
        </div>

        <div className="final-roles">
          <h3>Final Roles:</h3>
          
          <div className="role-section">
            <div className="role-header mafia">😈 Mafia</div>
            {renderPlayerList(mafiaPlayers, '😈')}
          </div>

          {detectivePlayers.length > 0 && (
            <div className="role-section">
              <div className="role-header detective">🔍 Detective</div>
              {renderPlayerList(detectivePlayers, '🔍')}
            </div>
          )}

          {doctorPlayers.length > 0 && (
            <div className="role-section">
              <div className="role-header doctor">💉 Doctor</div>
              {renderPlayerList(doctorPlayers, '💉')}
            </div>
          )}

          <div className="role-section">
            <div className="role-header villager">👤 Villagers</div>
            {renderPlayerList(villagerPlayers, '👤')}
          </div>
        </div>

        <div className="game-stats">
          <p>Rounds Played: {game.round || 1}</p>
        </div>

        {isHost && (
          <button className="btn-play-again" onClick={handlePlayAgain}>
            Play Again
          </button>
        )}

        <button className="btn-leave" onClick={handleLeave}>
          Back to Home
        </button>
      </div>
    </div>
  );
}

export default GameEnd;

