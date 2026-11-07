/* Orizon: dal telefono si apre la pagina di Orizon (app Android, iPhone, browser) al posto di quella di Element.
   I tablet aprono subito Orizon web. Chi sceglie "Continua nel browser" non la rivede più su quel telefono. */
(function () {
  try {
    var ua = navigator.userAgent || '';
    var android = /Android/i.test(ua);
    var iphone = /iPhone|iPod/.test(ua);
    var tablet = /iPad/.test(ua) || (android && !/Mobile/i.test(ua));
    if (!android && !iphone && !tablet) return;
    var ss = window.sessionStorage, ls = window.localStorage;
    /* da qui in poi Element non porta più alla sua pagina "scarica Element" */
    ss.setItem('skip_mobile_redirect', 'true');
    if (tablet) return;
    if (ls.getItem('orizon.browser') === '1' || ss.getItem('orizon.browser') === '1') return;
    /* mai durante l'accesso (ritorno dalla pagina di login) */
    if (/[?&](code|state|loginToken|error)=/.test(location.search)) return;
    if (location.pathname !== '/' && location.pathname !== '/index.html') return;
    location.replace('/brand/pages/telefono.html' + location.hash);
  } catch (e) { /* senza memoria del browser resta tutto com'è */ }
})();

(function () {
  var f = null;
  function show() {
    if (f) return;
    f = document.createElement('iframe');
    f.src = 'brand/pages/welcome.html';  /* relativo: va bene sia sul web (/) sia nell'app desktop (vector://vector/webapp/) */
    f.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:99999';
    document.body.appendChild(f);
  }
  function hide() { if (f) { f.remove(); f = null; } }
  function check() {
    var h = location.hash;
    if (h === '' || h === '#' || h === '#/welcome') show(); else hide();
  }
  window.addEventListener('hashchange', check);
  check();
})();

(function () {
  // barra del browser: bordeaux col tema chiaro, rosso col tema scuro
  function fix() {
    var c = document.body && document.body.classList.contains('cpd-theme-light') ? '#8B1A2B' : '#B8141C';
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) {
      if (m.content !== c) m.content = c;
    });
  }
  fix();
  new MutationObserver(fix).observe(document.head, { childList: true, subtree: true, attributes: true });
  if (document.body) new MutationObserver(fix).observe(document.body, { attributes: true, attributeFilter: ['class'] });
})();

/* ================================================================
   ORIZON 2 — comportamento dell'interfaccia come l'app Android
   (titolo, pillola con foto e ricerca, filtri, pillola Chat/Spazi/+,
   impostazioni con le sezioni in pillola, movimento liquido)
   ================================================================ */
