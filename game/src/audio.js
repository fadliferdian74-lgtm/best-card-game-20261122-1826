// Tiny synthesised sounds: no audio files ship with the game, so nothing loads
// over the network. Every sound is a short WebAudio oscillator envelope, and the
// module stays silent until the player first interacts (browsers demand that).
let context = null;
let muted = false;

/** Create the audio context on first user gesture; safe to call any time. */
export function unlockAudio() {
  try {
    if (!context) context = new (window.AudioContext || window.webkitAudioContext)();
    if (context.state === 'suspended') void context.resume();
  } catch {
    context = null;
  }
}

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

function tone(frequency, duration, type, gainValue, when = 0) {
  if (!context || muted) return;
  try {
    const now = context.currentTime + when;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.05);
  } catch {
    // Audio is decoration; a failure never breaks the game.
  }
}

export const sfx = {
  play() { tone(520, 0.12, 'triangle', 0.12); tone(780, 0.16, 'triangle', 0.08, 0.05); },
  attack() { tone(180, 0.14, 'sawtooth', 0.1); tone(90, 0.18, 'square', 0.07, 0.03); },
  damage() { tone(140, 0.2, 'sawtooth', 0.12); },
  heal() { tone(660, 0.18, 'sine', 0.09); tone(880, 0.22, 'sine', 0.07, 0.08); },
  turn() { tone(440, 0.09, 'triangle', 0.08); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'triangle', 0.11, i * 0.11)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.32, 'triangle', 0.1, i * 0.13)); },
  error() { tone(110, 0.12, 'square', 0.07); },
};
