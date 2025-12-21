import { getDatabase, ref, onValue } from 'firebase/database';
import app from '../firebase/config';

let serverTimeOffset = 0;
let isInitialized = false;

/**
 * Initialize the server time offset listener.
 * This sets up a real-time listener that automatically updates
 * the offset whenever the connection is re-established.
 * 
 * Fails gracefully if Realtime Database is not available.
 */
export function initServerTime() {
  if (isInitialized || !app) return;
  
  try {
    const db = getDatabase(app);
    const offsetRef = ref(db, '.info/serverTimeOffset');
    
    onValue(
      offsetRef,
      (snapshot) => {
        serverTimeOffset = snapshot.val() || 0;
        console.log('⏰ Server time offset updated:', serverTimeOffset, 'ms');
      },
      (error) => {
        // Error callback - Realtime Database might not be enabled
        console.warn('⚠️ Server time sync unavailable:', error.message);
        console.warn('Using local time. Enable Realtime Database in Firebase Console for accurate timing.');
        // Continue with local time (offset stays 0)
      }
    );
    
    isInitialized = true;
  } catch (error) {
    console.warn('Could not initialize server time offset:', error.message);
    // Fallback: use local time (offset = 0)
  }
}

/**
 * Get the current server time.
 * Uses the cached offset from Firebase Realtime Database.
 * Falls back to local time if offset isn't available.
 * 
 * @returns {number} Current server timestamp in milliseconds
 */
export function getServerTime() {
  return Date.now() + serverTimeOffset;
}

/**
 * Get the current offset value (for debugging).
 * @returns {number} The offset in milliseconds
 */
export function getOffset() {
  return serverTimeOffset;
}
