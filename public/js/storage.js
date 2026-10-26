// Persistencia local (localStorage). Todas las operaciones toleran
// navegadores sin almacenamiento disponible (modo privado, cookies bloqueadas).
import { DEFAULT_SETTINGS, MODES, DIFFICULTIES } from './config.js';
import { LANGUAGES } from './data/languages.js';

const PREFIX = 'wordcrash:';

export const storage = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(PREFIX + key);
      return v === null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      /* almacenamiento no disponible */
    }
  },
};

export function loadSettings() {
  const s = { ...DEFAULT_SETTINGS, ...storage.get('settings', {}) };
  if (!LANGUAGES[s.lang]) s.lang = DEFAULT_SETTINGS.lang;
  if (!MODES[s.mode]) s.mode = DEFAULT_SETTINGS.mode;
  if (!DIFFICULTIES[s.diff]) s.diff = DEFAULT_SETTINGS.diff;
  return s;
}

export const saveSettings = (s) => storage.set('settings', s);

const bestKey = (mode, lang, diff) => `best:${mode}:${lang}:${diff}`;
export const getBest = (mode, lang, diff) => storage.get(bestKey(mode, lang, diff), 0);
export const setBest = (mode, lang, diff, score) => storage.set(bestKey(mode, lang, diff), score);
