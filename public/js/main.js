// Punto de entrada: conecta motor, renderer, audio e interfaz, y gestiona la entrada.
import { Renderer } from './renderer.js';
import { Engine } from './engine.js';
import { AudioFx } from './audio.js';
import { loadSettings, saveSettings, getBest, setBest } from './storage.js';
import {
  dom, showOverlay, setMenuMode, focusLater, renderMenu, renderSound,
  updateHud, renderLives, showResults,
} from './ui.js';

const GAME_OVER_DELAY_MS = 900;
const HUD_INTERVAL = 0.08;

const settings = loadSettings();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const renderer = new Renderer(dom.canvas);
const audio = new AudioFx();
audio.enabled = settings.sound;

const engine = new Engine({
  renderer,
  audio,
  settings,
  reducedMotion,
  onLivesChange: renderLives,
  onGameOver: handleGameOver,
});

/** 'menu' | 'game' | 'over' */
let screen = 'menu';
let paused = false;

/* ---------- Ajustes ---------- */

function updateSettings(patch) {
  Object.assign(settings, patch);
  audio.enabled = settings.sound;
  saveSettings(settings);
  renderMenu(settings, updateSettings);
}

function toggleSound() {
  audio.init();
  updateSettings({ sound: !settings.sound });
  renderSound(settings.sound);
}

/* ---------- Pantallas ---------- */

function toMenu() {
  screen = 'menu';
  paused = false;
  setMenuMode(true);
  engine.start({ demo: true });
  engine.prefill(6);
  renderMenu(settings, updateSettings);
  showOverlay('menu');
  dom.input.blur();
  focusLater(dom.btn.start);
}

function startGame() {
  audio.init();
  screen = 'game';
  paused = false;
  setMenuMode(false);
  engine.start();
  updateHud(engine.game);
  showOverlay(null);
  dom.input.value = '';
  dom.input.focus({ preventScroll: true });
}

function setPaused(p) {
  const g = engine.game;
  if (screen !== 'game' || !g || !g.running) return;
  paused = p;
  showOverlay(p ? 'pause' : null);
  if (p) {
    dom.input.blur();
    focusLater(dom.btn.resume);
  } else {
    lastFrame = performance.now();
    dom.input.focus({ preventScroll: true });
  }
}

function handleGameOver(g, reason) {
  if (g.demo) return;
  setTimeout(() => {
    if (engine.game !== g) return; // el jugador ya salió de esta partida
    screen = 'over';
    dom.input.blur();
    const previousBest = getBest(g.mode, settings.lang, settings.diff);
    const isRecord = g.score > previousBest && g.score > 0;
    if (isRecord) setBest(g.mode, settings.lang, settings.diff, g.score);
    showResults(g, { reason, settings, previousBest, isRecord });
  }, GAME_OVER_DELAY_MS);
}

/* ---------- Botones ---------- */

const { btn } = dom;
btn.start.addEventListener('click', startGame);
btn.again.addEventListener('click', startGame);
btn.menu.addEventListener('click', toMenu);
btn.quit.addEventListener('click', toMenu);
btn.pause.addEventListener('click', () => setPaused(true));
btn.resume.addEventListener('click', () => setPaused(false));
btn.finish.addEventListener('click', () => {
  paused = false;
  showOverlay(null);
  engine.end('Partida terminada');
});
btn.tolerant.addEventListener('click', () => updateSettings({ tolerant: !settings.tolerant }));
btn.soundToggle.addEventListener('click', toggleSound);
btn.sound.addEventListener('click', () => {
  toggleSound();
  if (screen === 'game' && !paused) dom.input.focus({ preventScroll: true });
});

/* ---------- Teclado ---------- */
// Un <input> oculto recibe el texto: así funcionan teclados virtuales,
// teclas muertas (´ ¨ ^) y métodos de entrada compuestos.

function flushInput() {
  const v = dom.input.value;
  dom.input.value = '';
  if (screen === 'game' && !paused) for (const ch of v) engine.typeChar(ch);
}

dom.input.addEventListener('input', (e) => { if (!e.isComposing) flushInput(); });
dom.input.addEventListener('compositionend', flushInput);

document.addEventListener('keydown', (e) => {
  const onButton = document.activeElement?.tagName === 'BUTTON';

  if (screen === 'menu' || screen === 'over') {
    if (e.key === 'Enter' && !onButton) { e.preventDefault(); startGame(); }
    if (e.key === 'Escape' && screen === 'over') { e.preventDefault(); toMenu(); }
    return;
  }

  // screen === 'game'
  if (e.key === 'Escape') { e.preventDefault(); setPaused(!paused); return; }
  if (paused) return;
  if (e.key === 'Backspace') { e.preventDefault(); engine.releaseTarget(); return; }
  if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); return; }
  if (document.activeElement !== dom.input && !e.ctrlKey && !e.metaKey && !e.altKey) {
    dom.input.focus({ preventScroll: true });
  }
});

dom.canvas.addEventListener('pointerdown', () => {
  if (screen === 'game' && !paused) dom.input.focus({ preventScroll: true });
});

const autoPause = () => {
  if (screen === 'game' && engine.game?.running && !paused) setPaused(true);
};
window.addEventListener('blur', autoPause);
document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });

/* ---------- Bucle principal ---------- */

let lastFrame = performance.now();
let hudTimer = 0;

function frame(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  renderer.tick(dt);
  if (!paused) engine.update(dt);
  renderer.render(engine.game, engine.fx);
  hudTimer -= dt;
  if (hudTimer <= 0) { hudTimer = HUD_INTERVAL; updateHud(engine.game); }
  requestAnimationFrame(frame);
}

function resize() {
  renderer.resize();
  engine.onResize();
}

/* ---------- Arranque ---------- */

resize();
new ResizeObserver(resize).observe(dom.stageWrap);
toMenu();
requestAnimationFrame(frame);

// El lienzo mide el ancho de letra: hay que recalcular cuando llegan las fuentes.
if (document.fonts) {
  Promise.all([
    document.fonts.load('600 20px "JetBrains Mono"'),
    document.fonts.load('700 20px "Chakra Petch"'),
  ]).then(resize, () => {});
}

// Juego disponible sin conexión una vez visitado.
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
