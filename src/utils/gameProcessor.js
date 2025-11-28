import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { processNightPhase, processDayPhase, checkWinCondition, shouldEndPhaseEarly } from './gameLogic';

const GAME_ID = 'current_game';

export async function processGamePhase() {
  const gameRef = doc(db, 'games', GAME_ID);
  const gameSnap = await getDoc(gameRef);

  if (!gameSnap.exists()) return;

  const game = gameSnap.data();
  
  if (game.status === 'ended' || game.status === 'lobby') return;

  const alivePlayers = Object.values(game.players).filter(p => p.isAlive);
  
  if (alivePlayers.length === 0) {
    await updateDoc(gameRef, {
      status: 'ended',
      winner: 'none'
    });
    return;
  }

  if (game.phase === 'night') {
    const allActed = shouldEndPhaseEarly(game, 'night');
    const timerExpired = game.nightEndTime && Date.now() > game.nightEndTime;
    
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
        await updateDoc(gameRef, {
          status: 'ended',
          winner,
          players,
          phase: 'ended',
          lastKilledId: killedId
        });
        return;
      }

      const dayEndTime = Date.now() + ((game.settings?.dayTimer || 5) * 60 * 1000);

      await updateDoc(gameRef, {
        phase: 'day',
        players,
        lastActions: game.actions,
        actions: {},
        votes: {},
        dayStartTime: Date.now(),
        dayEndTime,
        lastKilledId: killedId
      });
    }
  } else if (game.phase === 'day') {
    const allVoted = shouldEndPhaseEarly(game, 'day');
    const timerExpired = game.dayEndTime && Date.now() > game.dayEndTime;
    
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
        await updateDoc(gameRef, {
          status: 'ended',
          winner,
          players,
          phase: 'ended',
          lastEliminatedId: eliminatedId
        });
        return;
      }

      const nightEndTime = Date.now() + ((game.settings?.nightTimer || 1) * 60 * 1000);

      await updateDoc(gameRef, {
        phase: 'night',
        round: (game.round || 1) + 1,
        players,
        actions: {},
        lastVotes: game.votes,
        votes: {},
        nightStartTime: Date.now(),
        nightEndTime,
        lastEliminatedId: eliminatedId
      });
    }
  }
}