(function () {
  'use strict';
  if (window.__orizon2) return;
  window.__orizon2 = true;

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- parole nelle 23 lingue ---------- */
  var T = {
    conv: { it: 'Conversazioni', en: 'Chats', de: 'Chats', fr: 'Discussions', es: 'Chats', pt: 'Conversas', nl: 'Chats', pl: 'Czaty', sv: 'Chattar', da: 'Chats', fi: 'Keskustelut', cs: 'Konverzace', sk: 'Konverzácie', hu: 'Beszélgetések', ro: 'Conversații', bg: 'Разговори', el: 'Συνομιλίες', hr: 'Razgovori', sl: 'Pogovori', et: 'Vestlused', lv: 'Sarunas', lt: 'Pokalbiai', uk: 'Розмови' },
    chat: { it: 'Chat', en: 'Chats', de: 'Chats', fr: 'Discussions', es: 'Chats', pt: 'Conversas', nl: 'Chats', pl: 'Czaty', sv: 'Chattar', da: 'Chats', fi: 'Keskustelut', cs: 'Chaty', sk: 'Chaty', hu: 'Csevegések', ro: 'Chaturi', bg: 'Чатове', el: 'Συνομιλίες', hr: 'Chatovi', sl: 'Klepeti', et: 'Vestlused', lv: 'Tērzēšana', lt: 'Pokalbiai', uk: 'Чати' },
    spazi: { it: 'Spazi', en: 'Spaces', de: 'Spaces', fr: 'Espaces', es: 'Espacios', pt: 'Espaços', nl: 'Spaces', pl: 'Przestrzenie', sv: 'Utrymmen', da: 'Områder', fi: 'Tilat', cs: 'Prostory', sk: 'Priestory', hu: 'Terek', ro: 'Spații', bg: 'Пространства', el: 'Χώροι', hr: 'Prostori', sl: 'Prostori', et: 'Kogukonnad', lv: 'Telpas', lt: 'Erdvės', uk: 'Простори' },
    tutte: { it: 'Tutte', en: 'All', de: 'Alle', fr: 'Toutes', es: 'Todas', pt: 'Todas', nl: 'Alle', pl: 'Wszystkie', sv: 'Alla', da: 'Alle', fi: 'Kaikki', cs: 'Vše', sk: 'Všetky', hu: 'Összes', ro: 'Toate', bg: 'Всички', el: 'Όλες', hr: 'Sve', sl: 'Vse', et: 'Kõik', lv: 'Visas', lt: 'Visi', uk: 'Усі' },
    cerca: { it: 'Cerca', en: 'Search', de: 'Suchen', fr: 'Rechercher', es: 'Buscar', pt: 'Pesquisar', nl: 'Zoeken', pl: 'Szukaj', sv: 'Sök', da: 'Søg', fi: 'Hae', cs: 'Hledat', sk: 'Hľadať', hu: 'Keresés', ro: 'Caută', bg: 'Търсене', el: 'Αναζήτηση', hr: 'Traži', sl: 'Iskanje', et: 'Otsi', lv: 'Meklēt', lt: 'Ieškoti', uk: 'Пошук' },
    nuova: { it: 'Nuova chat', en: 'New chat', de: 'Neuer Chat', fr: 'Nouvelle discussion', es: 'Nuevo chat', pt: 'Nova conversa', nl: 'Nieuwe chat', pl: 'Nowy czat', sv: 'Ny chatt', da: 'Ny chat', fi: 'Uusi keskustelu', cs: 'Nový chat', sk: 'Nový chat', hu: 'Új csevegés', ro: 'Chat nou', bg: 'Нов чат', el: 'Νέα συνομιλία', hr: 'Novi chat', sl: 'Nov klepet', et: 'Uus vestlus', lv: 'Jauna tērzēšana', lt: 'Naujas pokalbis', uk: 'Новий чат' },
    profilo: { it: 'Profilo e impostazioni', en: 'Profile and settings', de: 'Profil und Einstellungen', fr: 'Profil et paramètres', es: 'Perfil y ajustes', pt: 'Perfil e definições', nl: 'Profiel en instellingen', pl: 'Profil i ustawienia', sv: 'Profil och inställningar', da: 'Profil og indstillinger', fi: 'Profiili ja asetukset', cs: 'Profil a nastavení', sk: 'Profil a nastavenia', hu: 'Profil és beállítások', ro: 'Profil și setări', bg: 'Профил и настройки', el: 'Προφίλ και ρυθμίσεις', hr: 'Profil i postavke', sl: 'Profil in nastavitve', et: 'Profiil ja seaded', lv: 'Profils un iestatījumi', lt: 'Profilis ir nustatymai', uk: 'Профіль і налаштування' }
  };
  function lang() { return (document.documentElement.lang || 'it').slice(0, 2).toLowerCase(); }
  function t(k) { return T[k][lang()] || T[k].en; }

  var ICON = {
    cerca: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.9 3 3 6.6 3 11c0 2.2 1 4.2 2.6 5.6L5 21l4.3-2.2c.9.2 1.8.3 2.7.3 5.1 0 9-3.6 9-8s-3.9-8-9-8z"/></svg>',
    spazi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/></svg>',
    piu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'
  };

  function $(s, root) { return (root || document).querySelector(s); }
  function $$(s, root) { return Array.prototype.slice.call((root || document).querySelectorAll(s)); }
  function dispatch(action) {
    try { if (window.mxDispatcher) window.mxDispatcher.dispatch(typeof action === 'string' ? { action: action } : action); } catch (e) {}
  }

  /* ---------- vetro liquido (come GlassSurface) ---------- */
  var liquid = (function () {
    var ua = navigator.userAgent, probe = document.createElement('div');
    probe.style.backdropFilter = 'url(#x)';
    if (!/Chrome|Chromium|Electron/.test(ua) || /Firefox/.test(ua) || probe.style.backdropFilter === '') return function () {};
    var holder = null, count = 0;
    function map(w, h, r, o) {
      var edge = Math.min(w, h) * (o.border * 0.5);
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
        '<defs><linearGradient id="r" x1="100%" y1="0%" x2="0%" y2="0%"><stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="red"/></linearGradient>' +
        '<linearGradient id="b" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="blue"/></linearGradient>' +
        '<filter id="s" filterUnits="userSpaceOnUse" x="0" y="0" width="' + w + '" height="' + h + '" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="' + o.blur + '"/></filter></defs>' +
        '<rect width="' + w + '" height="' + h + '" fill="black"/>' +
        '<rect width="' + w + '" height="' + h + '" rx="' + r + '" fill="url(#r)"/>' +
        '<rect width="' + w + '" height="' + h + '" rx="' + r + '" fill="url(#b)" style="mix-blend-mode:difference"/>' +
        '<rect x="' + edge + '" y="' + edge + '" width="' + (w - edge * 2) + '" height="' + (h - edge * 2) + '" rx="' + r + '" fill="hsl(0 0% ' + o.brightness + '% / ' + o.opacity + ')" filter="url(#s)"/></svg>';
      return 'data:image/svg+xml,' + encodeURIComponent(svg);
    }
    return function (el, opt) {
      if (el.__liquid) return;
      el.__liquid = true;
      var o = { scale: -80, red: 0, green: 10, blue: 20, border: 0.07, brightness: 50, opacity: 0.93, blur: 11, displace: 0.5 };
      for (var k in opt) o[k] = opt[k];
      if (!holder) {
        holder = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        holder.setAttribute('aria-hidden', 'true');
        holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
        document.body.appendChild(holder);
      }
      var id = 'orizon-liquido-' + (++count);
      var box = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      box.innerHTML = '<filter id="' + id + '" color-interpolation-filters="sRGB" x="0%" y="0%" width="100%" height="100%">' +
        '<feImage x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="map" scale="' + (o.scale + o.red) + '" xChannelSelector="R" yChannelSelector="G" result="dr"/>' +
        '<feColorMatrix in="dr" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="red"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="map" scale="' + (o.scale + o.green) + '" xChannelSelector="R" yChannelSelector="G" result="dg"/>' +
        '<feColorMatrix in="dg" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="green"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="map" scale="' + (o.scale + o.blue) + '" xChannelSelector="R" yChannelSelector="G" result="db"/>' +
        '<feColorMatrix in="db" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="blue"/>' +
        '<feBlend in="red" in2="green" mode="screen" result="rg"/><feBlend in="rg" in2="blue" mode="screen" result="out"/>' +
        '<feGaussianBlur in="out" stdDeviation="' + o.displace + '"/></filter>';
      var filter = box.firstChild;
      holder.appendChild(filter);
      var image = filter.querySelector('feImage'), last = '';
      function update() {
        var w = el.offsetWidth, h = el.offsetHeight;
        if (!w || !h) return;
        var r = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, w / 2, h / 2);
        var key = w + 'x' + h + 'x' + r;
        if (key === last) return;
        last = key;
        image.setAttribute('href', map(w, h, r, o));
      }
      update();
      if (window.ResizeObserver) new ResizeObserver(update).observe(el);
      el.classList.add('liquid');
      el.style.backdropFilter = 'url(#' + id + ') saturate(1.15)';
    };
  })();

  /* ---------- movimento liquido: il bordo davanti arriva prima, quello dietro lo segue ---------- */
  function Spring(k) { this.x = 0; this.v = 0; this.t = 0; this.k = k; }
  Spring.prototype.step = function (dt) {
    var c = 2 * Math.sqrt(this.k);
    this.v += (-this.k * (this.x - this.t) - c * this.v) * dt;
    this.x += this.v * dt;
  };
  Spring.prototype.settled = function () { return Math.abs(this.x - this.t) < 0.002 && Math.abs(this.v) < 0.01; };

  /* evidenziazione che scivola sotto voci di larghezza fissa (filtri) */
  function Highlight(el) { this.el = el; this.L = new Spring(420); this.R = new Spring(420); this.ready = false; this.raf = 0; }
  Highlight.prototype.to = function (x, w) {
    var L = x, R = x + w;
    if (!this.ready) { this.L.x = this.L.t = L; this.R.x = this.R.t = R; this.L.v = this.R.v = 0; this.ready = true; this.draw(); return; }
    if (Math.abs(L - this.L.t) < 0.5 && Math.abs(R - this.R.t) < 0.5) return;
    var forward = (L + R) > (this.L.x + this.R.x);
    this.R.k = forward ? 900 : 420;
    this.L.k = forward ? 420 : 900;
    this.L.t = L; this.R.t = R;
    var self = this, last = performance.now();
    cancelAnimationFrame(this.raf);
    (function frame(now) {
      var dt = Math.min(0.034, (now - last) / 1000); last = now;
      self.L.step(dt); self.R.step(dt); self.draw();
      if (!(Math.abs(self.L.x - self.L.t) < 0.3 && Math.abs(self.R.x - self.R.t) < 0.3 && Math.abs(self.L.v) < 1 && Math.abs(self.R.v) < 1)) self.raf = requestAnimationFrame(frame);
      else { self.L.x = self.L.t; self.R.x = self.R.t; self.draw(); }
    })(last);
  };
  Highlight.prototype.draw = function () {
    this.el.style.setProperty('--orizon-hl-x', this.L.x.toFixed(1) + 'px');
    this.el.style.setProperty('--orizon-hl-w', Math.max(0, this.R.x - this.L.x).toFixed(1) + 'px');
  };

  /* schede che si allargano quando sono scelte (pillola in basso, sezioni delle impostazioni) */
  function Tabs(track, items, opts) {
    this.track = track; this.items = items; this.opts = opts;
    this.pos = new Spring(420); this.lead = new Spring(900); this.raf = 0; this.sel = -1;
    this.measure();
  }
  Tabs.prototype.measure = function () {
    var o = this.opts;
    this.collapsed = this.items.map(function (it) { return o.collapsed(it); });
    this.expanded = this.items.map(function (it) { return o.expanded(it); });
    this.gap = o.gap || 0;
  };
  Tabs.prototype.width = function (i, p) {
    var w = Math.max(0, Math.min(1, 1 - Math.abs(p - i)));
    return this.collapsed[i] + (this.expanded[i] - this.collapsed[i]) * w;
  };
  Tabs.prototype.start = function (i, p) { var x = 0; for (var k = 0; k < i; k++) x += this.width(k, p) + this.gap; return x; };
  Tabs.prototype.edge = function (e, p, right) {
    var n = this.items.length - 1, self = this;
    function at(k) { return self.start(k, p) + (right ? self.width(k, p) : 0); }
    if (n <= 0) return at(0);
    var i = Math.max(0, Math.min(n - 1, Math.floor(e))), f = Math.max(0, Math.min(1, e - i));
    return at(i) + (at(i + 1) - at(i)) * f;
  };
  Tabs.prototype.draw = function () {
    var p = this.pos.x, lead = this.lead.x, self = this;
    this.items.forEach(function (it, i) {
      it.style.width = self.width(i, p).toFixed(1) + 'px';
      var lb = self.opts.label(it);
      if (lb) lb.style.opacity = Math.max(0, 1 - Math.abs(p - i)).toFixed(3);
    });
    var fwd = lead >= p;
    var L = this.edge(fwd ? p : lead, p, false), R = this.edge(fwd ? lead : p, p, true);
    var off = this.opts.offset || 0;
    this.track.style.setProperty('--orizon-hl-x', (L + off).toFixed(1) + 'px');
    this.track.style.setProperty('--orizon-hl-w', Math.max(0, R - L).toFixed(1) + 'px');
  };
  Tabs.prototype.select = function (i, instant) {
    if (i < 0) return;
    if (this.sel === -1 || instant) {
      this.sel = i; this.pos.x = this.pos.t = this.lead.x = this.lead.t = i; this.pos.v = this.lead.v = 0; this.draw(); return;
    }
    if (i === this.sel) return;
    this.sel = i; this.pos.t = i; this.lead.t = i;
    var self = this, last = performance.now();
    cancelAnimationFrame(this.raf);
    (function frame(now) {
      var dt = Math.min(0.034, (now - last) / 1000); last = now;
      self.pos.step(dt); self.lead.step(dt); self.draw();
      if (!(self.pos.settled() && self.lead.settled())) self.raf = requestAnimationFrame(frame);
      else { self.pos.x = self.lead.x = i; self.draw(); }
    })(last);
  };

  /* ---------- colonna di sinistra: titolo + pillola con ricerca e foto ---------- */
  var testa = null, fotoKey = '';
  function homeButton() { return $('.mx_SpacePanel .mx_SpaceTreeLevel > li:first-child .mx_SpaceButton') || $('.mx_SpacePanel .mx_SpaceButton'); }
  function inHome() { var b = homeButton(); return !b || b.classList.contains('mx_SpaceButton_active'); }

  function ensureTesta() {
    var panel = $('.mx_RoomListPanel');
    if (!panel) return;
    if (!testa) {
      testa = document.createElement('div');
      testa.id = 'orizon-testa';
      testa.innerHTML = '<h1></h1><div class="orizon-pillola orizon-vetro">' +
        '<button type="button" class="orizon-tasto" data-a="cerca">' + ICON.cerca + '</button>' +
        '<button type="button" class="orizon-tasto orizon-foto" data-a="profilo"></button></div>';
      testa.querySelector('[data-a="cerca"]').onclick = function () {
        var b = $('[data-testid="room-list-search"] button');
        if (b) b.click();
      };
      testa.querySelector('[data-a="profilo"]').onclick = function () { dispatch('view_user_settings'); };
      testa.querySelector('h1').onclick = function () {
        if (inHome()) return;
        var b = $('[data-testid="room-list-header"] button');
        if (b) b.click();
      };
    }
    if (testa.parentNode !== panel || panel.firstChild !== testa) {
      panel.insertBefore(testa, panel.firstChild);
      liquid(testa.querySelector('.orizon-pillola'), { scale: -70 });
    }
    var h1 = testa.querySelector('h1');
    var title = scheda === 1 ? t('spazi') : inHome() ? t('conv') : (($('[data-testid="room-list-header"] h1') || {}).textContent || t('conv'));
    if (h1.textContent !== title) h1.textContent = title;
    h1.classList.toggle('cliccabile', !inHome());
    testa.querySelector('[data-a="cerca"]').setAttribute('aria-label', t('cerca'));
    testa.querySelector('[data-a="profilo"]').setAttribute('aria-label', t('profilo'));
    var av = $('.mx_UserMenu [class*="_avatar_"]');
    if (av) {
      var key = av.outerHTML;
      if (key !== fotoKey) {
        fotoKey = key;
        var foto = testa.querySelector('.orizon-foto');
        foto.innerHTML = '';
        var copy = av.cloneNode(true);
        copy.removeAttribute('aria-label');
        foto.appendChild(copy);
      }
    }
  }

  /* ---------- filtri: "Tutte" e l'evidenziazione che scorre ---------- */
  var filtri = { list: null, hl: null };
  function ensureFiltri() {
    var list = $('[data-testid="primary-filters"] [role="listbox"]');
    if (!list) return;
    if (filtri.list !== list) {
      filtri.list = list;
      filtri.hl = new Highlight(list);
      filtri.sel = null;
      /* sfumatura solo dal lato dove c'è altro da vedere */
      var bordi = function () {
        var max = list.scrollWidth - list.clientWidth;
        list.classList.toggle('o-sx', list.scrollLeft > 2);
        list.classList.toggle('o-dx', list.scrollLeft < max - 2);
      };
      list.addEventListener('scroll', bordi, { passive: true });
      window.addEventListener('resize', bordi);
      filtri.bordi = bordi;
      /* con la rotella del mouse scorre di lato */
      list.addEventListener('wheel', function (e) {
        if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || list.scrollWidth <= list.clientWidth) return;
        e.preventDefault();
        list.scrollLeft += e.deltaY;
      }, { passive: false });
    }
    /* il fondo di vetro sta sotto la lista: così la sfumatura ai lati tocca solo i filtri, non la pillola */
    var wrap = list.closest('[data-testid="primary-filters"]') || list.parentElement;
    var fondo = wrap && $(':scope > .orizon-filtri-fondo', wrap);
    if (wrap && !fondo) {
      fondo = document.createElement('div');
      fondo.className = 'orizon-filtri-fondo orizon-vetro';
      fondo.setAttribute('aria-hidden', 'true');
      wrap.appendChild(fondo);
      liquid(fondo, { scale: -60 });
    }
    var tutte = $('.orizon-tutte', list);
    if (!tutte) {
      tutte = document.createElement('button');
      tutte.type = 'button';
      tutte.className = 'orizon-tutte';
      tutte.setAttribute('role', 'option');
      tutte.onclick = function () {
        var on = $('[role="option"][aria-selected="true"]:not(.orizon-tutte)', list);
        if (on) on.click();
      };
      list.insertBefore(tutte, list.firstChild);
    }
    if (tutte.textContent !== t('tutte')) tutte.textContent = t('tutte');
    var on = $('[role="option"][aria-selected="true"]:not(.orizon-tutte)', list);
    tutte.setAttribute('aria-selected', on ? 'false' : 'true');
    var target = on || tutte;
    filtri.hl.to(target.offsetLeft, target.offsetWidth);
    /* il filtro scelto si vede sempre per intero: se è al bordo, la pillola scorre */
    if (filtri.sel !== target) {
      var primo = filtri.sel === null;
      filtri.sel = target;
      var pad = 28, x = target.offsetLeft, w = target.offsetWidth, sl = list.scrollLeft, cw = list.clientWidth, to = sl;
      if (x - pad < sl) to = Math.max(0, x - pad);
      else if (x + w + pad > sl + cw) to = x + w + pad - cw;
      if (to !== sl) list.scrollTo({ left: to, behavior: primo || reduced ? 'auto' : 'smooth' });
    }
    filtri.bordi();
  }

  /* ---------- pillola in basso: Chat / Spazi / + ---------- */
  var basso = null, bassoTabs = null, scheda = 0;
  function apriSpazi(on) {
    scheda = on ? 1 : 0;
    document.body.classList.toggle('orizon-spazi', !!on);
    if (on) {
      var sp = $('.mx_SpacePanel');
      if (sp && sp.classList.contains('collapsed')) { var tg = $('.mx_SpacePanel_toggleCollapse', sp); if (tg) tg.click(); }
      posizionaSpazi();
    }
    if (bassoTabs) bassoTabs.select(scheda);
    if (basso) $$('.orizon-tab', basso).forEach(function (b, i) { b.classList.toggle('on', i === scheda); b.setAttribute('aria-selected', i === scheda ? 'true' : 'false'); });
    schedule();
  }
  function posizionaSpazi() {
    var panel = $('.mx_RoomListPanel');
    if (!panel) return;
    var r = panel.getBoundingClientRect(), top = testa ? testa.getBoundingClientRect().bottom : r.top + 70;
    var s = document.body.style;
    s.setProperty('--orizon-spazi-top', top + 'px');
    s.setProperty('--orizon-spazi-left', r.left + 'px');
    s.setProperty('--orizon-spazi-w', r.width + 'px');
  }
  function ensureBasso() {
    var panel = $('.mx_RoomListPanel');
    if (!panel) return;
    if (!basso) {
      basso = document.createElement('div');
      basso.id = 'orizon-basso';
      basso.innerHTML = '<div class="orizon-pillola orizon-vetro" role="tablist">' +
        '<div class="orizon-tabs">' +
        '<button type="button" class="orizon-tab on" role="tab" aria-selected="true"><span>' + ICON.chat + '<b data-t="chat"></b></span></button>' +
        '<button type="button" class="orizon-tab" role="tab" aria-selected="false"><span>' + ICON.spazi + '<b data-t="spazi"></b></span></button>' +
        '</div><button type="button" class="orizon-piu">' + ICON.piu + '</button></div>';
      var tabs = $$('.orizon-tab', basso);
      tabs[0].onclick = function () {
        var wasSpaces = scheda === 1;
        apriSpazi(false);
        if (!wasSpaces && !inHome()) { var h = homeButton(); if (h) h.click(); }
      };
      tabs[1].onclick = function () { apriSpazi(scheda !== 1); };
      $('.orizon-piu', basso).onclick = function () {
        if (scheda === 1) { var n = $('.mx_SpacePanel .mx_SpaceButton_new'); if (n) n.click(); }
        else dispatch('view_create_chat');
      };
    }
    if (basso.parentNode !== panel) {
      panel.appendChild(basso);
      liquid($('.orizon-pillola', basso), { scale: -90 });
      bassoTabs = null;
    }
    $$('[data-t]', basso).forEach(function (b) { var v = t(b.getAttribute('data-t')); if (b.textContent !== v) b.textContent = v; });
    $('.orizon-piu', basso).setAttribute('aria-label', scheda === 1 ? t('spazi') : t('nuova'));
    var tabs = $$('.orizon-tab', basso);
    var key = lang();
    if (!bassoTabs || bassoTabs.key !== key) {
      bassoTabs = new Tabs($('.orizon-tabs', basso), tabs, {
        gap: 4,
        collapsed: function (it) { var s = it.firstChild; return 13 + s.firstChild.getBoundingClientRect().width + 13; },
        expanded: function (it) { var s = it.firstChild; s.style.width = 'max-content'; var w = s.getBoundingClientRect().width; s.style.width = ''; return Math.ceil(w) + 1; },
        label: function (it) { return it.querySelector('b'); }
      });
      bassoTabs.key = key;
      bassoTabs.select(scheda, true);
    }
  }

  /* ---------- intestazione della chat: sfondo della pillola con le azioni ---------- */
  function headerActions() {
    var h = $('.mx_RoomHeader');
    if (!h) return;
    /* via "Conversazioni" (thread) e "Info stanza": le info si aprono già cliccando sul nome */
    var info = $(':scope > .mx_RoomHeader_infoWrapper', h);
    var lab = info && info.getAttribute('aria-label');
    $$(':scope > button[class*="_icon-button_"]', h).forEach(function (b) {
      if (!lab || b.getAttribute('aria-label') !== lab) return;
      b.classList.add('orizon-via');
      var prev = b.previousElementSibling;
      if (prev && prev.matches('button[class*="_icon-button_"]')) prev.classList.add('orizon-via');
    });
    var btns = $$(':scope > button[class*="_icon-button_"]:not(.orizon-via), :scope > .mx_FacePile, :scope > div[class*="_typography_"]', h);
    if (!btns.length) { h.style.setProperty('--orizon-azioni-w', '0px'); h.__aw = 0; return; }
    var hr = h.getBoundingClientRect();
    var a = btns[0].getBoundingClientRect(), b = btns[btns.length - 1].getBoundingClientRect();
    var x = Math.round(a.left - hr.left - 4), w = Math.round(b.right - a.left + 8);
    var y = Math.round(a.top + a.height / 2 - hr.top - 23);
    if (h.__ax !== x || h.__aw !== w || h.__ay !== y) {
      h.__ax = x; h.__aw = w; h.__ay = y;
      h.style.setProperty('--orizon-azioni-x', x + 'px');
      h.style.setProperty('--orizon-azioni-w', w + 'px');
      h.style.setProperty('--orizon-azioni-y', y + 'px');
    }
  }

  /* ---------- impostazioni: sezioni in pillola con movimento liquido ---------- */
  var setTabs = null;
  function settingsTabs() {
    var ul = $('.mx_TabbedView_tabsOnLeft .mx_TabbedView_tabLabels');
    if (!ul) { setTabs = null; return; }
    var lis = $$(':scope > .mx_TabbedView_tabLabel', ul);
    if (!lis.length) return;
    if (!setTabs || setTabs.track !== ul || setTabs.items.length !== lis.length || setTabs.items[0] !== lis[0]) {
      ul.classList.add('orizon-tabs-js');
      setTabs = new Tabs(ul, lis, {
        offset: 4,
        collapsed: function () { return 42; },
        expanded: function (li) {
          var lb = li.querySelector('.mx_TabbedView_tabLabel_text');
          if (!lb) return 42;
          var old = lb.style.cssText;
          lb.style.cssText = 'max-width:none;position:absolute;visibility:hidden;margin:0';
          var w = lb.getBoundingClientRect().width;
          lb.style.cssText = old;
          return Math.ceil(42 + 9 + w + 5);
        },
        label: function (li) { return li.querySelector('.mx_TabbedView_tabLabel_text'); }
      });
      setTabs.select(Math.max(0, lis.findIndex(function (li) { return li.classList.contains('mx_TabbedView_tabLabel_active'); })), true);
    }
    var i = lis.findIndex(function (li) { return li.classList.contains('mx_TabbedView_tabLabel_active'); });
    if (i >= 0 && i !== setTabs.sel) {
      setTabs.select(i);
      var active = lis[i];
      if (active.scrollIntoView) setTimeout(function () { active.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduced ? 'auto' : 'smooth' }); }, 60);
    }
  }

  /* ---------- la grafica è pensata per le bolle: le attivo su questo dispositivo ---------- */
  var bolleFatto = false;
  function forzaBolle() {
    var S = window.mxSettingsStore;
    if (bolleFatto || !S || !$('.mx_RoomListPanel')) return;
    bolleFatto = true;
    try {
      if (S.getValue('layout') !== 'bubble') S.setValue('layout', null, 'device', 'bubble');
    } catch (e) { /* niente: resta la disposizione scelta */ }
  }

  /* ---------- tutto insieme, una volta per fotogramma quando la pagina cambia ---------- */
  var queued = false;
  function sync() {
    queued = false;
    try {
      forzaBolle();
      ensureTesta();
      ensureFiltri();
      ensureBasso();
      headerActions();
      settingsTabs();
      if (scheda === 1) posizionaSpazi();
    } catch (e) {
      if (window.console) console.warn('orizon', e);
    }
  }
  function schedule() { if (!queued) { queued = true; requestAnimationFrame(sync); } }
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'aria-selected', 'lang'] });
  new MutationObserver(schedule).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  window.addEventListener('resize', schedule);
  schedule();

  /* dalla colonna degli spazi: scelto uno spazio, si torna alla lista */
  document.addEventListener('click', function (e) {
    if (scheda !== 1) return;
    var b = e.target.closest && e.target.closest('.mx_SpacePanel .mx_SpaceButton');
    if (b && !b.classList.contains('mx_SpaceButton_new') && !(e.target.closest('.mx_SpaceButton_menuButton'))) setTimeout(function () { apriSpazi(false); }, 80);
  }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && scheda === 1) apriSpazi(false); });
})();
