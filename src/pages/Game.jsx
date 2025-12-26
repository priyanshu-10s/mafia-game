import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { useGamePhaseProcessor } from '../hooks/useGamePhaseProcessor';
import { useHeartbeat } from '../hooks/useHeartbeat';
import PhaseTransition from '../components/PhaseTransition';
import RoleReveal from '../components/RoleReveal';
import NightPhase from '../components/NightPhase';
import NightResults from '../components/NightResults';
import DayPhase from '../components/DayPhase';
import DayResults from '../components/DayResults';
import DeadPlayerView from '../components/DeadPlayerView';
import DeathReveal from '../components/DeathReveal';
import GameEnd from '../components/GameEnd';
import './Game.css';

function Game() {
  const { user } = useAuth();
  const { game, player, loading } = useGame();
  const navigate = useNavigate();
  const [showRoleReveal, setShowRoleReveal] = useState(true);
  const [showTransition, setShowTransition] = useState(false);
  const [showNightResults, setShowNightResults] = useState(false);
  const [showDayResults, setShowDayResults] = useState(false);
  const [showDeathReveal, setShowDeathReveal] = useState(false);
  const [deathCause, setDeathCause] = useState(null);
  const [lastPhase, setLastPhase] = useState(null);
  const [lastRound, setLastRound] = useState(null);
  const wasAliveRef = useRef(true);
  
  useGamePhaseProcessor();
  
  // Send heartbeat to track activity
  useHeartbeat();

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

  useEffect(() => {
    if (!loading && (!game || !player)) {
      const timer = setTimeout(() => {
        navigate('/');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [loading, game, player, navigate]);

  useEffect(() => {
    if (!game) return;
    
    if (lastPhase === 'night' && game.phase === 'day') {
      setShowNightResults(true);
      setShowTransition(false);
    } else if (lastPhase === 'day' && game.phase === 'night') {
      if (game.round !== lastRound) {
        setShowDayResults(true);
        setShowTransition(false);
      }
    } else if (lastPhase && game.phase !== lastPhase) {
      setShowTransition(true);
    }
    
    setLastPhase(game.phase);
    setLastRound(game.round);
  }, [game?.phase, game?.round, lastPhase, lastRound]);

  // Detect when player just died
  useEffect(() => {
    if (!player) return;
    
    // Check if player was alive before and is now dead
    if (wasAliveRef.current && !player.isAlive && !player.isSpectator) {
      // Determine cause of death
      if (game?.lastKilledId === user?.uid) {
        setDeathCause('mafia');
      } else if (game?.lastEliminatedId === user?.uid) {
        setDeathCause('vote');
      } else if (player.eliminatedReason === 'inactive') {
        setDeathCause('inactive');
      } else {
        setDeathCause('unknown');
      }
      setShowDeathReveal(true);
    }
    
    wasAliveRef.current = player.isAlive;
  }, [player?.isAlive, player?.isSpectator, player?.eliminatedReason, game?.lastKilledId, game?.lastEliminatedId, user?.uid]);

  if (loading) {
    return (
      <div className="game-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading game...</p>
        </div>
      </div>
    );
  }

  if (!game || !player) {
    return (
      <div className="game-container">
        <div className="loading-state">
          <p>No game found. Redirecting...</p>
        </div>
      </div>
    );
  }

  if (game.status === 'ended') {
    return <GameEnd game={game} player={player} />;
  }

  if (!player.isAlive) {
    // Show death reveal first if player just died
    if (showDeathReveal) {
      return (
        <DeathReveal 
          player={player}
          game={game}
          eliminatedBy={deathCause}
          onContinue={() => setShowDeathReveal(false)}
        />
      );
    }
    return <DeadPlayerView game={game} player={player} />;
  }

  if (showRoleReveal && player.role) {
    return (
      <RoleReveal 
        game={game} 
        player={player} 
        onContinue={() => setShowRoleReveal(false)} 
      />
    );
  }

  if (showTransition) {
    return (
      <PhaseTransition 
        phase={game.phase} 
        onComplete={() => setShowTransition(false)} 
      />
    );
  }

  if (showNightResults && game.phase === 'day') {
    const killedPlayer = game.lastKilledId ? game.players[game.lastKilledId] : null;
    return (
      <NightResults 
        game={game} 
        killedPlayer={killedPlayer}
        onContinue={() => setShowNightResults(false)} 
      />
    );
  }

  if (showDayResults && game.phase === 'night') {
    const eliminatedPlayer = game.lastEliminatedId ? game.players[game.lastEliminatedId] : null;
    const voteBreakdown = {};
    Object.values(game.lastVotes || {}).forEach(vote => {
      if (vote.targetId) {
        voteBreakdown[vote.targetId] = (voteBreakdown[vote.targetId] || 0) + 1;
      }
    });
    
    return (
      <DayResults 
        game={game}
        eliminatedPlayer={eliminatedPlayer}
        voteBreakdown={voteBreakdown}
        onContinue={() => setShowDayResults(false)} 
      />
    );
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
        <div className="spinner"></div>
        <p>Loading game phase...</p>
      </div>
    </div>
  );
}

export default Game;
