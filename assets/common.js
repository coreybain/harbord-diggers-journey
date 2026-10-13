// Shared behaviour for the Harbord Diggers and Mounties homepage concepts
(() => {
  const doc = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  doc.classList.add('js');

  // Split headlines into masked words
  document.querySelectorAll('[data-split]').forEach((el) => {
    let i = 0;
    const wrap = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part.trim()) return frag.append(part ? ' ' : '');
            const w = document.createElement('span');
            w.className = 'w';
            w.innerHTML = `<span style="--i:${i++}"></span>`;
            w.firstChild.textContent = part;
            frag.append(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') {
          wrap(child);
        }
      });
    };
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    wrap(el);
    el.classList.add('split');
  });

  // Words that light up with scroll progress (styled per concept)
  document.querySelectorAll('[data-words]').forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', words.join(' '));
    el.innerHTML = words.map((w, i) => `<span class="sw" aria-hidden="true" style="--i:${i}">${w}</span>`).join(' ');
    el.style.setProperty('--n', words.length);
  });

  // Reveal on scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('.reveal,.reveal-fade,.wipe,.split:not([data-split="load"])').forEach((el) => io.observe(el));

  // Count-up numbers
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      countIO.unobserve(e.target);
      const el = e.target;
      const to = +el.dataset.count;
      const from = +(el.dataset.from || 0);
      if (reduced) { el.textContent = to; return; }
      const t0 = performance.now();
      const dur = 1800;
      const tick = (t) => {
        const p = Math.min((t - t0) / dur, 1);
        el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 4)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach((el) => countIO.observe(el));

  // Header state + scroll progress exposed to CSS
  const header = document.querySelector('[data-header]');
  let lastY = 0;
  let ticking = false;
  const onScroll = () => {
    const y = scrollY;
    if (header) {
      header.classList.toggle('is-scrolled', y > 40);
      header.classList.toggle('is-hidden', y > 500 && y > lastY && !document.body.classList.contains('menu-open'));
    }
    doc.style.setProperty('--sy', y);
    document.querySelectorAll('[data-progress]').forEach((el) => {
      const r = el.getBoundingClientRect();
      const total = r.height - innerHeight;
      // "view": travel through the viewport; default: travel of a tall (sticky) section
      const raw = el.dataset.progress === 'view' ? (innerHeight - r.top) / (innerHeight + r.height) : (total > 0 ? -r.top / total : 0);
      const p = Math.min(Math.max(raw, 0), 1);
      el.style.setProperty('--p', p.toFixed(4));
    });
    lastY = y;
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  // Menu
  document.querySelectorAll('[data-menu-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const open = document.body.classList.toggle('menu-open');
      btn.setAttribute('aria-expanded', open);
    });
  });
  document.querySelectorAll('.menu a').forEach((a) => a.addEventListener('click', () => document.body.classList.remove('menu-open')));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') document.body.classList.remove('menu-open'); });
  document.querySelectorAll('.menu__links a').forEach((a, i) => a.style.setProperty('--i', i));

  // Crossfading slideshows: [data-slides] > [data-slide], optional tabs/labels
  document.querySelectorAll('[data-slides]').forEach((root) => {
    const slides = [...root.querySelectorAll('[data-slide]')];
    const tabs = [...document.querySelectorAll(`[data-slide-tab="${root.dataset.slides}"]`)];
    const interval = +(root.dataset.interval || 6000);
    let i = 0;
    let timer;
    const go = (n) => {
      i = (n + slides.length) % slides.length;
      slides.forEach((s, k) => s.classList.toggle('is-active', k === i));
      tabs.forEach((t, k) => {
        t.classList.remove('is-active');
        if (k === i) { void t.offsetWidth; t.classList.add('is-active'); }
      });
      clearTimeout(timer);
      if (!reduced) timer = setTimeout(() => go(i + 1), interval);
    };
    tabs.forEach((t, k) => t.addEventListener('click', () => go(k)));
    root.style.setProperty('--interval', interval + 'ms');
    tabs.forEach((t) => t.style.setProperty('--interval', interval + 'ms'));
    go(0);
  });

  // Rotating words: <span data-rotate="a|b|c">a</span>
  document.querySelectorAll('[data-rotate]').forEach((el) => {
    const words = el.dataset.rotate.split('|');
    if (reduced || words.length < 2) return;
    let i = 0;
    el.innerHTML = `<span class="rot">${words[0]}</span>`;
    setInterval(() => {
      const cur = el.firstElementChild;
      i = (i + 1) % words.length;
      const next = document.createElement('span');
      next.className = 'rot rot--in';
      next.textContent = words[i];
      cur.classList.add('rot--out');
      el.append(next);
      el.style.width = next.offsetWidth + 'px';
      requestAnimationFrame(() => requestAnimationFrame(() => next.classList.remove('rot--in')));
      setTimeout(() => cur.remove(), 700);
    }, +(el.dataset.every || 2600));
  });

  // Drag-to-scroll rails
  document.querySelectorAll('[data-rail]').forEach((rail) => {
    let down = false, startX = 0, startL = 0, moved = false;
    rail.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; down = true; moved = false; startX = e.clientX; startL = rail.scrollLeft; });
    addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) { moved = true; rail.classList.add('is-dragging'); }
      rail.scrollLeft = startL - dx;
    });
    addEventListener('pointerup', () => { down = false; setTimeout(() => rail.classList.remove('is-dragging'), 0); });
    rail.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
    const id = rail.dataset.rail;
    document.querySelectorAll(`[data-rail-prev="${id}"],[data-rail-next="${id}"]`).forEach((btn) => {
      btn.addEventListener('click', () => {
        const dir = btn.hasAttribute('data-rail-next') ? 1 : -1;
        rail.scrollBy({ left: dir * rail.clientWidth * 0.7, behavior: 'smooth' });
      });
    });
  });

  // Concept switcher
  const here = location.pathname.match(/\/v(\d+)\//);
  const current = here && here[1];
  if (current) {
    const root = location.pathname.slice(0, here.index + 1);
    const nav = document.createElement('nav');
    nav.className = 'switcher';
    nav.setAttribute('aria-label', 'Concepts');
    const group = +current <= 3 ? [1, 2, 3] : +current <= 6 ? [4] : [7, 8, 9, 10];
    // Concepts 1–3 share inner pages, so switching keeps you on the same page
    const sub = +current <= 3 ? (location.pathname.slice(here.index + here[0].length).match(/^[a-z0-9-]+\//) || [''])[0] : '';
    nav.innerHTML = `<a href="${root}">All concepts</a>` + group.map((n) => `<a href="${root}v${n}/${sub}"${String(n) === current ? ' aria-current="page"' : ''}>${n}</a>`).join('');
    document.body.append(nav);
  }

  // Kick off load-in animation once fonts are ready so headlines don't jump
  const start = () => requestAnimationFrame(() => {
    document.body.classList.add('is-loaded');
    document.querySelectorAll('[data-split="load"]').forEach((el) => el.classList.add('in'));
  });
  (document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]) : Promise.resolve()).then(start);
})();
