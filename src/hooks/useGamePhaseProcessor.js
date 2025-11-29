import { useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { processGamePhase } from '../utils/gameProcessor';

export function useGamePhaseProcessor() {
  const { game, lobbyId } = useGame();

  useEffect(() => {
    if (!game || !lobbyId || game.status === 'lobby' || game.status === 'ended') {
      return;
    }

    const interval = setInterval(() => {
      processGamePhase(lobbyId);
    }, 2000);

    return () => clearInterval(interval);
  }, [game, lobbyId]);
}
