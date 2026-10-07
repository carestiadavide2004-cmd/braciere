/* =========================================================
   BRACIERE — interazioni
   ========================================================= */
(function () {
  'use strict';

  /* ---------- Anno nel footer ---------- */
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Navigazione ---------- */
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('navToggle');
  const links = document.querySelectorAll('#navLinks a');

  const setMenu = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Chiudi menu' : 'Apri menu');
    document.body.style.overflow = open ? 'hidden' : '';
  };
  toggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  links.forEach((a) => a.addEventListener('click', () => setMenu(false)));

  /* Link attivo in base alla sezione visibile */
  const sectionLinks = new Map();
  links.forEach((a) => {
    const id = a.getAttribute('href').slice(1);
    const sec = document.getElementById(id);
    if (sec && !a.classList.contains('btn')) sectionLinks.set(sec, a);
  });
  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const link = sectionLinks.get(entry.target);
      if (link) link.classList.toggle('is-active', entry.isIntersecting);
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sectionLinks.forEach((_, sec) => navObserver.observe(sec));

  /* ---------- Reveal allo scroll ---------- */
  // Le immagini ".wipe" partono interamente nascoste da clip-path: il browser
  // non le considera mai visibili, quindi si osserva il loro contenitore.
  const revealEls = document.querySelectorAll('.reveal, .wipe, .divider');
  const targetOf = (el) => (el.classList.contains('wipe') ? el.parentElement : el);
  if (!('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  } else {
    const watched = new Map();
    const revealObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        watched.get(entry.target).forEach((el) => el.classList.add('is-visible'));
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.08 });
    revealEls.forEach((el) => {
      const t = targetOf(el);
      if (!watched.has(t)) { watched.set(t, []); revealObserver.observe(t); }
      watched.get(t).push(el);
    });
  }

  /* ---------- Scroll: nav + parallax ---------- */
  const parallaxEls = Array.from(document.querySelectorAll('[data-parallax]'));
  const progress = document.getElementById('progress');
  let ticking = false;

  const onScroll = () => {
    const y = window.scrollY;
    const vh = window.innerHeight;
    nav.classList.toggle('is-scrolled', y > 40);

    const max = document.documentElement.scrollHeight - vh;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;

    parallaxEls.forEach((el) => {
      const box = el.parentElement;
      const rect = box.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > vh + 200) return;
      const speed = parseFloat(el.dataset.parallax) || 0.2;
      // spostamento proporzionale alla distanza dal centro della viewport,
      // limitato al margine extra dell'immagine per non scoprire i bordi
      let offset = (rect.top + rect.height / 2 - vh / 2) * -speed;
      if (el.tagName === 'IMG') {
        const room = rect.height * 0.13;
        offset = Math.max(-room, Math.min(room, offset));
      }
      el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    });
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Braci ardenti (canvas) ---------- */
  const canvas = document.getElementById('embers');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const hero = canvas.parentElement;
    let w, h, dpr, particles = [], running = true, rafId;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = hero.clientWidth;
      h = hero.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawn = (initial) => ({
      x: Math.random() * w,
      y: initial ? Math.random() * h : h + 10,
      r: Math.random() < 0.12 ? Math.random() * 1.6 + 2 : Math.random() * 1.6 + 0.6,
      vy: -(Math.random() * 0.9 + 0.35),
      vx: (Math.random() - 0.5) * 0.35,
      life: 0,
      maxLife: Math.random() * 520 + 260,
      phase: Math.random() * Math.PI * 2,
      hue: 18 + Math.random() * 22 // dall'arancio brace all'ambra
    });

    const count = () => Math.round(Math.min(140, Math.max(45, w / 11)));

    const init = () => {
      resize();
      particles = Array.from({ length: count() }, () => spawn(true));
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.life++;
        p.phase += 0.02;
        p.x += p.vx + Math.sin(p.phase) * 0.35;
        p.y += p.vy;

        const t = p.life / p.maxLife;
        // brillano, poi si spengono salendo
        const alpha = Math.sin(Math.min(t, 1) * Math.PI) * (0.8 + Math.sin(p.phase * 3) * 0.2);
        if (t >= 1 || p.y < -20) { particles[i] = spawn(false); continue; }

        const glow = p.r * 6;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glow);
        g.addColorStop(0, `hsla(${p.hue + 15}, 100%, 75%, ${alpha})`);
        g.addColorStop(0.25, `hsla(${p.hue}, 95%, 55%, ${alpha * 0.55})`);
        g.addColorStop(1, `hsla(${p.hue - 8}, 90%, 40%, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, glow, 0, Math.PI * 2);
        ctx.fill();
        // nucleo incandescente
        ctx.fillStyle = `hsla(${p.hue + 25}, 100%, 85%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      if (running) rafId = requestAnimationFrame(draw);
    };

    init();
    draw();

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(init, 200);
    });

    // Pausa quando l'hero non è visibile (risparmio CPU/batteria)
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) { running = true; draw(); }
      else if (!entry.isIntersecting) { running = false; cancelAnimationFrame(rafId); }
    }).observe(hero);
  }

  /* ---------- Modale telefono ("Prenota") ---------- */
  const callModal = document.getElementById('callModal');
  const copyBtn = document.getElementById('copyPhone');
  let callReturnFocus = null;

  const openCall = () => {
    callReturnFocus = document.activeElement;
    setMenu(false);
    callModal.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => requestAnimationFrame(() => callModal.classList.add('is-open')));
    callModal.querySelector('.callmodal__number').focus();
  };
  const closeCall = (restoreFocus = true) => {
    if (callModal.hidden) return;
    callModal.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => { callModal.hidden = true; }, 500);
    if (restoreFocus && callReturnFocus) callReturnFocus.focus();
  };

  document.querySelectorAll('[data-call]').forEach((el) => {
    el.addEventListener('click', (e) => { e.preventDefault(); openCall(); });
  });
  callModal.querySelectorAll('[data-close]').forEach((el) => {
    // il link al modulo chiude la modale e lascia proseguire la navigazione
    el.addEventListener('click', () => closeCall(!el.matches('a')));
  });

  copyBtn.addEventListener('click', async () => {
    const label = copyBtn.textContent;
    try {
      await navigator.clipboard.writeText(copyBtn.dataset.phone);
      copyBtn.textContent = 'Copiato ✓';
    } catch (err) {
      copyBtn.textContent = copyBtn.dataset.phone;
    }
    setTimeout(() => { copyBtn.textContent = label; }, 2200);
  });

  callModal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); closeCall(); }
    // mantiene il focus da tastiera dentro la modale
    if (e.key === 'Tab') {
      const f = callModal.querySelectorAll('a[href], button');
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- Lightbox galleria ---------- */
  const items = Array.from(document.querySelectorAll('.gallery__item'));
  const lb = document.getElementById('lightbox');
  const lbMedia = document.getElementById('lbMedia');
  const lbCaption = document.getElementById('lbCaption');
  let current = 0;
  let lastFocus = null;

  const show = (i) => {
    current = (i + items.length) % items.length;
    const item = items[current];
    lbMedia.innerHTML = '';
    lbMedia.appendChild(item.querySelector('.ph').cloneNode(true));
    lbCaption.textContent = item.dataset.caption || '';
  };

  const open = (i) => {
    lastFocus = document.activeElement;
    show(i);
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => lb.classList.add('is-open'));
    document.getElementById('lbClose').focus();
  };

  const close = () => {
    lb.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => { lb.hidden = true; }, 450);
    if (lastFocus) lastFocus.focus();
  };

  items.forEach((item, i) => {
    item.setAttribute('aria-label', `Apri immagine: ${item.dataset.caption}`);
    item.addEventListener('click', () => open(i));
  });
  document.getElementById('lbClose').addEventListener('click', close);
  document.getElementById('lbPrev').addEventListener('click', () => show(current - 1));
  document.getElementById('lbNext').addEventListener('click', () => show(current + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb) close(); });

  document.addEventListener('keydown', (e) => {
    if (lb.hidden) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) setMenu(false);
      return;
    }
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });

  // swipe su mobile
  let touchX = null;
  lb.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  /* ---------- Form prenotazione ---------- */
  const form = document.getElementById('bookingForm');
  const status = document.getElementById('formStatus');
  const dateInput = document.getElementById('date');

  // niente date nel passato
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  dateInput.min = today.toISOString().split('T')[0];

  // il lunedì il ristorante è chiuso
  const CLOSED_MSG = 'Il lunedì siamo chiusi, scegliete un altro giorno';
  const parseDate = (value) => {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const checkClosedDay = () => {
    const closed = dateInput.value !== '' && parseDate(dateInput.value).getDay() === 1;
    dateInput.setCustomValidity(closed ? CLOSED_MSG : '');
    dateInput.closest('.field').classList.toggle('is-invalid', closed);
    if (closed) {
      status.className = 'form__status is-error';
      status.textContent = CLOSED_MSG;
    } else if (status.textContent === CLOSED_MSG) {
      status.className = 'form__status';
      status.textContent = '';
    }
    return !closed;
  };
  dateInput.addEventListener('change', checkClosedDay);

  /* ---------- Scelta del tavolo (piantina) ---------- */
  const ZONES = {
    sala: { name: 'Sala principale', desc: 'Il cuore del locale, luci soffuse e atmosfera conviviale.' },
    brace: { name: 'Brace a vista', desc: 'Davanti alla griglia, per vedere la carne cuocere.' },
    saletta: { name: 'Saletta riservata', desc: 'Una sala tutta per voi, ideale per gruppi e occasioni speciali.' },
    dehors: { name: 'Dehors', desc: 'All’aperto, sulla terrazza, nelle sere più miti.' }
  };
  // coordinate nel viewBox 600×920 della piantina
  const TABLES = [
    { n: 1, zone: 'sala', seats: 4, x: 110, y: 290 },
    { n: 2, zone: 'sala', seats: 2, x: 300, y: 290 },
    { n: 3, zone: 'sala', seats: 2, x: 110, y: 420 },
    { n: 4, zone: 'sala', seats: 4, x: 300, y: 420 },
    { n: 5, zone: 'sala', seats: 4, x: 110, y: 550 },
    { n: 6, zone: 'sala', seats: 2, x: 300, y: 550 },
    { n: 7, zone: 'brace', seats: 4, x: 95, y: 130 },
    { n: 8, zone: 'brace', seats: 2, x: 210, y: 130 },
    { n: 9, zone: 'brace', seats: 4, x: 325, y: 130 },
    { n: 10, zone: 'saletta', seats: 12, label: '10–12 posti', x: 495, y: 340, w: 60, h: 190, sides: [5, 5, 1, 1] },
    { n: 11, zone: 'dehors', seats: 2, x: 85, y: 825, round: true },
    { n: 12, zone: 'dehors', seats: 4, x: 225, y: 825, round: true },
    { n: 13, zone: 'dehors', seats: 4, x: 375, y: 825, round: true },
    { n: 14, zone: 'dehors', seats: 2, x: 515, y: 825, round: true }
  ];
  const seatsLabel = (t) => t.label || `${t.seats} posti`;
  const tableText = (t, sep) => [`Tavolo ${t.n}`, ZONES[t.zone].name, seatsLabel(t)].join(sep);

  const CH_L = 20, CH_S = 11, CH_GAP = 5, HIT = 20;

  const drawTable = (t) => {
    let shape, chairs = '', hit;
    if (t.round) {
      const r = t.seats > 2 ? 28 : 25;
      const angles = t.seats > 2 ? [45, 135, 225, 315] : [90, 270];
      shape = `<circle class="tbl__top" cx="${t.x}" cy="${t.y}" r="${r}"/>`;
      angles.forEach((a) => {
        chairs += `<rect class="tbl__chair" x="${-CH_L / 2}" y="${-(r + CH_GAP + CH_S)}" width="${CH_L}" height="${CH_S}" rx="3" transform="translate(${t.x} ${t.y}) rotate(${a})"/>`;
      });
      hit = `<circle class="tbl__hit" cx="${t.x}" cy="${t.y}" r="${r + HIT}"/>`;
    } else {
      const w = t.w || (t.seats > 2 ? 56 : 46);
      const h = t.h || w;
      const [left, right, top, bottom] = t.sides || (t.seats > 2 ? [1, 1, 1, 1] : [1, 1, 0, 0]);
      const x0 = t.x - w / 2, y0 = t.y - h / 2;
      const chair = (cx, cy, vertical) => {
        const cw = vertical ? CH_S : CH_L, chh = vertical ? CH_L : CH_S;
        chairs += `<rect class="tbl__chair" x="${cx - cw / 2}" y="${cy - chh / 2}" width="${cw}" height="${chh}" rx="3"/>`;
      };
      for (let i = 0; i < left; i++) chair(x0 - CH_GAP - CH_S / 2, y0 + h * (i + 0.5) / left, true);
      for (let i = 0; i < right; i++) chair(x0 + w + CH_GAP + CH_S / 2, y0 + h * (i + 0.5) / right, true);
      for (let i = 0; i < top; i++) chair(x0 + w * (i + 0.5) / top, y0 - CH_GAP - CH_S / 2, false);
      for (let i = 0; i < bottom; i++) chair(x0 + w * (i + 0.5) / bottom, y0 + h + CH_GAP + CH_S / 2, false);
      shape = `<rect class="tbl__top" x="${x0}" y="${y0}" width="${w}" height="${h}" rx="3"/>`;
      hit = `<rect class="tbl__hit" x="${x0 - HIT}" y="${y0 - HIT}" width="${w + HIT * 2}" height="${h + HIT * 2}" rx="8"/>`;
    }
    return `<g class="tbl" data-n="${t.n}" role="button" tabindex="0">${hit}${chairs}${shape}
      <text class="tbl__num" x="${t.x}" y="${t.y + 2}">${t.n}</text>
      <text class="tbl__seats" x="${t.x}" y="${t.y + 16}">${seatsLabel(t)}</text></g>`;
  };

  const buildPlan = () => {
    const bars = Array.from({ length: 32 }, (_, i) => `M${50 + i * 10} 28V58`).join('');
    const embers = [[62, 46], [88, 38], [115, 50], [140, 41], [168, 47], [197, 36], [222, 50], [250, 42], [276, 48], [301, 38], [330, 46], [352, 40]]
      .map(([x, y], i) => `<circle class="plan__ember" cx="${x}" cy="${y}" r="${i % 3 ? 2.2 : 3}"/>`).join('');
    const planters = Array.from({ length: 12 }, (_, i) => `<circle class="plan__planter" cx="${42 + i * 47}" cy="893" r="6"/>`).join('');
    const stools = [520, 555, 590, 625].map((y) => `<circle class="plan__stool" cx="482" cy="${y}" r="8"/>`).join('');
    return `<svg viewBox="0 0 600 920" role="group" aria-label="Piantina del ristorante">
      <defs>
        <pattern id="planHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line class="plan__hatch" x1="0" y1="0" x2="0" y2="8"/></pattern>
        <pattern id="planDeck" width="600" height="14" patternUnits="userSpaceOnUse"><line class="plan__deck" x1="0" y1="13.5" x2="600" y2="13.5"/></pattern>
        <radialGradient id="planGlow"><stop offset="0" stop-color="#ffb35c" stop-opacity="0.75"/><stop offset="1" stop-color="#b8461f" stop-opacity="0"/></radialGradient>
      </defs>

      <rect width="600" height="920" fill="transparent"/>
      <rect class="plan__floor" x="10" y="10" width="580" height="670"/>
      <rect x="10" y="720" width="580" height="185" fill="url(#planDeck)"/>
      <rect x="400" y="10" width="190" height="160" fill="url(#planHatch)"/>

      <!-- griglia della brace a vista -->
      <rect class="plan__grill" x="40" y="24" width="330" height="38" rx="3"/>
      <ellipse cx="205" cy="43" rx="170" ry="22" fill="url(#planGlow)"/>
      <path class="plan__bars" d="${bars}"/>
      <g>${embers}</g>

      <!-- muri, porte, divisori -->
      <path class="plan__wall" d="M215 680H10V10H590V680H285"/>
      <path class="plan__wall plan__wall--inner" d="M400 10V170H420M460 170H590M400 170V420M400 460V470H590"/>
      <path class="plan__door" d="M420 170A40 40 0 0 0 460 210M460 170V210M400 420A40 40 0 0 1 440 460M400 460H440"/>
      <path class="plan__divider" d="M10 200H400"/>
      <path class="plan__edge" d="M215 720H10V905H590V720H285"/>
      <path class="plan__arrow" d="M250 712V690M243 697L250 690L257 697"/>

      <!-- bancone -->
      <rect class="plan__fixture" x="562" y="492" width="18" height="170"/>
      <rect class="plan__counter" x="505" y="500" width="24" height="150" rx="3"/>
      ${stools}
      ${planters}

      <!-- nomi -->
      <text class="plan__room" x="495" y="100" text-anchor="middle">Cucina</text>
      <text class="plan__zone" x="26" y="192">BRACE A VISTA</text>
      <text class="plan__zone" x="26" y="226">SALA PRINCIPALE</text>
      <text class="plan__zone" x="414" y="194">SALETTA</text>
      <text class="plan__zone" x="414" y="212">RISERVATA</text>
      <text class="plan__zone" x="414" y="496">BANCONE</text>
      <text class="plan__small" x="250" y="668" text-anchor="middle">INGRESSO</text>
      <text class="plan__zone" x="26" y="748">DEHORS · TERRAZZA ESTERNA</text>

      ${TABLES.map(drawTable).join('')}
    </svg>`;
  };

  const guestsSelect = document.getElementById('guests');
  const tableValue = document.getElementById('tableValue');
  const tableOpen = document.getElementById('tableOpen');
  const tableChange = document.getElementById('tableChange');
  const tableClear = document.getElementById('tableClear');
  const tableMap = document.getElementById('tableMap');
  const tmPlan = document.getElementById('tmPlan');
  const tmHint = document.getElementById('tmHint');
  const tmEmpty = document.getElementById('tmEmpty');
  const tmPick = document.getElementById('tmPick');
  const tmConfirm = document.getElementById('tmConfirm');
  let chosenTable = null;
  let pendingTable = null;
  let tableMsg = '';
  let mapReturnFocus = null;

  // "Più di 8 — gruppo" vale come 9 persone
  const guestsCount = () => {
    const v = guestsSelect.value;
    if (!v) return 0;
    return parseInt(v, 10) || 9;
  };
  const fits = (t) => t.seats >= guestsCount();

  const setTableStatus = (msg) => {
    if (msg) {
      status.className = 'form__status is-error';
      status.textContent = msg;
    } else if (tableMsg && status.textContent === tableMsg) {
      status.className = 'form__status';
      status.textContent = '';
    }
    tableMsg = msg;
  };

  const renderTableField = () => {
    tableValue.textContent = chosenTable ? tableText(chosenTable, ' · ') : 'Nessuna preferenza';
    tableValue.classList.toggle('is-empty', !chosenTable);
    tableOpen.hidden = !!chosenTable;
    tableChange.hidden = tableClear.hidden = !chosenTable;
  };

  const renderMap = () => {
    const count = guestsCount();
    tmHint.textContent = count
      ? `Per ${count > 8 ? 'più di 8' : count} ${count === 1 ? 'persona' : 'persone'}: i tavoli in grigio sono troppo piccoli.`
      : 'Scegliete il numero di persone nel modulo per vedere solo i tavoli adatti.';
    tmPlan.querySelectorAll('.tbl').forEach((g) => {
      const t = TABLES[g.dataset.n - 1];
      const ok = fits(t);
      const sel = pendingTable === t;
      g.classList.toggle('is-disabled', !ok);
      g.classList.toggle('is-selected', sel);
      g.setAttribute('tabindex', ok ? '0' : '-1');
      g.setAttribute('aria-disabled', String(!ok));
      g.setAttribute('aria-pressed', String(sel));
      g.setAttribute('aria-label', tableText(t, ', ') + (ok ? '' : ', troppo piccolo per il vostro gruppo'));
    });
    tmEmpty.hidden = !!pendingTable;
    tmPick.hidden = !pendingTable;
    if (pendingTable) {
      document.getElementById('tmPickTitle').textContent = `Tavolo ${pendingTable.n}`;
      document.getElementById('tmPickMeta').textContent = `${ZONES[pendingTable.zone].name} · ${seatsLabel(pendingTable)}`;
      document.getElementById('tmPickDesc').textContent = ZONES[pendingTable.zone].desc;
    }
  };

  const openMap = () => {
    if (!tmPlan.firstChild) tmPlan.innerHTML = buildPlan();
    mapReturnFocus = document.activeElement;
    pendingTable = chosenTable;
    renderMap();
    tableMap.hidden = false;
    tableMap.scrollTop = 0;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => requestAnimationFrame(() => tableMap.classList.add('is-open')));
    document.getElementById('tmClose').focus();
  };
  const closeMap = (focusEl) => {
    if (tableMap.hidden) return;
    tableMap.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => { tableMap.hidden = true; }, 500);
    const target = focusEl || mapReturnFocus;
    if (target) target.focus();
  };

  const pickFromMap = (g) => {
    if (!g || g.classList.contains('is-disabled')) return;
    pendingTable = TABLES[g.dataset.n - 1];
    renderMap();
  };

  tableOpen.addEventListener('click', openMap);
  tableChange.addEventListener('click', openMap);
  tableClear.addEventListener('click', () => {
    chosenTable = null;
    renderTableField();
    tableOpen.focus();
  });
  document.getElementById('tmClose').addEventListener('click', () => closeMap());
  tmConfirm.addEventListener('click', () => {
    chosenTable = pendingTable;
    setTableStatus('');
    renderTableField();
    closeMap(tableChange);
  });
  tmPlan.addEventListener('click', (e) => pickFromMap(e.target.closest('.tbl')));
  // tocco fuori dalla piantina: sfondo, margini o area vuota attorno al disegno
  tableMap.addEventListener('click', (e) => {
    if (e.target === tableMap || e.target === tmPlan || e.target.tagName === 'svg') closeMap();
  });
  tableMap.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); closeMap(); return; }
    const g = e.target.closest && e.target.closest('.tbl');
    if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pickFromMap(g); }
    // mantiene il focus da tastiera dentro la finestra
    if (e.key === 'Tab') {
      const f = Array.from(tableMap.querySelectorAll('button, .tbl[tabindex="0"]')).filter((el) => !el.closest('[hidden]'));
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // se il gruppo cresce e il tavolo scelto non basta più, si annulla la scelta
  guestsSelect.addEventListener('change', () => {
    if (chosenTable && !fits(chosenTable)) {
      const old = chosenTable;
      chosenTable = null;
      renderTableField();
      setTableStatus(`Il tavolo ${old.n} ha ${seatsLabel(old)}: è troppo piccolo per il vostro gruppo, sceglietene un altro.`);
    }
  });

  form.addEventListener('input', (e) => {
    const field = e.target.closest('.field');
    if (field && e.target.checkValidity()) field.classList.remove('is-invalid');
  });

  const submitBtn = form.querySelector('button[type="submit"]');
  const submitLabel = submitBtn.textContent;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const openDay = checkClosedDay();
    let valid = true;
    form.querySelectorAll('.field input, .field select, .field textarea').forEach((el) => {
      const ok = el.checkValidity();
      el.closest('.field').classList.toggle('is-invalid', !ok);
      if (!ok && valid) { el.focus(); valid = false; }
    });

    status.className = 'form__status';
    if (!valid) {
      status.textContent = openDay ? 'Controllate i campi evidenziati, per favore.' : CLOSED_MSG;
      status.classList.add('is-error');
      return;
    }

    const f = form.elements;
    const payload = {
      access_key: '5937ef40-2020-4a9f-991e-662529408b49',
      subject: 'Nuova prenotazione dal sito Braciere',
      from_name: 'Sito Braciere',
      botcheck: f.botcheck.checked,
      nome: f.name.value.trim(),
      email: f.email.value.trim(),
      telefono: f.phone.value.trim(),
      data: f.date.value,
      orario: f.time.value,
      tavolo: chosenTable ? tableText(chosenTable, ' – ') : 'Nessuna preferenza',
      persone: f.guests.value,
      messaggio: f.message.value.trim()
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Invio in corso…';
    status.textContent = '';

    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || res.status);

      const name = payload.nome.split(' ')[0];
      const day = parseDate(payload.data).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
      status.textContent = `Grazie, ${name}. Abbiamo ricevuto la vostra richiesta per ${day} alle ${payload.orario}. Vi ricontatteremo a breve per confermare.`;
      status.classList.add('is-ok');
      form.reset();
      chosenTable = null;
      renderTableField();
    } catch (err) {
      status.textContent = 'Si è verificato un errore, riprova o chiamaci';
      status.classList.add('is-error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = submitLabel;
    }
  });
})();
