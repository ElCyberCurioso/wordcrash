// Lógica de la partida: aparición de palabras, tecleo, puntuación, niveles y partículas.
import {
  MODES, DIFFICULTIES, COLORS, COUNTDOWN_SECONDS, TIME_PENALTY,
  MAX_WORDS_ON_SCREEN, MAX_WORDS_ZEN,
} from './config.js';
import { LANGUAGES } from './data/languages.js';
import { rand, foldChar } from './utils.js';

const { PINK, CYAN, AMBER, RED, WHITE } = COLORS;
const DEMO = 'demo';

const createFx = () => ({ bolts: [], beams: [], shards: [], sparks: [], rings: [], pops: [], banners: [] });

function createGame(mode, demo) {
  const cfg = MODES[mode] ?? {};
  return {
    demo, mode,
    words: [], target: null,
    score: 0, shownScore: 0, combo: 0, maxCombo: 0,
    lives: cfg.lives ?? Infinity,
    level: 1, cleared: 0, correct: 0, errors: 0, missed: 0,
    t: 0,                 // tiempo total, incluida la cuenta atrás
    active: 0,            // tiempo jugado tras la cuenta atrás
    spawnT: 0.4,
    timeLeft: cfg?.duration ?? 0,
    count: demo ? 0 : COUNTDOWN_SECONDS, lastCount: 4,
    running: true, over: false, reason: '',
    shake: 0, flash: null, turretA: 0, recoil: 0, botT: 0.5,
  };
}

export const wpmOf = (g) => (g.active > 2 ? Math.round(g.correct / 5 / (g.active / 60)) : 0);
export const accuracyOf = (g) =>
  g.correct + g.errors ? Math.round((100 * g.correct) / (g.correct + g.errors)) : 100;

export class Engine {
  /**
   * @param {object} o
   * @param {import('./renderer.js').Renderer} o.renderer
   * @param {import('./audio.js').AudioFx} o.audio
   * @param {object} o.settings        ajustes vivos (idioma, dificultad, tolerante)
   * @param {boolean} [o.reducedMotion]
   * @param {(game) => void} [o.onLivesChange]
   * @param {(game, reason: string) => void} [o.onGameOver]
   */
  constructor({ renderer, audio, settings, reducedMotion = false, onLivesChange = () => {}, onGameOver = () => {} }) {
    this.view = renderer;
    this.audio = audio;
    this.settings = settings;
    this.reducedMotion = reducedMotion;
    this.onLivesChange = onLivesChange;
    this.onGameOver = onGameOver;
    this.fx = createFx();
    this.game = null;
  }

  /* ---------- Ciclo de vida ---------- */

  start({ demo = false } = {}) {
    this.fx = createFx();
    this.game = createGame(demo ? DEMO : this.settings.mode, demo);
    this.onLivesChange(this.game);
    return this.game;
  }

  /** Llena la pantalla de palabras ya en caída (para que la demo arranque con acción). */
  prefill(n) {
    const g = this.game;
    for (let i = 0; i < n; i++) {
      this.spawn();
      const w = g.words[g.words.length - 1];
      if (w) w.y = rand(this.view.groundY * 0.05, this.view.groundY * 0.6);
    }
  }

  end(reason) {
    const g = this.game;
    if (!g || !g.running) return;
    g.running = false;
    g.over = true;
    g.target = null;
    g.reason = reason;
    this.sound('gameOver');
    this.onGameOver(g, reason);
  }

  onResize() {
    if (!this.game) return;
    for (const w of this.game.words) this.sizeWord(w);
  }

  sound(name, arg) {
    if (this.game && !this.game.demo) this.audio.play(name, arg);
  }

  /* ---------- Palabras ---------- */

  matches(expected, typed) {
    return this.settings.tolerant ? foldChar(expected) === foldChar(typed) : expected === typed;
  }

  sizeWord(w) {
    const { fs, charW, W } = this.view;
    w.pad = fs * 0.75;
    w.w = charW * w.chars.length + w.pad * 2;
    w.h = Math.round(fs * 1.95);
    w.x = Math.min(w.x, Math.max(8, W - w.w - 8));
  }

  lengthRange() {
    const g = this.game, d = DIFFICULTIES[this.settings.diff];
    if (g.mode === DEMO) return [3, 9];
    if (g.mode === 'zen') return [2, d.len + 3];
    return [g.level >= 5 ? 4 : 2, Math.min(16, d.len + g.level - 1)];
  }

