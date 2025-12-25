import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase/config';
import { processNightPhase, processDayPhase, checkWinCondition, shouldEndPhaseEarly } from './gameLogic';
import { getSelectedLobby } from '../services/gameService';
import { getServerTime } from './serverTime';

export async function processGamePhase(lobbyId) {
  // Use provided lobbyId or fall back to selected lobby
  if (!lobbyId) lobbyId = getSelectedLobby();
  if (!lobbyId) return;

  const gameRef = doc(db, 'games', lobbyId);

  try {
    await runTransaction(db, async (transaction) => {
      const gameSnap = await transaction.get(gameRef);

      if (!gameSnap.exists()) return;

      const game = gameSnap.data();
      
      if (game.status === 'ended' || game.status === 'lobby') return;

      const alivePlayers = Object.values(game.players).filter(p => p.isAlive);
      
      if (alivePlayers.length === 0) {
        transaction.update(gameRef, {
          status: 'ended',
          winner: 'none'
        });
        return;
      }

      if (game.phase === 'night') {
        const allActed = shouldEndPhaseEarly(game, 'night');
        const timerExpired = game.nightEndTime && getServerTime() > game.nightEndTime;
        
        if (allActed || timerExpired) {
          const { killedId } = processNightPhase(game);
          const players = { ...game.players };
          
          if (killedId && players[killedId]) {
            players[killedId] = { 
              ...players[killedId], 
              isAlive: false,
              eliminatedRound: game.round
            };
          }

          const winner = checkWinCondition({ ...game, players });
          
          if (winner) {
            transaction.update(gameRef, {
              status: 'ended',
              winner,
              players,
              phase: 'ended',
              lastKilledId: killedId
            });
            return;
          }

          const dayEndTime = getServerTime() + ((game.settings?.dayTimer || 5) * 60 * 1000);

          transaction.update(gameRef, {
            phase: 'day',
            players,
            lastActions: game.actions,
            actions: {},
            votes: {},
            dayStartTime: getServerTime(),
            dayEndTime,
            lastKilledId: killedId
          });
        }
      } else if (game.phase === 'day') {
        const allVoted = shouldEndPhaseEarly(game, 'day');
        const timerExpired = game.dayEndTime && getServerTime() > game.dayEndTime;
        
        if (allVoted || timerExpired) {
          const eliminatedId = processDayPhase(game);
          const players = { ...game.players };
          
          if (eliminatedId && players[eliminatedId]) {
            players[eliminatedId] = { 
              ...players[eliminatedId], 
              isAlive: false,
              eliminatedRound: game.round
            };
          }

          const winner = checkWinCondition({ ...game, players });
          
          if (winner) {
            transaction.update(gameRef, {
              status: 'ended',
              winner,
              players,
              phase: 'ended',
              lastEliminatedId: eliminatedId
            });
            return;
          }

          const nightEndTime = getServerTime() + ((game.settings?.nightTimer || 1) * 60 * 1000);

          transaction.update(gameRef, {
            phase: 'night',
            round: (game.round || 1) + 1,
            players,
            actions: {},
            lastVotes: game.votes,
            votes: {},
            nightStartTime: getServerTime(),
            nightEndTime,
            lastEliminatedId: eliminatedId
          });
        }
      }
    });
  } catch (error) {
    // Transaction failed - likely due to concurrent modification
    // This is expected when multiple clients try to process the phase simultaneously
    // The first one to complete will succeed, others will fail and that's OK
    // Only log in development, and only if it's not an expected contention error
    if (import.meta.env.DEV && error.code !== 'failed-precondition') {
      console.log('Phase processing error:', error.message);
    }
  }
}
