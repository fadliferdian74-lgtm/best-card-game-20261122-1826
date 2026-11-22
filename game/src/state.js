// The rules of Ember Sigils, as pure state transitions: nothing here touches the
// DOM, so the same code runs a live game, the AI and the screenshot staging.
// A hero is { life, maxLife, ember, maxEmber, deck, hand, table }.
// A table creature is { uid, cardId, attack, health, maxHealth, canAttack, frozen, wardUsed }.
// The game is { heroes: { you, foe }, turn, phase, winner, log, nextUid }.
import { MAX_EMBER, MAX_HAND, MAX_TABLE, START_HAND, START_LIFE } from './config.js';
import { cardById } from './cards.js';
import { buildDeck, drawCard } from './deck.js';

export const PHASE_TITLE = 'title';
export const PHASE_PLAY = 'play';
export const PHASE_OVER = 'over';

export const EVENT_NONE = 0;
export const EVENT_DAMAGE = 1;
export const EVENT_HEAL = 2;
export const EVENT_OVER = 4;

/** A fresh hero: full life, one ember, a shuffled deck and a starting hand. */
function newHero(rand) {
  const hero = {
    life: START_LIFE,
    maxLife: START_LIFE,
    ember: 1,
    maxEmber: 1,
    deck: buildDeck(rand),
    hand: [],
    table: [],
  };
  for (let i = 0; i < START_HAND; i += 1) drawCard(hero.deck, hero.hand);
  return hero;
}

/** A fresh game. `rand` seeds both decks. */
export function createGame(rand) {
  return {
    heroes: { you: newHero(rand), foe: newHero(rand) },
    turn: 'you',
    phase: PHASE_TITLE,
    winner: null,
    log: ['The sigils are dealt. Your move, duellist.'],
    nextUid: 1,
  };
}

/** Start a fresh game from the title screen. */
export function startGame(game) {
  game.phase = PHASE_PLAY;
  game.log.push('You go first. Draw a card, spend your ember, end your turn.');
}

/** A hero's table, read-only view for the renderer and AI. */
export function heroOf(game, who) {
  return game.heroes[who];
}

export function otherOf(who) {
  return who === 'you' ? 'foe' : 'you';
}

/** Begin a hero's turn: +1 max ember (to 10), refill, draw, wake creatures. */
export function beginTurn(game, who) {
  const hero = game.heroes[who];
  hero.maxEmber = Math.min(MAX_EMBER, hero.maxEmber + 1);
  hero.ember = hero.maxEmber;
  if (hero.hand.length < MAX_HAND) drawCard(hero.deck, hero.hand);
  else if (hero.deck.length > 0) hero.deck.shift(); // overdrawn card burns
  for (const creature of hero.table) {
    creature.canAttack = !creature.frozen;
    creature.frozen = false;
  }
  game.turn = who;
  game.log.push(`${who === 'you' ? 'Your' : 'Vex\u2019s'} turn — ${hero.maxEmber} ember.`);
}

/** End the current turn and hand over to the other hero. */
export function endTurn(game) {
  beginTurn(game, otherOf(game.turn));
}

/** Can `who` play the hand card at `handIndex` right now? */
export function canPlayCard(game, who, handIndex) {
  if (game.phase !== PHASE_PLAY || game.turn !== who) return false;
  const hero = game.heroes[who];
  const id = hero.hand[handIndex];
  if (id === undefined) return false;
  const card = cardById(id);
  if (card.cost > hero.ember) return false;
  if (card.kind === 'creature' && hero.table.length >= MAX_TABLE) return false;
  return true;
}

/**
 * Play the hand card at `handIndex`. Spells need a target: `target` is
 * { who, uid } for a creature, { who: 'foe'|'you', hero: true } for a hero, or
 * null for spells that need none. Returns an event mask.
 */
export function playCard(game, who, handIndex, target) {
  if (!canPlayCard(game, who, handIndex)) return EVENT_NONE;
  const hero = game.heroes[who];
  const id = hero.hand[handIndex];
  const card = cardById(id);
  hero.ember -= card.cost;
  hero.hand.splice(handIndex, 1);
  if (card.kind === 'creature') {
    hero.table.push({
      uid: game.nextUid,
      cardId: id,
      attack: card.attack,
      health: card.health,
      maxHealth: card.health,
      canAttack: card.keyword === 'rush',
      frozen: false,
      wardUsed: false,
    });
    game.nextUid += 1;
    game.log.push(`${who === 'you' ? 'You play' : 'Vex plays'} ${card.name}.`);
    return EVENT_NONE;
  }
  return castSpell(game, who, card, target);
}

