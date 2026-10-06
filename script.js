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

  form.addEventListener('input', (e) => {
    const field = e.target.closest('.field');
    if (field && e.target.checkValidity()) field.classList.remove('is-invalid');
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let valid = true;
    form.querySelectorAll('input, select, textarea').forEach((el) => {
      const ok = el.checkValidity();
      el.closest('.field').classList.toggle('is-invalid', !ok);
      if (!ok && valid) { el.focus(); valid = false; }
    });

    status.className = 'form__status';
    if (!valid) {
      status.textContent = 'Controllate i campi evidenziati, per favore.';
      status.classList.add('is-error');
      return;
    }

    /*
      Il sito è statico (GitHub Pages): per ricevere davvero le richieste
      collegare il form a un servizio come Formspree o Netlify Forms,
      oppure sostituire con un invio via mailto.
    */
    const name = form.elements.name.value.trim().split(' ')[0];
    status.textContent = `Grazie, ${name}. Vi ricontatteremo a breve per confermare il vostro tavolo.`;
    status.classList.add('is-ok');
    form.reset();
  });
})();
