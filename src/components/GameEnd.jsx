import { useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { gameService } from '../services/gameService';
import { getPlayerRole } from '../utils/gameLogic';
import sounds from '../utils/sounds';
import './GameEnd.css';

function GameEnd({ game, player }) {
  const { user, logout } = useAuth();
  const { isHost, lobbyId, clearLobby } = useGame();
  const navigate = useNavigate();
  const soundPlayed = useRef(false);

  const winner = game.winner || 'unknown';

  useEffect(() => {
    if (!soundPlayed.current) {
      sounds.gameEnd();
      soundPlayed.current = true;
    }
  }, []);

  // Decrypt player's role
  const myRole = useMemo(() => getPlayerRole(player, game), [player, game]);
  
  const isWinner = (myRole === 'mafia' && winner === 'mafia') ||
                   (myRole !== 'mafia' && winner === 'villagers');

  // Decrypt all player roles for the reveal
  const allPlayers = useMemo(() => {
    return Object.values(game.players || {})
      .map(p => ({ ...p, decryptedRole: getPlayerRole(p, game) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [game]);

  const mafiaPlayers = allPlayers.filter(p => p.decryptedRole === 'mafia');
  const detectivePlayers = allPlayers.filter(p => p.decryptedRole === 'detective');
  const doctorPlayers = allPlayers.filter(p => p.decryptedRole === 'doctor');
  const villagerPlayers = allPlayers.filter(p => p.decryptedRole === 'villager');

  const handlePlayAgain = async () => {
    try {
      await gameService.resetGame(user.uid, lobbyId);
      navigate('/lobby');
    } catch (error) {
      alert(error.message || 'Failed to reset game');
    }
  };

  const handleChangeLobby = async () => {
    try {
      await gameService.leaveGame(user.uid, lobbyId);
      clearLobby();
      navigate('/select-lobby');
    } catch (error) {
      console.error('Leave error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await gameService.leaveGame(user.uid, lobbyId);
      clearLobby();
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
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
          <span className="your-role">You were {myRole}</span>
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

        <div className="end-actions">
          <button className="btn-change-lobby" onClick={handleChangeLobby}>
            Change Lobby
          </button>
          <button className="btn-leave" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

export default GameEnd;
