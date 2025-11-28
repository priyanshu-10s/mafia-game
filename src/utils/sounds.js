// Sound effects for the game
// Using free sound URLs - replace with your own if needed

const SOUNDS = {
  gameStart: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  night: 'https://assets.mixkit.co/active_storage/sfx/2515/2515-preview.mp3',
  day: 'https://assets.mixkit.co/active_storage/sfx/2513/2513-preview.mp3',
  gameEnd: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  death: 'https://assets.mixkit.co/active_storage/sfx/2658/2658-preview.mp3',
  vote: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'
};

// Audio cache to avoid re-loading
const audioCache = {};

// Preload sounds
export function preloadSounds() {
  Object.entries(SOUNDS).forEach(([key, url]) => {
    const audio = new Audio(url);
    audio.preload = 'auto';
    audio.volume = 0.5;
    audioCache[key] = audio;
  });
}

// Play a sound
export function playSound(soundName, volume = 0.5) {
  try {
    // Get from cache or create new
    let audio = audioCache[soundName];
    
    if (!audio && SOUNDS[soundName]) {
      audio = new Audio(SOUNDS[soundName]);
      audioCache[soundName] = audio;
    }
    
    if (audio) {
      // Clone to allow overlapping sounds
      const clone = audio.cloneNode();
      clone.volume = Math.min(1, Math.max(0, volume));
      clone.play().catch(err => {
        // Autoplay may be blocked - that's okay
        console.log('Sound blocked by browser:', err.message);
      });
    }
  } catch (error) {
    console.log('Sound error:', error.message);
  }
}

// Sound effect shortcuts
export const sounds = {
  gameStart: () => playSound('gameStart', 0.6),
  night: () => playSound('night', 0.4),
  day: () => playSound('day', 0.4),
  gameEnd: () => playSound('gameEnd', 0.6),
  death: () => playSound('death', 0.5),
  vote: () => playSound('vote', 0.3)
};

export default sounds;