  pickWord() {
    const list = LANGUAGES[this.settings.lang].words;
    const [min, max] = this.lengthRange();
    const live = this.game.words.filter((w) => !w.dying);
    const firsts = new Set(live.map((w) => foldChar(w.text[0])));
    const texts = new Set(live.map((w) => w.text));
    const fits = (t) => { const n = [...t].length; return n >= min && n <= max && !texts.has(t); };

    // Preferimos palabras cuya inicial no esté ya en pantalla: así el objetivo es inequívoco.
    let pool = list.filter((t) => fits(t) && !firsts.has(foldChar(t[0])));
    if (!pool.length) pool = list.filter(fits);
    if (!pool.length) pool = list;
    return pool[(Math.random() * pool.length) | 0];
  }

  fallTime() {
    const g = this.game, d = DIFFICULTIES[this.settings.diff];
    switch (g.mode) {
      case DEMO: return 9;
      case 'zen': return 15;
      case 'time': return Math.max(4.6, 11 - g.active * 0.09) / d.speed;
      default: return Math.max(4.4, 14.5 - (g.level - 1) * 1.05) / d.speed;
    }
  }

  spawnGap() {
    const g = this.game, d = DIFFICULTIES[this.settings.diff];
    switch (g.mode) {
      case DEMO: return 1.15;
      case 'zen': return 2.3 * d.spawn;
      case 'time': return Math.max(0.5, 1.45 - g.active * 0.013) * d.spawn;
      default: return Math.max(0.48, 2.3 - (g.level - 1) * 0.17) * d.spawn;
    }
  }

  spawn() {
    const g = this.game, { W, groundY } = this.view;
    const max = g.mode === 'zen' ? MAX_WORDS_ZEN : MAX_WORDS_ON_SCREEN;
    if (g.words.filter((w) => !w.dying).length >= max) return;

    const text = this.pickWord();
    const w = { text, chars: [...text], x: 0, y: 0, typed: 0, hit: 0, err: 0, shake: 0, dying: false, dieT: 0 };
    this.sizeWord(w);
    w.y = -w.h - 4;

    // Busca una columna libre para no solapar bloques recién aparecidos
    let x = 10;
    for (let i = 0; i < 14; i++) {
      x = rand(10, Math.max(10, W - w.w - 10));
      const clash = g.words.some((o) => o.y < w.h * 2.6 && x < o.x + o.w + 12 && x + w.w + 12 > o.x);
      if (!clash) break;
    }
    w.x = x;
    w.vy = (groundY + w.h) / (this.fallTime() * rand(0.9, 1.1));
    g.words.push(w);
  }

  /* ---------- Entrada ---------- */

  canType() {
    const g = this.game;
    return g && g.running && g.count <= 0;
  }

  typeChar(ch) {
    const g = this.game;
    if (!this.canType() || /\s/.test(ch)) return;

    let t = g.target;
    if (!t) {
      // Fija como objetivo la palabra más baja que empiece por esa letra
      const candidates = g.words.filter((w) => !w.dying && w.y > -w.h * 0.6 && this.matches(w.chars[0], ch));
      if (!candidates.length) { this.mistake(null); return; }
      t = candidates.reduce((a, b) => (b.y > a.y ? b : a));
      g.target = t;
    }

    if (this.matches(t.chars[t.typed], ch)) {
      t.typed++;
      g.correct++;
      this.bolt(t);
      this.sound('key');
      if (t.typed >= t.chars.length) this.complete(t);
    } else {
      this.mistake(t);
    }
  }

  /** Abandona la palabra fijada (tecla Retroceso). */
  releaseTarget() {
    const g = this.game;
    if (g?.target) { g.target.typed = 0; g.target = null; }
  }

  mistake(t) {
    const g = this.game;
    g.errors++;
    g.combo = 0;
    if (t) { t.err = 0.35; t.shake = 0.3; }
    if (g.demo) return;
    this.sound('error');
    g.flash = { c: RED, a: 0.08 };
    if (g.mode === 'sudden') this.end('Tecla equivocada');
  }

  /* ---------- Impactos ---------- */

