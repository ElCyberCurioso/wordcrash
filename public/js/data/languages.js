// Registro de idiomas disponibles.
// Para añadir uno: crea js/data/words/<código>.js y regístralo aquí.
import es from './words/es.js';
import en from './words/en.js';
import fr from './words/fr.js';
import de from './words/de.js';
import pt from './words/pt.js';
import it from './words/it.js';

const define = (name, words) => ({ name, words: [...new Set(words)] });

export const LANGUAGES = {
  es: define('Español', es),
  en: define('English', en),
  fr: define('Français', fr),
  de: define('Deutsch', de),
  pt: define('Português', pt),
  it: define('Italiano', it),
};
