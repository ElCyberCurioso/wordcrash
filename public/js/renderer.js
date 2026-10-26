// Todo el dibujo del lienzo: fondo, suelo, bloques, torreta y efectos.
// El renderer no modifica el estado de la partida; solo lo lee.
import { COLORS } from './config.js';
import { rgba, rand } from './utils.js';

const { PINK, CYAN, AMBER, RED, WHITE } = COLORS;
const DISPLAY_FONT = '"Chakra Petch", "Rajdhani", system-ui, sans-serif';
const MONO_FONT = '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = 1; this.H = 1; this.DPR = 1;
    this.groundY = 0;
    this.fs = 20;
    this.charW = 12;
    this.font = '';
    this.bg = null;
    this.stars = Array.from({ length: 140 }, () => ({
      x: Math.random(), y: Math.random(), z: Math.random() * 0.85 + 0.15,
    }));
  }

  /** Recalcula dimensiones según el tamaño CSS del lienzo. */
  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.DPR = Math.min(2, window.devicePixelRatio || 1);
    this.W = Math.max(1, r.width);
    this.H = Math.max(1, r.height);
    this.canvas.width = Math.round(this.W * this.DPR);
    this.canvas.height = Math.round(this.H * this.DPR);
    this.groundY = this.H - Math.min(92, Math.max(70, this.H * 0.13));
    this.fs = Math.round(Math.max(15, Math.min(23, this.W / 48)));
    this.font = `600 ${this.fs}px ${MONO_FONT}`;
    this.ctx.setTransform(this.DPR, 0, 0, this.DPR, 0, 0);
    this.ctx.font = this.font;
    this.charW = this.ctx.measureText('M').width;
    this.buildBackground();
  }

  get turretBase() {
    return [this.W / 2, this.groundY + 34];
  }

  muzzle(game) {
    const [tx, ty] = this.turretBase;
    const L = 50 - game.recoil * 10;
    return [tx + Math.sin(game.turretA) * L, ty - Math.cos(game.turretA) * L];
  }

  aimAt(x, y) {
    const [tx, ty] = this.turretBase;
    return Math.atan2(x - tx, -(y - ty));
  }

  buildBackground() {
    const { W, H, DPR, groundY } = this;
    const bg = document.createElement('canvas');
    bg.width = this.canvas.width;
    bg.height = this.canvas.height;
    const b = bg.getContext('2d');
    b.setTransform(DPR, 0, 0, DPR, 0, 0);

    const g = b.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#060918');
    g.addColorStop(0.7, '#0b1230');
    g.addColorStop(1, '#101a40');
    b.fillStyle = g;
    b.fillRect(0, 0, W, H);

    const blob = (x, y, r, c, a) => {
      const rg = b.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, rgba(c, a));
      rg.addColorStop(1, rgba(c, 0));
      b.fillStyle = rg;
      b.fillRect(0, 0, W, H);
    };
    blob(W * 0.82, H * 0.12, Math.max(W, H) * 0.5, PINK, 0.1);
    blob(W * 0.12, H * 0.75, Math.max(W, H) * 0.55, CYAN, 0.07);
    blob(W * 0.5, groundY, W * 0.5, [120, 90, 255], 0.1);

    b.strokeStyle = 'rgba(120,140,230,.035)';
    b.lineWidth = 1;
    for (let x = (W % 56) / 2; x < W; x += 56) {
      b.beginPath(); b.moveTo(x + 0.5, 0); b.lineTo(x + 0.5, groundY); b.stroke();
    }
    this.bg = bg;
  }

  tick(dt) {
    for (const s of this.stars) {
      s.y += dt * (0.006 + s.z * 0.03);
      if (s.y > 1) { s.y -= 1; s.x = Math.random(); }
    }
  }

  /** Dibuja un bloque de palabra en (x, y) sobre el contexto indicado. */
  drawBlock(c, w, x, y, o = {}) {
    const bw = w.w, bh = w.h, r = 6;
    const { target, hot } = o;

    const g = c.createLinearGradient(0, y, 0, y + bh);
    g.addColorStop(0, hot ? 'rgba(90,30,70,.97)' : target ? 'rgba(22,52,92,.96)' : 'rgba(25,34,74,.93)');
    g.addColorStop(1, hot ? 'rgba(40,12,40,.97)' : 'rgba(11,16,40,.95)');
    roundRect(c, x, y, bw, bh, r);
    c.fillStyle = g;
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.055)';
    roundRect(c, x + 1, y + 1, bw - 2, bh * 0.44, r - 1);
    c.fill();

    let stroke = 'rgba(132,150,230,.34)', lw = 1;
    if (o.danger) stroke = rgba(RED, 0.45 + 0.45 * o.danger);
    if (target) { stroke = rgba(CYAN, 0.95); lw = 1.6; }
    if (o.err > 0) { stroke = rgba(RED, 1); lw = 2; }
    if (hot) { stroke = rgba(PINK, 1); lw = 2; }
    c.lineWidth = lw;
    c.strokeStyle = stroke;
    roundRect(c, x + 0.5, y + 0.5, bw - 1, bh - 1, r);
    c.stroke();

    // Muescas laterales
    c.fillStyle = target ? rgba(CYAN, 0.9) : hot ? rgba(PINK, 0.9) : 'rgba(132,150,230,.35)';
    c.fillRect(x + 3, y + bh * 0.35, 2, bh * 0.3);
    c.fillRect(x + bw - 5, y + bh * 0.35, 2, bh * 0.3);

    // Texto, letra a letra para colorear lo ya tecleado
    c.font = this.font;
    c.textBaseline = 'middle';
    c.textAlign = 'left';
    const typed = hot ? w.chars.length : w.typed;
    let tx = x + w.pad;
    const ty = y + bh / 2 + 1;
    for (let i = 0; i < w.chars.length; i++) {
      c.fillStyle = i < typed ? rgba(PINK, 1) : target ? '#ffffff' : '#dde4ff';
      c.fillText(w.chars[i], tx, ty);
      tx += this.charW;
    }
    if (typed > 0 && !hot) {
      c.fillStyle = rgba(PINK, 0.9);
      c.fillRect(x + 6, y + bh - 4, (bw - 12) * typed / w.chars.length, 2);
    }
    if (o.white > 0) {
      c.globalAlpha = Math.min(1, o.white);
      c.fillStyle = '#fff';
      roundRect(c, x, y, bw, bh, r);
      c.fill();
      c.globalAlpha = 1;
    }
  }

  /** Imagen del bloque en estado "impactado", usada para los fragmentos. */
  snapshotBlock(w) {
    const off = document.createElement('canvas');
    off.width = Math.ceil(w.w * this.DPR) + 2;
    off.height = Math.ceil(w.h * this.DPR) + 2;
    const oc = off.getContext('2d');
    oc.setTransform(this.DPR, 0, 0, this.DPR, 0, 0);
    this.drawBlock(oc, w, 0, 0, { hot: true });
    return off;
  }

  drawReticle(game, w) {
    const c = this.ctx;
    const p = 4 + Math.sin(game.t * 10) * 1.5, L = 9;
    const x0 = w.x - p, y0 = w.y - p, x1 = w.x + w.w + p, y1 = w.y + w.h + p;
    c.strokeStyle = rgba(CYAN, 0.9);
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(x0, y0 + L); c.lineTo(x0, y0); c.lineTo(x0 + L, y0);
    c.moveTo(x1 - L, y0); c.lineTo(x1, y0); c.lineTo(x1, y0 + L);
    c.moveTo(x1, y1 - L); c.lineTo(x1, y1); c.lineTo(x1 - L, y1);
    c.moveTo(x0 + L, y1); c.lineTo(x0, y1); c.lineTo(x0, y1 - L);
    c.stroke();

    const [mx, my] = this.muzzle(game);
    c.save();
    c.setLineDash([3, 7]);
    c.lineDashOffset = -game.t * 40;
    c.strokeStyle = rgba(CYAN, 0.22);
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(mx, my); c.lineTo(w.x + w.w / 2, w.y + w.h); c.stroke();
    c.restore();
  }

  drawFloor(game) {
    const c = this.ctx, { W, H, groundY: gy } = this, vx = W / 2;
    const g = c.createLinearGradient(0, gy, 0, H);
    g.addColorStop(0, 'rgba(30,20,70,.55)');
    g.addColorStop(1, 'rgba(8,10,28,.95)');
    c.fillStyle = g;
    c.fillRect(0, gy, W, H - gy);

    c.save();
    c.beginPath(); c.rect(0, gy, W, H - gy); c.clip();
    c.strokeStyle = 'rgba(255,79,150,.16)';
    c.lineWidth = 1;
    const t = (game.t * 0.6) % 1;
    for (let i = 0; i < 7; i++) {
      const k = (i + t) / 7, y = gy + (H - gy) * k * k;
      c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
    }
    for (let i = -14; i <= 14; i++) {
      c.beginPath(); c.moveTo(vx + i * 26, gy); c.lineTo(vx + i * 150, H + 40); c.stroke();
    }
    c.restore();

    // Línea de suelo luminosa
    c.globalCompositeOperation = 'lighter';
    const lg = c.createLinearGradient(0, 0, W, 0);
    lg.addColorStop(0, rgba(PINK, 0));
    lg.addColorStop(0.5, rgba(PINK, 0.9));
    lg.addColorStop(1, rgba(PINK, 0));
    c.fillStyle = lg;
    c.fillRect(0, gy - 1, W, 2);
    c.globalAlpha = 0.25;
    c.fillRect(0, gy - 4, W, 8);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }

  drawTurret(game) {
    const c = this.ctx, [tx, ty] = this.turretBase;
    const charge = Math.min(1, game.combo / 15);

    // Cañón
    c.save();
    c.translate(tx, ty);
    c.rotate(game.turretA);
    const rec = game.recoil * 10;
    const barrel = c.createLinearGradient(-7, 0, 7, 0);
    barrel.addColorStop(0, '#5d6ba3');
    barrel.addColorStop(0.5, '#d5dcff');
    barrel.addColorStop(1, '#4a5687');
    c.fillStyle = barrel;
    roundRect(c, -6, -50 + rec, 12, 40, 3);
    c.fill();
    c.fillStyle = '#2a3361';
    c.fillRect(-8, -24 + rec, 16, 6);
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = rgba(PINK, 0.55 + game.recoil * 0.45);
    c.beginPath(); c.arc(0, -50 + rec, 4 + game.recoil * 6, 0, Math.PI * 2); c.fill();
    c.globalCompositeOperation = 'source-over';
    c.restore();

    // Cúpula y anillo de carga (crece con el combo)
    const dome = c.createLinearGradient(0, ty - 30, 0, ty + 10);
    dome.addColorStop(0, '#3a4782');
    dome.addColorStop(1, '#141b3d');
    c.fillStyle = dome;
    c.beginPath(); c.arc(tx, ty, 28, Math.PI, 0); c.closePath(); c.fill();
    c.strokeStyle = rgba(CYAN, 0.5);
    c.lineWidth = 1.5;
    c.beginPath(); c.arc(tx, ty, 28, Math.PI, 0); c.stroke();
    c.strokeStyle = rgba(AMBER, 0.25 + charge * 0.75);
    c.lineWidth = 3;
    c.beginPath(); c.arc(tx, ty, 34, Math.PI, Math.PI + Math.PI * Math.max(0.02, charge)); c.stroke();

    // Base
    c.fillStyle = '#0c1230';
    c.strokeStyle = 'rgba(132,150,230,.4)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(tx - 56, ty + 14); c.lineTo(tx - 40, ty - 2); c.lineTo(tx + 40, ty - 2); c.lineTo(tx + 56, ty + 14);
    c.closePath(); c.fill(); c.stroke();
    for (let i = -2; i <= 2; i++) {
      c.fillStyle = i === 0 ? rgba(CYAN, 0.9) : 'rgba(132,150,230,.35)';
      c.fillRect(tx + i * 14 - 3, ty + 4, 6, 3);
    }
    if (game.combo >= 3) {
      c.font = `700 ${Math.round(this.fs * 0.85)}px ${DISPLAY_FONT}`;
      c.textAlign = 'left';
      c.textBaseline = 'middle';
      c.fillStyle = rgba(AMBER, 0.95);
      c.fillText('×' + game.combo, tx + 64, ty + 2);
    }
  }

  drawEffects(game, fx) {
    const c = this.ctx;
    c.globalCompositeOperation = 'lighter';

    // Disparos por letra
    for (const b of fx.bolts) {
      const k = b.life / b.max;
      c.strokeStyle = rgba(CYAN, 0.35 * k);
      c.lineWidth = 5;
      c.beginPath(); c.moveTo(b.x0, b.y0); c.lineTo(b.x1, b.y1); c.stroke();
      c.strokeStyle = rgba(WHITE, 0.9 * k);
      c.lineWidth = 1.3;
      c.stroke();
    }

    // Rayo láser al completar palabra: tres capas con vibración
    for (const b of fx.beams) {
      const k = b.life / b.max, e = k * k;
      const dx = b.x1 - b.x0, dy = b.y1 - b.y0, len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len, seg = 14;
      const path = (jit) => {
        c.beginPath();
        c.moveTo(b.x0, b.y0);
        for (let i = 1; i < seg; i++) {
          const f = i / seg, j = Math.sin(i * 2.7 + b.seed + game.t * 60) * jit;
          c.lineTo(b.x0 + dx * f + nx * j, b.y0 + dy * f + ny * j);
        }
        c.lineTo(b.x1, b.y1);
      };
      c.lineCap = 'round';
      path(5 * e); c.strokeStyle = rgba(PINK, 0.16 * k); c.lineWidth = 26 * e + 2; c.stroke();
      path(2.5 * e); c.strokeStyle = rgba(PINK, 0.5 * k); c.lineWidth = 10 * e + 1; c.stroke();
      path(0); c.strokeStyle = rgba(WHITE, 0.95 * k); c.lineWidth = 3 * e + 0.6; c.stroke();

      const R = 60 * e + 10;
      const rg = c.createRadialGradient(b.x1, b.y1, 0, b.x1, b.y1, R);
      rg.addColorStop(0, rgba(WHITE, 0.9 * k));
      rg.addColorStop(0.3, rgba(PINK, 0.5 * k));
      rg.addColorStop(1, rgba(PINK, 0));
      c.fillStyle = rg;
      c.beginPath(); c.arc(b.x1, b.y1, R, 0, Math.PI * 2); c.fill();

      const M = 26 * e + 4;
      const mg = c.createRadialGradient(b.x0, b.y0, 0, b.x0, b.y0, M);
      mg.addColorStop(0, rgba(WHITE, 0.9 * k));
      mg.addColorStop(1, rgba(PINK, 0));
      c.fillStyle = mg;
      c.beginPath(); c.arc(b.x0, b.y0, M, 0, Math.PI * 2); c.fill();
      c.lineCap = 'butt';
    }
    c.globalCompositeOperation = 'source-over';

    // Fragmentos del bloque
    for (const s of fx.shards) {
      const a = Math.min(1, (s.life / s.max) * 1.4);
      c.save();
      c.globalAlpha = a;
      c.translate(s.x, s.y);
      c.rotate(s.rot);
      c.drawImage(s.img, s.sx * this.DPR, s.sy * this.DPR, s.sw * this.DPR, s.sh * this.DPR, -s.sw / 2, -s.sh / 2, s.sw, s.sh);
      c.globalCompositeOperation = 'lighter';
      c.strokeStyle = rgba(PINK, 0.7 * a);
      c.lineWidth = 1;
      c.strokeRect(-s.sw / 2, -s.sh / 2, s.sw, s.sh);
      c.restore();
    }

    c.globalCompositeOperation = 'lighter';
    for (const s of fx.sparks) {
      const k = s.life / s.max;
      c.strokeStyle = rgba(s.c, k);
      c.lineWidth = s.w;
      c.beginPath(); c.moveTo(s.x, s.y); c.lineTo(s.x - s.vx * 0.035, s.y - s.vy * 0.035); c.stroke();
    }
    for (const r of fx.rings) {
      const k = r.life / r.max;
      c.strokeStyle = rgba(r.c || PINK, 0.7 * k);
      c.lineWidth = 3 * k + 0.5;
      c.beginPath(); c.arc(r.x, r.y, r.r, 0, Math.PI * 2); c.stroke();
    }
    c.globalCompositeOperation = 'source-over';
  }

  drawPops(fx) {
    const c = this.ctx;
    for (const p of fx.pops) {
      const k = p.life / p.max;
      const sc = 1 + (1 - Math.min(1, (p.max - p.life) * 8)) * 0.4;
      c.save();
      c.globalAlpha = Math.min(1, k * 1.6);
      c.translate(p.x, p.y);
      c.scale(sc, sc);
      c.font = `700 ${Math.round(p.size)}px ${DISPLAY_FONT}`;
      c.textAlign = 'center';
      c.textBaseline = 'bottom';
      c.fillStyle = rgba(p.c, 1);
      c.shadowColor = rgba(p.c, 0.6);
      c.shadowBlur = 12;
      c.fillText(p.text, 0, 0);
      c.restore();
    }
  }

  drawOverlays(game, fx) {
    const c = this.ctx, { W, H, groundY } = this;
    c.textAlign = 'center';
    c.textBaseline = 'middle';

    // Cuenta atrás
    if (game.running && game.count > 0) {
      const n = Math.ceil(game.count), f = game.count - Math.floor(game.count);
      c.save();
      c.translate(W / 2, groundY * 0.45);
      c.scale(1 + f * 0.5, 1 + f * 0.5);
      c.globalAlpha = Math.min(1, f * 2.5 + 0.1);
      c.font = `700 ${Math.round(Math.min(W, H) * 0.22)}px ${DISPLAY_FONT}`;
      c.fillStyle = rgba(CYAN, 1);
      c.shadowColor = rgba(CYAN, 0.7);
      c.shadowBlur = 30;
      c.fillText(String(n), 0, 0);
      c.restore();
    }

    // Carteles (nivel, ¡Ya!)
    for (const b of fx.banners) {
      const age = b.max - b.life;
      const a = Math.min(1, age * 5, b.life * 2.2);
      const sc = 1 + Math.max(0, 0.25 - age) * 1.6;
      c.save();
      c.globalAlpha = a;
      c.translate(W / 2, groundY * 0.42);
      c.scale(sc, sc);
      c.font = `700 ${Math.round(Math.min(64, W * 0.09))}px ${DISPLAY_FONT}`;
      c.fillStyle = '#fff';
      c.shadowColor = rgba(PINK, 0.8);
      c.shadowBlur = 24;
      c.fillText(b.text.toUpperCase(), 0, 0);
      if (b.sub) {
        c.shadowBlur = 0;
        c.font = `600 ${Math.round(Math.min(16, W * 0.035))}px ${DISPLAY_FONT}`;
        c.fillStyle = rgba(AMBER, 0.95);
        c.fillText(b.sub.toUpperCase(), 0, Math.min(48, W * 0.07));
      }
      c.restore();
    }

    if (game.flash) {
      c.fillStyle = rgba(game.flash.c, Math.max(0, game.flash.a));
      c.fillRect(0, 0, W, H);
    }

    // Viñeta
    const vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,8,.45)');
    c.fillStyle = vg;
    c.fillRect(0, 0, W, H);
  }

  render(game, fx) {
    const c = this.ctx, { W, H, DPR, groundY } = this;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (this.bg) c.drawImage(this.bg, 0, 0, W, H);

    for (const s of this.stars) {
      c.fillStyle = `rgba(200,215,255,${0.15 + s.z * 0.55})`;
      const sz = s.z * 1.8;
      c.fillRect(s.x * W, s.y * groundY, sz, sz * (1 + s.z * 2));
    }
    if (!game) return;

    c.save();
    if (game.shake > 0.2) c.translate(rand(-game.shake, game.shake), rand(-game.shake, game.shake));
    this.drawFloor(game);

    for (const w of game.words) {
      const sx = w.shake > 0 ? Math.sin(w.shake * 90) * 4 * w.shake / 0.3 : 0;
      const dist = groundY - (w.y + w.h);
      const danger = dist < 110 ? 1 - Math.max(0, dist) / 110 : 0;
      const isTarget = w === game.target;
      if (isTarget) { c.save(); c.shadowColor = rgba(CYAN, 0.55); c.shadowBlur = 18; }
      this.drawBlock(c, w, w.x + sx, w.y, {
        target: isTarget,
        err: w.err,
        danger: danger > 0 ? danger * (0.6 + 0.4 * Math.sin(game.t * 14)) : 0,
        white: w.dying ? 1 - (w.dieT / 0.09) * 0.3 : w.hit * 2.2,
      });
      if (isTarget) c.restore();
    }
    if (game.target && game.running) this.drawReticle(game, game.target);

    this.drawEffects(game, fx);
    this.drawTurret(game);
    this.drawPops(fx);
    c.restore();

    this.drawOverlays(game, fx);
  }
}
