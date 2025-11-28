import { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';

const GameContext = createContext();
const GAME_ID = 'current_game';

export function useGame() {
  return useContext(GameContext);
}

export function GameProvider({ children }) {
  const { user } = useAuth();
  const [game, setGame] = useState(null);
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setGame(null);
      setPlayer(null);
      setLoading(false);
      return;
    }

    const gameRef = doc(db, 'games', GAME_ID);
    const unsubscribe = onSnapshot(gameRef, async (snapshot) => {
      if (!snapshot.exists()) {
        setGame(null);
        setPlayer(null);
        setLoading(false);
        return;
      }

      const gameData = { id: snapshot.id, ...snapshot.data() };
      setGame(gameData);

      if (gameData.players && user.uid in gameData.players) {
        setPlayer(gameData.players[user.uid]);
      } else {
        setPlayer(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const value = {
    game,
    player,
    loading,
    isHost: game?.hostId === user?.uid,
    isInGame: !!player
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

