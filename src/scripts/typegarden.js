(() => {
'use strict';

// ---------- the knobs ----------
const CFG = {
  boil: true,      // line jitter, redrawn ~8x a second
  recoil: 20,      // how far a cut stem snaps back
  density: 1,      // 0.5 sparse … 1.6 lush
  flyEvery: 9000,  // average ms between butterflies arriving on their own (0.6x to 1.4x)
  lineHeight: 1.4, // space between lines, in type sizes (was 2.1; 1.2 is tight, 2 is airy)
  showHint: true
};
const FONT = '"Playfair Display",Georgia,serif';

const PRESETS = [
  { id: 'breathe', label: 'Breathe', sub: 'Slow sway · 3s', T: 3000 },
  { id: 'grow', label: 'Grow & wither', sub: 'Bloom, then back · 6s', T: 6000 },
  { id: 'typed', label: 'Typed', sub: 'Type, cut, repeat · 5s', T: 5000 },
  { id: 'wind', label: 'Gust', sub: 'Wind sweeps through · 4s', T: 4000 },
  { id: 'reach', label: 'Reach', sub: 'Stems follow a light · 6s', T: 6000 },
  { id: 'scatter', label: 'Scatter', sub: 'Random bloom, fade · 6s', T: 6000 },
  { id: 'visit', label: 'Visitor', sub: 'Butterfly drops by · 7s', T: 7000 }
];
// name, background, flower, stem & leaf, flower line, type
const PAL = [
  ['Rose noir', '#000000', '#FF1400', '#3257FF', '#FFB4A8', '#FFFFFF'],
  ['Paper', '#F3EEE4', '#FF3B1F', '#1C2B8F', '#FFD2C4', '#111111'],
  ['Midnight', '#0D1B4C', '#FF5A4E', '#9FB4FF', '#FFD6CF', '#FFFFFF'],
  ['Citrus', '#0E1A12', '#FF8A00', '#1FA463', '#FFE2B8', '#FFF6E8'],
  ['Orchid', '#140A1F', '#E63CFF', '#2FB8A6', '#F9D1FF', '#FFFFFF'],
  ['Moss', '#133A2A', '#FFB7C5', '#7FD18B', '#FFFFFF', '#F6F1E7'],
  ['Tomato', '#FF1400', '#FFF1E0', '#0B0B0B', '#FF1400', '#000000'],
  ['Butter', '#FFE9A8', '#E4002B', '#0F5132', '#FFC2C2', '#1A1A1A'],
  ['Blush', '#FAD4D8', '#C8102E', '#274690', '#FFE3E6', '#1A1A1A'],
  ['Mono', '#000000', '#F2F2F2', '#6E6E6E', '#000000', '#FFFFFF'],
  ['Lavender', '#E6DFF5', '#6B3FD4', '#1F7A5C', '#D8C8FF', '#1B1235'],
  ['Sunset', '#1A0B2E', '#FF6B35', '#FFD166', '#FFD9B8', '#FFF4E6'],
  ['Ocean', '#04202C', '#FF8FA3', '#2EC4B6', '#FFD6DD', '#E8F7F5'],
  ['Mint', '#DDF3E4', '#E63B6F', '#0B6E4F', '#FFD3E0', '#0F2A1D'],
  ['Candy', '#FFD6E8', '#EE1C84', '#6C2BD9', '#FFF0F7', '#2B0A3D'],
  ['Ink & gold', '#0B1020', '#F2C14E', '#5C7CFA', '#FFF1C9', '#F6F1E1'],
  ['Peach', '#FFDCC2', '#E8452C', '#2B4C7E', '#FFE9D9', '#2A1208'],
  ['Sepia', '#2B1D14', '#E9B872', '#8FB996', '#FBE7C6', '#F5E6D0'],
  ['Neon', '#0A0A12', '#39FF14', '#FF2BD6', '#D8FFCC', '#FFFFFF'],
  ['Sky', '#CFE8FF', '#F0403C', '#1D3FA6', '#FFD7D6', '#0B1B3A'],
  ['Sage', '#CAD7BD', '#C2185B', '#2F4F2F', '#F6D5E3', '#1E2B1E']
];
const FLOWERS = [['rose', 'Rose'], ['daisy', 'Daisy'], ['tulip', 'Tulip'], ['poppy', 'Poppy'], ['sunflower', 'Sunflower'], ['lotus', 'Lotus'], ['cosmos', 'Cosmos'], ['lily', 'Lily'], ['mixed', 'Mixed']];
const KINDS = FLOWERS.map(f => f[0]).filter(k => k !== 'mixed');
const RATIOS = [
  { id: '1:1', label: '1:1', sub: 'Instagram post', w: 1080, h: 1080 },
  { id: '4:5', label: '4:5', sub: 'Instagram portrait', w: 1080, h: 1350 },
  { id: '9:16', label: '9:16', sub: 'Stories · Reels · TikTok', w: 1080, h: 1920 },
  { id: '16:9', label: '16:9', sub: 'X · YouTube · landscape', w: 1920, h: 1080 }
];
const SENT = String.fromCharCode(0x200b); // sentinel so Backspace on an empty field still reports
const $ = id => document.getElementById(id);

class Garden {
  constructor() {
    this.app = $('app'); this.cv = $('cv'); this.inp = $('inp'); this.pcv = $('pcv');
    this.bar = $('bar'); this.poster = $('poster'); this.modes = $('modes'); this.ctrls = $('ctrls');
    this.s = { mode: 'type', preset: 'breathe', palette: 0, flower: 'rose', ratio: '1:1', text: 'in bloom', seed: 7, status: '', busy: false };
    this.letters = []; this.uid = 1; this.cache = {}; this.Sd = 0; this.St = 0; this.wrapped = false;
    this.t0 = performance.now(); this.lastKey = 0; this.rand = Math.random;
    this.g = this.cv.getContext('2d');
    this.fa = {}; this.mx = null; this.flies = []; this.perch = []; this.gifts = [];
    this.vvMax = 0;
    this.init();
  }

  init() {
    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);
    this.resize();
    window.addEventListener('keydown', e => this.key(e));
    window.addEventListener('pointermove', e => { this.mx = e.clientX; this.my = e.clientY; });
    document.addEventListener('pointerleave', () => { this.mx = null; });
    document.addEventListener('mouseout', e => { if (!e.relatedTarget) this.mx = null; });

    // phone
    this.touch = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
    if (this.touch) document.documentElement.setAttribute('data-touch', '');
    document.documentElement.setAttribute('data-mode', this.s.mode);
    this.ptype = 'mouse';
    window.addEventListener('pointerdown', e => { this.ptype = e.pointerType || 'mouse'; }, true);
    const relax = e => { if (e.pointerType && e.pointerType !== 'mouse') this.mx = null; };
    window.addEventListener('pointerup', relax);
    window.addEventListener('pointercancel', relax);

    const fld = this.inp;
    this.iv = SENT; fld.value = SENT;
    fld.addEventListener('input', e => this.inputDiff(e.target));
    fld.addEventListener('compositionstart', () => { this.composing = true; });
    fld.addEventListener('compositionend', () => { this.composing = false; setTimeout(() => { if (!this.composing) this.inputDiff(fld); }, 0); });
    this.vv = window.visualViewport || null;
    if (this.vv && this.touch) {
      this.vv.addEventListener('resize', () => this.syncVV());
      this.vv.addEventListener('scroll', () => {
        if (this.s.mode === 'type' && document.documentElement.hasAttribute('data-kb')) {
          this.syncVV();
        }
      });
      this.syncVV();
    }

    // focus + butterflies
    this.app.addEventListener('pointerdown', ev => {
      if (this.s.mode !== 'type') return;
      const touch = ev.pointerType && ev.pointerType !== 'mouse', onCanvas = ev.target === this.cv;
      if (touch) { if (ev.cancelable && (onCanvas || (ev.target.closest && ev.target.closest('button')))) ev.preventDefault(); }
      else this.inp.focus({ preventScroll: true });
      if (onCanvas) this.spawnFly(ev.clientX, ev.clientY);
    });
    this.app.addEventListener('click', ev => {
      if (this.s.mode === 'type' && this.ptype !== 'mouse' && ev.target === this.cv) this.inp.focus({ preventScroll: true });
    });
    // double-click / double-tap leaves a rose
    window.addEventListener('pointerdown', e => {
      if (this.s.mode !== 'type' || e.target !== this.cv) return;
      const now = performance.now(), lp = this.lastTap;
      this.lastTap = { t: now, x: e.clientX, y: e.clientY };
      if (lp && now - lp.t < 340 && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) < 40 && now - (this.lastPlant || 0) > 1800) {
        this.lastPlant = now; this.lastTap = null;
        this.plantRose({ x: e.clientX / this.W, y: e.clientY / this.H, s: Math.floor(Math.random() * 1e6) });
      }
    });

    // UI
    $('ptext').addEventListener('change', e => this.upd({ text: e.target.value }));
    $('regrow').addEventListener('click', () => this.upd({ seed: Math.floor(Math.random() * 1e6) }));
    $('vid').addEventListener('click', () => this.exportVideo());
    $('frames').addEventListener('click', () => this.exportFrames());
    $('gifbtn').addEventListener('click', () => this.exportGif());

    if (document.fonts) document.fonts.load(`700 100px ${FONT}`).then(() => { this.cache = {}; this.layout(); this.buildPoster(); }).catch(() => {});
    this.vmime = typeof MediaRecorder !== 'undefined' ? ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m)) : null;
    this.buildPoster();
    this.updateUI();
    const loop = () => { this.raf = requestAnimationFrame(loop); this.frame(); };
    loop();
    if (!this.touch) setTimeout(() => this.inp.focus({ preventScroll: true }), 50);
  }

  // ---------- UI ----------
  set(patch, cb) { Object.assign(this.s, patch); this.updateUI(); if (cb) cb(); }
  upd(patch) { this.set(patch); this.buildPoster(); }
  setStatus(t) { this.s.status = t; $('status').textContent = t; }
  refocus() { if (this.ptype === 'mouse' && this.s.mode === 'type') this.inp.focus({ preventScroll: true }); }
  pickPalette(i) { this.set({ palette: i }, () => this.refocus()); }
  updateUI() {
    const s = this.s, pc = this.pal(), isType = s.mode === 'type', pr = this.preset();
    document.documentElement.setAttribute('data-mode', s.mode);
    this.app.style.background = pc.bg;
    this.cv.style.display = isType ? 'block' : 'none';
    this.bar.hidden = !(isType && CFG.showHint);
    this.poster.hidden = isType;
    this.bar.style.color = pc.C.text;
    {
      const h = pc.C.text, rgb = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
      this.bar.style.setProperty('--ui', h);
      this.bar.style.setProperty('--uiline', `rgba(${rgb[0]},${rgb[1]},${rgb[2]},.35)`);
    }
    this.bar.style.setProperty('--uibg', pc.bg);
    $('hdr').style.color = isType ? pc.C.text : '#FFFFFF';
    this.drawMark(pc);

    this.modes.innerHTML = '';
    for (const [id, label] of [['type', 'Type'], ['poster', 'Poster']]) {
      const b = document.createElement('button');
      b.textContent = label;
      b.style.background = s.mode === id ? '#FFFFFF' : 'transparent';
      b.style.color = s.mode === id ? '#000000' : '#BDBDBD';
      b.onclick = () => {
        if (id === 'poster' && s.mode !== 'poster') {
          if (document.activeElement === this.inp) this.inp.blur();
          const t = this.liveText() || s.text;
          $('ptext').value = t;
          window.scrollTo(0, 0);
          this.upd({ mode: 'poster', text: t });
          this.syncVV();
        } else if (id === 'type' && s.mode !== 'type') {
          window.scrollTo(0, 0);
          this.set({ mode: 'type' }, () => {
            this.syncVV();
            this.resize();
            this.inp.focus({ preventScroll: true });
          });
        }
      };
      this.modes.appendChild(b);
    }

    this.buildFooter(pc);

    if (!isType) {
      const rg = $('rgrid'); rg.innerHTML = '';
      RATIOS.forEach(r => {
        const b = document.createElement('button');
        b.className = 'preset';
        b.style.background = s.ratio === r.id ? '#161616' : 'transparent';
        b.style.borderColor = s.ratio === r.id ? '#FFFFFF' : '#2A2A2A';
        b.innerHTML = `<span style="font-size:13px">${r.label}</span><small>${r.sub}</small>`;
        b.onclick = () => this.upd({ ratio: r.id });
        rg.appendChild(b);
      });
      const rt = this.ratio();
      $('explbl').textContent = `Export · ${rt.w} × ${rt.h} loop`;
      $('gifbtn').textContent = `GIF loop · ${Math.round(rt.w / 2)} × ${Math.round(rt.h / 2)}`;
      const fg = $('fgrid'); fg.innerHTML = '';
      FLOWERS.forEach(([id, label]) => {
        const b = document.createElement('button');
        b.className = 'preset';
        b.style.background = s.flower === id ? '#161616' : 'transparent';
        b.style.borderColor = s.flower === id ? '#FFFFFF' : '#2A2A2A';
        b.innerHTML = `<span style="font-size:13px">${label}</span>`;
        b.onclick = () => this.set({ flower: id });
        fg.appendChild(b);
      });
      $('info').textContent = `${this.ratio().id} · ${pr.T / 1000}s loop · 30 fps`;
      const pw = $('presets'); pw.innerHTML = '';
      PRESETS.forEach(p => {
        const b = document.createElement('button');
        b.className = 'preset';
        b.style.background = s.preset === p.id ? '#161616' : 'transparent';
        b.style.borderColor = s.preset === p.id ? '#FFFFFF' : '#2A2A2A';
        b.innerHTML = `<span style="font-size:13px">${p.label}</span><small>${p.sub}</small>`;
        b.onclick = () => this.upd({ preset: p.id });
        pw.appendChild(b);
      });
      const gw = $('pgrid'); gw.innerHTML = '';
      PAL.forEach((p, i) => {
        const b = document.createElement('button');
        b.className = 'pcard'; b.setAttribute('aria-label', p[0]);
        b.style.borderColor = s.palette === i ? '#FFFFFF' : '#2A2A2A';
        b.innerHTML = `<span class="sw2" style="background:${p[1]}"><span style="width:18px;height:18px;border-radius:50%;background:${p[2]}"></span><span style="width:12px;height:12px;border-radius:50%;background:${p[3]};margin-left:-4px"></span><span style="font-family:'Playfair Display',serif;font-weight:700;font-size:18px;color:${p[5]};margin-left:8px">Aa</span></span><span style="padding:0 4px">${p[0]}</span>`;
        b.onclick = () => this.pickPalette(i);
        gw.appendChild(b);
      });
      $('vid').disabled = $('frames').disabled = $('gifbtn').disabled = s.busy;
      $('vid').textContent = this.vmime ? (s.busy ? 'Exporting…' : `Export ${this.vmime.includes('mp4') ? 'MP4' : 'WebM'} loop`) : 'Video export unavailable';
    }
  }

  // the logo mark: a small bloomed rose on a stem, drawn with the garden's own brushes in the current palette
  drawMark(pc) {
    const c = $('mark');
    if (c) {
      const d = window.devicePixelRatio || 1, S = c.clientWidth || 44;
      c.width = c.height = Math.round(S * d);
      this.paintMark(c.getContext('2d'), c.width / 44, pc);
    }
    if (this._fav !== this.s.palette) { this._fav = this.s.palette; this.setFavicon(pc); }
  }
  // the rose on a 44-unit grid, scaled by k
  paintMark(g, k, pc) {
    g.setTransform(k, 0, 0, k, 0, 0);
    const B = this.backend(g), C = pc.C; this.cc = C;
    B.stroke([[22, 42], [20.5, 33], [22, 25]], C.blue, 2.2);
    this.leaf(B, 21, 36, -0.5, 12, 0.3);
    this.leaf(B, 21.5, 31, -2.6, 10, -0.3);
    this.rose(B, 22, 15, 13, 0.15, { ph1: 1.2, ph2: 2.1, turns: 2.2 }, 5000, null);
  }
  // browser-tab icon: the same rose on the palette's background, redrawn when the palette changes
  setFavicon(pc) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = pc.bg; g.beginPath();
    if (g.roundRect) g.roundRect(0, 0, 64, 64, 14); else g.rect(0, 0, 64, 64);
    g.fill();
    this.paintMark(g, 64 / 44, pc);
    const link = $('fav'); if (link) link.href = c.toDataURL('image/png');
  }

  // ---------- footer: flower pills, palette swatches, PNG / SVG ----------
  buildFooter(pc) {
    const s = this.s, c = this.ctrls; c.innerHTML = '';
    const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
    const row1 = el('div', 'crow'), row2 = el('div', 'crow');

    const fw = el('div', 'fpick'); fw.style.background = pc.bg;
    FLOWERS.forEach(([id, label]) => {
      const b = el('button', null, label);
      b.style.background = s.flower === id ? pc.C.text : 'transparent';
      b.style.color = s.flower === id ? pc.bg : 'inherit';
      b.onclick = e => { e.stopPropagation(); this.set({ flower: id }, () => this.refocus()); };
      fw.appendChild(b);
    });
    row1.appendChild(fw);

    const pw = el('div'); pw.setAttribute('data-tg', 'pal'); pw.style.background = pc.bg;
    PAL.forEach((p, i) => {
      const b = el('button', null, `<span data-tg="dot" style="background:${p[2]}"></span>`);
      b.setAttribute('data-tg', 'sw'); b.setAttribute('aria-label', p[0]); b.title = p[0];
      b.style.background = p[1];
      b.style.border = '1.5px solid ' + (s.palette === i ? pc.C.text : p[1] === pc.bg ? 'var(--uiline)' : 'transparent');
      b.style.transform = `scale(${s.palette === i ? 1.1 : 1})`;
      b.onclick = e => { e.stopPropagation(); this.pickPalette(i); };
      pw.appendChild(b);
    });
    row2.appendChild(pw);

    const png = el('button', 'pill', 'PNG'), svg = el('button', 'pill', 'SVG');
    png.onclick = () => { this.savePNG(); this.refocus(); };
    svg.onclick = () => { this.saveSVG(); this.refocus(); };
    const btns = el('div', 'btns'); btns.appendChild(png); btns.appendChild(svg); row2.appendChild(btns);
    c.appendChild(row1); c.appendChild(row2);
  }

  // ---------- butterfly ----------
  spawnFly(cx, cy) {
    if (this.flies.length >= 6) { const o = this.flies.find(f => f.st !== 'leave'); if (o) this.flyOff(o); }
    const taken = new Set(this.flies.filter(f => f.st !== 'leave').map(f => f.pid));
    let best = null, bd = 1e9;
    for (const p of this.perch) { if (taken.has(p.id)) continue; const d = Math.hypot(p.x - cx, p.y - cy); if (d < bd) { bd = d; best = p; } }
    const left = cx < this.W / 2, sz = Math.max(9, this.Sd * 0.09);
    this.flies.push({ x: left ? -40 : this.W + 40, y: cy + (Math.random() - 0.5) * this.H * 0.4, vx: 0, vy: 0,
      st: best ? 'fly' : 'wander', pid: best ? best.id : null, hx: cx, hy: cy, t0: performance.now(), ph: Math.random() * 6, sz, seed: Math.random() * 100, ang: 0 });
  }
  flyOff(f) { f.st = 'leave'; f.pid = null; f.ex = f.x < this.W / 2 ? -80 : this.W + 80; f.ey = f.y - this.H * 0.3; }
  drawFlies(B, now, C) {
    const dt = Math.min(48, now - (this._fl || now)); this._fl = now;
    const byId = {}; for (const p of this.perch) byId[p.id] = p;
    this.flies = this.flies.filter(f => {
      const t = (now - f.t0) / 1000;
      let tx, ty;
      if (f.st === 'sit' || f.st === 'fly') {
        const p = byId[f.pid];
        if (!p) { this.flyOff(f); }
        else { tx = p.x + p.R * 0.05; ty = p.y - p.R * 0.55; }
      }
      if (f.st === 'wander') {
        tx = f.hx + Math.sin(t * 1.3 + f.seed) * 70; ty = f.hy + Math.sin(t * 2.1 + f.seed) * 40;
        if (t > 3.5) this.flyOff(f);
      }
      if (f.st === 'leave') { tx = f.ex; ty = f.ey; }
      if (f.st === 'sit') {
        if (now > f.until) { this.flyOff(f); return true; }
        f.x += (tx - f.x) * 0.35; f.y += (ty - f.y) * 0.35; f.ang *= 0.85;
        f.ph += dt * 0.004;
        const burst = Math.sin(now / 1000 * 0.9 + f.seed) > 0.75;
        f.open = burst ? 0.2 + 0.8 * Math.abs(Math.cos(now / 1000 * 9 + f.seed)) : 0.25 + 0.15 * Math.sin(f.ph);
      } else {
        const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy) || 1, sp = f.st === 'leave' ? 0.42 : Math.min(0.34, 0.06 + d * 0.0016);
        const flut = Math.sin(t * 7 + f.seed) * 0.12, wob = Math.cos(t * 4.3 + f.seed) * 0.1;
        const ax = (dx / d * sp + wob) - f.vx, ay = (dy / d * sp + flut) - f.vy;
        f.vx += ax * 0.06 * dt / 16; f.vy += ay * 0.06 * dt / 16;
        f.x += f.vx * dt; f.y += f.vy * dt + Math.sin(t * 13 + f.seed) * 0.6;
        f.ang += (Math.max(-0.5, Math.min(0.5, f.vx * 1.4)) - f.ang) * 0.1;
        f.open = Math.abs(Math.cos(t * 17 + f.seed));
        if (f.st === 'fly' && d < 5) { f.st = 'sit'; f.ph = 0; f.until = now + 3000 + Math.random() * 3500; } // rest a few seconds, then leave
        if (f.st === 'leave' && (f.x < -60 || f.x > this.W + 60 || f.y < -60)) return false;
      }
      this.butterfly(B, f.x, f.y, f.sz, f.ang, f.open, C);
      return true;
    });
  }
  butterfly(B, x, y, s, ang, o, C) {
    const ca = Math.cos(ang), sa = Math.sin(ang), T = (px, py) => [x + (px * ca - py * sa) * s, y + (px * sa + py * ca) * s];
    const wing = (cx, cy, rx, ry, a, side) => {
      const pts = [], c = Math.cos(a), sn = Math.sin(a);
      for (let k = 0; k < 22; k++) { const th = k / 22 * Math.PI * 2, r = 1 + 0.08 * Math.sin(th * 3), lx = Math.cos(th) * rx * r, ly = Math.sin(th) * ry * r; pts.push(T(side * (cx + lx * c - ly * sn) * (0.12 + 0.88 * o), cy + lx * sn + ly * c)); }
      return pts;
    };
    for (const sd of [-1, 1]) {
      B.fill(wing(0.46, 0.28, 0.36, 0.3, 0.5 * sd * sd, sd), C.text);
      B.fill(wing(0.55, -0.32, 0.55, 0.36, -0.55, sd), C.text);
      if (o > 0.35) B.fill(wing(0.66, -0.4, 0.13, 0.11, 0, sd), C.red);
    }
    const body = []; for (let k = 0; k < 18; k++) { const th = k / 18 * Math.PI * 2; body.push(T(Math.cos(th) * 0.08, Math.sin(th) * 0.48)); }
    B.fill(body, C.blue);
    const lw = Math.max(0.8, s * 0.05);
    B.stroke([T(0, -0.42), T(-0.14, -0.72), T(-0.24, -0.86)], C.blue, lw);
    B.stroke([T(0, -0.42), T(0.14, -0.72), T(0.24, -0.86)], C.blue, lw);
  }
  // roses turn their face toward the pointer
  faceTurn(e, x, y) {
    let wx = 0, wy = 0;
    const A = this.near(x, y);
    if (A) {
      const dx = A[0] - x, dy = A[1] - y, d = Math.hypot(dx, dy), reach = 300;
      if (d < reach && d > 0.001) {
        const w = 1 - d / reach, s = w * w * (3 - 2 * w) * Math.min(1, d / 40);
        wx = dx / d * s; wy = dy / d * s;
      }
    }
    const c = this.fa[e.id] || [0, 0];
    c[0] += (wx - c[0]) * 0.09; c[1] += (wy - c[1]) * 0.09;
    this.fa[e.id] = c;
    return c;
  }
  near() { return this.mx != null ? [this.mx, this.my] : null; }
  plantRose(g) {
    const r = this.rng((g.s | 0) || 1);
    this.gifts.push({ x: Math.min(1, Math.max(0, g.x)), y: Math.min(1, Math.max(0, g.y)), t0: performance.now(), rot: (r() - 0.5) * 0.8,
      e: { ph1: r() * 6.283, ph2: r() * 6.283, turns: 1.4 + r() * 0.5 } });
    if (this.gifts.length > 14) this.gifts.shift();
  }

  // ---------- math ----------
  h(n) { const x = Math.sin(n) * 43758.5453; return x - Math.floor(x); }
  spr(t, k = 7, w = 16) { if (t <= 0) return 0; return 1 - Math.exp(-t * k) * Math.cos(t * w); }
  eo(t) { if (t <= 0) return 0; if (t >= 1) return 1; return 1 - Math.pow(1 - t, 3); }
  rng(seed) {
    let s = seed | 0;
    return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  bez(a, b, c, d, n) {
    const P = [];
    for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t;
      P.push([u*u*u*a[0] + 3*u*u*t*b[0] + 3*u*t*t*c[0] + t*t*t*d[0], u*u*u*a[1] + 3*u*u*t*b[1] + 3*u*t*t*c[1] + t*t*t*d[1]]); }
    return P;
  }
  at(P, u) {
    const n = P.length; const i = Math.min(n - 2, Math.max(1, Math.round(u * (n - 1))));
    return [P[i], Math.atan2(P[i+1][1] - P[i-1][1], P[i+1][0] - P[i-1][0])];
  }
  jit(id, f, amp) {
    if (!amp) return [0, 0, 0];
    return [(this.h(id*1.37 + f*7.13)*2 - 1)*amp, (this.h(id*2.71 + f*3.11)*2 - 1)*amp, (this.h(id*5.3 + f*1.7)*2 - 1)*0.035];
  }
  path(c, p, closed) {
    const n = p.length; if (n < 2) return;
    const m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    if (closed) {
      const s = m(p[n-1], p[0]); c.moveTo(s[0], s[1]);
      for (let i = 0; i < n; i++) { const q = m(p[i], p[(i+1) % n]); c.quadraticCurveTo(p[i][0], p[i][1], q[0], q[1]); }
      c.closePath();
    } else {
      c.moveTo(p[0][0], p[0][1]);
      for (let i = 1; i < n - 1; i++) { const q = m(p[i], p[i+1]); c.quadraticCurveTo(p[i][0], p[i][1], q[0], q[1]); }
      c.lineTo(p[n-1][0], p[n-1][1]);
    }
  }
  backend(g) {
    return {
      fill: (p, col) => { g.beginPath(); this.path(g, p, true); g.fillStyle = col; g.fill(); },
      stroke: (p, col, w) => { g.beginPath(); this.path(g, p, false); g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); },
      rect: (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); },
      text: (ch, x, y, S, col) => { g.font = `700 ${S}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = col; g.fillText(ch, x, y); }
    };
  }
  vine(base, dir, len, amp, waves, ph, bend, n) {
    n = n || 40; const P = [[base[0], base[1]]], step = len / n; let x = base[0], y = base[1];
    for (let i = 1; i <= n; i++) {
      const u = i / n, a = dir + bend * u + amp * Math.sin(u * Math.PI * waves + ph) * Math.min(1, u * 3);
      x += Math.cos(a) * step; y += Math.sin(a) * step; P.push([x, y]);
    }
    return P;
  }
  curl(P, sign, rad) {
    const n = P.length, e = P[n - 1], a = Math.atan2(e[1] - P[n - 2][1], e[0] - P[n - 2][0]);
    const c = [e[0] - Math.sin(a) * sign * rad, e[1] + Math.cos(a) * sign * rad];
    const a0 = Math.atan2(e[1] - c[1], e[0] - c[0]);
    for (let i = 1; i <= 14; i++) { const u = i / 14, t = a0 + sign * u * Math.PI * 1.6, rr = rad * (1 - 0.5 * u); P.push([c[0] + Math.cos(t) * rr, c[1] + Math.sin(t) * rr]); }
    return P;
  }
  weave(r, startLayer) {
    const cuts = []; const nc = 1 + Math.floor(r() * 3);
    for (let i = 0; i < nc; i++) cuts.push(0.15 + r() * 0.7);
    cuts.sort((a, b) => a - b);
    const segs = []; let u0 = 0, layer = startLayer;
    for (const c of cuts) {
      if (c <= u0) continue;
      segs.push({ u0, u1: c, layer });
      if (r() < 0.3) { const g = 0.02 + r() * 0.03; u0 = Math.min(0.98, c + g); } else u0 = c;
      layer = 1 - layer;
    }
    segs.push({ u0, u1: 1, layer });
    return segs;
  }
  layerAt(segs, u) { for (const s of segs) if (u >= s.u0 && u <= s.u1) return s.layer; return segs[segs.length - 1].layer; }

  // ---------- layout ----------
  resize() {
    const c = this.cv, r = c.getBoundingClientRect(), d = window.devicePixelRatio || 1;
    if (!r.width) return;
    this.W = r.width; this.H = r.height; this.dpr = d;
    c.width = Math.round(r.width * d); c.height = Math.round(r.height * d);
    this.layout(true);
  }
  mw(ch) {
    if (this.cache[ch] != null) return this.cache[ch];
    this.g.font = `700 100px ${FONT}`;
    let w = this.g.measureText(ch).width / 100;
    if (ch === ' ') w *= 1.4;
    return (this.cache[ch] = w);
  }
  // sets tx/ty/tw on letters; keeps headroom for the garden above and below the type
  layoutCore(A, W, H, prevWrapped, tall) {
    const isMobile = W < 600;
    const maxW = isMobile ? W * 0.72 : W * 0.8;
    const S0 = Math.min(H * 0.28, isMobile ? W * 0.24 : H * 0.28);
    const LH = CFG.lineHeight;
    const ws = A.map(l => l.br ? 0 : this.mw(l.ch));
    const words = []; let cur = null;
    A.forEach((l, i) => {
      if (l.br) { if (cur) { words.push(cur); cur = null; } words.push({ br: true, idx: [i] }); }
      else if (l.ch === ' ') { if (cur) { words.push(cur); cur = null; } words.push({ sp: true, idx: [i] }); }
      else { if (!cur) cur = { idx: [] }; cur.idx.push(i); }
    });
    if (cur) words.push(cur);
    const lineW = (li, S) => { let e = li.length; while (e > 0 && A[li[e-1]].ch === ' ') e--; let w = 0; for (let k = 0; k < e; k++) w += ws[li[k]]; return w * S; };
    const wrap = S => {
      const lines = [[]]; let lw = 0;
      for (const w of words) {
        if (w.br) { lines.push([]); lw = 0; lines[lines.length - 1].push(...w.idx); continue; }
        const ww = w.idx.reduce((s, i) => s + ws[i], 0) * S;
        if (!w.sp && lw > 0 && lw + ww > maxW) { lines.push([]); lw = 0; }
        lines[lines.length - 1].push(...w.idx); lw += ww;
      }
      return lines;
    };
    let lines = [A.map((_, i) => i)];
    const unit = lineW(lines[0], 1);
    let S = unit > 0 ? Math.min(S0, maxW / unit) : S0;
    const multi = words.filter(w => !w.sp && !w.br).length > 1;
    let wrapped = words.some(w => w.br) || (multi && (tall || S < H * 0.1 || (prevWrapped && S < H * 0.14)));
    if (wrapped) {
      let lo = H * 0.03, hi = isMobile ? Math.min(H * 0.12, W * 0.18) : H * 0.15;
      for (let k = 0; k < 22; k++) {
        const mid = (lo + hi) / 2, ls = wrap(mid);
        const ok = ls.every(li => lineW(li, mid) <= maxW) && ls.length * LH * mid <= H * 0.82;
        if (ok) lo = mid; else hi = mid;
      }
      S = lo; lines = wrap(S);
      if (lines.length < 2) wrapped = false;
    }
    const n = lines.length, lh = LH * S;
    lines.forEach((li, k) => {
      let x = W / 2 - lineW(li, S) / 2;
      const y = H / 2 + (k - (n - 1) / 2) * lh + 0.33 * S;
      li.forEach(i => { const l = A[i], w = ws[i] * S; l.tx = x + w / 2; l.ty = y; l.tw = w; l.line = k; x += w; });
    });
    return { S, wrapped, n };
  }
  layout(snap) {
    if (!this.W) return;
    const A = this.letters.filter(l => !l.dead);
    const isMobile = this.W < 600 || this.touch;
    const res = this.layoutCore(A, this.W, this.H, this.wrapped, isMobile || this.H > this.W * 1.25);
    this.wrapped = res.wrapped;

    const hasKb = document.documentElement.hasAttribute('data-kb');
    const topPad = isMobile ? 64 : 50;
    const botPad = hasKb ? 24 : (isMobile ? 150 : 80);
    const sidePad = isMobile ? Math.max(16, this.W * 0.05) : 32;

    const availW = Math.max(100, this.W - sidePad * 2);
    const availH = Math.max(100, this.H - topPad - botPad);
    const targetCenterX = this.W / 2;
    const targetCenterY = topPad + availH / 2;

    const baselineShift = targetCenterY - this.H / 2;
    A.forEach(l => { l.ty += baselineShift; });

    let S = res.S;
    if (A.length > 0) {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      const addP = (l, x, y, r) => {
        const X = l.tx + x * S, Y = l.ty + y * S, R = (r || 0) * S;
        x0 = Math.min(x0, X - R); x1 = Math.max(x1, X + R);
        y0 = Math.min(y0, Y - R); y1 = Math.max(y1, Y + R);
      };
      for (const l of A) {
        if (l.ch === ' ') continue;
        addP(l, -l.tw / S / 2, -0.75); addP(l, l.tw / S / 2, 0.1);
        const all = [...(l.els || []), ...(l.endEls || [])];
        for (const e of all) {
          if (e.t === 'stem') (e.pts || []).forEach(q => addP(l, q[0], q[1], 0.03));
          else if (e.t === 'leaf') addP(l, e.x, e.y, e.L || 0.1);
          else if (e.t === 'flower') addP(l, e.x, e.y, (e.R || 12) / S);
        }
      }
      if (x0 < x1 && y0 < y1) {
        const gw = x1 - x0, gh = y1 - y0;
        const fitW = availW / gw, fitH = availH / gh;
        const fit = Math.min(1, fitW, fitH);
        if (fit < 1) {
          S *= fit;
          const ox = targetCenterX - (x0 + gw / 2) * fit;
          const oy = targetCenterY - (y0 + gh / 2) * fit;
          A.forEach(l => {
            l.tx = l.tx * fit + ox;
            l.ty = l.ty * fit + oy;
            l.tw *= fit;
          });
        }
      }
    }

    A.forEach(l => { if (l.x == null) { l.x = l.tx; l.y = l.ty; } });
    const last = A[A.length - 1];
    this.St = S;
    this.ctx_ = last ? (last.br ? last.tx : last.tx + last.tw / 2 + 0.07 * S) : this.W / 2;
    this.cty = last ? last.ty - 0.33 * S : targetCenterY;
    if (snap || !this.Sd) { this.Sd = S; this.cx = this.ctx_; this.cy = this.cty; A.forEach(l => { l.x = l.tx; l.y = l.ty; }); }
  }

  // ---------- phone: keyboard + visible area ----------
  syncVV() {
    const vv = this.vv; if (!vv) return;
    const de = document.documentElement;
    if (this.s.mode !== 'type') {
      de.removeAttribute('data-kb');
      de.style.removeProperty('--tg-top');
      de.style.removeProperty('--tg-h');
      return;
    }
    const w = Math.round(vv.width);
    if (this.vvW !== w) { this.vvW = w; this.vvMax = 0; }
    this.vvMax = Math.max(this.vvMax, vv.height);
    const kb = this.vvMax - vv.height > 120;
    if (kb) {
      de.setAttribute('data-kb', '');
      de.style.setProperty('--tg-top', Math.round(vv.offsetTop) + 'px');
      de.style.setProperty('--tg-h', Math.round(vv.height) + 'px');
    } else {
      de.removeAttribute('data-kb');
      de.style.removeProperty('--tg-top');
      de.style.removeProperty('--tg-h');
      if (this.kbWas && document.activeElement === this.inp) this.inp.blur();
    }
    const kbChanged = this.kbWas !== kb;
    this.kbWas = kb;
    if (kbChanged || !kb) {
      this.resize();
    }
  }
  liveText() { return (this.letters || []).filter(l => !l.dead).map(l => l.br ? '\n' : l.ch).join('').trim(); }
  wither(now) {
    const A = this.letters.filter(l => !l.dead), last = A[A.length - 1];
    if (!last) return;
    last.dead = now;
    const pv = A[A.length - 2];
    if (pv && pv.ch !== ' ') { pv.cut = null; pv.endEls = null; pv.tb = now; }
    this.layout();
  }
  // phone keyboards often skip real key events and write into the field instead
  inputDiff(el) {
    if (this.s.mode !== 'type' || this._kd) { this.iv = this.composing ? el.value : SENT; if (!this.composing) el.value = SENT; return; }
    const old = this.iv == null ? SENT : this.iv, cur = el.value;
    let p = 0; while (p < old.length && p < cur.length && old[p] === cur[p]) p++;
    let dels = old.length - p;
    if (p === 0 && old[0] === SENT && old.length > 1) dels -= 1;
    const now = performance.now(); this.lastKey = now;
    for (let i = 0; i < dels; i++) this.wither(now);
    for (const ch of cur.slice(p)) {
      if (ch === SENT) continue;
      if (ch.charCodeAt(0) === 10) { this.letters = []; this.gifts = []; this.layout(); } else this.add(ch, now);
    }
    if (this.composing) this.iv = cur; else { el.value = SENT; this.iv = SENT; }
  }

  // ---------- input ----------
  key(e) {
    if (this.s.mode !== 'type') return;
    if (e.metaKey || e.ctrlKey || e.altKey) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); e.shiftKey ? this.saveSVG() : this.savePNG(); }
      return;
    }
    if (e.target && e.target.tagName === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return;
    const now = performance.now();
    const A = this.letters.filter(l => !l.dead), last = A[A.length - 1];
    if (e.key === 'Backspace') {
      e.preventDefault(); this.mark(); if (!last) return;
      last.dead = now;
      const pv = A[A.length - 2];
      if (pv && pv.ch !== ' ') { pv.cut = null; pv.endEls = null; pv.tb = now; }
      this.layout(); return;
    }
    if (e.key === 'Enter') {
      e.preventDefault(); this.mark();
      if (e.shiftKey) { this.add(' ', now, true); return; } // Shift+Enter: line break
      this.letters = []; this.gifts = []; this.layout(); return;
    }
    if (e.key.length !== 1) return;
    e.preventDefault(); this.mark();
    this.add(e.key, now);
  }
  mark() { this.lastKey = performance.now(); this._kd = true; setTimeout(() => { this._kd = false; }, 0); }
  // a break is a space-like letter flagged br: it cuts the word and starts a new line
  add(ch, now, br) {
    const A = this.letters.filter(l => !l.dead), last = A[A.length - 1];
    if (ch === ' ') {
      if (last && last.ch !== ' ') { last.cut = now; this.genEnd(last, now - last.birth); }
      this.letters.push({ ch: ' ', id: this.uid++, birth: now, els: [], br: !!br });
      this.layout(); return;
    }
    const same = last && last.ch !== ' ';
    const l = { ch, id: this.uid++, birth: now, tb: now, ws: same ? last.ws : Math.floor(this.rand() * 1e9), wi: same ? last.wi + 1 : 0, prev: same ? last : null };
    this.gen(l);
    this.letters.push(l);
    this.layout();
  }

  // ---------- growth ----------
  wordParams(ws) {
    const r = this.rng(ws * 7 + 13), dens = CFG.density;
    return { roseP: 0.3 + r() * 0.3, leafy: (0.6 + r() * 0.8) * dens, dens, lean: (r() - 0.5) * 0.6, big: 0.85 + r() * 0.45, curvy: 0.8 + r() * 0.6, bridgeP: Math.min(0.95, (0.45 + r() * 0.35) * dens), w: 0.5 };
  }
  grow(r, E, nid, p, o) {
    const tip = o.tip || (r() < p.roseP ? 'rose' : r() < 0.45 ? 'fan' : r() < 0.6 ? 'leaf' : 'curl');
    let P = o.pts || this.vine(o.base, o.dir, o.len, (0.35 + r() * 0.45) * p.curvy, 1 + r() * 1.6, r() * 6.28, (r() - 0.5) * 1.2, 40);
    if (tip === 'curl') P = this.curl(P, r() < 0.5 ? -1 : 1, 0.05 + r() * 0.05);
    const segs = this.weave(r, o.layer0 != null ? o.layer0 : (r() < 0.5 ? 0 : 1));
    const dur = Math.max(320, (o.len || 0.8) * 620);
    const thorns = []; const nt = Math.floor(r() * 2.5);
    for (let i = 0; i < nt; i++) thorns.push({ u: 0.15 + r() * 0.65, s: r() < 0.5 ? -1 : 1 });
    E.push({ t: 'stem', id: nid(), pts: P, segs, d0: o.d0, dur, w: o.depth ? 0.82 : 1, thorns });
    const nl = Math.floor(r() * 2.8 * p.leafy);
    let sd = r() < 0.5 ? -1 : 1;
    for (let i = 0; i < nl; i++) {
      const u = 0.25 + r() * 0.6, [q, a] = this.at(P, u); sd = -sd;
      E.push({ t: 'leaf', id: nid(), x: q[0], y: q[1], a: a + sd * (0.55 + r() * 0.5), L: (0.14 + r() * 0.2) * (o.depth ? 0.8 : 1), bend: (r() - 0.5) * 1.2, layer: this.layerAt(segs, u), d0: o.d0 + dur * u });
    }
    const [tp, ta] = this.at(P, 1), td = o.d0 + dur * 0.8, tl = this.layerAt(segs, 1);
    if (tip === 'rose') {
      const R = (0.13 + r() * 0.15) * p.big * (o.depth ? 0.75 : 1);
      // legibility: a rose sitting over the letter body mostly goes behind it
      const over = tp[1] > -0.78 && tp[1] < 0.05 && Math.abs(tp[0]) < p.w * 0.5;
      const layer = over ? (r() < 0.22 ? 1 : 0) : (r() < 0.6 ? 1 : tl);
      E.push({ t: 'rose', id: nid(), x: tp[0], y: tp[1], R, rot: (r() - 0.5) * 1.0, ph1: r() * 6.28, ph2: r() * 6.28, turns: 1.8 + r() * 1, layer, d0: td });
      if (r() < 0.2) { const oo = ta + (r() < 0.5 ? 1 : -1) * 1.3; E.push({ t: 'rose', id: nid(), x: tp[0] + Math.cos(oo) * R * 1.4, y: tp[1] + Math.sin(oo) * R * 1.4, R: R * (0.6 + r() * 0.3), rot: (r() - 0.5) * 1.2, ph1: r() * 6.28, ph2: r() * 6.28, turns: 1.8 + r(), layer, d0: td + 120 }); }
    } else if (tip === 'fan') {
      const spread = 0.6 + r() * 0.3;
      for (let j = 0; j < 2; j++) E.push({ t: 'leaf', id: nid(), x: tp[0], y: tp[1], a: ta + (j - 0.5) * spread, L: 0.2 + r() * 0.2, bend: (j - 0.5) * 0.8, layer: tl, d0: td + j * 60 });
    } else if (tip === 'leaf') {
      E.push({ t: 'leaf', id: nid(), x: tp[0], y: tp[1], a: ta + (r() - 0.5) * 0.3, L: 0.16 + r() * 0.16, bend: (r() - 0.5), layer: tl, d0: td });
    }
    if (!o.depth && r() < 0.3) {
      const u = 0.35 + r() * 0.35, [q, a] = this.at(P, u);
      this.grow(r, E, nid, p, { base: q, dir: a + (r() < 0.5 ? -1 : 1) * (0.7 + r() * 0.4), len: (o.len || 0.8) * (0.35 + r() * 0.2), d0: o.d0 + dur * u, depth: 1, layer0: this.layerAt(segs, u) });
    }
    return P;
  }
  gen(l) {
    const r = this.rng((l.ws ^ Math.imul(l.wi + 1, 2654435761)) + Math.floor(this.rand() * 1e6));
    const p = this.wordParams(l.ws), E = []; let k0 = 0; const nid = () => l.id * 100 + (k0++);
    const w = this.mw(l.ch), inX = () => (r() - 0.5) * w * 0.7; p.w = w;
    const nUp = 1 + (r() < 0.45 * p.dens ? 1 : 0);
    for (let i = 0; i < nUp; i++) {
      this.grow(r, E, nid, p, { base: [inX(), -r() * 0.3], dir: -Math.PI / 2 + p.lean * 0.5 + (r() - 0.5) * 0.7, len: 0.6 + r() * 0.5, d0: 40 + i * 130, tip: l.wi === 0 && i === 0 ? 'rose' : null });
    }
    if (r() < 0.4 * p.dens) this.grow(r, E, nid, p, { base: [inX(), -0.1 - r() * 0.35], dir: Math.PI / 2 + (r() - 0.5) * 0.8, len: 0.35 + r() * 0.35, d0: 160 });
    if (l.prev && r() < p.bridgeP) {
      const px = -(this.mw(l.prev.ch) + w) / 2;
      const a = [inX(), -0.05 - r() * 0.55], b = [px + (r() - 0.5) * 0.25, -0.05 - r() * 0.55];
      const bulge = (r() < 0.55 ? -1 : 1) * (0.4 + r() * 0.4), dx = b[0] - a[0];
      let P = this.bez(a, [a[0] + dx * 0.15, a[1] + bulge], [b[0] - dx * 0.15, b[1] + bulge * 0.9], b, 40);
      if (r() < 0.45) P = P.slice(0, Math.floor(P.length * (0.7 + r() * 0.2)));
      this.grow(r, E, nid, p, { pts: P, len: Math.abs(dx) + Math.abs(bulge), d0: 90, tip: r() < 0.5 ? 'curl' : r() < 0.5 ? 'leaf' : 'rose' });
    }
    // bridges reach back to the previous letter, so balance them with a stem reaching forward
    if (r() < p.bridgeP * 0.7) {
      const fx = w * 0.15 + r() * w * 0.2;
      this.grow(r, E, nid, p, { base: [fx, -0.1 - r() * 0.45], dir: -0.55 + (r() - 0.5) * 0.9 + p.lean * 0.3, len: 0.45 + r() * 0.4, d0: 130 });
    }
    // the word-start flourish sweeps either way (the original always swept left)
    if (l.wi === 0) { const left = r() < 0.5; this.grow(r, E, nid, p, { base: [(left ? -1 : 1) * w * 0.3, -0.15 - r() * 0.4], dir: (left ? Math.PI : 0) + (r() - 0.5) * 1.2, len: 0.45 + r() * 0.3, d0: 120, tip: 'curl' }); }
    l.els = E;
    l.endEls = null;
    const T = [], tr = this.rng(l.id * 977 + Math.floor(this.rand() * 1e6));
    this.grow(tr, T, () => l.id * 100 + 90 + T.length, p, { base: [w * 0.25, -0.1 - tr() * 0.45], dir: (tr() - 0.5) * 1.4, len: 0.45 + tr() * 0.25, d0: 0, tip: 'curl', depth: 1 });
    l.tend = T.filter(e => e.t === 'stem').slice(0, 1);
  }
  genEnd(l, rel) {
    const r = this.rng(l.ws + l.wi * 31 + Math.floor(this.rand() * 1e6)), p = this.wordParams(l.ws), E = [];
    let k0 = 50; const nid = () => l.id * 100 + (k0++);
    const w = this.mw(l.ch), n = 1 + Math.floor(r() * 2.5); p.w = w;
    for (let i = 0; i < n; i++) {
      const dir = -Math.PI / 2 + 0.6 + (i - (n - 1) / 2) * 0.9 + (r() - 0.5) * 0.4;
      this.grow(r, E, nid, p, { base: [(r() - 0.2) * w * 0.6, -r() * 0.5], dir, len: 0.4 + r() * 0.45, d0: rel + 40 + i * 90, depth: 1, tip: i === 0 || r() < 0.5 ? 'rose' : 'fan' });
    }
    l.endEls = E;
  }

  // ---------- drawing ----------
  strokeRange(B, P, a, b, col, w) {
    const n = P.length - 1, ia = a * n, ib = b * n;
    const lerp = t => { const i = Math.min(n - 1, Math.floor(t)), f = t - i; return [P[i][0] + (P[i+1][0] - P[i][0]) * f, P[i][1] + (P[i+1][1] - P[i][1]) * f]; };
    const pts = [lerp(ia)];
    for (let i = Math.floor(ia) + 1; i < ib; i++) pts.push(P[i]);
    pts.push(lerp(ib));
    if (pts.length >= 2) B.stroke(pts, col, w);
  }
  thorn(B, P, u, s, S) {
    const [p, a] = this.at(P, u), d = a + s * 2.3, L = S * 0.045;
    B.stroke([p, [p[0] + Math.cos(d) * L, p[1] + Math.sin(d) * L]], this.cc.blue, S * 0.022);
  }
  leaf(B, bx, by, a, L, bend) {
    if (L < 0.5) return;
    const ca = Math.cos(a), sa = Math.sin(a), px = -sa, py = ca;
    const ax = u => { const b = Math.sin(Math.PI * u) * bend * 0.15 * L; return [bx + ca * u * L + px * b, by + sa * u * L + py * b]; };
    const hw = u => L * 0.18 * Math.sin(Math.PI * Math.pow(u, 0.8));
    const N = 12, s1 = [], s2 = [];
    for (let i = 0; i <= N; i++) { const u = i / N, c = ax(u), w = hw(u); s1.push([c[0] + px * w, c[1] + py * w]); s2.push([c[0] - px * w, c[1] - py * w]); }
    const tip = ax(1), base = ax(0);
    B.fill([base, ...s1.slice(1, N), tip, tip, ...s2.slice(1, N).reverse(), base], this.cc.blue);
    if (L > 6) { const v = []; for (let i = 0; i <= 8; i++) v.push(ax(0.08 + 0.72 * i / 8)); B.stroke(v, this.cc.vein, Math.max(0.8, L * 0.03)); }
  }
  rose(B, cx, cy, R, rot, e, a, tl) {
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const tm = tl ? Math.hypot(tl[0], tl[1]) : 0, ux = tm ? tl[0] / tm : 0, uy = tm ? tl[1] / tm : 0, sq = -0.28 * tm;
    const T = (x, y, z = 0) => {
      let dx = x * cr - y * sr, dy = x * sr + y * cr;
      if (tm) { const k = (dx * ux + dy * uy) * sq; dx += k * ux + tl[0] * R * z; dy += k * uy + tl[1] * R * z; }
      return [cx + dx, cy + dy];
    };
    // petals, back to front: [cx, cy, rx, ry, angle, depth, edge]
    const P = [
      [0, -0.36, 0.56, 0.54, 0, 0, 0],
      [-0.5, -0.06, 0.6, 0.6, -0.35, 0, 0],
      [0.52, -0.06, 0.6, 0.6, 0.35, 0, 0],
      [-0.42, 0.3, 0.62, 0.48, 0.2, 0.12, 1],
      [0.47, 0.3, 0.62, 0.48, -0.2, 0.12, 1],
      [0.05, 0.42, 0.56, 0.38, 0, 0.14, 0]
    ];
    const ax0 = 0, ay0 = 0.5, lw = Math.max(0.8, R * 0.045), st = 85;
    P.forEach((q, i) => {
      const s = this.spr((a - i * st) / 1000, 8, 14); if (s <= 0.001) return;
      const open = (1 - Math.min(1, s)) * (q[0] < 0 ? 0.5 : -0.5), ang = q[4] + open, ca = Math.cos(ang), sa = Math.sin(ang);
      const pt = th => {
        const rr = 1 + 0.08 * Math.sin(3 * th + e.ph1 + i) + 0.04 * Math.sin(5 * th + e.ph2);
        const lx = Math.cos(th) * q[2] * rr, ly = Math.sin(th) * q[3] * rr;
        const px = q[0] + lx * ca - ly * sa, py = q[1] + lx * sa + ly * ca;
        return T((ax0 + (px - ax0) * s) * R, (ay0 + (py - ay0) * s) * R, q[5]);
      };
      const pts = []; for (let k = 0; k < 26; k++) pts.push(pt(k / 26 * Math.PI * 2));
      B.fill(pts, this.cc.red);
      if (q[6] && R >= 12 && s > 0.4) {
        const arc = []; for (let k = 0; k <= 14; k++) arc.push(pt(Math.PI * (1.18 + 0.64 * k / 14)));
        this.strokeRange(B, arc, 0, Math.min(1, (s - 0.4) / 0.5), this.cc.line, lw * 0.8);
      }
    });
    const fr = this.eo((a - P.length * st - 80) / 520);
    if (fr > 0 && R > 3) {
      const sp = [], scl = [];
      const turns = R < 20 ? Math.min(e.turns, 1.3) : R < 32 ? e.turns * 0.8 : e.turns;
      for (let i = 0; i <= 70; i++) { const u = i / 70, th = e.ph1 + u * turns * Math.PI * 2, rr = R * (0.08 + 0.57 * u); sp.push(T(Math.cos(th) * rr * 1.05, Math.sin(th) * rr * 0.72 - 0.12 * R, 0.34 - 0.24 * u)); }
      this.strokeRange(B, sp, 0, fr, this.cc.line, lw);
      if (R >= 14) {
        for (let i = 0; i <= 36; i++) { const u = i / 36; scl.push(T((-0.72 + 1.5 * u) * R, 0.36 * R + 0.16 * R * Math.abs(Math.sin(u * Math.PI * 3)), 0.18)); }
        this.strokeRange(B, scl, 0, fr, this.cc.line, lw);
      }
    }
  }

  // ---------- other flowers (the rose above is the original) ----------
  mkT(cx, cy, R, rot, tl) {
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const tm = tl ? Math.hypot(tl[0], tl[1]) : 0, ux = tm ? tl[0] / tm : 0, uy = tm ? tl[1] / tm : 0, sq = -0.28 * tm;
    return (x, y, z = 0) => {
      let dx = x * cr - y * sr, dy = x * sr + y * cr;
      if (tm) { const k = (dx * ux + dy * uy) * sq; dx += k * ux + tl[0] * R * z; dy += k * uy + tl[1] * R * z; }
      return [cx + dx, cy + dy];
    };
  }
  kindOf(e) {
    const f = this.s.flower;
    if (f !== 'mixed') return f;
    return KINDS[Math.floor(e.ph1 * 100) % KINDS.length];
  }
  flower(B, cx, cy, R, rot, e, a, tl) {
    const kind = this.kindOf(e);
    if (kind === 'rose') return this.rose(B, cx, cy, R, rot, e, a, tl);
    const T = this.mkT(cx, cy, R, rot, tl), C = this.cc, lw = Math.max(0.8, R * 0.045), st = 85;
    // one petal: q = [cx, cy, rx, ry, angle]; grows out from anchor (ax, ay); taper narrows the tip
    const petal = (q, s, i, ax, ay, taper, z) => {
      const ca = Math.cos(q[4]), sa = Math.sin(q[4]), pts = [];
      for (let k = 0; k < 26; k++) {
        const th = k / 26 * Math.PI * 2, rr = 1 + 0.06 * Math.sin(3 * th + e.ph1 + i);
        let lx = Math.cos(th) * q[2] * rr; const ly = Math.sin(th) * q[3] * rr;
        if (taper) lx *= 1 - taper * Math.max(0, -Math.sin(th));
        const px = q[0] + lx * ca - ly * sa, py = q[1] + lx * sa + ly * ca;
        pts.push(T((ax + (px - ax) * s) * R, (ay + (py - ay) * s) * R, z));
      }
      B.fill(pts, C.red);
      return pts;
    };
    if (kind === 'daisy') {
      const N = 13, step = 38;
      for (let i = 0; i < N; i++) {
        const s = this.spr((a - i * step) / 1000, 8, 14); if (s <= 0.001) continue;
        const ang = i / N * Math.PI * 2 + e.ph1, ca = Math.cos(ang), sa = Math.sin(ang);
        petal([ca * 0.56, sa * 0.56, 0.42, 0.15, ang], s, i, 0, 0, 0, 0.05);
        if (R >= 12 && s > 0.5) B.stroke([T(ca * 0.22 * R, sa * 0.22 * R, 0.05), T(ca * (0.22 + 0.62 * Math.min(1, s)) * R, sa * (0.22 + 0.62 * Math.min(1, s)) * R, 0.05)], C.line, lw * 0.7);
      }
      const fr = this.eo((a - N * step - 60) / 400);
      if (fr > 0 && R > 3) {
        const d = []; for (let k = 0; k < 18; k++) { const th = k / 18 * Math.PI * 2; d.push(T(Math.cos(th) * 0.26 * R * fr, Math.sin(th) * 0.26 * R * fr, 0.2)); }
        B.fill(d, C.line);
        if (R >= 10) { const sp = []; for (let k = 0; k <= 30; k++) { const u = k / 30, th = e.ph1 + u * e.turns * Math.PI * 2; sp.push(T(Math.cos(th) * 0.2 * R * u * fr, Math.sin(th) * 0.2 * R * u * fr, 0.22)); } B.stroke(sp, C.red, lw); }
      }
      return;
    }
    if (kind === 'tulip') {
      const P = [[-0.3, -0.1, 0.34, 0.64, -0.22], [0.3, -0.1, 0.34, 0.64, 0.22], [0, 0, 0.4, 0.7, 0]];
      P.forEach((q, i) => {
        const s = this.spr((a - i * 95) / 1000, 8, 14); if (s <= 0.001) return;
        const open = (1 - Math.min(1, s)) * (q[0] < 0 ? 0.5 : q[0] > 0 ? -0.5 : 0);
        petal([q[0], q[1], q[2], q[3], q[4] + open], s, i, 0, 0.55, 0.55, i === 2 ? 0.12 : 0.04);
      });
      const fr = this.eo((a - 3 * 95 - 60) / 450);
      if (fr > 0 && R >= 8) for (const sg of [-1, 0, 1]) {
        const arr = []; for (let k = 0; k <= 12; k++) { const u = k / 12; arr.push(T(sg * 0.2 * Math.sin(u * Math.PI) * R, (0.5 - 0.95 * u) * R, 0.14)); }
        this.strokeRange(B, arr, 0, fr, C.line, lw);
      }
      return;
    }
    const dot = (x, y, z, w) => B.stroke([T(x * R, y * R, z), T(x * R + 0.01, y * R, z)], C.line, w);
    if (kind === 'sunflower') {
      // two rings of long pointed petals, then a dark seed head with a spiral of seeds
      for (const [ring, N, rad, off] of [[0, 17, 0.62, 0.18], [1, 17, 0.52, 0]]) for (let i = 0; i < N; i++) {
        const s = this.spr((a - (ring * N + i) * 14) / 1000, 8, 14); if (s <= 0.001) continue;
        const ang = (i + off) / N * Math.PI * 2 + e.ph1, ca = Math.cos(ang), sa = Math.sin(ang);
        petal([ca * rad, sa * rad, 0.4, 0.1, ang], s, i, 0, 0, 0, 0.04 + ring * 0.03);
      }
      const fr = this.eo((a - 34 * 14 - 80) / 450);
      if (fr > 0 && R > 3) {
        const d = []; for (let k = 0; k < 24; k++) { const th = k / 24 * Math.PI * 2; d.push(T(Math.cos(th) * 0.42 * R * fr, Math.sin(th) * 0.42 * R * fr, 0.2)); }
        B.fill(d, C.blue);
        if (R >= 12) for (let i = 1; i <= 26; i++) { const r = 0.4 * Math.sqrt(i / 26) * fr, th = i * 2.39996 + e.ph1; dot(Math.cos(th) * r, Math.sin(th) * r, 0.24, Math.max(0.8, R * 0.035)); }
      }
      return;
    }
    if (kind === 'lotus') {
      // pointed petals fan up from the base in three rows, back to front
      const rows = [[[-1.05, -0.55, 0, 0.55, 1.05], 0.22, 0.64], [[-0.75, -0.28, 0.28, 0.75], 0.22, 0.6], [[-0.38, 0.38], 0.2, 0.56], [[0], 0.2, 0.54]];
      let n = 0;
      rows.forEach(([angs, rx, ry]) => angs.forEach(an => {
        const i = n++, s = this.spr((a - i * 70) / 1000, 8, 14); if (s <= 0.001) return;
        const open = (1 - Math.min(1, s)) * -an * 0.6;
        const ang = an + open, q = [Math.sin(an) * 0.4, 0.22 - Math.cos(an) * 0.38, rx, ry, ang];
        const pts = petal(q, s, i, 0, 0.3, 0.5, 0.04 + i * 0.01);
        if (R >= 12 && s > 0.5) B.stroke([T(Math.sin(an) * 0.2 * R, (0.22 - Math.cos(an) * 0.2) * R, 0.1), T(Math.sin(an) * 0.62 * R, (0.22 - Math.cos(an) * 0.66) * R, 0.1)], C.line, lw * 0.8);
      }));
      return;
    }
    if (kind === 'cosmos') {
      // eight broad petals with notched tips around a small golden eye
      const N = 8;
      for (let i = 0; i < N; i++) {
        const s = this.spr((a - i * 50) / 1000, 8, 14); if (s <= 0.001) continue;
        const ang = i / N * Math.PI * 2 + e.ph1, ca = Math.cos(ang), sa = Math.sin(ang);
        const pts = petal([ca * 0.5, sa * 0.5, 0.42, 0.27, ang], s, i, 0, 0, 0, 0.05);
        if (R >= 12 && s > 0.5) B.stroke([T(ca * 0.3 * R, sa * 0.3 * R, 0.1), T(ca * 0.86 * R * Math.min(1, s), sa * 0.86 * R * Math.min(1, s), 0.1)], C.line, lw * 0.7);
        if (R >= 10 && s > 0.6) { const tx = ca * 0.86, ty = sa * 0.86, px = -sa * 0.08, py = ca * 0.08; B.stroke([T((tx + px) * R, (ty + py) * R, 0.1), T((tx - px * 0.0) * R, (ty - py * 0.0) * R, 0.1), T((tx - px) * R, (ty - py) * R, 0.1)], C.line, lw * 0.6); }
      }
      const fr = this.eo((a - N * 50 - 60) / 400);
      if (fr > 0 && R > 3) {
        const d = []; for (let k = 0; k < 18; k++) { const th = k / 18 * Math.PI * 2; d.push(T(Math.cos(th) * 0.2 * R * fr, Math.sin(th) * 0.2 * R * fr, 0.2)); }
        B.fill(d, C.line);
        if (R >= 10) for (let i = 0; i < 7; i++) { const th = i / 7 * Math.PI * 2 + e.ph1; dot(Math.cos(th) * 0.11 * fr, Math.sin(th) * 0.11 * fr, 0.22, Math.max(0.8, R * 0.04)); }
      }
      return;
    }
    if (kind === 'lily') {
      // six slim pointed petals in two overlapping triangles, with stamens
      for (let i = 0; i < 6; i++) {
        const back = i % 2 === 0, s = this.spr((a - i * 75) / 1000, 8, 14); if (s <= 0.001) continue;
        const ang = i / 6 * Math.PI * 2 + e.ph1, ca = Math.cos(ang), sa = Math.sin(ang), r = back ? 0.56 : 0.5;
        const pts = petal([ca * r, sa * r, back ? 0.64 : 0.58, 0.19, ang], s, i, 0, 0, 0, 0.05 + (back ? 0 : 0.04));
        if (R >= 12 && s > 0.5) B.stroke([T(ca * 0.1 * R, sa * 0.1 * R, 0.1), T(ca * (back ? 1.0 : 0.92) * R * Math.min(1, s), sa * (back ? 1.0 : 0.92) * R * Math.min(1, s), 0.1)], C.line, lw * 0.8);
      }
      const fr = this.eo((a - 6 * 75 - 60) / 450);
      if (fr > 0 && R > 4) for (let i = 0; i < 6; i++) {
        const th = i / 6 * Math.PI * 2 + e.ph1 + 0.5, x = Math.cos(th) * 0.34 * fr, y = Math.sin(th) * 0.34 * fr;
        B.stroke([T(0, 0, 0.2), T(x * R, y * R, 0.22)], C.blue, lw);
        dot(x, y, 0.24, Math.max(1.2, R * 0.07));
      }
      return;
    }
    // poppy
    const P = [[-0.36, -0.26, 0.52, 0.5, -0.3], [0.36, -0.26, 0.52, 0.5, 0.3], [-0.36, 0.3, 0.5, 0.46, 0.25], [0.38, 0.3, 0.5, 0.46, -0.25]];
    P.forEach((q, i) => {
      const s = this.spr((a - i * 80) / 1000, 8, 14); if (s <= 0.001) return;
      const pts = petal(q, s, i, 0, 0.05, 0, i > 1 ? 0.12 : 0.05);
      if (R >= 12 && s > 0.4) B.stroke(pts.slice(4, 11), C.line, lw * 0.8);
    });
    const fr = this.eo((a - 4 * 80 - 60) / 400);
    if (fr > 0 && R > 3) {
      const d = []; for (let k = 0; k < 18; k++) { const th = k / 18 * Math.PI * 2; d.push(T(Math.cos(th) * 0.2 * R * fr, Math.sin(th) * 0.2 * R * fr, 0.2)); }
      B.fill(d, C.blue);
      if (R >= 10) for (let k = 0; k < 10; k++) { const th = k / 10 * Math.PI * 2 + e.ph1; B.stroke([T(Math.cos(th) * 0.2 * R, Math.sin(th) * 0.2 * R, 0.22), T(Math.cos(th) * 0.36 * R * fr, Math.sin(th) * 0.36 * R * fr, 0.22)], C.line, lw); }
    }
  }

  // ---------- render (shared by typing view + poster) ----------
  frame() {
    const now = performance.now(), dt = Math.min(64, now - (this.lt || now)); this.lt = now;
    if (this.s.mode === 'poster') {
      if (!this.s.busy) this.posterDraw(this.pcv.getContext('2d'), now - (this.pt0 || 0));
      return;
    }
    if (!this.W) return;
    const k = 1 - Math.exp(-dt / 80);
    this.Sd += (this.St - this.Sd) * k;
    this.cx += (this.ctx_ - this.cx) * k; this.cy += (this.cty - this.cy) * k;
    for (const l of this.letters) if (!l.dead && l.tx != null) { l.x += (l.tx - l.x) * k; l.y += (l.ty - l.y) * k; }
    this.letters = this.letters.filter(l => !(l.dead && now - l.dead > 300));
    // every so often a butterfly drops in on its own, aimed at a random open flower
    if (this.nextFly == null) this.nextFly = now + 4000 + Math.random() * 4000;
    if (now > this.nextFly) {
      this.nextFly = now + CFG.flyEvery * (0.6 + Math.random() * 0.8);
      const free = this.perch.filter(p => !this.flies.some(f => f.pid === p.id));
      if (!document.hidden && this.flies.length < 3 && free.length) {
        const p = free[Math.floor(Math.random() * free.length)];
        this.spawnFly(p.x, p.y);
      }
    }
    this.paint(now, true);
  }
  pal() { const p = PAL[this.s.palette] || PAL[0]; return { bg: p[1], C: { red: p[2], blue: p[3], line: p[4], text: p[5], vein: p[1] } }; }
  mainState() { return { letters: this.letters, S: this.Sd, C: this.pal().C, boil: CFG.boil, recoil: CFG.recoil, speed: 1, wither: 260, face: true }; }
  paint(now, caret) {
    const g = this.g, d = this.dpr;
    g.setTransform(d, 0, 0, d, 0, 0); g.fillStyle = this.pal().bg; g.fillRect(0, 0, this.W, this.H);
    const B = this.backend(g), st = this.mainState();
    this.render(B, now, st);
    this.drawFlies(B, now, st.C);
    if (caret && this.gifts.length) {
      const LIFE = 5000; this.gifts = this.gifts.filter(gf => now - gf.t0 < LIFE);
      for (const gf of this.gifts) {
        const age = now - gf.t0, w = 1 - this.eo((age - (LIFE - 2200)) / 2200);
        g.globalAlpha = Math.max(0, w);
        this.flower(B, gf.x * this.W, gf.y * this.H + (1 - w) * this.Sd * 0.3, this.Sd * 0.24 * (0.65 + 0.35 * w), gf.rot + (1 - w) * 0.6, gf.e, age, null);
      }
      g.globalAlpha = 1;
    }
    if (caret) {
      const S = this.Sd, on = now - this.lastKey < 500 || Math.floor(now / 530) % 2 === 0, hf = this.eo((now - this.t0) / 600);
      if (on && hf > 0) { const h = 0.8 * S * hf, w = Math.max(2, S * 0.03); B.rect(this.cx - w / 2, this.cy - h / 2, w, h, st.C.text); }
    }
  }
  render(B, now, st) {
    const S = st.S, L = st.letters, act = L.filter(l => !l.dead), sp = st.speed || 1;
    this.cc = st.C; this._now = now; if (st.face) this.perch = [];
    if (st.face) for (const l of L) {
      let tx = 0, ty = 0;
      const A = !l.dead && l.ch !== ' ' ? this.near(l.x, l.y - S * 0.6) : null;
      if (A) {
        const dx = A[0] - l.x, dy = A[1] - (l.y - S * 0.6), d = Math.hypot(dx, dy), reach = Math.max(260, S * 3.2);
        if (d < reach && d > 1) { const w = 1 - d / reach, s = w * w * (3 - 2 * w); tx = dx / d * s; ty = dy / d * s; }
      }
      const c = l.lean || (l.lean = [0, 0]);
      c[0] += (tx - c[0]) * 0.07; c[1] += (ty - c[1]) * 0.07;
    }
    const f = st.boil ? Math.floor(now / 120) : 0, amp = st.boil ? Math.max(0.8, S * 0.01) : 0;
    const kd = l => l.dead ? 1 - this.eo((now - l.dead) / st.wither) : 1;
    const draw = layer => {
      for (const l of L) {
        if (l.ch === ' ' || !l.els) continue;
        const age = (now - l.birth) * sp, kk = kd(l);
        const each = e => { if (e.t === 'stem') this.drawStem(B, e, l, age, kk, st, f, amp, layer); else if (e.layer === layer) this.drawEl(B, e, l, age, kk, st, f, amp); };
        l.els.forEach(each);
        if (l.endEls) l.endEls.forEach(each);
        const i = act.indexOf(l), nx = i >= 0 ? act[i + 1] : null;
        if (l.tend && (l.dead || !nx || nx.ch === ' ')) {
          let fr = this.eo(((now - l.tb) * sp - 150) / 450);
          if (l.cut != null) fr *= 1 - this.eo((now - l.cut) * sp / 150) * Math.min(0.85, st.recoil / (0.6 * S));
          for (const e of l.tend) this.drawStem(B, e, l, age, kk, st, f, amp, layer, fr * kk);
        }
      }
    };
    draw(0);
    for (const l of L) if (l.ch !== ' ' && (st.textAll || !l.dead)) B.text(l.ch, l.x, l.y, S, st.C.text);
    draw(1);
  }
  wpt(st, l, x, y) {
    if (l.birth != null && this._now != null) {
      const t = (this._now - l.birth) * (st.speed || 1) / 1000;
      if (t > 0 && t < 2.5) {
        const hh = Math.max(0, (l.y - y) / st.S), dmp = Math.exp(-t * 3.2), dir = (l.id % 2 ? 1 : -1);
        x += st.S * 0.07 * hh * dmp * Math.sin(t * 11) * dir;
        y += st.S * 0.035 * hh * dmp * Math.sin(t * 11 + 1.2);
      }
    }
    if (st.face && l.lean) {
      const hh = Math.min(2.5, Math.max(0, (l.y - y) / st.S)), f = hh * hh * 0.5 + hh * 0.5;
      x += l.lean[0] * st.S * 0.1 * f;
      y += l.lean[1] * st.S * 0.05 * f;
    }
    return st.warp ? st.warp(x, y, l) : [x, y];
  }
  drawStem(B, e, l, age, kk, st, f, amp, layer, frO) {
    const S = st.S, fr = frO != null ? frO : this.eo((age - e.d0) / e.dur) * kk; if (fr <= 0) return;
    const j = this.jit(e.id, f, amp);
    const P = e.pts.map(p => this.wpt(st, l, l.x + p[0] * S + j[0], l.y + p[1] * S + j[1]));
    for (const sg of e.segs) {
      if (sg.layer !== layer) continue;
      const b = Math.min(sg.u1, fr); if (b <= sg.u0) continue;
      this.strokeRange(B, P, sg.u0, b, st.C.blue, S * 0.022 * (e.w || 1));
    }
    for (const th of e.thorns) if (fr > th.u && this.layerAt(e.segs, th.u) === layer) this.thorn(B, P, th.u, th.s, S);
  }
  drawEl(B, e, l, age, kk, st, f, amp) {
    const S = st.S, j = this.jit(e.id, f, amp), wx = (x, y) => this.wpt(st, l, l.x + x * S + j[0], l.y + y * S + j[1]);
    const rw = st.rotw ? st.rotw(e) : 0;
    if (e.t === 'leaf') {
      const sc = this.spr((age - e.d0) / 1000, 7, 15) * kk; if (sc <= 0) return;
      const p = wx(e.x, e.y); this.leaf(B, p[0], p[1], e.a + j[2] + rw, e.L * S * sc, e.bend);
    } else if (e.t === 'rose') {
      const a = age - e.d0; if (a < 0) return;
      if (kk <= 0.001) return;
      const p = wx(e.x, e.y), tl = st.face ? this.faceTurn(e, p[0], p[1]) : null;
      if ((st.face || st.perchOn) && !l.dead && a > 700) this.perch.push({ id: e.id, x: p[0], y: p[1], R: e.R * S * kk });
      this.flower(B, p[0], p[1], e.R * S * kk, e.rot + j[2] + rw + (tl ? tl[0] * 0.22 : 0), e, a, tl);
    }
  }

  // ---------- poster ----------
  ratio() { return RATIOS.find(r => r.id === this.s.ratio) || RATIOS[0]; }
  preset() { return PRESETS.find(p => p.id === this.s.preset) || PRESETS[0]; }
  buildPoster() {
    if (!this.g) return;
    const s = this.s, pr = this.preset(), text = (s.text || '').replace(/\r/g, '').slice(0, 40) || ' ';
    const rt = this.ratio(), PW = rt.w, PH = rt.h;
    this.PW = PW; this.PH = PH;
    if (this.pcv.width !== PW || this.pcv.height !== PH) { this.pcv.width = PW; this.pcv.height = PH; }
    this.rand = this.rng(s.seed * 7919 + 1);
    const L = []; let prev = null, uid = 1;
    for (const ch of text) {
      if (ch === ' ' || ch === '\n') { const sp = { ch: ' ', id: 9000 + uid++, els: [], br: ch === '\n' }; L.push(sp); prev = sp; continue; }
      const same = prev && prev.ch !== ' ';
      const l = { ch, id: 9000 + uid++, ws: same ? prev.ws : Math.floor(this.rand() * 1e9), wi: same ? prev.wi + 1 : 0, prev: same ? prev : null };
      this.gen(l); L.push(l); prev = l;
    }
    const n = L.length;
    const step = pr.id === 'grow' ? Math.min(110, 3000 / n) : pr.id === 'typed' ? Math.min(85, 3600 / n) : 0;
    const off = pr.id === 'grow' ? 200 : pr.id === 'typed' ? 300 : 0;
    L.forEach((l, i) => { l.b = off + i * step; });
    if (pr.id === 'scatter') { const r = this.rng(s.seed * 31 + 5); L.forEach(l => { l.b = 150 + r() * 2400; }); }
    const wd = Math.min(60, 900 / n);
    L.forEach((l, i) => {
      l.d = pr.id === 'scatter' ? 4700 + i * 8 : 4200 + (n - 1 - i) * wd;
      const nx = L[i + 1];
      l.cutRel = null;
      if (pr.id !== 'scatter' && l.ch !== ' ' && nx && nx.ch === ' ') { l.cutRel = Math.max(30, nx.b - l.b); this.genEnd(l, l.cutRel); }
    });
    this.rand = Math.random;
    const res = this.layoutCore(L, PW, PH, false, PH > PW * 1.2); // tall formats stack words on their own lines
    // fit the whole garden (not just the type) inside a 6% margin
    let S = res.S, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    const addP = (l, x, y, r) => { const X = l.tx + x * S, Y = l.ty + y * S, R = (r || 0) * S; x0 = Math.min(x0, X - R); x1 = Math.max(x1, X + R); y0 = Math.min(y0, Y - R); y1 = Math.max(y1, Y + R); };
    for (const l of L) {
      if (l.ch === ' ') continue;
      addP(l, -l.tw / S / 2, -0.75); addP(l, l.tw / S / 2, 0.1);
      const all = [...l.els, ...(l.endEls || [])];
      for (const e of all) {
        if (e.t === 'stem') e.pts.forEach(q => addP(l, q[0], q[1], 0.02));
        else if (e.t === 'leaf') addP(l, e.x, e.y, e.L);
        else addP(l, e.x, e.y, e.R * 1.15);
      }
    }
    // centre on the type itself; shrink just enough for the garden to clear the margins
    let tx0 = 1e9, tx1 = -1e9, ty0 = 1e9, ty1 = -1e9;
    for (const l of L) if (l.ch !== ' ') { tx0 = Math.min(tx0, l.tx - l.tw / 2); tx1 = Math.max(tx1, l.tx + l.tw / 2); ty0 = Math.min(ty0, l.ty - 0.72 * S); ty1 = Math.max(ty1, l.ty); }
    const halfX = PW * 0.44, halfY = PH * 0.44, bcx = (tx0 + tx1) / 2, bcy = (ty0 + ty1) / 2;
    const k = Math.min(1.25, halfX / Math.max(1, bcx - x0, x1 - bcx), halfY / Math.max(1, bcy - y0, y1 - bcy));
    L.forEach(l => { l.tx = PW / 2 + (l.tx - bcx) * k; l.ty = PH / 2 + (l.ty - bcy) * k; l.tw *= k; l.x = l.tx; l.y = l.ty; });
    this.P = { letters: L, S: S * k, T: pr.T, preset: pr.id };
    this.pt0 = performance.now();
  }
  posterFly(B, tt, P, C) {
    const ps = this.perch.slice().sort((a, b) => a.x - b.x);
    if (!ps.length) return;
    const p1 = ps[Math.floor(ps.length * 0.25)], p2 = ps[Math.min(ps.length - 1, Math.floor(ps.length * 0.75))];
    const A = [-80, this.PH * 0.28], s1 = [p1.x, p1.y - p1.R * 0.55], s2 = [p2.x, p2.y - p2.R * 0.55], E = [this.PW + 80, this.PH * 0.24];
    const sz = Math.max(12, P.S * 0.09), t = tt / 1000, eo = v => this.eo(Math.max(0, Math.min(1, v)));
    const leg = (a, b, u, lift) => { const e = eo(u); return [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e - Math.sin(e * Math.PI) * lift]; };
    let p, flying = true, vx = 0;
    if (t < 1.8) { p = leg(A, s1, t / 1.8, 160); vx = 1; }
    else if (t < 3.4) { p = s1; flying = false; }
    else if (t < 4.6) { p = leg(s1, s2, (t - 3.4) / 1.2, 140); vx = s2[0] > s1[0] ? 1 : -1; }
    else if (t < 5.8) { p = s2; flying = false; }
    else { p = leg(s2, E, (t - 5.8) / 1.2, 60); vx = 1; }
    let o, ang;
    if (flying) { o = Math.abs(Math.cos(t * 17)); p = [p[0] + Math.sin(t * 7) * 6, p[1] + Math.sin(t * 13) * 4]; ang = vx * 0.3; }
    else { const burst = (t > 2.4 && t < 2.8) || (t > 5 && t < 5.3); o = burst ? 0.2 + 0.8 * Math.abs(Math.cos(t * 9)) : 0.3 + 0.1 * Math.sin(t * 3); ang = 0; }
    this.butterfly(B, p[0], p[1], sz, ang, o, C);
  }
  posterDraw(g, t) {
    const P = this.P; if (!P) return;
    const PW = this.PW, PH = this.PH, pc = this.pal();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = pc.bg; g.fillRect(0, 0, PW, PH);
    const tt = ((t % P.T) + P.T) % P.T, L = P.letters, B = this.backend(g);
    const st = { letters: L, S: P.S, C: pc.C, boil: CFG.boil, recoil: CFG.recoil, speed: 1, wither: 600, textAll: true };
    L.forEach(l => { l.x = l.tx; l.y = l.ty; l.dead = null; });
    const set = base => L.forEach(l => { l.birth = base + l.b; l.tb = l.birth; l.cut = l.cutRel != null ? l.birth + l.cutRel : null; });
    if (P.preset === 'breathe') {
      set(-1e5);
      const ph = tt / P.T * Math.PI * 2, S = P.S;
      st.warp = (x, y, l) => { const h = Math.max(0, (l.y - y) / S); return [x + Math.sin(ph + l.x * 0.004 + h * 1.1) * S * 0.03 * h, y + Math.cos(ph + x * 0.003) * S * 0.008 * h]; };
      st.rotw = e => Math.sin(ph + e.id * 0.7) * 0.12;
    } else if (P.preset === 'grow' || P.preset === 'scatter') {
      set(0);
      L.forEach(l => { if (tt >= l.d) l.dead = l.d; });
    } else if (P.preset === 'wind') {
      set(-1e5);
      const S = P.S, u = tt / P.T, front = -0.35 + u * 1.9;
      st.warp = (x, y, l) => {
        const hh = Math.max(0, (l.y - y) / S), d = l.x / PW - front;
        const gg = d < 0 ? Math.exp(d * 2.2) * Math.cos(-d * 9) : Math.exp(-d * d * 30);
        const idle = Math.sin(tt / 1000 * 1.6 + l.x * 0.01) * 0.012;
        return [x + (gg * 0.13 + idle) * S * hh * hh * 0.6 + (gg * 0.13 + idle) * S * hh * 0.4, y + Math.abs(gg) * 0.02 * S * hh];
      };
      st.rotw = e => { const d = e.x / 1080 - front; return (d < 0 ? Math.exp(d * 2.2) * Math.cos(-d * 9) : Math.exp(-d * d * 30)) * 0.35; };
    } else if (P.preset === 'reach') {
      set(-1e5);
      const S = P.S, ph = tt / P.T * Math.PI * 2, lx = PW / 2 + Math.sin(ph) * PW * 0.4, ly = PH / 2 + Math.sin(ph * 2) * PH * 0.24;
      this._light = [lx, ly];
      st.warp = (x, y, l) => {
        const dx = lx - l.x, dy = ly - (l.y - S * 0.6), d = Math.hypot(dx, dy) || 1, w = Math.max(0, 1 - d / (560 * Math.max(PW, PH) / 1080)), s = w * w * (3 - 2 * w);
        const hh = Math.min(2.5, Math.max(0, (l.y - y) / S)), f = hh * hh * 0.5 + hh * 0.5;
        return [x + dx / d * s * S * 0.12 * f, y + dy / d * s * S * 0.06 * f];
      };
      st.rotw = e => { const a = Math.atan2(ly - e.y, lx - e.x); return Math.sin(a) * 0.15; };
    } else if (P.preset === 'visit') {
      set(-1e5);
      st.perchOn = true; this.perch = [];
      const ph = tt / P.T * Math.PI * 2;
      st.warp = (x, y, l) => { const hh = Math.max(0, (l.y - y) / P.S); return [x + Math.sin(ph + l.x * 0.004 + hh) * P.S * 0.015 * hh, y]; };
    } else { // typed
      if (tt >= 4400) return;
      set(0);
      st.letters = L.filter(l => tt >= l.birth);
      st.textAll = false;
    }
    this.render(B, tt, st);
    if (P.preset === 'reach') {
      const [lx, ly] = this._light, r = P.S * 0.09, pts = [];
      for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2; pts.push([lx + Math.cos(a) * r, ly + Math.sin(a) * r]); }
      B.fill(pts, st.C.line);
    }
    if (P.preset === 'visit') this.posterFly(B, tt, P, st.C);
    if (P.preset === 'typed') {
      const born = st.letters, last = born[born.length - 1], S = P.S;
      if (Math.floor(tt / 400) % 2 === 0 || (last && tt - last.birth < 300)) {
        const x = last ? last.tx + last.tw / 2 + 0.07 * S : PW / 2, y = last ? last.ty - 0.33 * S : PH / 2, w = Math.max(2, S * 0.03), h = 0.8 * S;
        B.rect(x - w / 2, y - h / 2, w, h, st.C.text);
      }
    }
  }

  // ---------- export ----------
  dl(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  savePNG() {
    this.paint(performance.now(), false);
    this.cv.toBlob(b => b && this.dl(b, 'garden.png'));
  }
  // SVG: flowers and stems as paths; letters as live text in Playfair Display (the font is linked inside the file)
  saveSVG() {
    const parts = [], n = v => Math.round(v * 100) / 100;
    const pb = () => ({ d: '', moveTo(x, y) { this.d += `M${n(x)} ${n(y)}`; }, lineTo(x, y) { this.d += `L${n(x)} ${n(y)}`; }, quadraticCurveTo(a, b, x, y) { this.d += `Q${n(a)} ${n(b)} ${n(x)} ${n(y)}`; }, closePath() { this.d += 'Z'; } });
    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const B = {
      fill: (p, col) => { const b = pb(); this.path(b, p, true); parts.push(`<path d="${b.d}" fill="${col}"/>`); },
      stroke: (p, col, w) => { const b = pb(); this.path(b, p, false); parts.push(`<path d="${b.d}" fill="none" stroke="${col}" stroke-width="${n(w)}" stroke-linecap="round" stroke-linejoin="round"/>`); },
      rect: () => {},
      text: (ch, x, y, S, col) => parts.push(`<text x="${n(x)}" y="${n(y)}" text-anchor="middle" font-family="Playfair Display, Georgia, serif" font-weight="700" font-size="${n(S)}" fill="${col}">${esc(ch)}</text>`)
    };
    this.render(B, performance.now(), this.mainState());
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${n(this.W)}" height="${n(this.H)}" viewBox="0 0 ${n(this.W)} ${n(this.H)}"><defs><style>@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&amp;display=swap');</style></defs><rect width="100%" height="100%" fill="${this.pal().bg}"/>${parts.join('')}</svg>`;
    this.dl(new Blob([svg], { type: 'image/svg+xml' }), 'garden.svg');
  }
  fname() { return 'garden-' + (this.s.text || 'loop').trim().replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 24) + '-' + this.s.preset; }
  async exportVideo() {
    if (!this.vmime || this.s.busy) { this.setStatus('Video export isn’t supported in this browser — use PNG frames.'); return; }
    const P = this.P, c = document.createElement('canvas'); c.width = this.PW; c.height = this.PH;
    const g = c.getContext('2d'), stream = c.captureStream(0), track = stream.getVideoTracks()[0];
    const rec = new MediaRecorder(stream, { mimeType: this.vmime, videoBitsPerSecond: 14e6 }), chunks = [];
    rec.ondataavailable = e => e.data && e.data.size && chunks.push(e.data);
    const done = new Promise(r => { rec.onstop = r; });
    this.set({ busy: true }); this.setStatus('Recording…');
    this.posterDraw(g, 0); rec.start();
    const N = Math.round(P.T / 1000 * 30), wait = ms => new Promise(r => setTimeout(r, ms));
    const t0 = performance.now();
    for (let i = 0; i < N; i++) {
      this.posterDraw(g, i * 1000 / 30);
      if (track.requestFrame) track.requestFrame();
      if (i % 15 === 0) this.setStatus(`Recording ${Math.round(i / N * 100)}%`);
      const target = t0 + (i + 1) * 1000 / 30; await wait(Math.max(0, target - performance.now()));
    }
    rec.stop(); await done;
    const ext = this.vmime.includes('mp4') ? 'mp4' : 'webm';
    this.dl(new Blob(chunks, { type: this.vmime.split(';')[0] }), `${this.fname()}.${ext}`);
    this.set({ busy: false }); this.setStatus(`Saved ${ext.toUpperCase()} · ${N} frames`);
  }
  // ---------- GIF (built-in encoder: shared palette from the theme + its blends, LZW) ----------
  gifPalette() {
    const p = PAL[this.s.palette] || PAL[0];
    const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const base = [];
    for (const c of [p[1], p[2], p[3], p[4], p[5]].map(hex)) if (!base.some(b => b[0] === c[0] && b[1] === c[1] && b[2] === c[2])) base.push(c);
    const pal = base.slice(), steps = 16;
    for (let i = 0; i < base.length; i++) for (let j = i + 1; j < base.length; j++)
      for (let k = 1; k < steps; k++) { const t = k / steps; pal.push(base[i].map((v, c) => Math.round(v + (base[j][c] - v) * t))); }
    return pal.slice(0, 256);
  }
  lzw(idx) {
    const bytes = []; let cur = 0, nb = 0, size = 9, next = 258;
    const emit = (code, sz) => { cur |= code << nb; nb += sz; while (nb >= 8) { bytes.push(cur & 255); cur >>>= 8; nb -= 8; } };
    const dict = new Map();
    emit(256, size);
    let prefix = idx[0];
    for (let i = 1; i < idx.length; i++) {
      const k = idx[i], key = (prefix << 8) | k, c = dict.get(key);
      if (c !== undefined) { prefix = c; continue; }
      emit(prefix, size);
      if (next > (1 << size) - 1 && size < 12) size++;
      if (next < 4096) dict.set(key, next++);
      else { emit(256, size); dict.clear(); next = 258; size = 9; }
      prefix = k;
    }
    emit(prefix, size);
    if (next > (1 << size) - 1 && size < 12) size++;
    emit(257, size);
    if (nb > 0) bytes.push(cur & 255);
    return bytes;
  }
  async exportGif() {
    if (this.s.busy) return;
    const P = this.P, GW = Math.round(this.PW / 2), GH = Math.round(this.PH / 2), FPS = 20, N = Math.round(P.T / 1000 * FPS), delay = Math.round(100 / FPS);
    const src = document.createElement('canvas'); src.width = this.PW; src.height = this.PH;
    const sg = src.getContext('2d');
    const dst = document.createElement('canvas'); dst.width = GW; dst.height = GH;
    const dg = dst.getContext('2d', { willReadFrequently: true }); dg.imageSmoothingQuality = 'high';
    const pal = this.gifPalette(), cache = new Map(), n = pal.length;
    const near = (r, g, b) => {
      let best = 0, bd = 1e9;
      for (let i = 0; i < n; i++) { const q = pal[i], d = (q[0] - r) * (q[0] - r) + (q[1] - g) * (q[1] - g) + (q[2] - b) * (q[2] - b); if (d < bd) { bd = d; best = i; } }
      return best;
    };
    const u16 = v => [v & 255, (v >> 8) & 255], ascii = s => [...s].map(c => c.charCodeAt(0));
    const flat = []; for (let i = 0; i < 256; i++) { const q = pal[i] || [0, 0, 0]; flat.push(q[0], q[1], q[2]); }
    const parts = [new Uint8Array([...ascii('GIF89a'), ...u16(GW), ...u16(GH), 0xF7, 0, 0, ...flat,
      0x21, 0xFF, 0x0B, ...ascii('NETSCAPE2.0'), 0x03, 0x01, 0, 0, 0])];
    this.set({ busy: true }); this.setStatus('Rendering GIF…');
    const idx = new Uint8Array(GW * GH);
    for (let f = 0; f < N; f++) {
      this.posterDraw(sg, f * 1000 / FPS);
      dg.drawImage(src, 0, 0, GW, GH);
      const d = dg.getImageData(0, 0, GW, GH).data;
      let lk = -1, lv = 0;
      for (let i = 0, j = 0; i < d.length; i += 4, j++) {
        const key = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
        if (key !== lk) { let v = cache.get(key); if (v === undefined) { v = near(d[i], d[i + 1], d[i + 2]); cache.set(key, v); } lk = key; lv = v; }
        idx[j] = lv;
      }
      const data = this.lzw(idx), out = [0x21, 0xF9, 0x04, 0x04, ...u16(delay), 0, 0, 0x2C, 0, 0, 0, 0, ...u16(GW), ...u16(GH), 0, 8];
      for (let o = 0; o < data.length; o += 255) { const chunk = data.slice(o, o + 255); out.push(chunk.length, ...chunk); }
      out.push(0);
      parts.push(new Uint8Array(out));
      if (f % 3 === 0) { this.setStatus(`Encoding GIF ${Math.round(f / N * 100)}%`); await new Promise(r => setTimeout(r, 0)); }
    }
    parts.push(new Uint8Array([0x3B]));
    const blob = new Blob(parts, { type: 'image/gif' });
    this.dl(blob, `${this.fname()}.gif`);
    this.set({ busy: false }); this.setStatus(`Saved GIF · ${N} frames · ${(blob.size / 1048576).toFixed(1)} MB`);
  }
  async exportFrames() {
    if (this.s.busy) return;
    const P = this.P, c = document.createElement('canvas'); c.width = this.PW; c.height = this.PH;
    const g = c.getContext('2d'), N = Math.round(P.T / 1000 * 30), files = [];
    this.set({ busy: true }); this.setStatus('Rendering frames…');
    for (let i = 0; i < N; i++) {
      this.posterDraw(g, i * 1000 / 30);
      const b = await new Promise(r => c.toBlob(r, 'image/png'));
      files.push({ name: `frame_${String(i + 1).padStart(4, '0')}.png`, data: new Uint8Array(await b.arrayBuffer()) });
      if (i % 10 === 0) this.setStatus(`Rendering ${Math.round(i / N * 100)}%`);
    }
    this.dl(this.zip(files), `${this.fname()}-frames.zip`);
    this.set({ busy: false }); this.setStatus(`Saved ${N} PNG frames · 30 fps`);
  }
  zip(files) {
    const crcT = this._crcT || (this._crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })());
    const crc = d => { let c = 0xFFFFFFFF; for (let i = 0; i < d.length; i++) c = crcT[(c ^ d[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
    const enc = new TextEncoder(), parts = [], cen = []; let off = 0;
    for (const f of files) {
      const nm = enc.encode(f.name), cr = crc(f.data), sz = f.data.length;
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(8, 0, true); h.setUint16(12, 33, true);
      h.setUint32(14, cr, true); h.setUint32(18, sz, true); h.setUint32(22, sz, true); h.setUint16(26, nm.length, true);
      parts.push(h.buffer, nm, f.data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(14, 33, true);
      c.setUint32(16, cr, true); c.setUint32(20, sz, true); c.setUint32(24, sz, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
      cen.push(c.buffer, nm);
      off += 30 + nm.length + sz;
    }
    const cs = cen.reduce((s, b) => s + (b.byteLength || b.length), 0);
    const e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cs, true); e.setUint32(16, off, true);
    return new Blob([...parts, ...cen, e.buffer], { type: 'application/zip' });
  }
}

window.garden = new Garden();
})();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(() => {});
  }
  if ('caches' in window) {
    caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {});
  }
