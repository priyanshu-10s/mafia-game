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
    
    if (allActed || (game.nightEndTime && Date.now() > game.nightEndTime)) {
      const { killedId } = processNightPhase(game);
      const players = { ...game.players };
      
      if (killedId && players[killedId]) {
        players[killedId] = { ...players[killedId], isAlive: false };
      }

      const winner = checkWinCondition({ ...game, players });
      
      if (winner) {
        await updateDoc(gameRef, {
          status: 'ended',
          winner,
          players,
          phase: 'ended'
        });
        return;
      }

      await updateDoc(gameRef, {
        phase: 'day',
        players,
        actions: {},
        votes: {},
        dayStartTime: Date.now()
      });
    }
  } else if (game.phase === 'day') {
    const allVoted = shouldEndPhaseEarly(game, 'day');
    
    if (allVoted || (game.dayEndTime && Date.now() > game.dayEndTime)) {
      const eliminatedId = processDayPhase(game);
      const players = { ...game.players };
      
      if (eliminatedId && players[eliminatedId]) {
        players[eliminatedId] = { ...players[eliminatedId], isAlive: false };
      }

      const winner = checkWinCondition({ ...game, players });
      
      if (winner) {
        await updateDoc(gameRef, {
          status: 'ended',
          winner,
          players,
          phase: 'ended'
        });
        return;
      }

      await updateDoc(gameRef, {
        phase: 'night',
        round: (game.round || 1) + 1,
        players,
        actions: {},
        votes: {},
        nightStartTime: Date.now()
      });
    }
  }
}

export function startPhaseTimer(game) {
  if (game.phase === 'night' && game.settings?.nightTimer) {
    const nightEndTime = Date.now() + (game.settings.nightTimer * 60 * 1000);
    return { nightEndTime };
  }
  
  if (game.phase === 'day' && game.settings?.dayTimer) {
    const dayEndTime = Date.now() + (game.settings.dayTimer * 60 * 1000);
    return { dayEndTime };
  }
  
  return {};
}

