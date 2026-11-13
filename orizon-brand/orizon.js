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

  /* ---------- vetro: lo disegna orizon.css (sfocatura, riflessi sul bordo); il vecchio filtro che sdoppiava i colori non c'è più ---------- */
  function liquid() {}

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
    this.pos = new Spring(420); this.lead = new Spring(900); this.mini = new Spring(260); this.raf = 0; this.sel = -1;
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
    var full = this.collapsed[i] + (this.expanded[i] - this.collapsed[i]) * w;
    var m = Math.max(0, Math.min(1, this.mini.x)), small = this.opts.miniW || full;
    return full + (small - full) * m;
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
      if (lb) lb.style.opacity = (Math.max(0, 1 - Math.abs(p - i)) * (1 - Math.max(0, Math.min(1, self.mini.x)))).toFixed(3);
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
    this.run();
  };
  Tabs.prototype.setMini = function (on) {
    var t = on ? 1 : 0;
    if (this.mini.t === t) return;
    this.mini.t = t;
    if (reduced) { this.mini.x = t; this.draw(); return; }
    this.run();
  };
  Tabs.prototype.run = function () {
    var self = this, last = performance.now();
    cancelAnimationFrame(this.raf);
    (function frame(now) {
      var dt = Math.min(0.034, (now - last) / 1000); last = now;
      self.pos.step(dt); self.lead.step(dt); self.mini.step(dt); self.draw();
      if (!(self.pos.settled() && self.lead.settled() && self.mini.settled())) self.raf = requestAnimationFrame(frame);
      else { self.pos.x = self.lead.x = self.sel; self.mini.x = self.mini.t; self.draw(); }
    })(last);
  };

  /* ---------- la goccia: segue il mouse sulle pillole, premuta diventa una lente che ingrandisce ----------
     o.items()   le voci della pillola        o.sel()   quella scelta (-1: nessuna, la goccia c'è solo sotto il mouse)
     o.pick(i,el) cosa fare quando la lascio su una voce dopo averla trascinata (di solito il clic)
     o.swell     di quanto si gonfia in altezza quando è premuta */
  var gocce = [];
  function chiaro() { return !!(document.body && document.body.classList.contains('cpd-theme-light')); }
  function Goccia(host, o) {
    this.host = host; this.o = o;
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    var d = document.createElement('span');
    d.className = 'orizon-goccia';
    d.setAttribute('aria-hidden', 'true');
    var l = document.createElement('span');
    l.className = 'orizon-goccia-lente';
    d.appendChild(l);
    this.d = d; this.l = l;
    this.s = { x: 0, w: 0, t: 0, h: 0, a: 0, g: 0, st: 0, sk: 0, vx: 0, vw: 0, vt: 0, vh: 0, va: 0, vg: 0, vst: 0, vsk: 0 };
    this.hov = -1; this.down = false; this.moved = false; this.px = 0; this.x0 = 0; this.raf = 0; this.last = 0; this.pid = null;
    var self = this;
    this.on = {
      move: function (e) { if (!self.down) self.move(e); },
      leave: function () { if (!self.down && self.hov !== -1) { self.hov = -1; self.kick(); } },
      down: function (e) { self.press(e); },
      /* mentre è premuta la seguo su tutta la finestra: anche se il mouse esce dalla pillola, quando lo lascio la goccia si ferma */
      wmove: function (e) { if (self.down) self.move(e); },
      wup: function (e) { self.release(e); },
      wcancel: function () { self.cancel(); }
    };
    host.addEventListener('pointermove', this.on.move);
    host.addEventListener('pointerleave', this.on.leave);
    host.addEventListener('pointerdown', this.on.down);
    this.attach();
    gocce.push(this);
  }
  Goccia.prototype.attach = function () { if (this.d.parentNode !== this.host) this.host.appendChild(this.d); };
  Goccia.prototype.scale = function () {
    var r = this.host.getBoundingClientRect();
    return (r.width && this.host.offsetWidth) ? r.width / this.host.offsetWidth : 1;
  };
  Goccia.prototype.rects = function () {
    var host = this.host, hr = host.getBoundingClientRect(), k = this.scale();
    return this.o.items().map(function (el) {
      var r = el.getBoundingClientRect();
      return { x: (r.left - hr.left) / k + host.scrollLeft - host.clientLeft, y: (r.top - hr.top) / k + host.scrollTop - host.clientTop, w: r.width / k, h: r.height / k, el: el };
    }).filter(function (r) { return r.w > 0 && r.h > 0; });
  };
  Goccia.prototype.local = function (e) {
    var hr = this.host.getBoundingClientRect();
    return (e.clientX - hr.left) / this.scale() + this.host.scrollLeft - this.host.clientLeft;
  };
  Goccia.prototype.nearest = function (it, x) {
    var best = 0, bd = 1e9;
    for (var i = 0; i < it.length; i++) { var d = Math.abs(x - (it[i].x + it[i].w / 2)); if (d < bd) { bd = d; best = i; } }
    return best;
  };
  Goccia.prototype.at = function (it, x) {
    for (var i = 0; i < it.length; i++) if (x >= it[i].x - 2 && x <= it[i].x + it[i].w + 2) return i;
    return -1;
  };
  Goccia.prototype.ascolta = function (on) {
    var f = on ? 'addEventListener' : 'removeEventListener';
    window[f]('pointermove', this.on.wmove, true);
    window[f]('pointerup', this.on.wup, true);
    window[f]('pointercancel', this.on.wcancel, true);
    window[f]('blur', this.on.wcancel);
  };
  Goccia.prototype.cancel = function () {
    if (!this.down) return;
    this.down = false;
    this.ascolta(false);
    if (this.pid != null) { try { this.host.releasePointerCapture(this.pid); } catch (err) {} this.pid = null; }
    this.kick();
  };
  Goccia.prototype.move = function (e) {
    /* il tasto è già stato lasciato (fuori dalla finestra): la goccia si ferma qui */
    if (this.down && e.pointerType === 'mouse' && e.buttons === 0) { this.release(e); return; }
    if (this.down) {
      this.px = this.local(e);
      if (!this.moved && Math.abs(this.px - this.x0) > 6) {
        this.moved = true;
        try { this.host.setPointerCapture(e.pointerId); this.pid = e.pointerId; } catch (err) {}
      }
      this.kick();
      return;
    }
    if (e.pointerType === 'touch') return;
    var i = this.at(this.rects(), this.local(e));
    if (i !== this.hov) { this.hov = i; this.kick(); }
  };
  Goccia.prototype.press = function (e) {
    if (e.button) return;
    var it = this.rects();
    if (this.at(it, this.local(e)) < 0) return;
    this.down = true; this.moved = false; this.px = this.x0 = this.local(e);
    this.ascolta(true);
    this.s.vst += 2.6;
    this.lente(it);
    this.kick();
  };
  Goccia.prototype.release = function () {
    if (!this.down) return;
    this.down = false;
    this.ascolta(false);
    if (this.pid != null) { try { this.host.releasePointerCapture(this.pid); } catch (err) {} this.pid = null; }
    if (this.moved) {
      var it = this.rects();
      if (it.length) {
        var i = this.nearest(it, this.px);
        this.hov = i;
        if (this.o.pick) this.o.pick(i, it[i].el); else it[i].el.click();
        /* il clic vero, che arriva subito dopo, non deve scegliere un'altra voce */
        var stop = function (ev) { ev.stopPropagation(); ev.preventDefault(); window.removeEventListener('click', stop, true); };
        window.addEventListener('click', stop, true);
        setTimeout(function () { window.removeEventListener('click', stop, true); }, 350);
      }
    }
    this.kick();
  };
  /* dentro la goccia: le stesse voci, ingrandite (si vedono solo mentre è premuta) */
  var COPIA = ['borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderStyle', 'borderColor', 'display', 'flexDirection', 'alignItems', 'justifyContent', 'gap', 'color', 'fontFamily', 'fontSize', 'fontWeight', 'letterSpacing',
    'lineHeight', 'whiteSpace', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'width', 'height', 'borderRadius', 'opacity', 'boxSizing', 'overflow', 'fill', 'stroke', 'maskImage', 'webkitMaskImage', 'backgroundColor'];
  function copiaStile(src, dst, top) {
    var cs = getComputedStyle(src);
    COPIA.forEach(function (k) {
      if (top && (k === 'width' || k === 'height')) return;
      try { dst.style[k] = cs[k]; } catch (e) {}
    });
    var a = src.children, b = dst.children;
    for (var i = 0; i < a.length && i < b.length; i++) copiaStile(a[i], b[i], false);
  }
  Goccia.prototype.lente = function (it) {
    var l = this.l;
    l.textContent = '';
    l.style.width = this.host.scrollWidth + 'px';
    l.style.height = this.host.scrollHeight + 'px';
    it.forEach(function (r) {
      var c = r.el.cloneNode(true);
      copiaStile(r.el, c, true);
      /* una copia solo da vedere: niente ruoli, nomi o id doppi */
      [c].concat($$('*', c)).forEach(function (n) {
        ['id', 'role', 'aria-selected', 'aria-hidden', 'aria-label', 'aria-labelledby', 'aria-current', 'aria-pressed', 'data-testid', 'tabindex', 'class'].forEach(function (k) { n.removeAttribute(k); });
      });
      c.style.position = 'absolute';
      c.style.left = r.x + 'px'; c.style.top = r.y + 'px';
      c.style.width = r.w + 'px'; c.style.height = r.h + 'px';
      c.style.margin = '0';
      c.style.color = chiaro() ? '#0B0D10' : '#FFFFFF';
      l.appendChild(c);
    });
  };
  Goccia.prototype.target = function () {
    var it = this.rects(), s = this.s, sw = this.o.swell == null ? 6 : this.o.swell;
    if (!it.length) return { x: s.x, w: s.w, t: s.t, h: s.h, a: 0, g: 0 };
    if (this.down) {
      var n = this.nearest(it, this.px), w = it[n].w + 14, f = it[0], z = it[it.length - 1];
      var cx = Math.max(f.x + f.w / 2, Math.min(z.x + z.w / 2, this.px));
      return { x: cx - w / 2, w: w, t: it[n].y - sw, h: it[n].h + sw * 2, a: 1, g: 1 };
    }
    var i = this.hov >= 0 && this.hov < it.length ? this.hov : this.o.sel();
    if (i < 0 || i >= it.length) return { x: s.x, w: s.w, t: s.t, h: s.h, a: 0, g: 0 };
    return { x: it[i].x, w: it[i].w, t: it[i].y, h: it[i].h, a: 1, g: 0 };
  };
  function molla(o, key, target, k, c, dt, eps, veps) {
    var vk = 'v' + key;
    o[vk] += (-k * (o[key] - target) - c * o[vk]) * dt;
    o[key] += o[vk] * dt;
    return Math.abs(o[key] - target) > eps || Math.abs(o[vk]) > veps;
  }
  Goccia.prototype.step = function (dt) {
    var s = this.s, T = this.target();
    if (reduced || (T.a > 0.5 && s.a < 0.05 && !this.down)) { s.x = T.x; s.w = T.w; s.t = T.t; s.h = T.h; s.vx = s.vw = s.vt = s.vh = 0; }
    var k = this.down ? 700 : 380, c = this.down ? 30 : 19, m = false;
    m = molla(s, 'x', T.x, k, c, dt, 0.25, 3) || m;
    m = molla(s, 'w', T.w, k, c, dt, 0.25, 3) || m;
    m = molla(s, 't', T.t, k, c, dt, 0.25, 3) || m;
    m = molla(s, 'h', T.h, k, c, dt, 0.25, 3) || m;
    m = molla(s, 'a', T.a, 260, 30, dt, 0.005, 0.05) || m;
    m = molla(s, 'g', T.g, 300, 22, dt, 0.005, 0.05) || m;
    m = molla(s, 'st', reduced ? 0 : Math.min(Math.abs(s.vx) / 1500, 0.42), 340, 9, dt, 0.004, 0.04) || m;
    m = molla(s, 'sk', reduced ? 0 : Math.max(-14, Math.min(14, -s.vx / 80)), 280, 12, dt, 0.05, 0.5) || m;
    if (!m && !this.down) {
      s.x = T.x; s.w = T.w; s.t = T.t; s.h = T.h; s.a = T.a; s.g = T.g; s.st = 0; s.sk = 0;
      s.vx = s.vw = s.vt = s.vh = s.va = s.vg = s.vst = s.vsk = 0;
    }
    return m || this.down;
  };
  Goccia.prototype.draw = function () {
    var s = this.s, d = this.d, g = Math.max(0, Math.min(1, s.g)), r = function (n) { return Math.round(n * 100) / 100; };
    var mix = function (p, q) { return p + (q - p) * g; };
    var hx = r(Math.max(8, Math.min(62, 32 - s.sk * 1.6))), bg, sh;
    if (!chiaro()) {
      bg = 'radial-gradient(90% 70% at ' + hx + '% 14%, rgba(255,255,255,' + r(0.06 + 0.32 * g) + '), rgba(255,255,255,0) 62%), radial-gradient(70% 55% at ' + r(100 - hx) + '% 106%, rgba(255,255,255,' + r(0.03 + 0.22 * g) + '), rgba(255,255,255,0) 66%), rgba(' + Math.round(mix(255, 64)) + ',' + Math.round(mix(255, 68)) + ',' + Math.round(mix(255, 78)) + ',' + r(mix(0.11, 0.93)) + ')';
      sh = 'inset 0 0 0 1px rgba(255,255,255,' + r(0.06 + 0.3 * g) + '), inset 1.5px 1.5px 2px rgba(255,255,255,' + r(0.4 + 0.45 * g) + '), inset -1px -1px 2px rgba(255,255,255,' + r(0.14 + 0.26 * g) + '), inset 0 -6px 12px rgba(0,0,0,' + r(0.18 * g) + '), 0 ' + r(4 + 10 * g) + 'px ' + r(12 + 18 * g) + 'px rgba(0,0,0,' + r(0.3 + 0.15 * g) + ')';
    } else {
      var c = Math.round(mix(0, 255));
      bg = 'radial-gradient(90% 70% at ' + hx + '% 14%, rgba(255,255,255,' + r(0.45 + 0.4 * g) + '), rgba(255,255,255,0) 62%), rgba(' + c + ',' + c + ',' + c + ',' + r(mix(0.07, 0.9)) + ')';
      sh = 'inset 0 0 0 1px rgba(0,0,0,' + r(0.04 + 0.03 * g) + '), inset 1.5px 1.5px 2px rgba(255,255,255,.95), inset -1px -1px 2px rgba(0,0,0,' + r(0.08 + 0.04 * g) + '), 0 ' + r(3 + 8 * g) + 'px ' + r(10 + 16 * g) + 'px rgba(0,0,0,' + r(0.08 + 0.12 * g) + ')';
    }
    d.style.left = r(s.x) + 'px'; d.style.top = r(s.t) + 'px';
    d.style.width = r(Math.max(0, s.w)) + 'px'; d.style.height = r(Math.max(0, s.h)) + 'px';
    d.style.opacity = r(Math.max(0, Math.min(1, s.a)));
    d.style.transform = 'scale(' + r(1 + s.st) + ', ' + r(1 - s.st * 0.55) + ') skewX(' + r(s.sk) + 'deg)';
    d.style.background = bg; d.style.boxShadow = sh;
    var l = this.l;
    if (g < 0.01 && !this.down && l.firstChild) l.textContent = '';
    l.style.opacity = r(g);
    l.style.transform = 'translate(' + r(-s.x) + 'px, ' + r(-s.t) + 'px) scale(1.22)';
    l.style.transformOrigin = r(s.x + s.w / 2) + 'px ' + r(s.t + s.h / 2) + 'px';
    var pill = this.o.pill && this.o.pill();
    if (pill) pill.style.transform = g > 0.01 ? 'scale(' + r(1 + 0.02 * g) + ')' : '';
  };
  Goccia.prototype.kick = function () {
    if (this.raf) return;
    var self = this;
    this.last = performance.now();
    this.raf = requestAnimationFrame(function frame(now) {
      var dt = Math.max(0.001, Math.min(0.032, (now - self.last) / 1000));
      self.last = now;
      var go = self.step(dt);
      self.draw();
      self.raf = go ? requestAnimationFrame(frame) : 0;
    });
  };
  Goccia.prototype.alive = function () { return document.body.contains(this.host); };
  function goccia(host, o) {
    if (!host) return null;
    if (host.__goccia && host.__goccia.alive()) { host.__goccia.o = o; host.__goccia.attach(); return host.__goccia; }
    host.__goccia = new Goccia(host, o);
    return host.__goccia;
  }
  function kickGocce() {
    gocce = gocce.filter(function (g) { return g.alive(); });
    gocce.forEach(function (g) { g.attach(); g.kick(); });
  }

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
    if (wrap) {
      list.classList.add('orizon-con-goccia');
      goccia(wrap, {
        items: function () { return $$('[role="option"]', list).filter(function (b) { var r = b.getBoundingClientRect(), lr = list.getBoundingClientRect(); return r.right > lr.left + 8 && r.left < lr.right - 8; }); },
        sel: function () {
          var it = $$('[role="option"]', list).filter(function (b) { var r = b.getBoundingClientRect(), lr = list.getBoundingClientRect(); return r.right > lr.left + 8 && r.left < lr.right - 8; });
          return it.findIndex(function (b) { return b.getAttribute('aria-selected') === 'true'; });
        },
        pill: function () { return fondo; }
      });
    }
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
        '</div></div><button type="button" class="orizon-piu orizon-vetro">' + ICON.piu + '</button>';
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
        gap: 0,
        miniW: 40,
        collapsed: function (it) { var s = it.firstChild; return 13 + s.firstChild.getBoundingClientRect().width + 13; },
        expanded: function (it) { var s = it.firstChild; s.style.width = 'max-content'; var w = s.getBoundingClientRect().width; s.style.width = ''; return Math.ceil(w) + 1; },
        label: function (it) { return it.querySelector('b'); }
      });
      bassoTabs.key = key;
      bassoTabs.select(scheda, true);
      if (mini) { bassoTabs.mini.x = bassoTabs.mini.t = 1; bassoTabs.draw(); }
    }
    var tr = $('.orizon-tabs', basso);
    tr.classList.add('orizon-con-goccia');
    goccia(tr, {
      items: function () { return $$('.orizon-tab', basso); },
      sel: function () { return scheda; },
      pill: function () { return $('.orizon-pillola', basso); }
    });
  }

  /* scorrendo la lista verso il basso la pillola si fa piccola, tornando su torna grande (come sul telefono) */
  var mini = false, listaY = 0;
  function setMini(on) {
    if (on === mini) return;
    mini = on;
    if (basso) basso.classList.toggle('orizon-mini', on);
    if (bassoTabs) bassoTabs.setMini(on);
    kickGocce();
    var t0 = performance.now();
    (function segui(now) { kickGocce(); if (now - t0 < 520) requestAnimationFrame(segui); })(t0);
  }
  document.addEventListener('scroll', function (e) {
    var el = e.target;
    if (!el || !el.matches || !el.matches('.mx_RoomListPanel [data-testid="room-list"]')) return;
    var y = el.scrollTop, dy = y - listaY;
    listaY = y;
    if (y < 24) setMini(false);
    else if (dy > 3) setMini(true);
    else if (dy < -3) setMini(false);
  }, true);

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
    goccia(h, {
      items: function () { return $$(':scope > button[class*="_icon-button_"]:not(.orizon-via)', h).filter(function (b) { return b.offsetWidth > 0; }); },
      sel: function () { return -1; }
    });
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
    ul.classList.add('orizon-con-goccia');
    goccia(ul, {
      items: function () { return $$(':scope > .mx_TabbedView_tabLabel', ul); },
      sel: function () { return $$(':scope > .mx_TabbedView_tabLabel', ul).findIndex(function (li) { return li.classList.contains('mx_TabbedView_tabLabel_active'); }); },
      swell: 2
    });
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
      kickGocce();
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