  bolt(t) {
    const g = this.game, fx = this.fx, { charW } = this.view;
    g.turretA = this.view.aimAt(t.x + t.w / 2, t.y + t.h / 2);
    const [mx, my] = this.view.muzzle(g);
    const hx = t.x + t.pad + charW * (t.typed - 0.5), hy = t.y + t.h * 0.5;
    fx.bolts.push({ x0: mx, y0: my, x1: hx, y1: hy, life: 0.11, max: 0.11 });
    for (let i = 0; i < 3; i++) {
      fx.sparks.push({ x: hx, y: hy + t.h * 0.3, vx: rand(-90, 90), vy: rand(-160, -20), life: 0.25, max: 0.25, c: CYAN, w: 1.2 });
    }
    t.hit = 0.12;
    t.y -= 1.2;
    g.recoil = Math.min(1, g.recoil + 0.35);
  }

  complete(t) {
    const g = this.game, fx = this.fx, { fs, groundY } = this.view;
    t.dying = true;
    t.dieT = 0.09;
    g.target = null;
    g.cleared++;
    g.combo++;
    g.maxCombo = Math.max(g.maxCombo, g.combo);

    // Puntos: longitud × bonus de combo × bonus por destruirla alta
    const height = Math.max(0, 1 - t.y / groundY);
    const pts = Math.round(t.chars.length * 10 * (1 + Math.min(g.combo, 20) * 0.1) * (1 + height * 0.5));
    g.score += pts;

    g.turretA = this.view.aimAt(t.x + t.w / 2, t.y + t.h / 2);
    const [mx, my] = this.view.muzzle(g);
    fx.beams.push({ x0: mx, y0: my, x1: t.x + t.w / 2, y1: t.y + t.h / 2, life: 0.42, max: 0.42, seed: Math.random() * 99 });
    fx.pops.push({ x: t.x + t.w / 2, y: t.y, text: '+' + pts, life: 1, max: 1, c: AMBER, size: fs * 0.95 });
    if (g.combo >= 5 && g.combo % 5 === 0) {
      fx.pops.push({ x: t.x + t.w / 2, y: t.y - fs * 1.3, text: 'COMBO ×' + g.combo, life: 1.2, max: 1.2, c: PINK, size: fs * 1.1 });
    }
    g.recoil = 1;
    this.sound('laser');

    const every = g.mode === DEMO ? 10 : MODES[g.mode].levelEvery;
    if (every) {
      const level = 1 + Math.floor(g.cleared / every);
      if (level > g.level) {
        g.level = level;
        if (!g.demo) {
          this.banner('Nivel ' + level, g.mode === 'zen' ? 'Sigue así' : 'Las palabras caen más rápido');
          this.sound('level');
        }
      }
    }
  }

