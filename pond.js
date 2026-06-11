// pond.js ─ Fish Pond Publication Visualizer
// Fish size ∝ log(citations) | Hover = tooltip | Click = open paper

// ── Utilities ────────────────────────────────────────────────────

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function lerpAngle(a, b, t) {
  let d = b - a;
  while (d >  Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function shadeColor(hex, amt) {
  const n = parseInt(hex.replace('#',''), 16);
  const r = clamp((n >> 16)         + amt, 0, 255);
  const g = clamp(((n >> 8) & 0xFF) + amt, 0, 255);
  const b = clamp((n & 0xFF)        + amt, 0, 255);
  return `rgb(${r},${g},${b})`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);  ctx.arcTo(x+w, y,   x+w, y+r,   r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x+w,y+h,x+w-r,y+h, r);
  ctx.lineTo(x + r, y + h);  ctx.arcTo(x, y+h, x, y+h-r,     r);
  ctx.lineTo(x, y + r);      ctx.arcTo(x, y,   x+r, y,        r);
  ctx.closePath();
}

// ── Fish Class ───────────────────────────────────────────────────

class Fish {
  constructor(pub, W, H, color) {
    this.pub   = pub;
    this.color = color;
    this.size  = Fish.citeToSize(pub.citations);

    const pad  = this.size * 2.8;
    this.x     = pad + Math.random() * (W - pad * 2);
    this.y     = pad + Math.random() * (H - pad * 2);

    this.angle        = Math.random() * Math.PI * 2;
    this.targetAngle  = this.angle;
    this.speed        = clamp(2.6 - this.size * 0.02, 0.45, 2.2);

    this.wiggleOffset = Math.random() * Math.PI * 2;
    this.wiggleFreq   = 0.055 + Math.random() * 0.04;

    this.turnTimer    = Math.random() * 120;
    this.turnInterval = 80 + Math.random() * 140;

    this.hovered      = false;
    this.glowAlpha    = 0;
  }

  // log scale → [14, 68] px  (tune MAX_CITES for your citation range)
  static citeToSize(n) {
    const MAX_CITES = 300;
    return 14 + clamp(Math.log1p(n) / Math.log1p(MAX_CITES), 0, 1) * 54;
  }

  update(W, H, t) {
    // Random wander
    this.turnTimer++;
    if (this.turnTimer > this.turnInterval) {
      this.targetAngle  += (Math.random() - 0.5) * 1.6;
      this.turnTimer     = 0;
      this.turnInterval  = 80 + Math.random() * 140;
    }

    // Soft wall repulsion
    const m  = this.size * 2.4;
    if (this.x < m)      this.targetAngle = lerpAngle(this.targetAngle, 0,            0.12);
    if (this.x > W - m)  this.targetAngle = lerpAngle(this.targetAngle, Math.PI,      0.12);
    if (this.y < m)      this.targetAngle = lerpAngle(this.targetAngle, Math.PI/2,    0.12);
    if (this.y > H - m)  this.targetAngle = lerpAngle(this.targetAngle, -Math.PI/2,   0.12);

    this.angle  = lerpAngle(this.angle, this.targetAngle, 0.032);
    this.x     += Math.cos(this.angle) * this.speed;
    this.y     += Math.sin(this.angle) * this.speed;
    this.x      = clamp(this.x, this.size, W - this.size);
    this.y      = clamp(this.y, this.size, H - this.size);

    this.glowAlpha = clamp(this.glowAlpha + (this.hovered ? 0.1 : -0.07), 0, 1);
  }

  draw(ctx, t) {
    const s = this.size;
    const w = Math.sin(t * this.wiggleFreq + this.wiggleOffset);

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Glow on hover
    if (this.glowAlpha > 0.01) {
      ctx.shadowColor = this.color;
      ctx.shadowBlur  = 20 * this.glowAlpha;
    }

    // Tail
    ctx.beginPath();
    ctx.moveTo(-s * 0.58, 0);
    ctx.lineTo(-s * 1.1,  w * s * 0.44);
    ctx.lineTo(-s * 1.1, -w * s * 0.44);
    ctx.closePath();
    ctx.fillStyle = shadeColor(this.color, -40);
    ctx.fill();

    // Body
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.68, s * 0.31, 0, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    // Shine
    const shine = ctx.createLinearGradient(0, -s * 0.31, 0, s * 0.31);
    shine.addColorStop(0,    'rgba(255,255,255,0.30)');
    shine.addColorStop(0.5,  'rgba(255,255,255,0.00)');
    shine.addColorStop(1,    'rgba(0,0,0,0.10)');
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.68, s * 0.31, 0, 0, Math.PI * 2);
    ctx.fillStyle = shine;
    ctx.fill();

    // Dorsal fin
    ctx.beginPath();
    ctx.moveTo(-s * 0.05, -s * 0.31);
    ctx.quadraticCurveTo(s * 0.18, -s * 0.58, s * 0.44, -s * 0.31);
    ctx.closePath();
    ctx.fillStyle = shadeColor(this.color, -22);
    ctx.fill();

    // Pectoral fin
    ctx.beginPath();
    ctx.ellipse(s * 0.06, s * 0.22, s * 0.22, s * 0.09, Math.PI * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = shadeColor(this.color, -12);
    ctx.fill();

    // Eye
    ctx.beginPath();
    ctx.arc(s * 0.38, -s * 0.07, s * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = '#111827';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s * 0.40, -s * 0.09, s * 0.036, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();

    ctx.restore();

    // Hover ring
    if (this.glowAlpha > 0.01) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.72 + 5, s * 0.35 + 5, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,240,120,${this.glowAlpha * 0.9})`;
      ctx.lineWidth   = 2.5;
      ctx.stroke();
      ctx.restore();
    }

    // Citation badge (visible on bigger fish or when hovered)
    if (s > 26 || this.hovered) this._drawBadge(ctx, s);
  }

  _drawBadge(ctx, s) {
    const text     = String(this.pub.citations);
    const fontSize = clamp(Math.round(s * 0.28), 9, 13);
    ctx.font       = `700 ${fontSize}px 'Inter', system-ui, sans-serif`;
    ctx.textAlign  = 'center';
    const tw = ctx.measureText(text).width;
    const bw = tw + 10, bh = fontSize + 7;
    const bx = this.x - bw / 2;
    const by = this.y - s * 1.28 - bh;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    roundRect(ctx, bx, by, bw, bh, 4);
    ctx.fill();

    ctx.fillStyle    = '#FFD700';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, this.x, by + bh / 2);
  }

  // Ellipse-accurate click/hover detection
  hitTest(mx, my) {
    const cos = Math.cos(-this.angle), sin = Math.sin(-this.angle);
    const dx  = mx - this.x,          dy  = my - this.y;
    const lx  = cos * dx - sin * dy,  ly  = sin * dx + cos * dy;
    return (lx / (this.size * 0.72)) ** 2 + (ly / (this.size * 0.34)) ** 2 < 1;
  }
}

// ── Pond Class ───────────────────────────────────────────────────

class Pond {
  constructor(canvasId, tooltipId, publications) {
    this.canvas  = document.getElementById(canvasId);
    this.ctx     = this.canvas.getContext('2d');
    this.tooltip = document.getElementById(tooltipId);
    this.pubs    = publications;
    this.fish    = [];
    this.bubbles = [];
    this.t       = 0;
    this.active  = null;   // currently hovered fish
    this.bgCache = null;

    this._init();
  }

  _init() {
    this._resize();
    this._buildFish();
    this._buildBubbles();
    this._bakeBg();
    this._events();
    this._loop();
  }

  _resize() {
    const sync = () => {
      const parent = this.canvas.parentElement;
      this.canvas.width  = Math.min(parent.clientWidth, 960);
      this.canvas.height = Math.round(this.canvas.width * 0.46);
      this._bakeBg();
    };
    sync();
    window.addEventListener('resize', sync);
  }

  _buildFish() {
    const PALETTE = [
      '#FF6B6B','#FF8C42','#FFCA3A','#6BCB77',
      '#4D96FF','#C77DFF','#FF9EAA','#56CFE1',
      '#F72585','#B5E48C','#FFBA08','#3A86FF'
    ];
    const { width: W, height: H } = this.canvas;
    this.fish = this.pubs.map((p, i) =>
      new Fish(p, W, H, PALETTE[i % PALETTE.length])
    );
  }

  _buildBubbles() {
    const { width: W, height: H } = this.canvas;
    this.bubbles = Array.from({ length: 20 }, () => ({
      x:      Math.random() * W,
      y:      Math.random() * H,
      r:      0.8 + Math.random() * 2.2,
      speed:  0.22 + Math.random() * 0.42,
      phase:  Math.random() * Math.PI * 2
    }));
  }

  // Pre-render static background once (perf win)
  _bakeBg() {
    const W = this.canvas.width, H = this.canvas.height;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');

    // Water gradient
    const bg = ctx.createRadialGradient(W*.5, H*.35, 0, W*.5, H*.5, Math.hypot(W,H)*.6);
    bg.addColorStop(0,   '#1e8099');
    bg.addColorStop(0.6, '#0e5568');
    bg.addColorStop(1,   '#062b38');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Static ripple lines
    ctx.strokeStyle = 'rgba(255,255,255,0.045)';
    ctx.lineWidth   = 1;
    for (let i = 1; i < 9; i++) {
      ctx.beginPath();
      const fy = (i / 9) * H;
      ctx.moveTo(0, fy);
      ctx.bezierCurveTo(W * .3, fy - 12, W * .7, fy + 12, W, fy);
      ctx.stroke();
    }

    // Lily pads
    [
      [0.10, 0.20, 22], [0.80, 0.70, 18], [0.60, 0.10, 15],
      [0.35, 0.85, 20], [0.88, 0.32, 16], [0.52, 0.58, 12]
    ].forEach(([rx, ry, r]) => _bakeLilyPad(ctx, rx * W, ry * H, r));

    this.bgCache = c;
  }

  _events() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const sx   = this.canvas.width  / rect.width;
      const sy   = this.canvas.height / rect.height;
      return { mx: (e.clientX - rect.left) * sx, my: (e.clientY - rect.top) * sy };
    };

    this.canvas.addEventListener('mousemove', (e) => {
      const { mx, my } = getPos(e);
      let hit = null;
      for (let i = this.fish.length - 1; i >= 0; i--) {
        if (this.fish[i].hitTest(mx, my)) { hit = this.fish[i]; break; }
      }
      this.fish.forEach(f => f.hovered = f === hit);

      if (hit !== this.active) {
        this.active = hit;
        this.canvas.style.cursor = hit ? 'pointer' : 'default';
        hit ? this._showTip(hit, e) : this._hideTip();
      } else if (hit) {
        this._moveTip(e);
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.fish.forEach(f => f.hovered = false);
      this.active = null;
      this._hideTip();
    });

    this.canvas.addEventListener('click', () => {
      if (this.active?.pub.url) window.open(this.active.pub.url, '_blank');
    });
  }

  _showTip(fish, e) {
    const p = fish.pub;
    this.tooltip.innerHTML = `
      <span class="tip-title">${p.title}</span>
      <span class="tip-authors">${p.authors}</span>
      <span class="tip-meta">${p.venue} &middot; ${p.year}</span>
      <span class="tip-cites">📚 <strong>${p.citations}</strong> citation${p.citations !== 1 ? 's' : ''}</span>
    `;
    this._moveTip(e);
    this.tooltip.classList.add('visible');
  }

  _moveTip(e) {
    const PAD = 16, tw = this.tooltip.offsetWidth || 250, th = this.tooltip.offsetHeight || 100;
    let x = e.clientX + PAD, y = e.clientY - PAD;
    if (x + tw > window.innerWidth  - 8) x = e.clientX - tw - PAD;
    if (y + th > window.innerHeight - 8) y = e.clientY - th - PAD;
    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top  = `${y}px`;
  }

  _hideTip() { this.tooltip.classList.remove('visible'); }

  _loop() {
    this.t++;
    const ctx = this.ctx;
    const { width: W, height: H } = this.canvas;

    // Background
    if (this.bgCache) ctx.drawImage(this.bgCache, 0, 0);

    // Animated shimmer
    for (let i = 0; i < 3; i++) {
      const x = ((this.t * 0.45 + i * 290) % (W + 180)) - 90;
      const y = H * 0.22 + Math.sin(this.t * 0.011 + i * 2.2) * H * 0.2;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 80 + i * 22);
      g.addColorStop(0, 'rgba(150,215,255,0.07)');
      g.addColorStop(1, 'rgba(150,215,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }

    // Bubbles
    for (const b of this.bubbles) {
      b.y    -= b.speed;
      b.phase += 0.025;
      b.x    += Math.sin(b.phase) * 0.35;
      if (b.y + b.r < 0) { b.y = H + b.r; b.x = Math.random() * W; }
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(185,230,255,0.28)';
      ctx.lineWidth   = 0.7;
      ctx.stroke();
    }

    // Fish — larger ones drawn first (appear behind)
    [...this.fish]
      .sort((a, b) => b.size - a.size)
      .forEach(f => { f.update(W, H, this.t); f.draw(ctx, this.t); });

    // Surface caustic overlay
    for (let i = 0; i < 5; i++) {
      const x = W * (0.12 + i * 0.19) + Math.sin(this.t * 0.007 + i * 1.4) * 26;
      const y = H * 0.07 + Math.cos(this.t * 0.005 + i * 2.1) * 16;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 36);
      g.addColorStop(0, 'rgba(255,255,255,0.04)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }

    requestAnimationFrame(() => this._loop());
  }
}

// ── Lily pad helper ──────────────────────────────────────────────

function _bakeLilyPad(ctx, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.random() * Math.PI * 2);

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, r, 0.4, Math.PI * 2 - 0.4);
  ctx.closePath();
  ctx.fillStyle   = 'rgba(35,105,52,0.75)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(22,72,34,0.4)';
  ctx.lineWidth   = 0.8;
  ctx.stroke();

  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.strokeStyle = 'rgba(22,72,34,0.28)';
    ctx.lineWidth   = 0.6;
    ctx.stroke();
  }
  ctx.restore();
}

// ── Boot ─────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  new Pond('pondCanvas', 'fishTooltip', PUBLICATIONS);
});
