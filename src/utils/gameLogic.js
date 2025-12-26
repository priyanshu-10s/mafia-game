import { decryptRole } from './encryption';

/**
 * Helper to get decrypted role for a player
 */
function getRole(player, lobbyId, gameStartTime) {
  if (!player?.role) return null;
  return decryptRole(player.role, lobbyId, gameStartTime);
}

export function processNightPhase(game) {
  const actions = game.actions || {};
  const lobbyId = game.lobbyId;
  const gameStartTime = game.gameStartTime;
  
  const mafiaVotes = {};
  Object.entries(actions).forEach(([uid, action]) => {
    const player = game.players[uid];
    const role = getRole(player, lobbyId, gameStartTime);
    if (player && player.isAlive && role === 'mafia' && action.targetId && action.targetId !== 'skip') {
      mafiaVotes[action.targetId] = (mafiaVotes[action.targetId] || 0) + 1;
    }
  });

  const targetId = Object.keys(mafiaVotes).length > 0 
    ? Object.keys(mafiaVotes).reduce((a, b) => mafiaVotes[a] > mafiaVotes[b] ? a : b)
    : null;

  const doctorSave = Object.entries(actions).find(([uid, action]) => {
    const player = game.players[uid];
    const role = getRole(player, lobbyId, gameStartTime);
    return player && player.isAlive && role === 'doctor' && action.targetId && action.targetId !== 'skip';
  })?.[1]?.targetId;

  const killedId = targetId && doctorSave !== targetId ? targetId : null;

  return { killedId, targetId };
}

export function processDayPhase(game) {
  const votes = game.votes || {};
  const voteCounts = {};
  
  Object.values(votes).forEach(vote => {
    if (vote.targetId && vote.targetId !== 'skip') {
      voteCounts[vote.targetId] = (voteCounts[vote.targetId] || 0) + 1;
    }
  });

  if (Object.keys(voteCounts).length === 0) {
    return null;
  }

  // Find the maximum vote count
  const maxVotes = Math.max(...Object.values(voteCounts));
  
  // Find all players with the max votes
  const playersWithMaxVotes = Object.keys(voteCounts).filter(
    id => voteCounts[id] === maxVotes
  );
  
  // If there's a tie (more than one player with max votes), no one is eliminated
  if (playersWithMaxVotes.length > 1) {
    return null;
  }

  return playersWithMaxVotes[0];
}

export function checkWinCondition(game) {
  const lobbyId = game.lobbyId;
  const gameStartTime = game.gameStartTime;
  
  const alivePlayers = Object.values(game.players).filter(p => p.isAlive);
  const aliveMafia = alivePlayers.filter(p => getRole(p, lobbyId, gameStartTime) === 'mafia');
  const aliveVillagers = alivePlayers.filter(p => getRole(p, lobbyId, gameStartTime) !== 'mafia');

  if (aliveMafia.length === 0) {
    return 'villagers';
  }

  if (aliveMafia.length >= aliveVillagers.length) {
    return 'mafia';
  }

  return null;
}

export function shouldEndPhaseEarly(game, phase) {
  const alivePlayers = Object.values(game.players).filter(p => p.isAlive);
  
  if (phase === 'night') {
    const actions = game.actions || {};
    const allActed = alivePlayers.every(p => actions[p.uid]);
    return allActed;
  }

  if (phase === 'day') {
    const votes = game.votes || {};
    const allVoted = alivePlayers.every(p => votes[p.uid]);
    return allVoted;
  }

  return false;
}

/**
 * Get the decrypted role for a specific player
 * Exported for use in components
 */
export function getPlayerRole(player, game) {
  if (!player?.role || !game) return null;
  return decryptRole(player.role, game.lobbyId, game.gameStartTime);
}
