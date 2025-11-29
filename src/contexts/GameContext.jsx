import { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';
import { getSelectedLobby, setSelectedLobby } from '../services/gameService';

const GameContext = createContext();

export function useGame() {
  return useContext(GameContext);
}

export function GameProvider({ children }) {
  const { user } = useAuth();
  const [game, setGame] = useState(null);
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lobbyId, setLobbyIdState] = useState(getSelectedLobby());

  // Function to change lobby
  const selectLobby = (newLobbyId) => {
    setSelectedLobby(newLobbyId);
    setLobbyIdState(newLobbyId);
  };

  // Function to clear lobby selection
  const clearLobby = () => {
    setSelectedLobby(null);
    setLobbyIdState(null);
    setGame(null);
    setPlayer(null);
  };

  useEffect(() => {
    if (!user) {
      setGame(null);
      setPlayer(null);
      setLoading(false);
      return;
    }

    if (!db) {
      console.warn('Firebase not initialized');
      setLoading(false);
      return;
    }

    if (!lobbyId) {
      setGame(null);
      setPlayer(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const gameRef = doc(db, 'games', lobbyId);
    const unsubscribe = onSnapshot(gameRef, (snapshot) => {
      if (!snapshot.exists()) {
        setGame(null);
        setPlayer(null);
        setLoading(false);
        return;
      }

      const gameData = { id: snapshot.id, lobbyId, ...snapshot.data() };
      setGame(gameData);

      if (gameData.players && user.uid in gameData.players) {
        setPlayer(gameData.players[user.uid]);
      } else {
        setPlayer(null);
      }

      setLoading(false);
    }, (error) => {
      console.error('Game subscription error:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, [user, lobbyId]);

  const value = {
    game,
    player,
    loading,
    lobbyId,
    selectLobby,
    clearLobby,
    isHost: game?.hostId === user?.uid,
    isInGame: !!player
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
