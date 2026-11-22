// Vex, the Hollow Warden — the opponent. A greedy heuristic with a readable
// plan: play the best-value affordable cards first, spend leftover ember on
// spells, then attack with everything that can, preferring lethal, then the
// best trades, then the hero's face. It plays one action at a time so the
// renderer can show each move.
import { cardById } from './cards.js';
import { attack, canAttack, canPlayCard, endTurn, otherOf, playCard } from './state.js';

/** Value of a card in hand: stats per ember, with a bonus for keywords. */
function cardValue(card) {
  if (card.kind === 'spell') return card.cost + 1.5;
  let value = (card.attack + card.health) / Math.max(1, card.cost);
  if (card.keyword === 'guard') value += 0.6;
  if (card.keyword === 'rush') value += 0.4;
  if (card.keyword === 'leech') value += 0.3;
  return value;
}

/** The best affordable hand card for `who`, or -1 when nothing is playable. */
function bestPlayable(game, who) {
  const hero = game.heroes[who];
  let best = -1;
  let bestValue = 0;
  for (let i = 0; i < hero.hand.length; i += 1) {
    if (!canPlayCard(game, who, i)) continue;
    const value = cardValue(cardById(hero.hand[i]));
    if (value > bestValue) {
      bestValue = value;
      best = i;
    }
  }
  return best;
}

/** Pick a spell target: bolts and surges go face when lethal, else at the biggest threat. */
function spellTarget(game, who, card) {
  const foe = game.heroes[otherOf(who)];
  if (card.effect === 'surge') return { who: otherOf(who), hero: true };
  if (card.effect === 'bolt') {
    if (foe.life <= 4) return { who: otherOf(who), hero: true };
    let biggest = null;
    for (const creature of foe.table) {
      if (!biggest || creature.attack > biggest.attack) biggest = creature;
    }
    if (biggest) return { who: otherOf(who), uid: biggest.uid };
    return { who: otherOf(who), hero: true };
  }
  if (card.effect === 'freeze') {
    let biggest = null;
    for (const creature of foe.table) {
      if (!biggest || creature.attack > biggest.attack) biggest = creature;
    }
    if (biggest) return { who: otherOf(who), uid: biggest.uid };
    return { who: otherOf(who), hero: true };
  }
  return null;
}

/** Pick an attack for one creature: lethal first, then the best trade, then face. */
function pickAttack(game, who, creature) {
  const foe = game.heroes[otherOf(who)];
  if (foe.life <= creature.attack) return { who: otherOf(who), hero: true };
  let bestTrade = null;
  let bestScore = 0;
  for (const defender of foe.table) {
    const target = { who: otherOf(who), uid: defender.uid };
    if (!canAttack(game, who, creature.uid, target)) continue;
    // Trade up: kill something bigger than what we lose, or kill for free.
    const kills = defender.health <= creature.attack;
    const survives = creature.health > defender.attack;
    const score = (kills ? 3 : 0) + (survives ? 2 : 0) + defender.attack * 0.2;
    if (score > bestScore) {
      bestScore = score;
      bestTrade = target;
    }
  }
  if (bestTrade && bestScore >= 3) return bestTrade;
  const face = { who: otherOf(who), hero: true };
  if (canAttack(game, who, creature.uid, face)) return face;
  return bestTrade;
}

/**
 * Take Vex's next single action. Returns true when an action was taken, false
 * when Vex is done and the turn should pass back.
 */
export function takeAiAction(game) {
  const who = 'foe';
  // 1. Play cards, best value first.
  const handIndex = bestPlayable(game, who);
  if (handIndex >= 0) {
    const card = cardById(game.heroes[who].hand[handIndex]);
    const target = card.kind === 'spell' ? spellTarget(game, who, card) : null;
    playCard(game, who, handIndex, target);
    return true;
  }
  // 2. Attack with each ready creature, one at a time.
  for (const creature of game.heroes[who].table) {
    if (!creature.canAttack) continue;
    const target = pickAttack(game, who, creature);
    if (target) {
      attack(game, who, creature.uid, target);
      return true;
    }
  }
  return false;
}

/** Run Vex's whole turn at once (used by the screenshot staging). */
export function runAiTurn(game) {
  let guard = 0;
  while (takeAiAction(game) && guard < 40) guard += 1;
  endTurn(game);
}
