/**
 * Simple role encryption/decryption utility
 * 
 * This provides obfuscation to prevent casual snooping of roles
 * in network tab, console, or React DevTools.
 * 
 * NOT cryptographically secure - a determined developer could
 * reverse-engineer this. For true security, use Cloud Functions.
 */

// Salt that makes the encryption unique to this app
// Loaded from environment variable (set in .env locally, GitHub Secrets for CI/CD)
const APP_SALT = import.meta.env.VITE_APP_SALT || 'default-dev-salt';

/**
 * Generate a game-specific encryption key
 * Uses lobbyId + game start time + salt to create unique key per game
 */
function generateGameKey(lobbyId, gameStartTime) {
  const raw = `${APP_SALT}_${lobbyId}_${gameStartTime || 'default'}`;
  // Simple hash-like transformation
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `${raw}_${Math.abs(hash).toString(36)}`;
}

/**
 * Encrypt a role string
 * @param {string} role - The role to encrypt (e.g., 'mafia', 'villager')
 * @param {string} lobbyId - The lobby ID
 * @param {number} gameStartTime - The game start timestamp
 * @returns {string} Encrypted role string
 */
export function encryptRole(role, lobbyId, gameStartTime) {
  if (!role) return null;
  
  const key = generateGameKey(lobbyId, gameStartTime);
  
  // Add some random padding to make same roles look different
  const padding = Math.random().toString(36).substring(2, 6);
  const padded = `${padding}:${role}:${padding}`;
  
  // XOR encryption with the key
  let encrypted = '';
  for (let i = 0; i < padded.length; i++) {
    const charCode = padded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    encrypted += String.fromCharCode(charCode);
  }
  
  // Base64 encode to make it URL-safe and look like random data
  return btoa(encrypted)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Decrypt a role string
 * @param {string} encrypted - The encrypted role string
 * @param {string} lobbyId - The lobby ID
 * @param {number} gameStartTime - The game start timestamp
 * @returns {string} Decrypted role string
 */
export function decryptRole(encrypted, lobbyId, gameStartTime) {
  if (!encrypted) return null;
  
  // If it's already a plain role (backwards compatibility), return as-is
  const plainRoles = ['mafia', 'villager', 'detective', 'doctor'];
  if (plainRoles.includes(encrypted)) {
    return encrypted;
  }
  
  try {
    const key = generateGameKey(lobbyId, gameStartTime);
    
    // Restore Base64 padding
    let base64 = encrypted
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    
    // Base64 decode
    const decoded = atob(base64);
    
    // XOR decryption with the key
    let decrypted = '';
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      decrypted += String.fromCharCode(charCode);
    }
    
    // Extract role from padding format: "xxxx:role:xxxx"
    const parts = decrypted.split(':');
    if (parts.length >= 3) {
      return parts[1];
    }
    
    return decrypted;
  } catch (error) {
    console.warn('Role decryption failed, returning as-is:', error.message);
    return encrypted;
  }
}

/**
 * Encrypt all player roles in a players object
 * @param {Object} players - Players object with roles
 * @param {string} lobbyId - The lobby ID
 * @param {number} gameStartTime - The game start timestamp
 * @returns {Object} Players object with encrypted roles
 */
export function encryptPlayerRoles(players, lobbyId, gameStartTime) {
  const encrypted = {};
  Object.keys(players).forEach(uid => {
    encrypted[uid] = {
      ...players[uid],
      role: players[uid].role 
        ? encryptRole(players[uid].role, lobbyId, gameStartTime)
        : null
    };
  });
  return encrypted;
}

/**
 * Decrypt a player's role
 * @param {Object} player - Player object with encrypted role
 * @param {string} lobbyId - The lobby ID
 * @param {number} gameStartTime - The game start timestamp
 * @returns {string} Decrypted role
 */
export function decryptPlayerRole(player, lobbyId, gameStartTime) {
  if (!player?.role) return null;
  return decryptRole(player.role, lobbyId, gameStartTime);
}

