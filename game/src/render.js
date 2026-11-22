// The table: builds the DOM once and repaints it from the game state. Cards are
// real DOM elements (crisp at any size, readable at thumbnail size), with cost,
// sigil glyph, name, keyword and attack/health always visible.
import { KEYWORDS, SIGILS } from './config.js';
import { cardById } from './cards.js';
import { PHASE_OVER, PHASE_TITLE, canAttack, canPlayCard } from './state.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** One card face: cost, sigil, name, art glyph, keyword, attack/health. */
export function cardElement(card, opts = {}) {
  const sigil = SIGILS[card.sigil];
  const node = el('div', `card sigil-${card.sigil}${opts.playable ? ' playable' : ''}${opts.selected ? ' selected' : ''}${opts.canAttack ? ' can-attack' : ''}`);
  node.dataset.cardId = card.id;
  if (opts.uid !== undefined) node.dataset.uid = String(opts.uid);
  if (opts.handIndex !== undefined) node.dataset.handIndex = String(opts.handIndex);
  node.appendChild(el('div', 'card-cost', String(card.cost)));
  const sigilEl = el('div', 'card-sigil', sigil.glyph);
  sigilEl.title = sigil.name;
  node.appendChild(sigilEl);
  node.appendChild(el('div', 'card-name', card.name));
  node.appendChild(el('div', 'card-art', card.kind === 'creature' ? sigil.glyph : '✦'));
  if (card.keyword) node.appendChild(el('div', 'card-keyword', card.keyword.toUpperCase()));
  node.appendChild(el('div', 'card-text', card.text));
  if (card.kind === 'creature') {
    const stats = el('div', 'card-stats');
    stats.appendChild(el('span', 'card-attack', String(opts.attack ?? card.attack)));
    stats.appendChild(el('span', 'card-health', String(opts.health ?? card.health)));
    node.appendChild(stats);
  } else {
    node.appendChild(el('div', 'card-spell', 'SPELL'));
  }
  return node;
}

/** A face-down card back, for the opponent's hand. */
function cardBackElement() {
  const node = el('div', 'card card-back');
  node.appendChild(el('div', 'card-back-glyph', '✦'));
  return node;
}

/** A hero portrait: name, life bar, ember pips. */
function heroElement(who, hero, active) {
  const node = el('div', `hero ${who}${active ? ' active-turn' : ''}`);
  const portrait = el('div', 'hero-portrait', who === 'you' ? 'Y' : 'V');
  node.appendChild(portrait);
  const info = el('div', 'hero-info');
  info.appendChild(el('div', 'hero-name', who === 'you' ? 'You — the Emberborn' : 'Vex, the Hollow Warden'));
  const life = el('div', 'hero-life');
  life.appendChild(el('span', 'life-label', 'LIFE'));
  const bar = el('div', 'life-bar');
  const fill = el('div', 'life-fill');
  fill.style.width = `${Math.max(0, (hero.life / hero.maxLife) * 100)}%`;
  bar.appendChild(fill);
  life.appendChild(bar);
  life.appendChild(el('span', 'life-number', `${hero.life} / ${hero.maxLife}`));
  info.appendChild(life);
  const ember = el('div', 'hero-ember');
  ember.appendChild(el('span', 'ember-label', 'EMBER'));
  for (let i = 0; i < hero.maxEmber; i += 1) {
    ember.appendChild(el('span', `ember-pip${i < hero.ember ? ' lit' : ''}`, '●'));
  }
  info.appendChild(ember);
  node.appendChild(info);
  return node;
}

