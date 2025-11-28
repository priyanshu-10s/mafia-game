import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { useGamePhaseProcessor } from '../hooks/useGamePhaseProcessor';
import NightPhase from '../components/NightPhase';
import DayPhase from '../components/DayPhase';
import RoleReveal from '../components/RoleReveal';
import GameEnd from '../components/GameEnd';
import './Game.css';

function Game() {
  const { user } = useAuth();
  const { game, player, loading } = useGame();
  const navigate = useNavigate();
  
  useGamePhaseProcessor();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (game?.status === 'lobby') {
      navigate('/lobby');
    }
  }, [game, navigate]);

  if (loading) {
    return (
      <div className="game-container">
        <div className="loading-state">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (!game || !player) {
    return (
      <div className="game-container">
        <p>No game found. Redirecting...</p>
      </div>
    );
  }

  if (game.status === 'ended') {
    return <GameEnd game={game} player={player} />;
  }

  if (!player.role && game.status !== 'lobby') {
    return <RoleReveal game={game} player={player} />;
  }

  if (game.phase === 'night') {
    return <NightPhase game={game} player={player} />;
  }

  if (game.phase === 'day') {
    return <DayPhase game={game} player={player} />;
  }

  return (
    <div className="game-container">
      <div className="loading-state">
        <p>Loading game...</p>
      </div>
    </div>
  );
}

export default Game;

