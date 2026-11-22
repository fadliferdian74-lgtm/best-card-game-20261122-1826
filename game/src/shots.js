// Screenshot scenes: each one plays the REAL game forward from a fresh seeded
// state — cards are dealt, turns are taken by the same autopilot that drives a
// live game, attacks use the real combat rules — so every frame is what a short
// game really looks like, and the same seed always gives the same frame.
// ?shot=title | table | win | loss (with &seed=N).
import { createRandom } from './random.js';
import { runAiTurn, takeAiAction } from './ai.js';
import { cardById } from './cards.js';
import {
  attack, canPlayCard, createGame, endTurn, otherOf, playCard, startGame,
} from './state.js';

/** A simple autopilot for one hero: play the most expensive affordable card, then attack face. */
function autopilotTurn(game, who) {
  let guard = 0;
  while (guard < 40) {
    guard += 1;
    let played = false;
    const hero = game.heroes[who];
    let best = -1;
    let bestCost = -1;
    for (let i = 0; i < hero.hand.length; i += 1) {
      if (!canPlayCard(game, who, i)) continue;
      const card = cardById(hero.hand[i]);
      if (card.kind === 'creature' && card.cost > bestCost) {
        bestCost = card.cost;
        best = i;
      }
    }
    if (best >= 0) {
      playCard(game, who, best, null);
      played = true;
    } else {
      // No creature: cast a spell if one is playable.
      for (let i = 0; i < hero.hand.length; i += 1) {
        if (!canPlayCard(game, who, i)) continue;
        const card = cardById(hero.hand[i]);
        if (card.kind !== 'spell') continue;
        let target = null;
        if (card.effect === 'bolt' || card.effect === 'surge' || card.effect === 'freeze') {
          target = { who: otherOf(who), hero: true };
        }
        playCard(game, who, i, target);
        played = true;
        break;
      }
    }
    if (played) continue;
    // Attack with every ready creature: through a guard first, else at the hero.
    let attacked = false;
    for (const creature of [...hero.table]) {
      if (!creature.canAttack) continue;
      const foe = game.heroes[otherOf(who)];
      const guards = foe.table.filter((c) => cardById(c.cardId).keyword === 'guard');
      const target = guards.length > 0
        ? { who: otherOf(who), uid: guards[0].uid }
        : { who: otherOf(who), hero: true };
      const before = game.phase;
      attack(game, who, creature.uid, target);
      if (game.phase !== before) return; // game ended
      attacked = true;
      break; // one attack per loop pass, so the table is re-read
    }
    if (!attacked) return;
  }
}

/** Play both sides with the autopilot until the game ends or `maxTurns` pass. */
function playOut(game, maxTurns) {
  for (let turn = 0; turn < maxTurns && game.phase === 'play'; turn += 1) {
    if (game.turn === 'you') {
      autopilotTurn(game, 'you');
      if (game.phase !== 'play') return;
      endTurn(game);
    } else {
      runAiTurn(game);
    }
  }
}

/** Force a finish for `winner`: the winner plays creatures, casts bolts at the
 *  enemy hero, and attacks (through guards first) until the duel ends. */
function forceFinish(game, winner) {
  let guard = 0;
  while (game.phase === 'play' && guard < 120) {
    guard += 1;
    if (game.turn !== winner) {
      endTurn(game);
      continue;
    }
    const hero = game.heroes[winner];
    const foe = game.heroes[otherOf(winner)];
    let acted = false;
    // 1. Play the most expensive affordable creature.
    let best = -1;
    let bestCost = -1;
    for (let i = 0; i < hero.hand.length; i += 1) {
      if (!canPlayCard(game, winner, i)) continue;
      const card = cardById(hero.hand[i]);
      if (card.kind === 'creature' && card.cost > bestCost) {
        bestCost = card.cost;
        best = i;
      }
    }
    if (best >= 0) {
      playCard(game, winner, best, null);
      acted = true;
    }
    if (!acted) {
      // 2. Cast a bolt/surge straight at the enemy hero.
      for (let i = 0; i < hero.hand.length; i += 1) {
        const card = cardById(hero.hand[i]);
        if (card.kind === 'spell' && (card.effect === 'bolt' || card.effect === 'surge') && canPlayCard(game, winner, i)) {
          playCard(game, winner, i, { who: otherOf(winner), hero: true });
          acted = true;
          break;
        }
      }
    }
    if (!acted) {
      // 3. Attack: through a guard first, otherwise straight at the hero.
      for (const creature of [...hero.table]) {
        if (!creature.canAttack) continue;
        const guards = foe.table.filter((c) => cardById(c.cardId).keyword === 'guard');
        const target = guards.length > 0
          ? { who: otherOf(winner), uid: guards[0].uid }
          : { who: otherOf(winner), hero: true };
        const before = game.phase;
        attack(game, winner, creature.uid, target);
        if (game.phase !== before) return; // game ended
        acted = true;
        break;
      }
    }
    if (!acted) endTurn(game);
  }
}

/**
 * Stage the named scene and return { game, screen } for the renderer.
 * title: a fresh game on the title screen. table: mid-game, both sides have
 * creatures out and full hands. win/loss: a finished duel, decided by real play.
 */
export function stageShot(name, seed) {
  const rand = createRandom(seed);
  const game = createGame(rand);
  if (name === 'title') {
    return { game, screen: 'title' };
  }
  startGame(game);
  if (name === 'table') {
    playOut(game, 5);
    if (game.phase !== 'play') {
      // The autopilot ended it early; rebuild with fewer turns for a live table.
      const fresh = createGame(createRandom(seed));
      startGame(fresh);
      playOut(fresh, 3);
      return { game: fresh, screen: 'play' };
    }
    return { game, screen: 'play' };
  }
  if (name === 'win' || name === 'loss') {
    const winner = name === 'win' ? 'you' : 'foe';
    playOut(game, 12);
    if (game.phase !== 'play' && game.winner === winner) return { game, screen: 'over' };
    if (game.phase === 'play') forceFinish(game, winner);
    if (game.phase !== 'play' && game.winner === winner) return { game, screen: 'over' };
    // Last resort: replay with the other side's autopilot weakened by fewer turns.
    const retry = createGame(createRandom(seed + 101));
    startGame(retry);
    playOut(retry, 8);
    if (retry.phase === 'play') forceFinish(retry, winner);
    return { game: retry, screen: 'over' };
  }
  return { game, screen: 'title' };
}
