/* INTIQ motion engine
   - gold dust drifting behind the slides, gently following the pointer
   - a soft light that follows the pointer; satin surfaces shimmer with it
   - coin streams and particle bursts (window.FX.stream / FX.burst)
   - word-by-word headline reveals ([data-split])
   - 3D tilt with glare ([data-tilt]) and magnetic buttons ([data-magnet])
   All coordinates are stage pixels (1920 x 1080). */
(function () {
  const stage = document.getElementById('stage');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const W = 1920, H = 1080;

  function makeCanvas(id, z) {
    const c = document.createElement('canvas');
    c.id = id; c.width = W; c.height = H;
    c.style.cssText = `position:absolute;inset:0;width:${W}px;height:${H}px;pointer-events:none;z-index:${z}`;
    return c;
  }
  const back = makeCanvas('fxBack', 0), top = makeCanvas('fxTop', 4);
  const light = document.createElement('div'); light.id = 'light';
  stage.prepend(light); stage.prepend(back); stage.appendChild(top);
  const bctx = back.getContext('2d'), tctx = top.getContext('2d');

  /* ---- pointer in stage coordinates ---- */
  const ptr = { x: W * .7, y: H * .3, nx: .5, ny: .5, tx: W * .7, ty: H * .3 };
  function toStage(cx, cy) {
    const r = stage.getBoundingClientRect();
    return { x: (cx - r.left) / r.width * W, y: (cy - r.top) / r.height * H };
  }
  window.addEventListener('pointermove', e => {
    const p = toStage(e.clientX, e.clientY);
    ptr.tx = p.x; ptr.ty = p.y;
  }, { passive: true });

  /* ---- gold dust ---- */
  const COLORS = ['243,227,188', '217,180,103', '230,179,204', '255,246,249'];
  const dust = [];
  const N = reduce ? 0 : 70;
  for (let k = 0; k < N; k++) {
    dust.push({ x: Math.random() * W, y: Math.random() * H, r: .6 + Math.random() * 2.2, z: .2 + Math.random() * .8,
      vy: -(4 + Math.random() * 12), vx: (Math.random() - .5) * 6, a: .12 + Math.random() * .4, ph: Math.random() * 6.28,
      c: COLORS[(Math.random() * COLORS.length) | 0] });
  }

  /* ---- streams (coins flowing along curves) ---- */
  const streams = new Map();
  function bez(p, t) {
    const u = 1 - t;
    return { x: u * u * p[0] + 2 * u * t * p[2] + t * t * p[4], y: u * u * p[1] + 2 * u * t * p[3] + t * t * p[5] };
  }
  function stream(id, opts) {
    if (reduce) { opts.onDone && opts.onDone(); return; }
    streams.set(id, { paths: opts.paths, rate: opts.rate || 12, until: performance.now() + (opts.duration || 2500),
      size: opts.size || 7, speed: opts.speed || 1.1, acc: 0, items: [], onArrive: opts.onArrive, onDone: opts.onDone, ending: false });
  }
  function stopStream(id) { streams.delete(id); }

  /* ---- bursts ---- */
  const parts = [];
  function burst(x, y, o = {}) {
    if (reduce) return;
    const n = o.count || 40, cols = o.colors || COLORS;
    for (let k = 0; k < n; k++) {
      const a = (o.angle !== undefined ? o.angle : -Math.PI / 2) + (Math.random() - .5) * (o.spread || Math.PI * 2);
      const v = (o.speed || 520) * (.35 + Math.random() * .75);
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: o.gravity === undefined ? 900 : o.gravity,
        life: (o.life || 1.6) * (.6 + Math.random() * .6), t: 0, s: (o.size || 6) * (.5 + Math.random()),
        rot: Math.random() * 6.28, vr: (Math.random() - .5) * 12, c: cols[(Math.random() * cols.length) | 0],
        shape: o.shape || 'confetti', drag: o.drag || 1.6 });
    }
  }

  /* ---- frame loop ---- */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    ptr.x += (ptr.tx - ptr.x) * .08; ptr.y += (ptr.ty - ptr.y) * .08;
    ptr.nx = ptr.x / W; ptr.ny = ptr.y / H;
    stage.style.setProperty('--mx', ptr.nx.toFixed(3));
    stage.style.setProperty('--my', ptr.ny.toFixed(3));
    light.style.transform = `translate(${(ptr.x - 450).toFixed(1)}px, ${(ptr.y - 450).toFixed(1)}px)`;

    bctx.clearRect(0, 0, W, H);
    const ox = (ptr.nx - .5) * 40, oy = (ptr.ny - .5) * 30;
    bctx.globalCompositeOperation = 'lighter';
    for (const d of dust) {
      d.x += d.vx * dt; d.y += d.vy * dt * d.z; d.ph += dt * 1.4;
      if (d.y < -10) { d.y = H + 10; d.x = Math.random() * W; }
      if (d.x < -10) d.x = W + 10; if (d.x > W + 10) d.x = -10;
      const al = d.a * (.6 + .4 * Math.sin(d.ph));
      bctx.fillStyle = `rgba(${d.c},${al.toFixed(3)})`;
      bctx.beginPath(); bctx.arc(d.x + ox * d.z, d.y + oy * d.z, d.r * d.z + .3, 0, 6.283); bctx.fill();
    }
    for (const [id, s] of streams) {
      const live = now < s.until;
      if (live) {
        s.acc += dt * s.rate;
        while (s.acc >= 1) { s.acc -= 1; s.items.push({ p: s.paths[(Math.random() * s.paths.length) | 0], t: 0, j: Math.random() }); }
      }
      for (let k = s.items.length - 1; k >= 0; k--) {
        const it = s.items[k];
        it.t += dt * s.speed * (.8 + it.j * .4);
        if (it.t >= 1) { s.items.splice(k, 1); s.onArrive && s.onArrive(); continue; }
        const e = it.t < .5 ? 2 * it.t * it.t : 1 - Math.pow(-2 * it.t + 2, 2) / 2;
        for (let tr = 0; tr < 5; tr++) {
          const q = bez(it.p, Math.max(0, e - tr * .025));
          bctx.fillStyle = `rgba(243,227,188,${(.55 - tr * .1).toFixed(2)})`;
          bctx.beginPath(); bctx.arc(q.x, q.y, Math.max(1, s.size - tr * 1.2), 0, 6.283); bctx.fill();
        }
      }
      if (!live && !s.items.length) { streams.delete(id); s.onDone && s.onDone(); }
    }
    bctx.globalCompositeOperation = 'source-over';

    tctx.clearRect(0, 0, W, H);
    for (let k = parts.length - 1; k >= 0; k--) {
      const p = parts[k];
      p.t += dt; if (p.t > p.life) { parts.splice(k, 1); continue; }
      p.vx -= p.vx * p.drag * dt; p.vy += p.g * dt - p.vy * p.drag * dt * .5;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      const al = 1 - Math.pow(p.t / p.life, 2);
      tctx.save(); tctx.globalAlpha = al; tctx.translate(p.x, p.y); tctx.rotate(p.rot);
      tctx.fillStyle = `rgb(${p.c})`;
      if (p.shape === 'dust') { tctx.beginPath(); tctx.arc(0, 0, p.s * .5, 0, 6.283); tctx.fill(); }
      else tctx.fillRect(-p.s / 2, -p.s * .3, p.s, p.s * .6);
      tctx.restore();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---- word-by-word reveals ---- */
  function split(el) {
    if (el.dataset.splitDone === '1' && el.querySelector('.wi')) return;
    let n = 0;
    const walk = node => {
      [...node.childNodes].forEach(ch => {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach(tok => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const i = document.createElement('span'); i.className = 'wi'; i.style.setProperty('--wi', n++);
            i.textContent = tok; w.appendChild(i); frag.appendChild(w);
          });
          ch.replaceWith(frag);
        } else if (ch.nodeType === 1 && ch.tagName !== 'BR' && !ch.classList.contains('w')) walk(ch);
      });
    };
    walk(el);
    el.dataset.splitDone = '1';
  }
  const splitAll = () => document.querySelectorAll('[data-split]').forEach(split);
  document.addEventListener('deck:lang', splitAll);
  splitAll();

  /* ---- tilt + glare, magnetic buttons ---- */
  let tiltEl = null;
  stage.addEventListener('pointermove', e => {
    const t = e.target.closest('[data-tilt]');
    if (tiltEl && tiltEl !== t) { tiltEl.style.removeProperty('--rx'); tiltEl.style.removeProperty('--ry'); tiltEl.classList.remove('tilting'); }
    tiltEl = t;
    if (t && !reduce) {
      const r = t.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width, ny = (e.clientY - r.top) / r.height;
      const k = parseFloat(t.dataset.tilt || '10');
      t.style.setProperty('--rx', ((.5 - ny) * k).toFixed(2) + 'deg');
      t.style.setProperty('--ry', ((nx - .5) * k).toFixed(2) + 'deg');
      t.style.setProperty('--gx', (nx * 100).toFixed(1) + '%');
      t.style.setProperty('--gy', (ny * 100).toFixed(1) + '%');
      t.classList.add('tilting');
    }
    document.querySelectorAll('.slide.active [data-magnet]').forEach(m => {
      const r = m.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy), reach = Math.max(r.width, r.height) * .9;
      const s = stage.getBoundingClientRect().width / W;
      if (dist < reach && !reduce) m.style.translate = `${(dx * .22 / s).toFixed(1)}px ${(dy * .3 / s).toFixed(1)}px`;
      else m.style.translate = '0 0';
    });
  });
  stage.addEventListener('pointerleave', () => {
    if (tiltEl) { tiltEl.style.removeProperty('--rx'); tiltEl.style.removeProperty('--ry'); tiltEl.classList.remove('tilting'); tiltEl = null; }
  });

  /* ---- helpers for slides ---- */
  function tween(from, to, ms, fn, ease) {
    const t0 = performance.now();
    ease = ease || (t => 1 - Math.pow(1 - t, 3));
    return new Promise(res => {
      if (reduce || ms <= 0) { fn(to); res(); return; }
      (function step(now) {
        const p = Math.min(1, (now - t0) / ms);
        fn(from + (to - from) * ease(p));
        if (p < 1) requestAnimationFrame(step); else res();
      })(t0);
    });
  }
  function centerOf(el) {
    const r = el.getBoundingClientRect();
    return toStage(r.left + r.width / 2, r.top + r.height / 2);
  }

  window.FX = { burst, stream, stopStream, toStage, tween, centerOf, split, reduce };
})();
