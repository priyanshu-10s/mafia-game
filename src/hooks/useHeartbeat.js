import { useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { gameService } from '../services/gameService';

const HEARTBEAT_INTERVAL = 60 * 1000; // 60 seconds

export function useHeartbeat() {
  const { user } = useAuth();
  const { lobbyId } = useGame();

  const sendHeartbeat = useCallback(async () => {
    if (!user?.uid) return;
    
    // Only send heartbeat if tab is visible
    if (document.visibilityState === 'visible') {
      await gameService.sendHeartbeat(user.uid);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || !lobbyId) return;

    // Send initial heartbeat immediately
    sendHeartbeat();

    // Set up heartbeat interval (60 seconds)
    const heartbeatInterval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // Handle visibility change - send heartbeat when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(heartbeatInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.uid, lobbyId, sendHeartbeat]);

  return { sendHeartbeat };
}

