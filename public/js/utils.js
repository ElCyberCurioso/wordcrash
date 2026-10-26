export const rand = (a, b) => a + Math.random() * (b - a);

export const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

/** Normaliza un carácter o palabra: sin diacríticos y en minúsculas. */
export const fold = (s) =>
  s.normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/œ/g, 'oe');

/** Versión de un solo carácter: ß se acepta con «s» y œ con «o» en modo tolerante. */
export const foldChar = (c) => fold(c)[0] || c;

export const formatNumber = (n) => Math.round(n).toLocaleString('es-ES');
