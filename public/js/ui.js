// Capa DOM: HUD, menú, pausa y resultados.
import { MODES, DIFFICULTIES } from './config.js';
import { LANGUAGES } from './data/languages.js';
import { getBest } from './storage.js';
import { wpmOf, accuracyOf } from './engine.js';
import { formatNumber } from './utils.js';

const $ = (id) => document.getElementById(id);

const ICON_SOUND_ON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
const ICON_SOUND_OFF =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';

export const dom = {
  app: $('app'),
  canvas: $('stage'),
  stageWrap: $('stageWrap'),
  input: $('typing-input'),
  btn: {
    start: $('bStart'), pause: $('bPause'), resume: $('bResume'), finish: $('bFinish'),
    quit: $('bQuit'), again: $('bAgain'), menu: $('bMenu'), sound: $('bSound'),
    tolerant: $('tTol'), soundToggle: $('tSnd'),
  },
};

const OVERLAYS = ['menu', 'pause', 'over'];

/** Muestra una única capa superpuesta (o ninguna con `null`). */
export function showOverlay(id) {
  for (const o of OVERLAYS) {
    const el = $(o);
    if (o === id && el.hidden) {
      el.hidden = false;
      el.classList.remove('fade-in');
      void el.offsetWidth; // reinicia la animación
      el.classList.add('fade-in');
    } else if (o !== id) {
      el.hidden = true;
    }
  }
}

export function setMenuMode(inMenu) {
  dom.app.classList.toggle('in-menu', inMenu);
}

export function focusLater(el) {
  setTimeout(() => el.focus({ preventScroll: true }), 30);
}

/* ---------- Menú ---------- */

function optionButton({ id, className, pressed, html, text, onClick }) {
  const b = document.createElement('button');
  b.type = 'button';
  b.id = id;
  if (className) b.className = className;
  b.setAttribute('aria-pressed', String(pressed));
  if (html) b.innerHTML = html; else b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function renderMenu(settings, onChange) {
  const langs = $('langs');
  langs.replaceChildren(...Object.entries(LANGUAGES).map(([code, l]) => optionButton({
    id: 'lang-' + code, className: 'chip', pressed: settings.lang === code,
    html: `<span class="code">${code.toUpperCase()}</span><span>${escapeHtml(l.name)}</span>`,
    onClick: () => onChange({ lang: code }),
  })));

  const modes = $('modes');
  modes.replaceChildren(...Object.entries(MODES).map(([key, m]) => {
    const best = getBest(key, settings.lang, settings.diff);
    return optionButton({
      id: 'mode-' + key, className: 'mode', pressed: settings.mode === key,
      html: `<span class="mode-top"><span class="mode-name">${escapeHtml(m.name)}</span>` +
        `<span class="mode-tag">${escapeHtml(m.tag)}</span></span>` +
        `<span class="mode-desc">${escapeHtml(m.desc)}</span>` +
        `<span class="mode-best">Récord · ${best ? formatNumber(best) : '—'}</span>`,
      onClick: () => onChange({ mode: key }),
    });
  }));

  const diffs = $('diffs');
  diffs.replaceChildren(...Object.entries(DIFFICULTIES).map(([key, d]) => optionButton({
    id: 'diff-' + key, pressed: settings.diff === key, text: d.name,
    onClick: () => onChange({ diff: key }),
  })));

  dom.btn.tolerant.setAttribute('aria-checked', String(settings.tolerant));
  renderSound(settings.sound);
}

export function renderSound(on) {
  dom.btn.sound.innerHTML = on ? ICON_SOUND_ON : ICON_SOUND_OFF;
  dom.btn.sound.setAttribute('aria-label', on ? 'Silenciar sonido' : 'Activar sonido');
  dom.btn.soundToggle.setAttribute('aria-checked', String(on));
}

/* ---------- HUD ---------- */

export function updateHud(g) {
  if (!g || g.demo) return;
  g.shownScore += (g.score - g.shownScore) * 0.35;
  if (Math.abs(g.score - g.shownScore) < 1) g.shownScore = g.score;

  $('hScore').textContent = formatNumber(g.shownScore);
  $('hWpm').textContent = wpmOf(g);
  $('hAcc').textContent = accuracyOf(g) + '%';
  const combo = $('hCombo');
  combo.textContent = '×' + g.combo;
  combo.classList.toggle('hot', g.combo >= 5);

  if (g.mode === 'time') {
    $('hLvlK').textContent = 'Tiempo';
    $('hLvl').textContent = Math.ceil(g.timeLeft) + ' s';
  } else {
    $('hLvlK').textContent = 'Nivel';
    $('hLvl').textContent = g.level;
  }
}

export function renderLives(g) {
  const el = $('hLives');
  el.replaceChildren();
  if (!g || g.demo) return;
  if (g.mode === 'zen') {
    const inf = document.createElement('span');
    inf.className = 'inf';
    inf.title = 'Sin límite';
    inf.textContent = '∞';
    el.append(inf);
    return;
  }
  const total = MODES[g.mode].lives;
  if (!Number.isFinite(total)) return;
  for (let i = 0; i < total; i++) {
    const s = document.createElement('span');
    s.className = 'life' + (i >= g.lives ? ' lost' : '');
    el.append(s);
  }
  el.setAttribute('aria-label', `Vidas: ${g.lives} de ${total}`);
}

/* ---------- Resultados ---------- */

export function showResults(g, { reason, settings, previousBest, isRecord }) {
  $('oReason').textContent =
    `${reason} · ${MODES[g.mode].name} · ${LANGUAGES[settings.lang].name} · ${DIFFICULTIES[settings.diff].name}`;
  $('oScore').textContent = formatNumber(g.score);
  $('oRecord').hidden = !isRecord;
  $('oWpm').textContent = wpmOf(g);
  $('oAcc').textContent = accuracyOf(g) + '%';
  $('oWords').textContent = g.cleared;
  $('oCombo').textContent = '×' + g.maxCombo;
  $('oLvl').textContent = g.level;
  $('oBest').textContent = formatNumber(Math.max(previousBest, g.score));
  showOverlay('over');
  focusLater(dom.btn.again);
}
