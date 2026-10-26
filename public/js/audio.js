// Efectos de sonido sintetizados con Web Audio: no hay archivos de audio.
// El contexto se crea en el primer gesto del usuario (requisito de los navegadores).

export class AudioFx {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this.master = null;
    this.noiseBuf = null;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.32;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.8;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch {
      this.ctx = null;
    }
  }

  get ready() {
    return this.enabled && this.ctx !== null;
  }

  tone({ type = 'sine', f0, f1, dur, vol = 0.2, delay = 0 }) {
    if (!this.ready) return;
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.03);
  }

  noise({ dur, vol = 0.2, freq = 1500, f1, type = 'lowpass', delay = 0 }) {
    if (!this.ready) return;
    const c = this.ctx, t = c.currentTime + delay;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf;
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t); s.stop(t + dur + 0.03);
  }

  play(name, arg) {
    const fx = SOUNDS[name];
    if (fx && this.ready) fx(this, arg);
  }
}

const SOUNDS = {
  key: (a) => a.tone({ type: 'square', f0: 1500 + Math.random() * 300, f1: 900, dur: 0.035, vol: 0.045 }),
  laser: (a) => {
    a.tone({ type: 'sawtooth', f0: 2400, f1: 160, dur: 0.3, vol: 0.11 });
    a.tone({ type: 'square', f0: 900, f1: 120, dur: 0.22, vol: 0.05 });
  },
  boom: (a) => {
    a.noise({ dur: 0.5, vol: 0.32, freq: 2400, f1: 90 });
    a.tone({ type: 'sine', f0: 150, f1: 38, dur: 0.4, vol: 0.32 });
  },
  error: (a) => a.tone({ type: 'square', f0: 140, f1: 95, dur: 0.13, vol: 0.1 }),
  miss: (a) => {
    a.tone({ type: 'triangle', f0: 320, f1: 45, dur: 0.55, vol: 0.28 });
    a.noise({ dur: 0.35, vol: 0.18, freq: 600, f1: 80 });
  },
  level: (a) => [523, 659, 784, 1047].forEach((f, i) =>
    a.tone({ type: 'triangle', f0: f, dur: 0.2, vol: 0.12, delay: i * 0.07 })),
  count: (a, high) => a.tone({ type: 'sine', f0: high ? 1046 : 523, dur: high ? 0.35 : 0.14, vol: 0.14 }),
  gameOver: (a) => [392, 330, 262, 196].forEach((f, i) =>
    a.tone({ type: 'triangle', f0: f, dur: 0.32, vol: 0.13, delay: i * 0.12 })),
};
