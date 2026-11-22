// Decks: two copies of most cards, one of the big finishers, shuffled with the
// seeded generator. A deck is a list of card ids; a hand is a list of card ids.
import { CARDS } from './cards.js';
import { shuffle } from './random.js';

const DECKLIST = [
  'cinder-pup', 'cinder-pup', 'ash-imp', 'ash-imp', 'flame-drake', 'pyre-giant',
  'rime-sprite', 'rime-sprite', 'glacier-fox', 'frost-warden', 'frost-warden', 'ice-behemoth',
  'briar-moth', 'briar-moth', 'vine-stalker', 'thorn-maw', 'elder-bloom',
  'zephyr-kite', 'zephyr-kite', 'storm-crow', 'sky-serpent',
  'ember-bolt', 'ember-bolt', 'frost-bind', 'thorn-mend', 'gale-call', 'wild-surge',
];

/** Build one fresh shuffled deck (27 cards) from the seeded generator. */
export function buildDeck(rand) {
  return shuffle(DECKLIST, rand);
}

/** Draw the top card of `deck` into `hand` (max hand size respected by caller). */
export function drawCard(deck, hand) {
  if (deck.length === 0) return null;
  const id = deck.shift();
  hand.push(id);
  return id;
}

/** How many copies of each card the decklist holds (used by the help panel). */
export function decklistCounts() {
  const counts = new Map();
  for (const id of DECKLIST) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts.entries()].map(([id, count]) => ({ id, count, card: CARDS.find((c) => c.id === id) }));
}
