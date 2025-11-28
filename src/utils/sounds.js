// Sound effects for the game using Web Audio API
// This ensures sounds work without external dependencies

let audioContext = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

// Generate a tone
function playTone(frequency, duration, type = 'sine', volume = 0.3) {
  try {
    const ctx = getAudioContext();
    
    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (e) {
    console.log('Audio error:', e.message);
  }
}

// Play a chord (multiple tones)
function playChord(frequencies, duration, type = 'sine', volume = 0.2) {
  frequencies.forEach((freq, i) => {
    setTimeout(() => playTone(freq, duration, type, volume), i * 50);
  });
}

// Play a melody (sequence of tones)
function playMelody(notes, noteLength = 0.15, type = 'sine', volume = 0.3) {
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, noteLength, type, volume), i * (noteLength * 800));
  });
}

// Sound effect functions
export const sounds = {
  // Game start - ascending triumphant chord
  gameStart: () => {
    playChord([262, 330, 392, 523], 0.8, 'triangle', 0.25);
  },
  
  // Night - low mysterious tones
  night: () => {
    playMelody([196, 175, 165], 0.4, 'sine', 0.2);
    setTimeout(() => playTone(98, 1.5, 'sine', 0.15), 200);
  },
  
  // Day - bright ascending tones (like birds chirping)
  day: () => {
    playMelody([523, 659, 784, 880], 0.12, 'sine', 0.2);
    setTimeout(() => playMelody([587, 740, 880], 0.1, 'sine', 0.15), 400);
  },
  
  // Game end - victory fanfare
  gameEnd: () => {
    playMelody([392, 392, 392, 523], 0.2, 'triangle', 0.25);
    setTimeout(() => playChord([523, 659, 784], 0.6, 'triangle', 0.2), 700);
  },
  
  // Death - dramatic low tone
  death: () => {
    playTone(147, 0.5, 'sawtooth', 0.2);
    setTimeout(() => playTone(131, 0.8, 'sawtooth', 0.15), 200);
  }
};

// Preload - just initialize audio context on user interaction
export function preloadSounds() {
  // Audio context will be created on first sound play
  // This is just a placeholder for compatibility
  document.addEventListener('click', () => {
    try {
      getAudioContext();
    } catch (e) {}
  }, { once: true });
}

export default sounds;
