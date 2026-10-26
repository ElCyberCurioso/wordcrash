// Parámetros de juego. Todo lo ajustable vive aquí.

/**
 * lives:       vidas iniciales (Infinity = sin límite)
 * levelEvery:  palabras destruidas para subir de nivel (null = por tiempo)
 * duration:    segundos de partida (solo contrarreloj)
 */
export const MODES = {
  classic: {
    name: 'Clásico', tag: '3 vidas', lives: 3, levelEvery: 10,
    desc: 'Tres vidas. Las palabras caen más rápido cada diez destruidas.',
  },
  time: {
    name: 'Contrarreloj', tag: '60 s', lives: Infinity, levelEvery: null, duration: 60,
    desc: 'Un minuto a máxima cadencia. Cada palabra que toca el suelo resta puntos.',
  },
  zen: {
    name: 'Zen', tag: 'sin límite', lives: Infinity, levelEvery: 15,
    desc: 'Sin vidas ni reloj. Ritmo constante para practicar la técnica.',
  },
  sudden: {
    name: 'Muerte súbita', tag: '0 errores', lives: 1, levelEvery: 10,
    desc: 'Una tecla equivocada o una palabra perdida y se acabó.',
  },
};

/** speed: multiplicador de caída · spawn: multiplicador del intervalo · len: longitud base */
export const DIFFICULTIES = {
  easy:   { name: 'Fácil',   speed: 0.78, spawn: 1.3,  len: 5 },
  normal: { name: 'Normal',  speed: 1,    spawn: 1,    len: 6 },
  hard:   { name: 'Difícil', speed: 1.3,  spawn: 0.78, len: 7 },
};

export const DEFAULT_SETTINGS = {
  lang: 'es',
  mode: 'classic',
  diff: 'normal',
  sound: true,
  tolerant: true,
};

export const COUNTDOWN_SECONDS = 3.2;
export const TIME_PENALTY = 50;       // puntos que resta una palabra perdida en contrarreloj
export const MAX_WORDS_ON_SCREEN = 14;
export const MAX_WORDS_ZEN = 7;

export const COLORS = {
  PINK:  [255, 79, 150],
  CYAN:  [86, 227, 255],
  AMBER: [255, 190, 92],
  RED:   [255, 84, 104],
  WHITE: [255, 255, 255],
};
