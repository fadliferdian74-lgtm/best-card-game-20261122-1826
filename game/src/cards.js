// The card catalogue: every card in Ember Sigils, with its own name, cost, sigil
// and effect. All names, art (drawn shapes) and flavour are original to this game.
// A card is { id, name, kind, sigil, cost, attack, health, keyword, text }.
// kind is 'creature' or 'spell'. Spells carry `effect` instead of attack/health.
export const CARDS = [
  // Ember creatures — aggressive, rush.
  { id: 'cinder-pup', name: 'Cinder Pup', kind: 'creature', sigil: 'ember', cost: 1, attack: 2, health: 1, keyword: 'rush', text: 'A spark that bites before it is seen.' },
  { id: 'ash-imp', name: 'Ash Imp', kind: 'creature', sigil: 'ember', cost: 2, attack: 3, health: 2, keyword: 'rush', text: 'It laughs in the smoke it makes.' },
  { id: 'flame-drake', name: 'Flame Drake', kind: 'creature', sigil: 'ember', cost: 4, attack: 5, health: 4, keyword: 'rush', text: 'Its wings are the wildfire itself.' },
  { id: 'pyre-giant', name: 'Pyre Giant', kind: 'creature', sigil: 'ember', cost: 6, attack: 7, health: 7, keyword: null, text: 'It carries a mountain that is still burning.' },
  // Frost creatures — sturdy, ward.
  { id: 'rime-sprite', name: 'Rime Sprite', kind: 'creature', sigil: 'frost', cost: 1, attack: 1, health: 3, keyword: 'ward', text: 'Cold that answers before it is asked.' },
  { id: 'glacier-fox', name: 'Glacier Fox', kind: 'creature', sigil: 'frost', cost: 2, attack: 2, health: 4, keyword: 'ward', text: 'Its tracks freeze a day behind it.' },
  { id: 'frost-warden', name: 'Frost Warden', kind: 'creature', sigil: 'frost', cost: 3, attack: 3, health: 5, keyword: 'guard', text: 'The wall that winter built.' },
  { id: 'ice-behemoth', name: 'Ice Behemoth', kind: 'creature', sigil: 'frost', cost: 5, attack: 4, health: 8, keyword: 'guard', text: 'It has not thawed since the first snow.' },
  // Thorn creatures — leech, grind the long game.
  { id: 'briar-moth', name: 'Briar Moth', kind: 'creature', sigil: 'thorn', cost: 1, attack: 1, health: 2, keyword: 'leech', text: 'It drinks a drop and leaves a garden.' },
  { id: 'vine-stalker', name: 'Vine Stalker', kind: 'creature', sigil: 'thorn', cost: 3, attack: 4, health: 3, keyword: 'leech', text: 'Every step it takes roots behind it.' },
  { id: 'thorn-maw', name: 'Thorn Maw', kind: 'creature', sigil: 'thorn', cost: 4, attack: 4, health: 6, keyword: 'guard', text: 'A mouth that the forest grew by mistake.' },
  { id: 'elder-bloom', name: 'Elder Bloom', kind: 'creature', sigil: 'thorn', cost: 6, attack: 6, health: 8, keyword: 'leech', text: 'It blooms once a century. Today is the day.' },
  // Gale creatures — cheap, quick, flexible.
  { id: 'zephyr-kite', name: 'Zephyr Kite', kind: 'creature', sigil: 'gale', cost: 1, attack: 2, health: 2, keyword: null, text: 'It rides winds nobody else can see.' },
  { id: 'storm-crow', name: 'Storm Crow', kind: 'creature', sigil: 'gale', cost: 2, attack: 3, health: 1, keyword: 'rush', text: 'It caws, and the lightning listens.' },
  { id: 'sky-serpent', name: 'Sky Serpent', kind: 'creature', sigil: 'gale', cost: 5, attack: 6, health: 5, keyword: 'rush', text: 'A river that learned to fly.' },
  { id: 'tempest-roc', name: 'Tempest Roc', kind: 'creature', sigil: 'gale', cost: 7, attack: 8, health: 8, keyword: null, text: 'Its shadow is a storm front.' },
  // Spells — one-shot sigil magic.
  { id: 'ember-bolt', name: 'Ember Bolt', kind: 'spell', sigil: 'ember', cost: 2, effect: 'bolt', text: 'Deal 4 damage to any target.' },
  { id: 'frost-bind', name: 'Frost Bind', kind: 'spell', sigil: 'frost', cost: 2, effect: 'freeze', text: 'Deal 2 damage and freeze a creature for a turn.' },
  { id: 'thorn-mend', name: 'Thorn Mend', kind: 'spell', sigil: 'thorn', cost: 2, effect: 'heal', text: 'Restore 6 life to your hero.' },
  { id: 'gale-call', name: 'Gale Call', kind: 'spell', sigil: 'gale', cost: 3, effect: 'draw', text: 'Draw 2 cards.' },
  { id: 'wild-surge', name: 'Wild Surge', kind: 'spell', sigil: 'ember', cost: 5, effect: 'surge', text: 'Deal 6 damage to the enemy hero.' },
];

export const CARD_BY_ID = Object.fromEntries(CARDS.map((card) => [card.id, card]));

/** Look a card up by id; throws on an unknown id so a bad deck fails loudly. */
export function cardById(id) {
  const card = CARD_BY_ID[id];
  if (!card) throw new Error(`unknown card ${id}`);
  return card;
}
