// Boot and the live game: the screens are title, play and over. Clicks and keys
// arrive as intents from input.js; Vex answers on a short timer so each of her
// moves is visible. ?seed=N fixes the shuffle. ?shot=title|table|win|loss
// stages that scene instead of running the loop and sets window.__shotReady.
import { createRandom } from './random.js';
import {
  attack, canAttack, canPlayCard, createGame, endTurn, isOver, playCard,
  startGame,
} from './state.js';
import { cardById } from './cards.js';
import { takeAiAction } from './ai.js';
import { createRenderer, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createInput } from './input.js';
import { isMuted, setMuted, sfx } from './audio.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const root = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(root);

function announce(message) {
  status.textContent = message;
}

if (shot) {
  // Screenshot mode: no loop, no timers — stage the scene, paint it twice so
  // layout settles, then signal the screenshot runner.
  document.documentElement.classList.add('shot');
  const scene = stageShot(shot, seed);
  const view = { selectedUid: null, selectedHand: null, targeting: false, showHelp: false };
  let painted = 0;
  function paint() {
    renderer.draw(scene.game, scene.screen, view);
    painted += 1;
    if (painted < 3) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
} else {
  const game = createGame(createRandom(seed));
  let screen = SCREEN_TITLE;
  const view = { selectedUid: null, selectedHand: null, targeting: false, showHelp: false };
  let aiTimer = null;
  let aiBusy = false;

  function draw() {
    renderer.draw(game, screen, view);
  }

  function clearSelection() {
    view.selectedUid = null;
    view.selectedHand = null;
    view.targeting = false;
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (game.winner === 'you') sfx.win();
    else sfx.lose();
    announce(game.winner === 'you' ? 'Victory! Vex falls.' : 'Defeat. Vex wins the duel.');
  }

  /** After any player action, check for game over and hand Vex her turn. */
  function afterPlayerAction() {
    if (isOver(game)) return endGame();
    if (game.turn === 'foe' && !aiBusy) runVexTurn();
  }

  function runVexTurn() {
    aiBusy = true;
    announce('Vex is thinking…');
    const step = () => {
      if (isOver(game)) {
        aiBusy = false;
        return endGame();
      }
      if (game.turn !== 'foe') {
        aiBusy = false;
        draw();
        return;
      }
      const acted = takeAiAction(game);
      draw();
      if (!acted) {
        endTurn(game);
        announce('Your turn. Draw, play, attack.');
        sfx.turn();
        aiBusy = false;
        draw();
        return;
      }
      aiTimer = window.setTimeout(step, 650);
    };
    aiTimer = window.setTimeout(step, 700);
  }

  function newGame() {
    window.clearTimeout(aiTimer);
    aiBusy = false;
    const fresh = createGame(createRandom(Math.floor(Math.random() * 4294967296)));
    game.heroes = fresh.heroes;
    game.turn = fresh.turn;
    game.phase = fresh.phase;
    game.winner = fresh.winner;
    game.log = fresh.log;
    game.nextUid = fresh.nextUid;
    clearSelection();
    screen = SCREEN_TITLE;
    draw();
  }

  function onIntent(intent) {
    if (intent.type === 'mute') {
      setMuted(!isMuted());
      document.getElementById('mute-btn').textContent = isMuted() ? '✕' : '♪';
      return;
    }
    if (intent.type === 'help') {
      view.showHelp = true;
      draw();
      return;
    }
    if (intent.type === 'close-help') {
      view.showHelp = false;
      draw();
      return;
    }
    if (view.showHelp) return;
    if (intent.type === 'start' && screen === SCREEN_TITLE) {
      startGame(game);
      screen = SCREEN_PLAY;
      sfx.play();
      announce('Playing. Your turn — play a card or end your turn.');
      draw();
      return;
    }
    if (intent.type === 'again' && screen === SCREEN_OVER) {
      newGame();
      return;
    }
    if (screen !== SCREEN_PLAY || game.turn !== 'you') return;
    if (intent.type === 'end-turn') {
      clearSelection();
      endTurn(game);
      sfx.turn();
      draw();
      afterPlayerAction();
      return;
    }
    if (intent.type === 'play-hand') {
      const card = cardById(game.heroes.you.hand[intent.handIndex]);
      if (!card) return;
      if (!canPlayCard(game, 'you', intent.handIndex)) {
        sfx.error();
        announce(`You cannot play ${card.name} yet.`);
        return;
      }
      if (card.kind === 'spell' && (card.effect === 'bolt' || card.effect === 'freeze')) {
        // Targeted spell: select it, then click the target.
        view.selectedHand = intent.handIndex;
        view.targeting = true;
        announce(`${card.name} — click a target.`);
        draw();
        return;
      }
      const target = card.effect === 'surge' ? { who: 'foe', hero: true } : null;
      playCard(game, 'you', intent.handIndex, target);
      clearSelection();
      if (card.effect === 'heal') sfx.heal();
      else sfx.play();
      draw();
      afterPlayerAction();
      return;
    }
    if (intent.type === 'select-creature') {
      const creature = game.heroes.you.table.find((c) => c.uid === intent.uid);
      if (!creature) return;
      if (view.selectedUid === intent.uid) {
        clearSelection();
        draw();
        return;
      }
      if (!creature.canAttack) {
        sfx.error();
        announce('That creature cannot attack yet.');
        return;
      }
      view.selectedUid = intent.uid;
      view.targeting = true;
      announce('Choose a target — an enemy creature, or Vex.');
      draw();
      return;
    }
    if (intent.type === 'attack-target') {
      if (view.selectedHand !== null && view.targeting) {
        // A targeted spell was waiting for its target.
        const handIndex = view.selectedHand;
        playCard(game, 'you', handIndex, intent.target);
        clearSelection();
        sfx.attack();
        draw();
        afterPlayerAction();
        return;
      }
      if (view.selectedUid === null) return;
      const uid = view.selectedUid;
      if (!canAttack(game, 'you', uid, intent.target)) {
        sfx.error();
        announce('That target cannot be attacked — a Guard stands in the way.');
        return;
      }
      attack(game, 'you', uid, intent.target);
      clearSelection();
      sfx.attack();
      draw();
      afterPlayerAction();
      return;
    }
  }

  createInput(root, onIntent);
  announce('Ember Sigils. Press Enter or click Begin the Duel to start.');
  draw();
}
