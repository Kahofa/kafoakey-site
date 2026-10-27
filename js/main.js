/* =========================================================================
   KafoaKey — рендер каталога, меню, FAQ, движение
   Данные и заглушки — в js/config.js
   ========================================================================= */
(() => {
  'use strict';

  const C = window.CONFIG || {};
  const D = window.CATALOG || {};
  const ACC = C.ACCESSORIES || {};

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;

  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const DESKTOP = matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)').matches;
  const HAS_GSAP = !!(window.gsap && window.ScrollTrigger);
  const MOTION = !REDUCE && HAS_GSAP;
  if (!MOTION) root.classList.remove('motion');

  /* ---------- Утилиты ---------- */

  const isPh = v => typeof v === 'string' && /\{\{.+?\}\}/.test(v);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const href = v => (!v || isPh(v)) ? '#' : v;
  const pad2 = n => String(n).padStart(2, '0');
  const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-arrow"/></svg>';
  const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-star"/></svg>';

  const linkAttrs = v => {
    const h = href(v);
    if (h === '#') return 'href="#" data-missing';
    return `href="${esc(h)}"${/^https?:/i.test(h) ? ' target="_blank" rel="noopener"' : ''}`;
  };

  const btn = (label, value, cls = 'btn--primary') =>
    `<a class="btn ${cls}" ${linkAttrs(value)}><span>${label}</span><i class="btn__icon">${ARROW}</i></a>`;

  const buyBtn = p => p.inStock
    ? btn('Купить на Kaspi', p.kaspiUrl)
    : btn('Под заказ — написать в Instagram', C.INSTAGRAM, 'btn--ghost');

  const media = (p, cls = '', eager = false) =>
    `<div class="media ${cls}" data-media="${esc(p.id)}"><span class="media__ph">${esc(p.name)}</span>` +
    `<img src="${esc(p.img)}" alt="${esc(p.name)}${p.color ? ` — ${esc(p.color)}` : ''}" loading="${eager ? 'eager' : 'lazy'}" decoding="async" onerror="this.parentNode.classList.add('is-missing')"></div>`;

  const PALETTE = C.COLORS || {};
  const colors = p => {
    const list = (p.colors || []).filter(Boolean);
    if (!list.length) return '';
    return `<div class="colors"><span class="colors__lbl">Цвета</span><ul class="colors__list">${list.map(name => {
      const hex = PALETTE[name];
      const dot = `<i class="color__dot${hex ? '' : ' color__dot--none'}"${hex ? ` style="background:${esc(hex)}"` : ''}></i>${esc(name)}`;
      return p.photos?.[name]
        ? `<li><button class="color color--pick" type="button" data-pid="${esc(p.id)}" data-color="${esc(name)}" aria-pressed="${name === p.color}">${dot}</button></li>`
        : `<li class="color">${dot}</li>`;
    }).join('')}</ul></div>`;
  };

  /* Смена цвета: меняет фото во всех местах, где показан товар (карточка, витрина, просмотр) */
  const setColor = (id, name) => {
    const p = ALL.get(id);
    const src = p?.photos?.[name];
    if (!src || p.color === name) return;
    p.color = name;
    p.img = src;
    $$(`[data-pid="${id}"][data-color]`).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.color === name)));
    $$(`[data-media="${id}"]`).forEach(m => {
      const img = $('img', m);
      m.classList.add('is-swapping');
      const pre = new Image();
      const done = () => setTimeout(() => {
        img.src = src;
        img.alt = `${p.name} — ${name}`;
        m.classList.toggle('is-missing', !pre.naturalWidth);
        m.classList.remove('is-swapping');
      }, 160);
      pre.onload = pre.onerror = done;
      pre.src = src;
    });
  };

  const SIZES = C.SIZES || {};
  const sizes = (p, full) => {
    const list = (p.sizes || []).filter(Boolean);
    if (!list.length) return '';
    return `<div class="colors"><span class="colors__lbl">Размеры</span><ul class="colors__list">${list.map(s => {
      const dim = SIZES[s] ? esc(SIZES[s]) : '';
      return `<li class="size"${dim ? ` title="${dim}"` : ''}><b>${esc(s)}</b>${full && dim ? ` ${dim}` : ''}</li>`;
    }).join('')}</ul></div>`;
  };

  const card = (p, num, badge) => `
    <div class="pcard card" data-reveal data-view="${esc(p.id)}">
      ${media(p, 'pcard__media')}
      <div class="pcard__body">
        <div class="pcard__top">${num ? `<span class="pcard__num">${num}</span>` : ''}<span class="badge">${esc(badge)}</span></div>
        <h3 class="pcard__name">${esc(p.name)}</h3>
        <p class="pcard__desc">${esc(p.desc)}</p>
        ${colors(p)}
        ${sizes(p)}
        ${buyBtn(p)}
      </div>
    </div>`;

  const ALL = new Map();
  (D.artisan || []).forEach(p => {
    if (p.photos) {
      p.color = (p.colors || []).find(c => p.photos[c]) || null;
      if (p.color && !p.img) p.img = p.photos[p.color];
    }
    ALL.set(p.id, p);
  });
  [['glides', 'Глайды'], ['dots', 'Точки'], ['sleeves', 'Рукава']].forEach(([k, label]) =>
    (ACC[k] || []).forEach(p => { p.type = p.type || label; ALL.set(p.id, p); }));

  /* ---------- Ссылки и тексты из CONFIG ---------- */

  $$('[data-href]').forEach(a => {
    const h = href(C[a.dataset.href]);
    a.setAttribute('href', h);
    if (h === '#') a.setAttribute('data-missing', '');
    else if (/^https?:/i.test(h)) { a.target = '_blank'; a.rel = 'noopener'; }
  });
  $$('[data-text]').forEach(el => { el.textContent = C[el.dataset.text] ?? ''; });
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  /* ---------- Витрина ---------- */

  function renderShowcase(el, items) {
    const stage = `
      <div class="showcase__stage">
        <div class="stage" data-view="${esc(items[0].id)}">
          <div class="stage__media" data-parallax="34">
            ${items.map((p, i) => `<figure class="stage__img${i ? '' : ' is-active'}">${media(p, '', DESKTOP)}</figure>`).join('')}
          </div>
          <div class="stage__count"><b data-count>01</b><span>/${pad2(items.length)}</span></div>
          <span class="badge stage__badge" data-stage-badge>${esc(items[0].type)}</span>
        </div>
      </div>`;

    const list = items.map((p, i) =>
      `<article class="model" id="model-${esc(p.id)}" data-i="${i}">${card(p, pad2(i + 1), p.type)}</article>`).join('');
    el.innerHTML = stage + `<div class="showcase__list">${list}</div>`;

    const imgs = $$('.stage__img', el), models = $$('.model', el);
    const stageEl = $('.stage', el), count = $('[data-count]', el), badge = $('[data-stage-badge]', el);
    let current = -1;
    const setActive = i => {
      if (i === current) return;
      current = i;
      imgs.forEach((f, k) => f.classList.toggle('is-active', k === i));
      models.forEach((m, k) => m.classList.toggle('is-active', k === i));
      count.textContent = pad2(i + 1);
      badge.textContent = items[i].type;
      stageEl.dataset.view = items[i].id;
    };
    setActive(0);
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) setActive(+e.target.dataset.i);
    }), { rootMargin: '-45% 0px -45% 0px' });
    models.forEach(m => io.observe(m));
  }

  const ninja = $('[data-showcase="artisan"]');
  if (ninja && D.artisan) renderShowcase(ninja, D.artisan);

  /* ---------- Карта скольжения ---------- */

  const gmap = $('[data-gmap]');
  if (gmap && D.artisan) {
    const track = $('.gmap__track', gmap);
    track.innerHTML = D.artisan.map(p => `
      <li class="gstop" data-zones="${p.zones.join(' ')}">
        <button class="gnode" type="button" data-goto="model-${esc(p.id)}"><b>${esc(p.name)}</b><small>${esc(p.type)}</small></button>
      </li>`).join('');

    const filters = $$('[data-zone]');
    filters.forEach(f => f.addEventListener('click', () => {
      const on = f.getAttribute('aria-pressed') !== 'true';
      filters.forEach(x => x.setAttribute('aria-pressed', String(x === f && on)));
      gmap.classList.toggle('is-filtering', on);
      $$('.gstop', gmap).forEach(s => s.classList.toggle('is-hit', on && s.dataset.zones.split(' ').includes(f.dataset.zone)));
    }));
  }

  /* ---------- Отзывы ---------- */

  const reviews = $('[data-reviews]');
  if (reviews && C.REVIEWS) {
    reviews.insertAdjacentHTML('beforeend', C.REVIEWS.map((r, i) => {
      const n = parseFloat(String(r.rating).replace(',', '.'));
      const valid = n > 0 && n <= 5;
      const stars = valid ? `<div class="stars" aria-label="Оценка: ${n} из 5">${Array.from({ length: 5 }, (_, k) =>
        `<span class="${k < Math.round(n) ? '' : 'off'}">${STAR}</span>`).join('')}</div>` : '';
      const meta = [r.source, r.date].filter(Boolean).map(esc).join(' · ');
      return `
        <article class="review card" data-reveal data-glow="${['br', 'tl', 'bl', 'tr'][i % 4]}">
          <div class="review__top">${stars}${meta ? `<span class="review__meta">${meta}</span>` : ''}</div>
          ${r.product ? `<p class="review__product">${esc(r.product)}</p>` : ''}
          <p class="review__text">${esc(r.text)}</p>
          <button class="review__more" type="button" hidden>Читать полностью</button>
          <div class="review__author"><span class="review__avatar" aria-hidden="true">${esc((r.name || '?').trim().charAt(0))}</span><span class="review__name">${esc(r.name)}</span></div>
        </article>`;
    }).join(''));

    // «Читать полностью» — только у длинных отзывов
    const fitMore = () => $$('.review', reviews).forEach(card => {
      const text = $('.review__text', card), more = $('.review__more', card);
      if (card.classList.contains('is-open')) return;
      more.hidden = text.scrollHeight <= text.clientHeight + 2;
    });
    reviews.addEventListener('click', e => {
      const more = e.target.closest('.review__more');
      if (!more) return;
      const card = more.closest('.review');
      const open = card.classList.toggle('is-open');
      more.textContent = open ? 'Свернуть' : 'Читать полностью';
      if (HAS_GSAP) ScrollTrigger.refresh();
    });
    fitMore();
    addEventListener('resize', fitMore);
    document.fonts?.ready.then(fitMore);
  }

  /* ---------- Аксессуары ---------- */

  $$('[data-acc]').forEach(el => {
    const items = ACC[el.dataset.acc] || [];
    el.innerHTML = items.map(p => card(p, '', p.type)).join('');
  });

  /* ---------- Плавный скролл ---------- */

  let lenis = null;
  if (FINE && !REDUCE && window.Lenis) {
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
    if (HAS_GSAP) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  const scrollToEl = el => {
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: el.matches('.section') ? 0 : -90, duration: 1.4 });
    else el.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'start' });
  };

  /* ---------- Меню ---------- */

  const nav = $('[data-nav]');
  const burger = $('.nav__burger');
  const panel = $('.nav__panel');
  const closeMenu = () => {
    if (!nav || !panel) return;
    nav.classList.remove('is-open');
    panel.hidden = true;
    burger?.setAttribute('aria-expanded', 'false');
  };
  burger?.addEventListener('click', () => {
    const open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    panel.hidden = !open;
    burger.setAttribute('aria-expanded', String(open));
  });
  const onScroll = () => nav?.classList.toggle('is-scrolled', scrollY > 20);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- FAQ ---------- */

  $$('.faq__item').forEach(item => {
    const q = $('.faq__q', item), a = $('.faq__a', item);
    q.addEventListener('click', () => {
      const open = !item.classList.contains('is-open');
      item.classList.toggle('is-open', open);
      q.setAttribute('aria-expanded', String(open));
    });
    a.addEventListener('transitionend', () => HAS_GSAP && ScrollTrigger.refresh());
  });

  /* ---------- Просмотр товара ---------- */

  const lb = document.createElement('div');
  lb.className = 'lb';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-hidden', 'true');
  lb.innerHTML = '<div class="lb__box" data-lenis-prevent><button class="lb__close" type="button" aria-label="Закрыть"></button><div class="lb__content"></div></div>';
  document.body.appendChild(lb);
  const lbBox = $('.lb__box', lb);
  let lastFocus = null;

  const openLb = id => {
    const p = ALL.get(id);
    if (!p) return;
    lastFocus = document.activeElement;
    lbBox.querySelector('.lb__content').remove();
    lbBox.insertAdjacentHTML('beforeend', `
      <div class="lb__content" style="display:contents">
        ${media(p, 'lb__media')}
        <div class="lb__body">
          <span class="badge">${esc(p.type)}</span>
          <h3>${esc(p.name)}</h3>
          <p>${esc(p.desc)}</p>
          ${colors(p)}
          ${sizes(p, true)}
          ${buyBtn(p)}
        </div>
      </div>`);
    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
    lenis?.stop();
    document.body.style.overflow = 'hidden';
    $('.lb__close', lb).focus({ preventScroll: true });
  };
  const closeLb = () => {
    if (!lb.classList.contains('is-open')) return;
    lb.classList.remove('is-open');
    lb.setAttribute('aria-hidden', 'true');
    lenis?.start();
    document.body.style.overflow = '';
    lastFocus?.focus?.({ preventScroll: true });
  };
  lb.addEventListener('click', e => { if (e.target === lb || e.target.closest('.lb__close')) closeLb(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') { closeLb(); closeMenu(); } });

  /* ---------- Клики ---------- */

  document.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (a) {
      if (a.hasAttribute('data-missing')) {
        e.preventDefault();
        console.warn('[KafoaKey] Ссылка ещё не заполнена в js/config.js');
        return;
      }
      const h = a.getAttribute('href') || '';
      if (h.length > 1 && h.startsWith('#')) {
        const t = document.getElementById(h.slice(1));
        if (t) { e.preventDefault(); closeMenu(); closeLb(); scrollToEl(t); history.replaceState(null, '', h); }
      }
      return;
    }
    const pick = e.target.closest('[data-color]');
    if (pick) { setColor(pick.dataset.pid, pick.dataset.color); return; }
    const go = e.target.closest('[data-goto]');
    if (go) {
      const m = document.getElementById(go.dataset.goto);
      scrollToEl(m);
      const c = m?.querySelector('.pcard');
      if (c && !DESKTOP) { c.classList.remove('is-flash'); void c.offsetWidth; c.classList.add('is-flash'); }
      return;
    }
    const v = e.target.closest('[data-view]');
    if (v && !e.target.closest('button') && !lb.contains(v)) openLb(v.dataset.view);
  });

  /* ---------- Курсор и магнитные кнопки (ПК) ---------- */

  /* Свой курсор включается при первом движении мышью (не пальцем) — так он работает
     и на ноутбуках с тачскрином. При «уменьшении движения» он следует за мышью без задержки. */
  let cur = null, x = -100, y = -100, cx = x, cy = y;
  const initCursor = () => {
    cur = document.createElement('div');
    cur.className = 'cursor is-hidden';
    cur.setAttribute('aria-hidden', 'true');
    cur.innerHTML = '<div class="cursor__dot"><span>смотреть</span></div>';
    document.body.appendChild(cur);
    cx = x; cy = y;
    const ease = REDUCE ? 1 : 0.2;
    const tick = () => {
      cx += (x - cx) * ease;
      cy += (y - cy) * ease;
      cur.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      requestAnimationFrame(tick);
    };
    tick();
  };
  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    x = e.clientX; y = e.clientY;
    if (!cur) initCursor();
    root.classList.add('has-cursor');
    cur.classList.remove('is-hidden');
  }, { passive: true });
  addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' || !cur) return;
    root.classList.remove('has-cursor');
    cur.classList.add('is-hidden');
  }, { passive: true });
  document.addEventListener('mouseleave', () => cur?.classList.add('is-hidden'));
  document.addEventListener('mouseover', e => {
    if (!cur) return;
    const t = e.target;
    const link = t.closest('a, button, label, [role="button"]');
    const view = !link && t.closest('[data-view]') && !t.closest('.lb');
    cur.classList.toggle('is-link', !!link);
    cur.classList.toggle('is-view', !!view);
  });

  if (FINE && !REDUCE) {
    if (HAS_GSAP) {
      $$('[data-magnetic]').forEach(el => {
        el.addEventListener('mousemove', e => {
          const r = el.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2);
          const dy = e.clientY - (r.top + r.height / 2);
          gsap.to(el, { x: dx * 0.3, y: dy * 0.4, duration: 0.5, ease: 'power3.out' });
        });
        el.addEventListener('mouseleave', () => gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.35)' }));
      });
    }
  }

  /* ---------- Анимации ---------- */

  if (!MOTION) return;
  gsap.registerPlugin(ScrollTrigger);

  const heroReveal = $$('.hero [data-reveal]');
  gsap.to(heroReveal, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.1, delay: 0.1 });
  ScrollTrigger.batch($$('[data-reveal]').filter(el => !heroReveal.includes(el)), {
    start: 'top 90%',
    once: true,
    onEnter: batch => gsap.to(batch, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.09, overwrite: true })
  });

  if (DESKTOP) {
    const hero = $('.hero');
    if (hero) {
      $$('[data-hx]', hero).forEach(el => gsap.to(el, {
        xPercent: +el.dataset.hx * 7, ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
      }));
      $$('[data-hero-obj]', hero).forEach(el => {
        const [y, r] = (el.dataset.heroObj || '0,0').split(',').map(Number);
        gsap.to(el, { y, rotate: r, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 1 } });
      });
    }
    $$('[data-parallax]').forEach(el => {
      const v = +el.dataset.parallax || 40;
      gsap.fromTo(el, { y: -v }, {
        y: v, ease: 'none',
        scrollTrigger: { trigger: el.closest('section') || el, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  }

  addEventListener('load', () => ScrollTrigger.refresh());
})();
