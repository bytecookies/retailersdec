/* INTIQ retailer deck: what each slide does when it opens and on each click. */
(function () {
  const FX = window.FX, CFG = window.INTIQ_CONFIG, PHOTOS = window.INTIQ_PHOTOS || {};
  const stage = document.getElementById('stage');
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const t = k => { const L = window.INTIQ_TEXT, l = window.INTIQ_LANG(); return (L[l] && L[l][k] !== undefined) ? L[l][k] : (L.en[k] || ''); };
  const inr = n => Math.round(n).toLocaleString('en-IN');
  const svgNS = 'http://www.w3.org/2000/svg';
  const timers = {};
  const later = (slide, fn, ms) => { (timers[slide] = timers[slide] || []).push(setTimeout(fn, ms)); };
  const clearLater = slide => { (timers[slide] || []).forEach(clearTimeout); timers[slide] = []; };

  /* ================= shop name, typed once, shown everywhere ================= */
  let shop = '';
  try { shop = localStorage.getItem('intiq-shop') || ''; } catch (e) {}
  function paintShop(except) {
    $$('[data-shop-edit]').forEach(el => { if (el !== except) el.textContent = shop; });
    $$('[data-shop]').forEach(el => { el.textContent = shop || t('pass.v1'); });
  }
  $$('[data-shop-edit]').forEach(el => {
    el.addEventListener('input', () => {
      shop = el.textContent.replace(/\s+/g, ' ').trim().slice(0, 32);
      try { localStorage.setItem('intiq-shop', shop); } catch (e) {}
      paintShop(el);
    });
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); el.blur(); } });
    el.addEventListener('paste', e => { e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text').slice(0, 32)); });
    el.addEventListener('blur', () => { el.textContent = shop; });
  });
  paintShop();

  /* member-card logo */
  const LOGO = window.INTIQ_LOGO || [];
  $$('.member img.logo2').forEach(img => {
    let n = 0;
    img.addEventListener('load', () => img.closest('.member').classList.add('has-img'));
    img.addEventListener('error', () => { n += 1; if (n < LOGO.length) img.src = LOGO[n]; });
    if (LOGO.length) img.src = LOGO[0];
  });

  /* ================= slide 2: coins drop into locked jars, then go to waste ================= */
  const COINS = [5, 2, 4];
  function jarCoins(k) { return $(`#coins${k}`); }
  function makeCoin(k, c) {
    const jar = $(`#jar${k}`), cx = +jar.dataset.cx;
    const e = document.createElementNS(svgNS, 'ellipse');
    e.setAttribute('cx', cx + (c % 2 ? 9 : -9)); e.setAttribute('rx', 52); e.setAttribute('ry', 14);
    e.setAttribute('fill', 'url(#silk)'); e.setAttribute('stroke', '#24111F'); e.setAttribute('stroke-opacity', '.45'); e.setAttribute('stroke-width', 2);
    e.style.transition = 'opacity .6s';
    jarCoins(k).appendChild(e);
    return e;
  }
  function setAmt(k, v) { const el = $(`#amt${k}`); if (el) el.textContent = inr(v); }
  function placeJar(k, filled) {
    const g = jarCoins(k); g.innerHTML = '';
    const amt = +$(`#jar${k}`).dataset.amt;
    if (!filled) { setAmt(k, 0); return; }
    for (let c = 0; c < COINS[k - 1]; c++) makeCoin(k, c).setAttribute('cy', 806 - c * 16);
    setAmt(k, amt);
  }
  function dropJar(k) {
    const g = jarCoins(k); g.innerHTML = '';
    const n = COINS[k - 1], amt = +$(`#jar${k}`).dataset.amt;
    let landed = 0;
    for (let c = 0; c < n; c++) {
      later('s-jars', () => {
        const e = makeCoin(k, c), rest = 806 - c * 16;
        let y = 330, v = 0, last = performance.now(), bounces = 0;
        (function fall(now) {
          const dt = Math.min(.032, (now - last) / 1000); last = now;
          v += 3400 * dt; y += v * dt;
          if (y >= rest) {
            y = rest; v = -v * .32; bounces++;
            if (bounces === 1) { landed++; FX.tween(amt * (landed - 1) / n, amt * landed / n, 380, x => setAmt(k, x)); }
            if (Math.abs(v) < 140 || bounces > 3) { e.setAttribute('cy', rest); return; }
          }
          e.setAttribute('cy', y.toFixed(1));
          requestAnimationFrame(fall);
        })(last);
      }, 250 + c * 170);
    }
  }
  function crackJars(animate) {
    const root = $('#jarsroot');
    root.classList.add('cracked');
    if (!animate) { $$('#jarsroot ellipse').forEach(e => { e.style.opacity = 0; }); return; }
    $$('.jar').forEach((j, i) => later('s-jars', () => { j.classList.add('shake'); setTimeout(() => j.classList.remove('shake'), 700); }, i * 120));
    later('s-jars', () => {
      $$('#jarsroot ellipse').forEach((e, i) => {
        const x = +e.getAttribute('cx'), y = +e.getAttribute('cy');
        setTimeout(() => {
          FX.burst(x, y, { count: 18, shape: 'dust', gravity: -60, speed: 220, life: 1.6, size: 7, colors: ['243,227,188', '217,180,103', '205,179,194'] });
          e.style.opacity = 0;
        }, i * 45);
      });
    }, 1100);
  }
  function jarsStep(n, animate) {
    clearLater('s-jars');
    const root = $('#jarsroot');
    if (n < 4) { root.classList.remove('cracked'); }
    for (let k = 1; k <= 3; k++) {
      if (k <= Math.min(n, 3)) { if (animate && k === n) dropJar(k); else placeJar(k, true); }
      else placeJar(k, false);
    }
    if (n >= 4) crackJars(animate);
  }

  /* ================= slide 3: coins stream from every category into one wallet ================= */
  let gulpAt = 0;
  function walletStep(n, animate) {
    const root = $('#walletroot'), wc = $('#wcount');
    if (n === 0) { FX.stopStream('wallet'); wc.textContent = '0'; return; }
    if (n === 1 && animate) {
      const [tx, ty] = root.dataset.target.split(',').map(Number);
      const paths = root.dataset.orbs.split(';').map(p => { const [x, y] = p.split(',').map(Number); return [x, y, (x + tx) / 2, Math.min(y, ty) - 60, tx, ty]; });
      FX.stream('wallet', { paths, rate: 22, duration: 2600, size: 6, speed: .9,
        onArrive: () => { const now = performance.now(); if (now - gulpAt > 140) { gulpAt = now; const b = $('#wbox'); b.classList.remove('gulp'); void b.getBoundingClientRect(); b.classList.add('gulp'); } } });
      FX.tween(0, 3100, 3200, v => { wc.textContent = inr(v); }, x => x);
    } else wc.textContent = '3,100';
  }

  /* ================= slide 4: progress line ================= */
  function howStep(n) { const l = $('#s-how .hline'); if (l) l.style.setProperty('--p', (n / 3 * 100) + '%'); }

  /* ================= slide 5: how far can you go ================= */
  const sim = { v: 0, level: 0, aLevel: 0, hopping: false, tw: 0 };
  const range = $('#simrange');
  const spots = $('#avatar').dataset.spots.split(';').map(p => p.split(',').map(Number));
  function levelFor(pts) { let l = 0; CFG.levels.forEach((th, i) => { if (pts >= th) l = i + 1; }); return l; }
  function simText() {
    const el = $('#simlvl');
    el.innerHTML = sim.level ? `<span style="color:var(--muted);font-weight:700;font-size:20px">${t('sim.reach')}</span><br>${t('sim.lv')} ${sim.level}: ${t('l.n' + sim.level)}` : t('sim.none');
  }
  function simSet(v) {
    sim.v = v;
    const pct = v / CFG.sliderMaxLakh * 100;
    range.value = v; range.parentElement.style.setProperty('--v', pct + '%');
    $('#simval').textContent = (Math.round(v * 10) / 10).toLocaleString('en-IN');
    const pts = v * 100000 * CFG.pointsRate;
    $('#simpts').textContent = inr(pts);
    const lvl = levelFor(pts);
    if (lvl !== sim.level) {
      const up = lvl > sim.level;
      $$('#s-ladder .lv').forEach(g => g.classList.toggle('unlocked', +g.dataset.k <= lvl));
      $$('#s-ladder .lphoto').forEach(f => {
        const k = +f.dataset.k, was = f.classList.contains('unlocked');
        f.classList.toggle('unlocked', k <= lvl);
        if (up && k <= lvl && !was && !sim.silent) {
          f.classList.remove('pulse1'); void f.offsetWidth; f.classList.add('pulse1');
          const x = parseFloat(f.style.left) + 64, y = parseFloat(f.style.top) + 64;
          FX.burst(x, y, { count: k === 5 ? 160 : 34, speed: k === 5 ? 760 : 420, life: k === 5 ? 2.4 : 1.4, size: k === 5 ? 9 : 6 });
        }
      });
      sim.level = lvl; simText(); if (!sim.silent) hop();
    }
  }
  function moveAvatar(x, y) { $('#avatar').setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`); }
  async function hop() {
    if (sim.hopping) return;
    sim.hopping = true;
    while (sim.aLevel !== sim.level) {
      const from = spots[sim.aLevel], dir = sim.level > sim.aLevel ? 1 : -1, to = spots[sim.aLevel + dir];
      await FX.tween(0, 1, 300, p => moveAvatar(from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p - Math.sin(p * Math.PI) * 46), p => p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
      sim.aLevel += dir;
    }
    sim.hopping = false;
  }
  function simTo(v, ms) {
    const id = ++sim.tw;
    return FX.tween(sim.v, v, ms, x => { if (id === sim.tw) simSet(x); }, p => 1 - Math.pow(1 - p, 3));
  }
  function selChip(key) { $$('#s-ladder .chips button').forEach(b => b.classList.toggle('sel', b.dataset.preset === key)); }
  range.addEventListener('input', () => { sim.tw++; selChip(null); simSet(+range.value); });
  range.addEventListener('change', () => range.blur());
  range.addEventListener('pointerup', () => setTimeout(() => range.blur(), 50));
  $$('#s-ladder .chips button').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); selChip(b.dataset.preset); simTo(CFG.presets[b.dataset.preset], 1600); }));
  const PRE = [null, 'small', 'medium', 'large'];
  function ladderStep(n, animate, entering) {
    const key = PRE[n], v = key ? CFG.presets[key] : 0;
    selChip(key);
    if (entering) {
      sim.tw++; sim.silent = true; sim.level = -1; simSet(v); sim.silent = false;
      sim.aLevel = sim.level; const s = spots[sim.aLevel]; moveAvatar(s[0], s[1]);
    } else simTo(v, n === 0 ? 700 : 1700);
  }

  /* ================= slides 6, 7, 8: expanding photo cards ================= */
  let xp = null;
  function openCard(card) {
    if (xp) return;
    const r = { l: card.offsetLeft, t: card.offsetTop, w: card.offsetWidth, h: card.offsetHeight };
    const key = card.querySelector('figure[data-photo]').dataset.photo, p = PHOTOS[key] || {};
    const pin = card.dataset.pin ? card.dataset.pin.split(',').map(Number) : null;
    xp = document.createElement('div');
    xp.className = 'xp'; xp.setAttribute('data-interactive', '');
    xp.style.setProperty('--t', r.t + 'px'); xp.style.setProperty('--l', r.l + 'px');
    xp.style.setProperty('--r', (1920 - r.l - r.w) + 'px'); xp.style.setProperty('--b', (1080 - r.t - r.h) + 'px');
    const src = /^https:\/\/images\.unsplash\.com\//.test(p.src || '') ? `${p.src}?auto=format&fit=crop&w=1920&q=82` : (p.src || '');
    xp.innerHTML = `<figure class="ph"><img alt="${p.alt || ''}"></figure><div class="shade"></div>
      <div class="xin"><span class="xbadge silk">${t(card.dataset.lv)}</span>
      <div class="xname">${t(card.dataset.name)}</div><div class="xsub">${t(card.dataset.lt)}</div></div>
      ${pin ? `<svg class="xmap" viewBox="0 0 300 340"><use href="#indiaMini" width="300" height="340"/><circle class="pulse" cx="${pin[0]}" cy="${pin[1]}" r="9" fill="none" stroke="#F3E3BC" stroke-width="2"/><circle cx="${pin[0]}" cy="${pin[1]}" r="8" fill="url(#silk)" stroke="#24111F" stroke-width="2"/></svg>` : ''}
      <button type="button" class="xclose" aria-label="${t('x.close')}">×</button>`;
    const img = xp.querySelector('img');
    img.addEventListener('load', () => img.classList.add('ok'));
    img.src = src;
    xp.addEventListener('click', e => { e.stopPropagation(); closeCard(); });
    stage.appendChild(xp);
    void xp.offsetWidth;
    requestAnimationFrame(() => xp.classList.add('open'));
  }
  function closeCard() {
    if (!xp) return;
    const el = xp; xp = null;
    el.classList.remove('open');
    setTimeout(() => el.remove(), 950);
  }
  $$('[data-expand]').forEach(c => c.addEventListener('click', e => { e.stopPropagation(); openCard(c); }));
  window.addEventListener('keydown', e => {
    if (!xp) return;
    if (['Escape', 'ArrowRight', 'ArrowLeft', 'PageDown', 'PageUp', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); e.stopImmediatePropagation(); closeCard(); }
  }, true);

  /* ================= slide 9: card flips, join celebrates ================= */
  const joinBtn = $('#joinbtn');
  joinBtn.addEventListener('click', e => {
    e.stopPropagation();
    const c = FX.centerOf(joinBtn);
    FX.burst(c.x, c.y, { count: 180, speed: 900, spread: Math.PI * 1.2, life: 2.6, size: 10 });
    const card = $('#cardJoin');
    card.classList.add('glow', 'top');
    const cc = FX.centerOf(card);
    FX.burst(cc.x, cc.y - 120, { count: 60, shape: 'dust', gravity: -40, speed: 300, life: 2, size: 8 });
    $('#welcome').classList.add('show');
  });

  /* ================= wiring ================= */
  const last = {};
  document.addEventListener('deck:step', e => {
    const { slide, step, entering } = e.detail, id = slide.id;
    const animate = !entering && last[id] === step - 1;
    last[id] = step;
    if (id === 's-jars') jarsStep(step, animate);
    else if (id === 's-wallet') walletStep(step, animate);
    else if (id === 's-how') howStep(step);
    else if (id === 's-ladder') ladderStep(step, animate, entering);
  });
  function enter(slide, from) {
    if (from) { clearLater(from.id); if (from.id === 's-wallet') FX.stopStream('wallet'); closeCard(); }
    const id = slide.id;
    if (id === 's-cover') {
      later(id, () => { const c = FX.centerOf($('#cardCover')); FX.burst(c.x, c.y, { count: 40, shape: 'dust', gravity: -30, speed: 260, life: 2.2, size: 7 }); }, 1500);
    }
    if (id === 's-gifts') {
      $$('#s-gifts .rcard[data-step="0"]').forEach(c => c.classList.remove('on'));
      later(id, () => $$('#s-gifts .rcard[data-step="0"]').forEach(c => c.classList.add('on')), 900);
    }
    if (id === 's-abroad') {
      $$('#s-abroad .plane').forEach((pl, i) => {
        pl.style.transition = 'opacity .5s'; pl.style.opacity = 0;
        later(id, () => { pl.style.opacity = 1; try { pl.querySelector('animateMotion').beginElement(); } catch (e) {} }, 700 + i * 1200);
        later(id, () => { pl.style.opacity = 0; }, 700 + i * 1200 + 1700);
      });
    }
    if (id === 's-join') {
      const f = $('#cardJoinFlip'), card = $('#cardJoin');
      f.classList.remove('flipped'); card.classList.remove('glow', 'top'); $('#welcome').classList.remove('show');
      later(id, () => f.classList.add('flipped'), 900);
      later(id, () => { const c = FX.centerOf(card); FX.burst(c.x, c.y, { count: 46, shape: 'dust', gravity: -30, speed: 300, life: 2, size: 7 }); }, 2300);
    }
  }
  document.addEventListener('deck:enter', e => enter(e.detail.slide, e.detail.from));
  document.addEventListener('deck:lang', () => { paintShop(); if (sim.level >= 0) simText(); });

  sim.silent = true; sim.level = -1; simSet(0); sim.silent = false; sim.aLevel = 0; moveAvatar(spots[0][0], spots[0][1]);

  /* the deck opened before this file loaded: catch up */
  const D = window.INTIQ_DECK;
  if (D && D.slide) {
    const s = D.slide, n = +(s.dataset.cur || 0);
    last[s.id] = n;
    if (s.id === 's-jars') jarsStep(n, false);
    if (s.id === 's-wallet') walletStep(n, false);
    if (s.id === 's-how') howStep(n);
    if (s.id === 's-ladder') ladderStep(n, false, true);
    enter(s, null);
  }
})();