  explode(w) {
    const g = this.game, fx = this.fx;
    const img = this.view.snapshotBlock(w);
    const bw = w.w, bh = w.h, cx = w.x + bw / 2, cy = w.y + bh / 2;
    const cols = Math.max(2, Math.round(bw / (bh * 0.75))), rows = 2;
    const sw = bw / cols, sh = bh / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const px = w.x + c * sw + sw / 2, py = w.y + r * sh + sh / 2, life = rand(0.7, 1.15);
        fx.shards.push({
          img, sx: c * sw, sy: r * sh, sw, sh, x: px, y: py,
          vx: (px - cx) * 3.2 + rand(-70, 70), vy: (py - cy) * 5 - rand(80, 240),
          rot: 0, vr: rand(-7, 7), life, max: life,
        });
      }
    }
    const n = this.reducedMotion ? 10 : 34;
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), s = rand(120, 520), life = rand(0.35, 0.8);
      fx.sparks.push({
        x: cx + rand(-bw / 3, bw / 3), y: cy,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.7 - 80,
        life, max: life, c: [PINK, AMBER, WHITE][(Math.random() * 3) | 0], w: rand(1.2, 2.4),
      });
    }
    fx.rings.push({ x: cx, y: cy, r: 8, life: 0.5, max: 0.5, R: Math.max(70, bw * 0.8) });
    if (!g.demo) {
      this.sound('boom');
      g.shake = Math.max(g.shake, this.reducedMotion ? 0 : 5);
    }
  }

  miss(w) {
    const g = this.game, fx = this.fx, { groundY, fs } = this.view;
    const idx = g.words.indexOf(w);
    if (idx >= 0) g.words.splice(idx, 1);
    if (g.target === w) g.target = null;
    g.combo = 0;
    g.missed++;

    const cx = w.x + w.w / 2;
    for (let i = 0; i < (this.reducedMotion ? 8 : 24); i++) {
      const life = rand(0.4, 0.8);
      fx.sparks.push({ x: cx + rand(-w.w / 2, w.w / 2), y: groundY, vx: rand(-200, 200), vy: rand(-320, -60), life, max: life, c: RED, w: 2 });
    }
    fx.rings.push({ x: cx, y: groundY, r: 6, life: 0.45, max: 0.45, R: 120, c: RED });
    if (g.demo) return;

    this.sound('miss');
    g.shake = this.reducedMotion ? 0 : 12;
    g.flash = { c: RED, a: 0.22 };

    if (g.mode === 'time') {
      const p = Math.min(g.score, TIME_PENALTY);
      g.score -= p;
      if (p) fx.pops.push({ x: cx, y: groundY - 30, text: '−' + p, life: 1, max: 1, c: RED, size: fs });
    }
    if (Number.isFinite(g.lives)) {
      g.lives--;
      this.onLivesChange(g);
      if (g.lives <= 0) this.end(g.mode === 'sudden' ? 'Una palabra tocó el suelo' : 'Sin vidas');
    }
  }

  banner(text, sub) {
    this.fx.banners.push({ text, sub, life: 1.6, max: 1.6 });
  }

  /* ---------- Bucle ---------- */

  update(dt) {
    const g = this.game;
    this.updateFx(dt);
    if (!g) return;

    g.shake *= Math.pow(0.0009, dt);
    if (g.flash) { g.flash.a -= dt * 0.9; if (g.flash.a <= 0) g.flash = null; }
    g.recoil = Math.max(0, g.recoil - dt * 6);
    for (const w of g.words) {
      w.hit = Math.max(0, w.hit - dt);
      w.err = Math.max(0, w.err - dt);
      w.shake = Math.max(0, w.shake - dt);
    }
    const aim = g.target ? this.view.aimAt(g.target.x + g.target.w / 2, g.target.y + g.target.h / 2) : 0;
    g.turretA += (aim - g.turretA) * Math.min(1, dt * (g.target ? 16 : 4));

    if (!g.running) return;
    g.t += dt;

    if (g.count > 0) {
      g.count -= dt;
      const c = Math.ceil(g.count);
      if (c !== g.lastCount && c > 0) { g.lastCount = c; this.sound('count', false); }
      if (g.count <= 0) { this.banner('¡Ya!', MODES[g.mode].name); this.sound('count', true); }
      return;
    }

    g.active += dt;
    if (g.mode === 'time') {
      g.timeLeft = Math.max(0, MODES.time.duration - g.active);
      g.level = 1 + Math.floor(g.active / 12);
      if (g.timeLeft <= 0) { this.end('Tiempo agotado'); return; }
    }

    g.spawnT -= dt;
    if (g.spawnT <= 0) { this.spawn(); g.spawnT = this.spawnGap(); }

    const { groundY } = this.view;
    for (let i = g.words.length - 1; i >= 0; i--) {
      const w = g.words[i];
      if (w.dying) {
        w.dieT -= dt;
        if (w.dieT <= 0) { g.words.splice(i, 1); this.explode(w); }
        continue;
      }
      w.y += w.vy * dt;
      if (w.y + w.h >= groundY) {
        this.miss(w);
        if (!g.running) return;
      }
    }
    if (g.demo) this.autoplay(dt);
  }

  /** Jugador automático para la demo del menú. */
  autoplay(dt) {
    const g = this.game;
    g.botT -= dt;
    if (g.botT > 0) return;
    g.botT = rand(0.07, 0.15);
    if (g.target) { this.typeChar(g.target.chars[g.target.typed]); return; }
    const visible = g.words.filter((w) => !w.dying && w.y > this.view.H * 0.12);
    if (!visible.length) return;
    const t = visible.reduce((a, b) => (b.y > a.y ? b : a));
    this.typeChar(t.chars[0]);
  }

  updateFx(dt) {
    const fx = this.fx;
    for (const s of fx.sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 520 * dt; s.vx *= 1 - 2.2 * dt; }
    for (const s of fx.shards) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 900 * dt; s.rot += s.vr * dt; }
    for (const r of fx.rings) r.r += (r.R - r.r) * Math.min(1, dt * 9);
    for (const p of fx.pops) p.y -= dt * 48;
    for (const key in fx) {
      const arr = fx[key];
      for (let i = arr.length - 1; i >= 0; i--) {
        arr[i].life -= dt;
        if (arr[i].life <= 0) arr.splice(i, 1);
      }
    }
  }
}

