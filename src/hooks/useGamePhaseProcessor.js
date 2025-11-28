import { useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { processGamePhase } from '../utils/gameProcessor';

export function useGamePhaseProcessor() {
  const { game } = useGame();

  useEffect(() => {
    if (!game || game.status === 'lobby' || game.status === 'ended') {
      return;
    }

    const interval = setInterval(() => {
      processGamePhase();
    }, 2000);

    return () => clearInterval(interval);
  }, [game]);
}

