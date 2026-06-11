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
  ctx.lineTo(x + w - r, y);     ctx.arcTo(x+w, y,   x+w, y+r,   r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
  ctx.lineTo(x + r, y + h);     ctx.arcTo(x, y+h,   x, y+h-r,   r);
  ctx.lineTo(x, y + r);         ctx.arcTo(x, y,     x+r, y,      r);
  ctx.closePath();
}

// ── Fish ─────────────────────────────────────────────────────────
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

    // ── SLOWER speed ──────────────────────────────────────────────
    this.speed        = clamp(0.85 - this.size * 0.007, 0.12, 0.65);

    this.wiggleOffset = Math.random() * Math.PI * 2;
    this.wiggleFreq   = 0.038 + Math.random() * 0.025;   // slower wiggle too

    // ── Longer, gentler turns ─────────────────────────────────────
    this.turnTimer    = Math.random() * 200;
    this.turnInterval = 220 + Math.random() * 280;

    this.hovered   = false;
    this.glowAlpha = 0;
  }

  static citeToSize(n) {
    const MAX = 100;
    return 14 + clamp(Math.log1p(n) / Math.log1p(MAX), 0, 1) * 54;
  }

  update(W, H) {
    // Random gentle wander
    this.turnTimer++;
    if (this.turnTimer > this.turnInterval) {
      this.targetAngle  += (Math.random() - 0.5) * 0.9;  // subtle turns
      this.turnTimer     = 0;
      this.turnInterval  = 220 + Math.random() * 280;
    }

    // Soft wall repulsion
    const m = this.size * 2.4;
    if (this.x < m)      this.targetAngle = lerpAngle(this.targetAngle, 0,          0.08);
    if (this.x > W - m)  this.targetAngle = lerpAngle(this.targetAngle, Math.PI,    0.08);
    if (this.y < m)      this.targetAngle = lerpAngle(this.targetAngle, Math.PI/2,  0.08);
    if (this.y > H - m)  this.targetAngle = lerpAngle(this.targetAngle, -Math.PI/2, 0.08);

    this.angle  = lerpAngle(this.angle, this.targetAngle, 0.022);
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

    if (this.glowAlpha > 0.01) {
      ctx.shadowColor = this.color;
      ctx.shadowBlur  = 18 * this.glowAlpha;
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
    const shine = ctx.createLinearGradient(0, -s*0.31, 0, s*0.31);
    shine.addColorStop(0,   'rgba(255,255,255,0.28)');
    shine.addColorStop(0.5, 'rgba(255,255,255,0.00)');
    shine.addColorStop(1,   'rgba(0,0,0,0.10)');
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.68, s * 0.31, 0, 0, Math.PI * 2);
    ctx.fillStyle = shine;
    ctx.fill();

    // Dorsal fin
    ctx.beginPath();
    ctx.moveTo(-s*0.05, -s*0.31);
    ctx.quadraticCurveTo(s*0.18, -s*0.58, s*0.44, -s*0.31);
    ctx.closePath();
    ctx.fillStyle = shadeColor(this.color, -22);
    ctx.fill();

    // Pectoral fin
    ctx.beginPath();
    ctx.ellipse(s*0.06, s*0.22, s*0.22, s*0.09, Math.PI*0.3, 0, Math.PI*2);
    ctx.fillStyle = shadeColor(this.color, -12);
    ctx.fill();

    // Eye
    ctx.beginPath();
    ctx.arc(s*0.38, -s*0.07, s*0.1, 0, Math.PI*2);
    ctx.fillStyle = '#1a2e20';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s*0.40, -s*0.09, s*0.036, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();

    ctx.restore();

    // Hover ring
    if (this.glowAlpha > 0.01) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.beginPath();
      ctx.ellipse(0, 0, s*0.72+5, s*0.35+5, 0, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(230,185,100,${this.glowAlpha*0.9})`;
      ctx.lineWidth   = 2;
      ctx.stroke();
      ctx.restore();
    }

    // Citation badge (only on larger or hovered fish)
    if (s > 26 || this.hovered) {
      const text     = String(this.pub.citations);
      const fontSize = clamp(Math.round(s * 0.28), 9, 13);
      ctx.font       = `700 ${fontSize}px 'Source Sans 3', system-ui, sans-serif`;
      ctx.textAlign  = 'center';
      const tw = ctx.measureText(text).width;
      const bw = tw + 10, bh = fontSize + 7;
      const bx = this.x - bw/2, by = this.y - s*1.28 - bh;
      ctx.fillStyle = 'rgba(15,35,22,0.72)';
      roundRect(ctx, bx, by, bw, bh, 4);
      ctx.fill();
      ctx.fillStyle    = '#e8c46a';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, this.x, by + bh/2);
    }
  }

  hitTest(mx, my) {
    const cos = Math.cos(-this.angle), sin = Math.sin(-this.angle);
    const dx = mx - this.x, dy = my - this.y;
    const lx = cos*dx - sin*dy, ly = sin*dx + cos*dy;
    return (lx/(this.size*0.72))**2 + (ly/(this.size*0.34))**2 < 1;
  }
}

// ── Pond ─────────────────────────────────────────────────────────
class Pond {
  constructor(canvasId, tooltipId, publications) {
    this.canvas  = document.getElementById(canvasId);
    this.ctx     = this.canvas.getContext('2d');
    this.tooltip = document.getElementById(tooltipId);
    this.pubs    = publications;
    this.fish    = [];
    this.bubbles = [];
    this.t       = 0;
    this.active  = null;
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
    // ── Earthy palette to match the site's forest-green + rust theme ──
    const PALETTE = [
      '#c8734a',   // rust/terracotta — matches site accent
      '#d4956a',   // warm peach
      '#e8b84b',   // warm gold
      '#7ab87a',   // sage green
      '#4e9e72',   // forest green
      '#b07d4a',   // warm brown
      '#6aaa85',   // muted teal-green
      '#d4886a',   // salmon
      '#a3c98a',   // light sage
      '#c9873c',   // amber
      '#5a8f6e',   // deep sage
      '#dba96e'    // warm tan
    ];
    const {width: W, height: H} = this.canvas;
    this.fish = this.pubs.map((p, i) => new Fish(p, W, H, PALETTE[i % PALETTE.length]));
  }

  _buildBubbles() {
    const {width: W, height: H} = this.canvas;
    this.bubbles = Array.from({length: 16}, () => ({
      x:     Math.random() * W,
      y:     Math.random() * H,
      r:     0.8 + Math.random() * 2.0,
      speed: 0.15 + Math.random() * 0.28,   // slow bubbles too
      phase: Math.random() * Math.PI * 2
    }));
  }

  // ── Background: deep forest pond, earthier greens ──
  _bakeBg() {
    const W = this.canvas.width, H = this.canvas.height;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');

    // Forest pond gradient — deep greens matching site palette
    const bg = ctx.createRadialGradient(W*.5, H*.38, 0, W*.5, H*.5, Math.hypot(W,H)*.62);
    bg.addColorStop(0,   '#1e6b50');   // deep forest teal
    bg.addColorStop(0.5, '#124535');   // dark forest green
    bg.addColorStop(1,   '#071e12');   // near black-green
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle horizontal water lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth   = 1;
    for (let i = 1; i < 9; i++) {
      const fy = (i/9)*H;
      ctx.beginPath();
      ctx.moveTo(0, fy);
      ctx.bezierCurveTo(W*.3, fy-10, W*.7, fy+10, W, fy);
      ctx.stroke();
    }

    // Lily pads — richer greens
    [
      [0.10, 0.20, 22], [0.80, 0.70, 18], [0.60, 0.10, 15],
      [0.35, 0.85, 20], [0.88, 0.32, 16], [0.52, 0.58, 12]
    ].forEach(([rx, ry, r]) => {
      ctx.save();
      ctx.translate(rx*W, ry*H);
      ctx.rotate(Math.random() * Math.PI * 2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, 0.4, Math.PI*2-0.4);
      ctx.closePath();
      ctx.fillStyle   = 'rgba(28,82,42,0.82)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(15,50,24,0.5)';
      ctx.lineWidth   = 0.9;
      ctx.stroke();
      // Veins
      for (let i = 0; i < 7; i++) {
        const a = (i/7)*Math.PI*2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
        ctx.strokeStyle = 'rgba(15,50,24,0.3)';
        ctx.lineWidth   = 0.5;
        ctx.stroke();
      }
      ctx.restore();
    });

    this.bgCache = c;
  }

  _events() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      return {
        mx: (e.clientX - rect.left) * (this.canvas.width  / rect.width),
        my: (e.clientY - rect.top)  * (this.canvas.height / rect.height)
      };
    };

    this.canvas.addEventListener('mousemove', (e) => {
      const {mx, my} = getPos(e);
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
      if (this.active && this.active.pub.url) window.open(this.active.pub.url, '_blank');
    });
  }

  // ── Tooltip: title + journal only ────────────────────────────
  _showTip(fish, e) {
    const p = fish.pub;
    this.tooltip.innerHTML = `
      <span class="tip-title">${p.title}</span>
      <span class="tip-meta"><em>${p.venue}</em> &middot; ${p.year}</span>
      <span class="tip-cites">${p.citations} citation${p.citations !== 1 ? 's' : ''}</span>
    `;
    this._moveTip(e);
    this.tooltip.classList.add('visible');
  }

  _moveTip(e) {
    const PAD = 16;
    const tw  = this.tooltip.offsetWidth  || 260;
    const th  = this.tooltip.offsetHeight || 80;
    let x = e.clientX + PAD;
    let y = e.clientY - PAD;
    if (x + tw > window.innerWidth  - 8) x = e.clientX - tw - PAD;
    if (y + th > window.innerHeight - 8) y = e.clientY - th - PAD;
    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top  = `${y}px`;
  }

  _hideTip() { this.tooltip.classList.remove('visible'); }

  _loop() {
    this.t++;
    const ctx = this.ctx;
    const {width: W, height: H} = this.canvas;

    if (this.bgCache) ctx.drawImage(this.bgCache, 0, 0);

    // Slow shimmer
    for (let i = 0; i < 3; i++) {
      const x = ((this.t*0.32 + i*310) % (W+200)) - 100;
      const y = H*0.25 + Math.sin(this.t*0.008 + i*2.1)*H*0.18;
      const g = ctx.createRadialGradient(x,y,0, x,y,90+i*20);
      g.addColorStop(0, 'rgba(120,200,160,0.055)');
      g.addColorStop(1, 'rgba(120,200,160,0)');
      ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    }

    // Bubbles
    for (const b of this.bubbles) {
      b.y    -= b.speed;
      b.phase += 0.02;
      b.x    += Math.sin(b.phase) * 0.3;
      if (b.y + b.r < 0) { b.y = H + b.r; b.x = Math.random()*W; }
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(160,220,190,0.22)';
      ctx.lineWidth   = 0.7;
      ctx.stroke();
    }

    // Fish — large behind small
    [...this.fish]
      .sort((a,b) => b.size - a.size)
      .forEach(f => { f.update(W, H); f.draw(ctx, this.t); });

    // Subtle surface caustics
    for (let i = 0; i < 4; i++) {
      const x = W*(0.14+i*0.22) + Math.sin(this.t*0.006+i*1.5)*22;
      const y = H*0.06 + Math.cos(this.t*0.004+i*2.2)*14;
      const g = ctx.createRadialGradient(x,y,0, x,y,32);
      g.addColorStop(0, 'rgba(255,255,255,0.032)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    }

    requestAnimationFrame(() => this._loop());
  }
}

// ── Boot ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (typeof PUBLICATIONS === 'undefined') {
    console.error('Pond: PUBLICATIONS not defined — check script order');
    return;
  }
  if (!document.getElementById('pondCanvas')) {
    console.error('Pond: #pondCanvas not found');
    return;
  }
  new Pond('pondCanvas', 'fishTooltip', PUBLICATIONS);
});
