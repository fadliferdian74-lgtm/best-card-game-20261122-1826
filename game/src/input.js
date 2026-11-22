// Mouse and keyboard input, translated into game intents for main.js:
// { type: 'start' | 'again' | 'end-turn' | 'play-hand', handIndex }
// { type: 'select-creature', uid } | { type: 'attack-target', target }
// { type: 'help' } | { type: 'close-help' } | { type: 'mute' }.
import { unlockAudio } from './audio.js';

export function createInput(root, onIntent) {
  function emit(intent) {
    unlockAudio();
    onIntent(intent);
  }

  root.addEventListener('click', (event) => {
    const target = event.target;
    const button = target.closest('button');
    if (button) {
      if (button.id === 'start-btn') return emit({ type: 'start' });
      if (button.id === 'again-btn') return emit({ type: 'again' });
      if (button.id === 'end-turn-btn') return emit({ type: 'end-turn' });
      if (button.id === 'help-btn') return emit({ type: 'help' });
      if (button.id === 'help-close-btn') return emit({ type: 'close-help' });
      if (button.id === 'mute-btn') return emit({ type: 'mute' });
      return;
    }
    const card = target.closest('.card');
    if (!card) return;
    if (card.classList.contains('card-back')) return;
    if (card.dataset.handIndex !== undefined) {
      return emit({ type: 'play-hand', handIndex: Number(card.dataset.handIndex) });
    }
    if (card.dataset.uid !== undefined) {
      return emit({ type: 'select-creature', uid: Number(card.dataset.uid) });
    }
  });

  // The hero portraits are the hero targets: clicking one attacks that hero.
  root.addEventListener('click', (event) => {
    const hero = event.target.closest('.hero');
    if (!hero) return;
    const who = hero.classList.contains('foe') ? 'foe' : 'you';
    emit({ type: 'attack-target', target: { who, hero: true } });
  });

  document.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    if (event.key >= '1' && event.key <= '6') {
      emit({ type: 'play-hand', handIndex: Number(event.key) - 1 });
    } else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      emit({ type: 'end-turn' });
    } else if (event.key === 'Escape') {
      emit({ type: 'close-help' });
    }
  });
}