export function createRenderer(root) {
  const table = el('div', 'table');
  const topbar = el('div', 'topbar');
  topbar.appendChild(el('div', 'game-title', 'EMBER SIGILS'));
  topbar.appendChild(el('div', 'score-line', ''));
  const helpBtn = el('button', 'icon-btn', '?');
  helpBtn.id = 'help-btn';
  helpBtn.title = 'How to play';
  topbar.appendChild(helpBtn);
  const muteBtn = el('button', 'icon-btn', '♪');
  muteBtn.id = 'mute-btn';
  muteBtn.title = 'Mute';
  topbar.appendChild(muteBtn);
  table.appendChild(topbar);

  const foeZone = el('div', 'zone foe-zone');
  table.appendChild(foeZone);
  const midbar = el('div', 'midbar');
  midbar.appendChild(el('div', 'log-line', ''));
  const endBtn = el('button', 'end-turn-btn', 'END TURN ⏎');
  endBtn.id = 'end-turn-btn';
  midbar.appendChild(endBtn);
  table.appendChild(midbar);
  const youZone = el('div', 'zone you-zone');
  table.appendChild(youZone);

  const titleOverlay = el('div', 'overlay title-overlay');
  const titleCard = el('div', 'title-card');
  titleCard.appendChild(el('div', 'title-sigil-row', '▲ ◆ ✚ ★'));
  titleCard.appendChild(el('h1', 'title-heading', 'EMBER SIGILS'));
  titleCard.appendChild(el('p', 'title-sub', 'A duel of sigil cards. Outwit Vex, the Hollow Warden.'));
  titleCard.appendChild(el('p', 'title-rules', '30 life each · ember grows every turn · play creatures, cast spells, strike the enemy hero. Guard must be attacked first. Rush attacks at once.'));
  const startBtn = el('button', 'big-btn', 'BEGIN THE DUEL');
  startBtn.id = 'start-btn';
  titleCard.appendChild(startBtn);
  titleCard.appendChild(el('p', 'title-keys', 'Mouse: click a card to play · click a creature, then its target, to attack · Keys: 1–6 play · Space ends turn'));
  titleOverlay.appendChild(titleCard);
  table.appendChild(titleOverlay);

  const overOverlay = el('div', 'overlay over-overlay hidden');
  const overCard = el('div', 'over-card');
  overCard.appendChild(el('h1', 'over-heading', ''));
  overCard.appendChild(el('p', 'over-sub', ''));
  const againBtn = el('button', 'big-btn', 'DUEL AGAIN');
  againBtn.id = 'again-btn';
  overCard.appendChild(againBtn);
  overOverlay.appendChild(overCard);
  table.appendChild(overOverlay);

  const helpOverlay = el('div', 'overlay help-overlay hidden');
  const helpCard = el('div', 'help-card');
  helpCard.appendChild(el('h2', '', 'How to play'));
  helpCard.appendChild(el('p', '', 'Each turn you gain ember (max 10) and draw a card. Click a hand card to play it if you can afford its cost, shown top-left. Click one of your creatures, then an enemy creature or Vex, to attack. Creatures cannot attack the turn they are played — unless they have RUSH.'));
  const kw = el('ul', 'keyword-list');
  for (const [name, text] of Object.entries(KEYWORDS)) {
    const li = el('li', '', '');
    li.appendChild(el('strong', '', `${name.toUpperCase()} — `));
    li.appendChild(document.createTextNode(text));
    kw.appendChild(li);
  }
  helpCard.appendChild(kw);
  helpCard.appendChild(el('p', '', 'Sigils: ▲ Ember (red) · ◆ Frost (blue) · ✚ Thorn (green) · ★ Gale (gold). First hero to 0 life loses.'));
  const closeBtn = el('button', 'big-btn', 'CLOSE');
  closeBtn.id = 'help-close-btn';
  helpCard.appendChild(closeBtn);
  helpOverlay.appendChild(helpCard);
  table.appendChild(helpOverlay);

  root.appendChild(table);

  const scoreLine = topbar.querySelector('.score-line');
  const logLine = midbar.querySelector('.log-line');

  /** Repaint everything from `game` and the view state. */
  function draw(game, screen, view) {
    const you = game.heroes.you;
    const foe = game.heroes.foe;
    scoreLine.textContent = `You ${you.life}  —  ${foe.life} Vex · Turn ${game.turn === 'you' ? 'yours' : 'Vex\u2019s'}`;
    logLine.textContent = game.log[game.log.length - 1] ?? '';

    // Opponent zone: hero, face-down hand, table.
    foeZone.replaceChildren();
    foeZone.appendChild(heroElement('foe', foe, game.turn === 'foe'));
    const foeHand = el('div', 'hand foe-hand');
    for (let i = 0; i < foe.hand.length; i += 1) foeHand.appendChild(cardBackElement());
    foeZone.appendChild(foeHand);
    const foeTable = el('div', 'table-row');
    for (const creature of foe.table) {
      const card = cardById(creature.cardId);
      const node = cardElement(card, { uid: creature.uid, attack: creature.attack, health: creature.health, canAttack: false });
      if (view.targeting) node.classList.add('targetable');
      if (creature.frozen) node.classList.add('frozen');
      if (card.keyword === 'ward' && !creature.wardUsed) node.classList.add('warded');
      foeTable.appendChild(node);
    }
    if (foe.table.length === 0) foeTable.appendChild(el('div', 'table-empty', 'Vex has no creatures out.'));
    foeZone.appendChild(foeTable);

    // Your zone: table, hand, hero.
    youZone.replaceChildren();
    const youTable = el('div', 'table-row');
    for (const creature of you.table) {
      const card = cardById(creature.cardId);
      const node = cardElement(card, {
        uid: creature.uid,
        attack: creature.attack,
        health: creature.health,
        canAttack: game.turn === 'you' && creature.canAttack,
        selected: view.selectedUid === creature.uid,
      });
      if (creature.frozen) node.classList.add('frozen');
      if (card.keyword === 'ward' && !creature.wardUsed) node.classList.add('warded');
      youTable.appendChild(node);
    }
    if (you.table.length === 0) youTable.appendChild(el('div', 'table-empty', 'Your side of the table is empty — play a creature.'));
    youZone.appendChild(youTable);
    const youHand = el('div', 'hand you-hand');
    you.hand.forEach((id, index) => {
      const card = cardById(id);
      const node = cardElement(card, {
        handIndex: index,
        playable: game.turn === 'you' && canPlayCard(game, 'you', index),
        selected: view.selectedHand === index,
      });
      youHand.appendChild(node);
    });
    youZone.appendChild(youHand);
    youZone.appendChild(heroElement('you', you, game.turn === 'you'));

    endBtn.disabled = screen !== SCREEN_PLAY || game.turn !== 'you';
    endBtn.classList.toggle('your-turn', game.turn === 'you' && screen === SCREEN_PLAY);

    titleOverlay.classList.toggle('hidden', screen !== SCREEN_TITLE);
    const over = screen === SCREEN_OVER;
    overOverlay.classList.toggle('hidden', !over);
    if (over) {
      const heading = overOverlay.querySelector('.over-heading');
      const sub = overOverlay.querySelector('.over-sub');
      const won = game.winner === 'you';
      heading.textContent = won ? '★ VICTORY ★' : 'DEFEAT';
      heading.classList.toggle('won', won);
      sub.textContent = won
        ? `Vex falls at ${foe.life} life. The sigils are yours — final score You ${you.life} — ${foe.life} Vex.`
        : `Your hero falls at ${you.life} life. Vex keeps the table — final score You ${you.life} — ${foe.life} Vex.`;
    }
    helpOverlay.classList.toggle('hidden', !view.showHelp);
  }

  return { draw, root: table };
}