/** Resolve a spell. Returns an event mask. */
function castSpell(game, who, card, target) {
  const foe = game.heroes[otherOf(who)];
  const you = game.heroes[who];
  let events = EVENT_NONE;
  if (card.effect === 'bolt') {
    events |= damageTarget(game, who, target, 4);
    game.log.push(`${card.name} strikes for 4.`);
  } else if (card.effect === 'surge') {
    events |= damageHero(game, foe, 6);
    game.log.push(`${card.name} slams the enemy hero for 6.`);
  } else if (card.effect === 'freeze') {
    events |= damageTarget(game, who, target, 2);
    if (target && target.uid !== undefined) {
      const creature = findCreature(game, target.who, target.uid);
      if (creature) {
        creature.frozen = true;
        creature.canAttack = false;
        game.log.push(`${card.name} freezes ${cardById(creature.cardId).name}.`);
      }
    }
  } else if (card.effect === 'heal') {
    you.life = Math.min(you.maxLife, you.life + 6);
    game.log.push(`${card.name} mends 6 life.`);
    events |= EVENT_HEAL;
  } else if (card.effect === 'draw') {
    drawCard(you.deck, you.hand);
    drawCard(you.deck, you.hand);
    game.log.push(`${card.name} draws 2 cards.`);
  }
  return events;
}

/** Find a creature on `who`'s table by uid, or null. */
export function findCreature(game, who, uid) {
  return game.heroes[who].table.find((c) => c.uid === uid) ?? null;
}

/** Deal `amount` damage to a hero, ending the game if life hits zero. */
export function damageHero(game, hero, amount) {
  hero.life -= amount;
  if (hero.life <= 0) {
    hero.life = 0;
    game.phase = PHASE_OVER;
    game.winner = hero === game.heroes.you ? 'foe' : 'you';
    game.log.push(game.winner === 'you' ? 'Vex falls. Victory is yours!' : 'Your hero falls. Vex wins the duel.');
    return EVENT_OVER;
  }
  return EVENT_DAMAGE;
}

/** Deal damage to a creature or hero target. Returns an event mask. */
export function damageTarget(game, attacker, target, amount) {
  if (!target) return EVENT_NONE;
  if (target.hero) {
    return damageHero(game, game.heroes[target.who], amount);
  }
  const creature = findCreature(game, target.who, target.uid);
  if (!creature) return EVENT_NONE;
  return damageCreature(game, target.who, creature, amount);
}

/** Deal damage to a creature, honouring ward; remove it if it dies. */
export function damageCreature(game, who, creature, amount) {
  const card = cardById(creature.cardId);
  if (card.keyword === 'ward' && !creature.wardUsed && amount > 0) {
    creature.wardUsed = true;
    game.log.push(`${card.name}\u2019s ward shatters — no damage.`);
    return EVENT_DAMAGE;
  }
  creature.health -= amount;
  if (creature.health <= 0) {
    const table = game.heroes[who].table;
    table.splice(table.indexOf(creature), 1);
    game.log.push(`${card.name} is destroyed.`);
  }
  return EVENT_DAMAGE;
}

/** Can `attacker` (a creature uid on `who`'s table) attack `target`? */
export function canAttack(game, who, uid, target) {
  if (game.phase !== PHASE_PLAY || game.turn !== who) return false;
  const creature = findCreature(game, who, uid);
  if (!creature || !creature.canAttack) return false;
  const foe = game.heroes[otherOf(who)];
  const guards = foe.table.filter((c) => cardById(c.cardId).keyword === 'guard');
  if (guards.length > 0) {
    // A guard on the table must be attacked before anything else.
    if (target.hero) return false;
    if (!guards.some((g) => g.uid === target.uid)) return false;
  }
  if (target.hero) return target.who === otherOf(who);
  return findCreature(game, target.who, target.uid) !== null && target.who === otherOf(who);
}

/** One creature attacks a target. Returns an event mask. */
export function attack(game, who, uid, target) {
  if (!canAttack(game, who, uid, target)) return EVENT_NONE;
  const creature = findCreature(game, who, uid);
  creature.canAttack = false;
  const card = cardById(creature.cardId);
  let events = EVENT_NONE;
  if (target.hero) {
    events |= damageHero(game, game.heroes[target.who], creature.attack);
    if (card.keyword === 'leech') {
      const hero = game.heroes[who];
      hero.life = Math.min(hero.maxLife, hero.life + creature.attack);
      events |= EVENT_HEAL;
    }
    game.log.push(`${card.name} strikes the enemy hero for ${creature.attack}.`);
  } else {
    const defender = findCreature(game, target.who, target.uid);
    events |= damageCreature(game, target.who, defender, creature.attack);
    // The defender strikes back, if it survived.
    if (findCreature(game, target.who, target.uid)) {
      events |= damageCreature(game, who, creature, defender.attack);
    }
    if (card.keyword === 'leech') {
      const hero = game.heroes[who];
      hero.life = Math.min(hero.maxLife, hero.life + creature.attack);
      events |= EVENT_HEAL;
    }
    game.log.push(`${card.name} trades blows with ${cardById(defender.cardId).name}.`);
  }
  return events;
}

/** Is the game over? */
export function isOver(game) {
  return game.phase === PHASE_OVER;
}

/** The current score line: life totals and turn count, for the status bar. */
export function scoreLine(game) {
  return `You ${game.heroes.you.life} — ${game.heroes.foe.life} Vex`;
}
