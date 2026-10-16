/* INTIQ deck controller
   - scales the 1920x1080 stage to the window
   - click / arrow / clicker moves through builds first, then to the next slide
   - elements with data-step="2" appear from build 2; data-step="1-3" shows only for builds 1 to 3
   - a slide with data-zoom moves its #panzoom group to a new view on each build
   - loads photos (assets/js/photos.js) and the brand logo (assets/brand/) */
(function () {
  const deck = document.getElementById('deck');
  const stage = document.getElementById('stage');
  const slides = [...document.querySelectorAll('.slide')];
  const count = document.getElementById('count');
  const bar = document.getElementById('bar');
  const notes = document.getElementById('notes');
  const notesB = document.getElementById('notesB');
  const notesT = document.getElementById('notesT');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealAt = slides.findIndex(s => s.hasAttribute('data-reveal'));
  let i = -1;

  /* ---- photos ---- */
  const PHOTOS = window.INTIQ_PHOTOS || {};
  document.querySelectorAll('figure.ph[data-photo]').forEach(fig => {
    const p = PHOTOS[fig.dataset.photo];
    if (!p) return;
    const img = document.createElement('img');
    img.alt = p.alt || '';
    img.decoding = 'async';
    img.addEventListener('load', () => img.classList.add('ok'));
    img.addEventListener('error', () => img.remove()); // the satin frame stays as the fallback
    const w = parseInt(fig.dataset.w || '1600', 10);
    img.src = /^https:\/\/images\.unsplash\.com\//.test(p.src) ? `${p.src}?auto=format&fit=crop&w=${w}&q=80` : p.src;
    fig.prepend(img);
  });

  /* ---- brand logo: first file that loads wins; otherwise the text wordmark shows ---- */
  const LOGO = window.INTIQ_LOGO || [];
  document.querySelectorAll('.logo').forEach(box => {
    const img = box.querySelector('img');
    if (!img || !LOGO.length) return;
    let n = 0;
    img.addEventListener('load', () => box.classList.add('has-img'));
    img.addEventListener('error', () => { n += 1; if (n < LOGO.length) img.src = LOGO[n]; });
    img.src = LOGO[0];
  });

  function fit() {
    stage.style.setProperty('--s', Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
  }

  /* ---- count-up numbers ---- */
  const fmt = (v, dec) => (dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-IN'));
  function countUp(el) {
    const to = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.dec || '0', 10);
    if (reduce) { el.textContent = fmt(to, dec); return; }
    const t0 = performance.now(), dur = 1400;
    (function step(t) {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(to * e, dec);
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* ---- builds within a slide ---- */
  const maxStep = s => parseInt(s.dataset.steps || '0', 10);
  function inRange(spec, n) {
    return spec.split(',').some(part => {
      const [a, b] = part.split('-').map(Number);
      return n >= a && (b === undefined || Number.isNaN(b) || n <= b);
    });
  }
  function setStep(s, n, entering) {
    s.dataset.cur = n;
    s.querySelectorAll('[data-step]').forEach(el => {
      const was = el.classList.contains('on');
      const on = inRange(el.dataset.step, n);
      el.classList.toggle('on', on);
      if (on && !was) el.querySelectorAll('[data-count]').forEach(countUp);
    });
    if (s.dataset.zoom) {
      const views = JSON.parse(s.dataset.zoom);
      const v = views[Math.min(n, views.length - 1)];
      const pz = s.querySelector('#panzoom');
      if (pz) {
        pz.style.transform = `translate(${v[0]}px, ${v[1]}px) scale(${v[2]})`;
        pz.style.setProperty('--k', v[2]);
      }
    }
    updateChrome();
    document.dispatchEvent(new CustomEvent('deck:step', { detail: { index: slides.indexOf(s), slide: s, step: n, entering: !!entering } }));
  }

  function updateChrome() {
    const s = slides[i];
    const cur = parseInt(s.dataset.cur || '0', 10), max = maxStep(s);
    count.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
    bar.style.width = ((i + (max ? cur / (max + 1) : 0) + 1) / slides.length * 100) + '%';
    notesT.textContent = 'Speaker notes · ' + (s.dataset.title || '') + (max ? `  (build ${cur + 1} of ${max + 1})` : '');
    notesB.textContent = s.dataset.notes || '';
  }

  /* ---- move between slides ---- */
  function go(n, atEnd) {
    n = Math.max(0, Math.min(slides.length - 1, n));
    if (n === i) return;
    const old = slides[i];
    if (old) {
      old.classList.remove('active');
      old.classList.add('leaving');
      setTimeout(() => old.classList.remove('leaving'), 900);
    }
    i = n;
    const s = slides[i];
    setStep(s, atEnd ? maxStep(s) : 0, true);
    void s.offsetWidth; // restart entry animations
    s.classList.add('active');
    stage.classList.toggle('is-cover', i === 0);
    stage.classList.toggle('pre-reveal', revealAt > -1 && i < revealAt);
    s.querySelectorAll('[data-count]').forEach(el => { if (!el.closest('[data-step]')) countUp(el); });
    s.querySelectorAll('animateMotion.motion').forEach(a => { try { a.beginElement(); } catch (e) {} });
    updateChrome();
    document.dispatchEvent(new CustomEvent('deck:enter', { detail: { index: i, slide: s, from: old || null } }));
    try { history.replaceState(null, '', '#s' + (i + 1)); } catch (e) {}
  }
  function next() {
    const s = slides[i], cur = parseInt(s.dataset.cur || '0', 10);
    if (cur < maxStep(s)) setStep(s, cur + 1); else go(i + 1);
  }
  function prev() {
    const s = slides[i], cur = parseInt(s.dataset.cur || '0', 10);
    if (cur > 0) setStep(s, cur - 1); else if (i > 0) go(i - 1, true);
  }

  function full() {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else deck.requestFullscreen().catch(() => {});
    } catch (e) {}
  }
  function toggleNotes() {
    notes.hidden = !notes.hidden;
    document.getElementById('bNotes').setAttribute('aria-pressed', String(!notes.hidden));
  }

  /* keyboard: arrows, space, page up/down (presentation clickers), Home/End, F, N */
  const typing = el => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (typing(e.target)) return;
    const k = e.key;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) {
      if (k === 'Enter' && e.target.tagName === 'BUTTON') return;
      e.preventDefault(); next();
    } else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); prev(); }
    else if (k === 'Home') go(0);
    else if (k === 'End') go(slides.length - 1, true);
    else if (k === 'f' || k === 'F') full();
    else if (k === 'n' || k === 'N') toggleNotes();
  });

  /* click: left third goes back, the rest goes forward */
  stage.addEventListener('click', e => {
    if (e.target.closest('[data-interactive], button, input, a, [contenteditable]')) return;
    if (window.getSelection && String(window.getSelection())) return;
    const r = stage.getBoundingClientRect();
    ((e.clientX - r.left) / r.width < 0.33) ? prev() : next();
  });

  /* swipe */
  let tx = null;
  stage.addEventListener('touchstart', e => { tx = e.target.closest('[data-interactive], input') ? null : e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', e => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
    tx = null;
  });

  document.getElementById('bPrev').onclick = prev;
  document.getElementById('bNext').onclick = next;
  document.getElementById('bNotes').onclick = toggleNotes;
  document.getElementById('bFull').onclick = full;

  let idle;
  document.addEventListener('mousemove', () => {
    deck.classList.add('ui');
    clearTimeout(idle);
    idle = setTimeout(() => deck.classList.remove('ui'), 2500);
  });

  window.INTIQ_DECK = { go, next, prev, get index() { return i; }, get slide() { return slides[i]; }, setStep };
  window.addEventListener('resize', fit);
  fit();
  const m = /^#s(\d+)$/.exec(location.hash || '');
  go(m ? parseInt(m[1], 10) - 1 : 0);
})();
