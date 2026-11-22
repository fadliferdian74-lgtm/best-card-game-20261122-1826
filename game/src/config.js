// Every tuning number and colour in one place. Ember Sigils is a turn-based card
// duel: two heroes at 30 life, ember (mana) that grows one a turn to a max of 10,
// hands of cards played onto a shared table. Nothing here depends on screen size.
export const START_LIFE = 30;
export const START_HAND = 4;
export const MAX_HAND = 8;
export const MAX_EMBER = 10;
export const MAX_TABLE = 6;
export const DECK_SIZE = 27;

// The four sigils: each has a colour AND a shape, so a card's suit is told apart
// by colour and shape, never by text alone.
export const SIGILS = {
  ember: { name: 'Ember', glyph: '▲', colour: '#e8590c', soft: '#ffd8a8' },
  frost: { name: 'Frost', glyph: '◆', colour: '#339af0', soft: '#a5d8ff' },
  thorn: { name: 'Thorn', glyph: '✚', colour: '#51cf66', soft: '#b2f2bb' },
  gale: { name: 'Gale', glyph: '★', colour: '#fab005', soft: '#ffec99' },
};

// Keywords a creature can carry. One line each on the card, in plain words.
export const KEYWORDS = {
  rush: 'RUSH — attacks the turn it is played',
  ward: 'WARD — ignores the first damage it takes',
  leech: 'LEECH — heals its hero for the damage it deals',
  guard: 'GUARD — enemies must attack it first',
};

export const PALETTE = {
  felt: '#1d4d33',
  feltDark: '#143626',
  feltLight: '#276b45',
  wood: '#5b3a1e',
  woodDark: '#3d2712',
  gold: '#e9c46a',
  goldBright: '#ffd97a',
  parchment: '#f4ead5',
  ink: '#241f1a',
  muted: '#8b93a3',
  text: '#f4ead5',
  player: '#339af0',
  enemy: '#e8590c',
  danger: '#fa5252',
  ember: '#fab005',
};

export const FONT = 'Georgia, "Times New Roman", serif';
export const UI_FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
