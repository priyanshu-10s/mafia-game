import { useEffect, useRef } from 'react';
import { useGame } from '../contexts/GameContext';
import { processGamePhase } from '../utils/gameProcessor';
import { getServerTime } from '../utils/serverTime';

export function useGamePhaseProcessor() {
  const { game, lobbyId } = useGame();
  const timerRef = useRef(null);

  useEffect(() => {
    // Don't process if no game, not playing, or game ended
    if (!game || !lobbyId || game.status === 'lobby' || game.status === 'ended') {
      return;
    }

    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Get the phase end time
    const endTime = game.phase === 'night' ? game.nightEndTime : game.dayEndTime;
    if (!endTime) return;

    const now = getServerTime();
    const msUntilEnd = endTime - now;

    if (msUntilEnd <= 0) {
      // Timer already expired, process immediately
      processGamePhase(lobbyId);
    } else {
      // Schedule processing for when timer expires (+ 500ms buffer for network latency)
      timerRef.current = setTimeout(() => {
        processGamePhase(lobbyId);
      }, msUntilEnd + 500);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [game?.phase, game?.nightEndTime, game?.dayEndTime, game?.status, lobbyId]);
}
