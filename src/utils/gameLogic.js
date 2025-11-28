export function processNightPhase(game) {
  const alivePlayers = Object.values(game.players).filter(p => p.isAlive);
  const actions = game.actions || {};
  
  const mafiaVotes = {};
  Object.entries(actions).forEach(([uid, action]) => {
    const player = game.players[uid];
    if (player && player.isAlive && player.role === 'mafia' && action.targetId) {
      mafiaVotes[action.targetId] = (mafiaVotes[action.targetId] || 0) + 1;
    }
  });

  const targetId = Object.keys(mafiaVotes).reduce((a, b) => 
    mafiaVotes[a] > mafiaVotes[b] ? a : b, Object.keys(mafiaVotes)[0]
  );

  const doctorSave = Object.entries(actions).find(([uid, action]) => {
    const player = game.players[uid];
    return player && player.isAlive && player.role === 'doctor' && action.targetId;
  })?.[1]?.targetId;

  const killedId = targetId && doctorSave !== targetId ? targetId : null;

  return { killedId, targetId };
}

export function processDayPhase(game) {
  const votes = game.votes || {};
  const voteCounts = {};
  
  Object.values(votes).forEach(vote => {
    if (vote.targetId) {
      voteCounts[vote.targetId] = (voteCounts[vote.targetId] || 0) + 1;
    }
  });

  const eliminatedId = Object.keys(voteCounts).reduce((a, b) => 
    voteCounts[a] > voteCounts[b] ? a : b, Object.keys(voteCounts)[0]
  );

  return eliminatedId;
}

export function checkWinCondition(game) {
  const alivePlayers = Object.values(game.players).filter(p => p.isAlive);
  const aliveMafia = alivePlayers.filter(p => p.role === 'mafia');
  const aliveVillagers = alivePlayers.filter(p => p.role !== 'mafia');

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

