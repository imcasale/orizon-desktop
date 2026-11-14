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
    cancella: { it: 'Cancella', en: 'Clear', de: 'Löschen', fr: 'Effacer', es: 'Borrar', pt: 'Limpar', nl: 'Wissen', pl: 'Wyczyść', sv: 'Rensa', da: 'Ryd', fi: 'Tyhjennä', cs: 'Vymazat', sk: 'Vymazať', hu: 'Törlés', ro: 'Șterge', bg: 'Изчисти', el: 'Εκκαθάριση', hr: 'Očisti', sl: 'Počisti', et: 'Tühjenda', lv: 'Notīrīt', lt: 'Išvalyti', uk: 'Очистити' },
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
  function Spring(k, z) { this.x = 0; this.v = 0; this.t = 0; this.k = k; this.z = z || 1; }
  Spring.prototype.step = function (dt) {
    var c = 2 * this.z * Math.sqrt(this.k);
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

  /* ---------- la pillola in basso, come OrizonBottomPill.kt: le misure e le molle dell'app ----------
     schede tonde alte 52 (44 quando la pillola è piccola); quella scelta si allarga e mostra il nome; dopo le schede,
     dentro la stessa pillola, il + (48, piccolo 44). La scelta scorre con una molla 0,72 / 420, la pillola si fa
     piccola con 0,75 / 380. */
  var PB = { pad: 6, padMini: 5, h: 52, hMini: 44, gap: 4, dentro: 14, icona: 24, spazio: 8, piu: 48, piuMini: 44,
    piuSp: 8, piuSpMini: 4, goccia: 84, gocciaMini: 62, fuori: 5, bordo: 2 };
  function mix(a, b, f) { return a + (b - a) * f; }
  function Pillola(basso) {
    this.basso = basso;
    this.pill = basso.querySelector('.orizon-pillola');
    this.track = basso.querySelector('.orizon-tabs');
    this.tabs = Array.prototype.slice.call(basso.querySelectorAll('.orizon-tab'));
    this.spazio = basso.querySelector('.oz-piu-spazio');
    this.piu = basso.querySelector('.orizon-piu');
    this.pos = new Spring(420, 0.72); this.mini = new Spring(380, 0.75);
    this.sel = -1; this.raf = 0; this.larghe = []; this.last = 0;
    this.misura();
  }
  Pillola.prototype.m = function () { return Math.max(0, Math.min(1, this.mini.x)); };
  Pillola.prototype.pad = function (m) { return mix(PB.pad, PB.padMini, m); };
  Pillola.prototype.alta = function (m) { return mix(PB.h, PB.hMini, m); };
  Pillola.prototype.peso = function (i, p) { return Math.max(0, Math.min(1, 1 - Math.abs(p - i))); };
  Pillola.prototype.nome = function (i, p, m) { return this.peso(i, p) * (1 - m); };
  Pillola.prototype.larga = function (i, p, m) { var c = this.alta(m); return c + ((this.larghe[i] || c) - c) * this.nome(i, p, m); };
  /* dove comincia la scheda i, dal bordo della pillola */
  Pillola.prototype.inizio = function (i, p, m) { var x = this.pad(m); for (var k = 0; k < i; k++) x += this.larga(k, p, m) + PB.gap; return x; };
  Pillola.prototype.fine = function (p, m) { var n = this.tabs.length - 1; return this.inizio(n, p, m) + this.larga(n, p, m); };
  Pillola.prototype.misura = function () {
    /* scheda aperta: 14 + icona 24 + 8 + nome + 14, più 1 perché l'arrotondamento non tagli l'ultima lettera */
    this.larghe = this.tabs.map(function (t) {
      var b = t.querySelector('b'); if (!b) return PB.h;
      var w = b.scrollWidth || b.getBoundingClientRect().width;
      return PB.dentro * 2 + PB.icona + PB.spazio + 1 + Math.ceil(w);
    });
  };
  Pillola.prototype.draw = function () {
    var p = this.pos.x, m = this.m(), self = this, pad = this.pad(m), h = this.alta(m), ic = (h - PB.icona) / 2;
    var r = function (n) { return (Math.round(n * 100) / 100) + 'px'; };
    this.pill.style.padding = r(pad);
    this.tabs.forEach(function (t, i) {
      t.style.width = r(self.larga(i, p, m));
      t.style.height = r(h);
      var d = t.firstElementChild;
      if (d) {
        d.style.left = r(ic);
        var w = self.peso(i, p), sv = d.querySelector('svg'), b = d.querySelector('b');
        if (sv) sv.style.color = 'color-mix(in srgb, var(--o-text) ' + Math.round(w * 100) + '%, var(--o-text-2))';
        if (b) b.style.opacity = self.nome(i, p, m).toFixed(3);
      }
    });
    this.spazio.style.width = r(mix(PB.piuSp, PB.piuSpMini, m));
    var ps = r(mix(PB.piu, PB.piuMini, m));
    this.piu.style.width = ps; this.piu.style.height = ps;
    if (this.track.__goccia) this.track.__goccia.kick();
  };
  Pillola.prototype.select = function (i, instant) {
    if (i < 0) return;
    if (this.sel === -1 || instant || reduced) { this.sel = i; this.pos.x = this.pos.t = i; this.pos.v = 0; this.draw(); return; }
    if (i === this.sel) return;
    this.sel = i; this.pos.t = i;
    this.run();
  };
  Pillola.prototype.setMini = function (on) {
    var t = on ? 1 : 0;
    if (this.mini.t === t) return;
    this.mini.t = t;
    if (reduced) { this.mini.x = t; this.draw(); return; }
    this.run();
  };
  Pillola.prototype.run = function () {
    if (this.raf) return;
    var self = this;
    this.last = performance.now();
    this.raf = requestAnimationFrame(function f(now) {
      var dt = Math.max(0.001, Math.min(0.032, (now - self.last) / 1000)); self.last = now;
      self.pos.step(dt); self.mini.step(dt); self.draw();
      if (self.pos.settled() && self.mini.settled()) { self.pos.x = self.pos.t; self.pos.v = 0; self.mini.x = self.mini.t; self.mini.v = 0; self.draw(); self.raf = 0; return; }
      self.raf = requestAnimationFrame(f);
    });
  };

  var gocce = [];
  function chiaro() { return !!(document.body && document.body.classList.contains('cpd-theme-light')); }

  /* ---------- la lente: lo stesso vetro dell'app Android ----------
     Sul telefono il vetro lo fa la libreria Backdrop (Kyant, Apache 2.0): quello che sta dietro alla pillola viene
     ridisegnato più vivido (saturazione 1,5), appena sfocato e, vicino al bordo, piegato verso l'interno come da una
     lente (refractionHeight / refractionAmount, profilo circolare); sul bordo un filo di luce a 45 gradi.
     Qui è la stessa matematica, fatta con un filtro SVG dietro all'elemento (backdrop-filter: url(#...)):
     una mappa di spostamenti calcolata per la forma esatta (rettangolo arrotondato) dice a ogni punto da dove prendere
     il colore. La goccia premuta usa la stessa lente, più l'ingrandimento (1,22) e la separazione dei colori ai bordi.
     backdrop-filter con i filtri SVG c'è in Chromium (l'app desktop, Chrome, Edge, Vivaldi); altrove resta il vetro sfocato. */
  var LENTE = (function () {
    try { if (window.localStorage && localStorage.getItem('orizon.lente') === '0') return false; } catch (e) {}
    return /Chrome\//.test(navigator.userAgent || '') && !!window.ResizeObserver;
  })();
  var SVGNS = 'http://www.w3.org/2000/svg', lenteDefs = null, lenteCache = {}, lenteOrdine = [], lenteN = 0, tela = null;
  function lenteAccesa() { if (LENTE && !document.documentElement.classList.contains('oz-lente')) document.documentElement.classList.add('oz-lente'); }
  function defsLente() {
    if (lenteDefs && lenteDefs.isConnected) return lenteDefs;
    var s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    s.setAttribute('width', '0');
    s.setAttribute('height', '0');
    s.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;overflow:hidden;pointer-events:none';
    lenteDefs = document.createElementNS(SVGNS, 'defs');
    s.appendChild(lenteDefs);
    document.body.appendChild(s);
    return lenteDefs;
  }
  /* distanza dal bordo di un rettangolo arrotondato e direzione verso fuori (come sdRoundedRect / gradSdRoundedRect) */
  function sdRR(px, py, hx, hy, r) {
    var cx = Math.abs(px) - (hx - r), cy = Math.abs(py) - (hy - r), ox = Math.max(cx, 0), oy = Math.max(cy, 0);
    return Math.sqrt(ox * ox + oy * oy) - r + Math.min(Math.max(cx, cy), 0);
  }
  function gradRR(px, py, hx, hy, r) {
    var cx = Math.abs(px) - (hx - r), cy = Math.abs(py) - (hy - r), sx = px < 0 ? -1 : 1, sy = py < 0 ? -1 : 1;
    if (cx >= 0 || cy >= 0) {
      var ox = Math.max(cx, 0), oy = Math.max(cy, 0), l = Math.sqrt(ox * ox + oy * oy) || 1;
      return [sx * ox / l, sy * oy / l];
    }
    var gx = cx >= cy ? 1 : 0;
    return [sx * gx, sy * (1 - gx)];
  }
  function disegna(w, h, k, fn) {
    if (!tela) tela = document.createElement('canvas');
    var W = Math.max(1, Math.round(w * k)), H = Math.max(1, Math.round(h * k));
    tela.width = W; tela.height = H;
    var g = tela.getContext('2d'), img = g.createImageData(W, H), d = img.data, i = 0;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++, i += 4) fn((x + 0.5) / k - w / 2, (y + 0.5) / k - h / 2, d, i);
    g.putImageData(img, 0, 0);
    return tela.toDataURL();
  }
  /* dove prendere il colore: verso il centro per l'ingrandimento, verso l'interno vicino al bordo per la lente */
  function mappaLente(w, h, r, alto, quanto, zoom) {
    var hx = w / 2, hy = h / 2, rad = Math.min(r, hx, hy), gr = Math.min(rad * 1.5, hx, hy), z = zoom > 1 ? 1 - 1 / zoom : 0;
    var S = 2 * (quanto + Math.max(hx, hy) * z) + 2;
    var url = disegna(w, h, 1, function (px, py, d, i) {
      var dx = -px * z, dy = -py * z;
      if (alto > 0 && quanto > 0) {
        var sd = sdRR(px, py, hx, hy, rad);
        if (-sd < alto) {
          var t = 1 - Math.max(0, -sd) / alto, dd = (1 - Math.sqrt(Math.max(0, 1 - t * t))) * quanto, gg = gradRR(px, py, hx, hy, gr);
          dx -= dd * gg[0]; dy -= dd * gg[1];
        }
      }
      d[i] = 127.5 + 255 * dx / S; d[i + 1] = 127.5 + 255 * dy / S; d[i + 2] = 128; d[i + 3] = 255;
    });
    return { url: url, S: S };
  }
  /* il filo di luce sul bordo (Highlight.Default: bianco al 50%, più forte dove il bordo guarda a 45 gradi) */
  function filoLuce(w, h, r, alfa) {
    var hx = w / 2, hy = h / 2, rad = Math.min(r, hx, hy), gr = Math.min(rad * 1.5, hx, hy), n = Math.SQRT1_2;
    var k = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    return disegna(w, h, k, function (px, py, d, i) {
      var sd = sdRR(px, py, hx, hy, rad), a = 1 - Math.abs(sd + 0.7) / 0.9;
      if (a <= 0) return;
      var gg = gradRR(px, py, hx, hy, gr);
      d[i] = d[i + 1] = d[i + 2] = 255;
      d[i + 3] = 255 * alfa * Math.abs(gg[0] * n + gg[1] * n) * a;
    });
  }
  function nuovoFiltro(key, w, h, primitive) {
    var id = 'oz-lente-' + (++lenteN);
    var f = document.createElementNS(SVGNS, 'filter');
    f.setAttribute('id', id);
    f.setAttribute('x', '0'); f.setAttribute('y', '0');
    f.setAttribute('width', String(w)); f.setAttribute('height', String(h));
    f.setAttribute('filterUnits', 'userSpaceOnUse');
    f.setAttribute('primitiveUnits', 'userSpaceOnUse');
    f.setAttribute('color-interpolation-filters', 'sRGB');
    f.innerHTML = primitive;
    defsLente().appendChild(f);
    var v = { id: id, el: f };
    lenteCache[key] = v;
    lenteOrdine.push(key);
    while (lenteOrdine.length > 220) {
      var vecchio = lenteOrdine.shift(), o = lenteCache[vecchio];
      delete lenteCache[vecchio];
      if (o && o.el.parentNode) o.el.parentNode.removeChild(o.el);
    }
    return v;
  }
  function daCache(key) {
    var v = lenteCache[key];
    if (v) { var i = lenteOrdine.indexOf(key); if (i >= 0 && i < lenteOrdine.length - 1) { lenteOrdine.splice(i, 1); lenteOrdine.push(key); } }
    return v;
  }
  /* vetro: 'v' come Glass.Regular (sfocatura 4dp), 'p' come Glass.Thick per finestre e menu (sfocatura 22dp) */
  function filtroVetro(tipo, w, h, r) {
    var key = tipo + w + 'x' + h + 'r' + r, v = daCache(key);
    if (v) return v;
    var m = Math.min(w, h), alto = Math.min(20, m * 0.35), quanto = Math.min(28, m * 0.5);
    var sfoca = tipo === 'p' ? 13 : 2.8;
    var mp = mappaLente(w, h, r, alto, quanto, 1);
    v = nuovoFiltro(key, w, h,
      '<feColorMatrix in="SourceGraphic" type="saturate" values="1.5" result="a"/>' +
      '<feGaussianBlur in="a" stdDeviation="' + sfoca + '" edgeMode="duplicate" result="b"/>' +
      '<feImage href="' + mp.url + '" x="0" y="0" width="' + w + '" height="' + h + '" preserveAspectRatio="none" result="m"/>' +
      '<feDisplacementMap in="b" in2="m" scale="' + mp.S.toFixed(2) + '" xChannelSelector="R" yChannelSelector="G"/>');
    v.luce = filoLuce(w, h, r, 0.5);
    return v;
  }
  /* la goccia premuta, come GlassDroplet: prima ingrandisce quello che ha sotto (1 + 0,22 x pressione, dal centro),
     poi la lente sul bordo (10dp / 14dp x pressione) con i colori separati come RoundedRectRefractionWithDispersion:
     sette campioni (rosso, arancio, giallo, verde, ciano, blu, viola) spostati lungo il bordo, di più verso gli angoli
     (x*y), per niente a metà dei lati */
  var DISPERSIONE = [
    [1, '0.2857 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0'],
    [2 / 3, '0.2857 0 0 0 0 0 0.1429 0 0 0 0 0 0 0 0 0 0 0 1 0'],
    [1 / 3, '0.2857 0 0 0 0 0 0.2857 0 0 0 0 0 0 0 0 0 0 0 1 0'],
    [0, '0 0 0 0 0 0 0.2857 0 0 0 0 0 0 0 0 0 0 0 1 0'],
    [-1 / 3, '0 0 0 0 0 0 0.2857 0 0 0 0 0 0.3333 0 0 0 0 0 1 0'],
    [-2 / 3, '0 0 0 0 0 0 0 0 0 0 0 0 0.3333 0 0 0 0 0 1 0'],
    [-1, '0.1429 0 0 0 0 0 0 0 0 0 0 0 0.3333 0 0 0 0 0 1 0']
  ];
  function filtroGoccia(w, h, p) {
    var key = 'g' + w + 'x' + h + 'p' + p, v = daCache(key);
    if (v) return v;
    var hx = w / 2, hy = h / 2, rad = Math.min(hx, hy), gr = Math.min(rad * 1.5, hx, hy);
    var zoom = 1 + 0.22 * p, z = 1 - 1 / zoom, alto = 10 * p, quanto = 14 * p;
    var S = 2 * (Math.max(hx, hy) * z + 2 * quanto / zoom) + 2;
    var mappa = function (c) {
      return disegna(w, h, 1, function (px, py, d, i) {
        var dx = -px * z, dy = -py * z;
        if (alto > 0.01) {
          var sd = sdRR(px, py, hx, hy, rad);
          if (-sd < alto) {
            var t = 1 - Math.max(0, -sd) / alto, dd = -(1 - Math.sqrt(Math.max(0, 1 - t * t))) * quanto, g = gradRR(px, py, hx, hy, gr);
            var f = dd * (1 + c * (px * py) / (hx * hy)) / zoom;
            dx += f * g[0]; dy += f * g[1];
          }
        }
        d[i] = 127.5 + 255 * dx / S; d[i + 1] = 127.5 + 255 * dy / S; d[i + 2] = 128; d[i + 3] = 255;
      });
    };
    var corpo = '', ultimo = '';
    DISPERSIONE.forEach(function (x, n) {
      corpo += '<feImage href="' + mappa(x[0]) + '" x="0" y="0" width="' + w + '" height="' + h + '" preserveAspectRatio="none" result="m' + n + '"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="m' + n + '" scale="' + S.toFixed(2) + '" xChannelSelector="R" yChannelSelector="G" result="d' + n + '"/>' +
        '<feColorMatrix in="d' + n + '" type="matrix" values="' + x[1] + '" result="c' + n + '"/>';
      if (n === 1) { corpo += '<feComposite in="c0" in2="c1" operator="arithmetic" k2="1" k3="1" result="s1"/>'; ultimo = 's1'; }
      else if (n > 1) { corpo += '<feComposite in="' + ultimo + '" in2="c' + n + '" operator="arithmetic" k2="1" k3="1" result="s' + n + '"/>'; ultimo = 's' + n; }
    });
    v = nuovoFiltro(key, w, h, corpo);
    v.luce = filoLuce(w, h, rad, 0.5 * p);
    return v;
  }
  function raggio(cs, w, h) {
    var s = cs.borderTopLeftRadius || '0', r = parseFloat(s) || 0;
    if (s.indexOf('%') > 0) r = Math.min(w, h) * r / 100;
    return Math.round(Math.max(0, Math.min(r, w / 2, h / 2)));
  }
  /* mette la lente su un elemento (o sul suo ::before): due variabili CSS, il filtro e il filo di luce */
  function applicaLente(el, tipo, prima, w, h, r) {
    if (!LENTE || !el || !el.isConnected) return;
    if (w == null) {
      var cs = prima ? getComputedStyle(el, '::before') : null;
      w = prima ? parseFloat(cs.width) : el.offsetWidth;
      h = prima ? parseFloat(cs.height) : el.offsetHeight;
      if (!(w > 6 && h > 6)) return;
      r = raggio(cs || getComputedStyle(el), w, h);
    }
    w = Math.round(w); h = Math.round(h); r = Math.round(Math.min(r, w / 2, h / 2));
    if (!(w > 6 && h > 6)) return;
    var key = tipo + w + 'x' + h + 'r' + r, campo = prima ? '__ozLenteP' : '__ozLente';
    if (el[campo] === key) return;
    el[campo] = key;
    var f = filtroVetro(tipo, w, h, r);
    el.style.setProperty(prima ? '--o-lente-p' : '--o-lente', 'url(#' + f.id + ')');
    el.style.setProperty(prima ? '--o-luce-p' : '--o-luce', 'url("' + f.luce + '")');
  }
  var lenteRO = LENTE ? new ResizeObserver(function (voci) {
    voci.forEach(function (v) {
      var el = v.target;
      if (el.__ozTipo) applicaLente(el, el.__ozTipo, false);
      if (el.__ozTipoP) applicaLente(el, el.__ozTipoP, true);
    });
  }) : null;
  var conLente = [];
  function lente(el, tipo, prima) {
    if (!LENTE || !el) return;
    var campo = prima ? '__ozTipoP' : '__ozTipo';
    if (el[campo] === tipo) return;
    el[campo] = tipo;
    conLente.push(el);
    lenteRO.observe(el, { box: 'border-box' });
    applicaLente(el, tipo, prima);
  }
  /* gli elementi tolti dalla pagina non si osservano più */
  var pulitaLente = 0;
  function puliziaLente() {
    var ora = Date.now();
    if (!LENTE || ora - pulitaLente < 4000) return;
    pulitaLente = ora;
    conLente = conLente.filter(function (el) { if (el.isConnected) return true; try { lenteRO.unobserve(el); } catch (e) {} return false; });
  }
  function vetri(lista) {
    if (!LENTE) return;
    lenteAccesa();
    lista.forEach(function (x) { $$(x[0]).forEach(function (el) { lente(el, x[1], x[2]); }); });
    puliziaLente();
  }
  /* ---------- la goccia: lo stesso codice dell'app Android (GlassDroplet.kt) ----------
     A riposo è la selezione piatta sotto la voce scelta. Premuta esce dalla pillola come una goccia d'acqua
     di misura fissa, segue il mouse, si allunga con la velocità (gelatina), ingrandisce quello che ha sotto
     e, lasciata, torna con un rimbalzo sulla voce dove la lasci.
     Tutto è fatto di molle smorzate integrate fotogramma per fotogramma (stesse costanti dell'app), così una
     nuova destinazione non spezza il movimento: lo piega, come l'acqua.
     Le posizioni sono in pixel, nelle coordinate dell'elemento "host" (la pista delle voci).
       o.items()        le voci
       o.sel()          la voce scelta, dove riposa la selezione (-1: nessuna, la goccia si vede solo premuta)
       o.spec(it)       misura della goccia premuta: { w, h, top, min, max } (min e max: dove può stare il centro)
       o.gesture        'select' (esce subito, lasciata sceglie), 'hold' (un clic la mostra un attimo, tenuta
                        si afferra) o 'feedback' (segue soltanto, i tasti sotto fanno da soli)
       o.pick(i, el)    cosa fare quando la lascio su un'altra voce dopo averla trascinata (di solito il clic)
       o.layer()        dove mettere la goccia: fuori dal vetro, così ingrandisce la pillola e quello che c'è dietro
       o.rest           colore della selezione a riposo (se manca, quello dell'app) */
  var MIN_PREMUTA = 140, TENUTA = 140, SPOSTA = 6;
  function Goccia(host, o) {
    this.host = host; this.o = o;
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    /* la selezione a riposo sta dietro alle voci, come drawBehind */
    if (o.gesture !== 'feedback') host.style.isolation = 'isolate';
    var ly = o.layer && o.layer();
    if (ly && getComputedStyle(ly).position === 'static') ly.style.position = 'relative';
    var r = document.createElement('span');
    r.className = 'orizon-riposo';
    r.setAttribute('aria-hidden', 'true');
    var d = document.createElement('span');
    d.className = 'orizon-goccia';
    d.setAttribute('aria-hidden', 'true');
    var l = document.createElement('span');
    l.className = 'orizon-goccia-lente';
    d.appendChild(l);
    this.r = r; this.d = d; this.l = l;
    this.left = 0; this.top = 0; this.width = 0; this.height = 0; this.alpha = 0; this.press = 0; this.stretch = 0;
    this.vl = 0; this.vt = 0; this.vw = 0; this.vh = 0; this.va = 0; this.vp = 0; this.vs = 0;
    this.rest = null; this.has = false; this.spec = null; this.isPressed = false;
    this.px = 0; this.downX = 0; this.moved = false; this.t0 = 0; this.tRel = 0; this.tHold = 0;
    this.giu = false; this.preso = false; this.raf = 0; this.last = 0; this.pid = null;
    var self = this;
    this.on = {
      down: function (e) { self.giuMouse(e); },
      wmove: function (e) { self.muovi(e); },
      wup: function (e) { self.su(e); },
      wcancel: function () { self.annulla(); }
    };
    host.addEventListener('pointerdown', this.on.down);
    this.attach();
    gocce.push(this);
  }
  Goccia.prototype.strato = function () { return (this.o.layer && this.o.layer()) || this.host; };
  Goccia.prototype.attach = function () {
    var ly = this.strato();
    if (this.d.parentNode !== ly) ly.appendChild(this.d);
    if (this.r.parentNode !== this.host) this.host.insertBefore(this.r, this.host.firstChild);
  };
  /* di quanto spostare la goccia quando sta in un altro strato */
  Goccia.prototype.scarto = function () {
    var ly = this.strato();
    if (ly === this.host) return { x: 0, y: 0 };
    var a = this.host.getBoundingClientRect(), b = ly.getBoundingClientRect(), k = (b.width && ly.offsetWidth) ? b.width / ly.offsetWidth : 1;
    return { x: (a.left - b.left) / k + ly.scrollLeft - ly.clientLeft + this.host.clientLeft - this.host.scrollLeft, y: (a.top - b.top) / k + ly.scrollTop - ly.clientTop + this.host.clientTop - this.host.scrollTop };
  };
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
    for (var i = 0; i < it.length; i++) {
      if (x >= it[i].x && x <= it[i].x + it[i].w) return i;
      var d = Math.min(Math.abs(x - it[i].x), Math.abs(x - it[i].x - it[i].w));
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  };
  Goccia.prototype.at = function (it, x) {
    for (var i = 0; i < it.length; i++) if (x >= it[i].x - 2 && x <= it[i].x + it[i].w + 2) return i;
    return -1;
  };
  /* dove riposa la selezione: la voce scelta */
  Goccia.prototype.riposo = function (it) {
    var i = this.o.sel ? this.o.sel() : -1;
    if (i < 0 || i >= it.length) return null;
    if (this.o.riposo) return this.o.riposo(i);
    return { x: it[i].x, y: it[i].y, w: it[i].w, h: it[i].h };
  };

  /* ---- lo stato, come GlassDropletState ---- */
  Goccia.prototype.setRest = function (rect, anima) {
    this.rest = rect;
    if (rect && (!this.has || anima === false)) {
      this.left = rect.x; this.top = rect.y; this.width = rect.w; this.height = rect.h; this.alpha = 1;
      this.vl = this.vt = this.vw = this.vh = this.va = 0;
      this.has = true;
    }
    this.kick();
  };
  Goccia.prototype.premi = function (x, spec) {
    clearTimeout(this.tRel);
    this.spec = spec; this.px = x; this.downX = x; this.moved = false;
    if (!this.has || this.alpha < 0.05) {
      /* nascosta: la goccia compare sotto il mouse, un po' più piccola, e cresce */
      var cx = Math.max(Math.min(spec.min, spec.max), Math.min(Math.max(spec.min, spec.max), x));
      this.width = spec.w * 0.6; this.height = spec.h * 0.6;
      this.left = cx - this.width / 2; this.top = spec.top + (spec.h - this.height) / 2;
      this.vl = this.vt = this.vw = this.vh = 0;
      this.has = true;
    }
    /* un piccolo colpo, così la goccia trema quando esce */
    this.vs += 2.6;
    this.isPressed = true;
    this.t0 = performance.now();
    if (!LENTE) this.lente(this.rects());
    this.kick();
  };
  Goccia.prototype.trascina = function (x) {
    this.px = x;
    if (Math.abs(x - this.downX) > SPOSTA) this.moved = true;
  };
  Goccia.prototype.lascia = function () {
    if (!this.isPressed) return;
    clearTimeout(this.tRel);
    var tenuta = performance.now() - this.t0, self = this;
    /* un clic veloce mostra comunque la goccia per un momento */
    if (tenuta >= MIN_PREMUTA) { this.isPressed = false; this.kick(); }
    else this.tRel = setTimeout(function () { self.isPressed = false; self.kick(); }, MIN_PREMUTA - tenuta);
  };
  Goccia.prototype.step = function (dt) {
    var it = this.rects(), rest = this.riposo(it);
    /* la voce scelta si è spostata (o è cambiata): la selezione ci va con la molla */
    if (rest && (!this.rest || Math.abs(rest.x - this.rest.x) > 0.5 || Math.abs(rest.y - this.rest.y) > 0.5 || Math.abs(rest.w - this.rest.w) > 0.5 || Math.abs(rest.h - this.rest.h) > 0.5)) {
      this.rest = rest;
      if (!this.has) { this.left = rest.x; this.top = rest.y; this.width = rest.w; this.height = rest.h; this.alpha = 1; this.has = true; }
    } else if (!rest) this.rest = null;
    var spec = this.isPressed ? this.spec : null, cur = this.rest;
    var tl, tt, tw, th, ta, tp;
    if (spec) {
      var cx = Math.max(Math.min(spec.min, spec.max), Math.min(Math.max(spec.min, spec.max), this.px));
      tw = spec.w; th = spec.h; tl = cx - spec.w / 2; tt = spec.top; ta = 1; tp = 1;
    } else if (cur) {
      tl = cur.x; tt = cur.y; tw = cur.w; th = cur.h; ta = 1; tp = 0;
    } else {
      tl = this.left; tt = this.top; tw = this.width; th = this.height; ta = 0; tp = 0;
    }
    if (reduced) { this.left = tl; this.top = tt; this.width = tw; this.height = th; this.alpha = ta; this.press = tp; this.stretch = 0; return false; }
    /* più ferma mentre la tiene il mouse, più elastica quando la lascia */
    var k = spec ? 700 : 380, c = spec ? 30 : 19;
    this.vl += (-k * (this.left - tl) - c * this.vl) * dt; this.left += this.vl * dt;
    this.vt += (-k * (this.top - tt) - c * this.vt) * dt; this.top += this.vt * dt;
    this.vw += (-k * (this.width - tw) - c * this.vw) * dt; this.width += this.vw * dt;
    this.vh += (-k * (this.height - th) - c * this.vh) * dt; this.height += this.vh * dt;
    this.va += (-260 * (this.alpha - ta) - 30 * this.va) * dt; this.alpha += this.va * dt;
    this.vp += (-300 * (this.press - tp) - 22 * this.vp) * dt; this.press += this.vp * dt;
    /* gelatina: più va veloce, più si allunga; la molla dell'allungamento è molto morbida */
    var ts = Math.min(Math.abs(this.vl) / 1500, 0.42);
    this.vs += (-340 * (this.stretch - ts) - 9 * this.vs) * dt; this.stretch += this.vs * dt;
    var pe = 0.25, ve = 3;
    var moving = Math.abs(this.left - tl) > pe || Math.abs(this.vl) > ve || Math.abs(this.top - tt) > pe || Math.abs(this.vt) > ve ||
      Math.abs(this.width - tw) > pe || Math.abs(this.vw) > ve || Math.abs(this.height - th) > pe || Math.abs(this.vh) > ve ||
      Math.abs(this.alpha - ta) > 0.005 || Math.abs(this.va) > 0.05 || Math.abs(this.press - tp) > 0.005 || Math.abs(this.vp) > 0.05 ||
      Math.abs(this.stretch - ts) > 0.004 || Math.abs(this.vs) > 0.04;
    if (!moving && !spec) {
      this.left = tl; this.top = tt; this.width = tw; this.height = th; this.alpha = ta; this.press = tp; this.stretch = 0;
      this.vl = this.vt = this.vw = this.vh = this.va = this.vp = this.vs = 0;
      return false;
    }
    return true;
  };

  /* ---- il mouse, come glassDropletGestures ---- */
  Goccia.prototype.ascolta = function (on) {
    var f = on ? 'addEventListener' : 'removeEventListener';
    window[f]('pointermove', this.on.wmove, true);
    window[f]('pointerup', this.on.wup, true);
    window[f]('pointercancel', this.on.wcancel, true);
    window[f]('blur', this.on.wcancel);
  };
  Goccia.prototype.giuMouse = function (e) {
    if (e.button) return;
    var it = this.rects(), x = this.local(e);
    if (this.at(it, x) < 0) return;
    this.giu = true; this.preso = false; this.x0 = x; this.pid = e.pointerId;
    this.ascolta(true);
    var spec = this.o.spec(it), self = this;
    if ((this.o.gesture || 'select') === 'hold') {
      /* un clic la mostra un attimo; tenendo premuto (o trascinando) la goccia si afferra */
      clearTimeout(this.tHold);
      this.tHold = setTimeout(function () { if (self.giu && !self.preso) self.afferra(self.o.spec(self.rects()), self.x0); }, TENUTA);
      return;
    }
    this.afferra(spec, x);
  };
  Goccia.prototype.afferra = function (spec, x) {
    /* niente cattura del puntatore: il clic deve arrivare alla voce sotto (tocco veloce), il resto lo seguo dalla finestra */
    this.preso = true;
    this.mi = -1;
    this.premi(x, spec);
  };
  Goccia.prototype.muovi = function (e) {
    if (!this.giu) return;
    /* il tasto è già stato lasciato (fuori dalla finestra): la goccia si ferma qui */
    if (e.pointerType === 'mouse' && e.buttons === 0) { this.su(e); return; }
    var x = this.local(e);
    if (!this.preso) {
      if (Math.abs(x - this.x0) > SPOSTA) { clearTimeout(this.tHold); this.afferra(this.o.spec(this.rects()), this.x0); }
      else return;
    }
    this.trascina(x);
    /* trascinando, la voce sotto la goccia (EmojiCategoryPill: la lista segue la goccia) */
    if (this.o.move && this.spec) {
      var it = this.rects(), cx = Math.max(Math.min(this.spec.min, this.spec.max), Math.min(Math.max(this.spec.min, this.spec.max), x));
      if (it.length) { var i = this.nearest(it, cx); if (i !== this.mi) { this.mi = i; this.o.move(i, it[i].el); } }
    }
    this.kick();
  };
  Goccia.prototype.fine = function () {
    this.giu = false;
    clearTimeout(this.tHold);
    this.ascolta(false);
    this.pid = null;
  };
  Goccia.prototype.su = function () {
    if (!this.giu) return;
    var preso = this.preso;
    this.fine();
    var gesto = this.o.gesture || 'select';
    if (!preso) {
      /* un clic veloce: la goccia esce un attimo, il clic lo fa la voce */
      if (gesto === 'hold') { this.premi(this.x0, this.o.spec(this.rects())); this.lascia(); }
      return;
    }
    var moved = this.moved;
    this.lascia();
    if (moved && gesto !== 'feedback') {
      var it = this.rects();
      if (it.length) {
        var i = this.nearest(it, this.px);
        if (this.o.pick) this.o.pick(i, it[i].el); else it[i].el.click();
        /* il clic vero, che arriva subito dopo, non deve scegliere un'altra voce */
        var stop = function (ev) { ev.stopPropagation(); ev.preventDefault(); window.removeEventListener('click', stop, true); };
        window.addEventListener('click', stop, true);
        setTimeout(function () { window.removeEventListener('click', stop, true); }, 350);
      }
    }
  };
  Goccia.prototype.annulla = function () {
    if (!this.giu) return;
    this.fine();
    this.lascia();
  };

  /* senza lente vera: dentro la goccia una copia ingrandita delle voci */
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

  /* ---- il disegno, come glassDropletRest e GlassDroplet ---- */
  Goccia.prototype.draw = function () {
    var r = function (n) { return Math.round(n * 100) / 100; };
    var scuro = !chiaro(), st = Math.max(-0.2, Math.min(0.45, this.stretch)), p = Math.max(0, Math.min(1, this.press));
    var a = Math.max(0, Math.min(1, this.alpha));
    /* la selezione a riposo: piatta, sparisce mentre la goccia è premuta */
    var R = this.r, ra = this.rest ? a * (1 - p) : 0;
    if (ra > 0.001 && this.width > 0 && this.height > 0) {
      var rw = this.width * (1 + st), rh = this.height * (1 - st * 0.55);
      var cx = this.left + this.width / 2, cy = this.top + this.height / 2;
      R.style.left = r(cx - rw / 2) + 'px'; R.style.top = r(cy - rh / 2) + 'px';
      R.style.width = r(rw) + 'px'; R.style.height = r(rh) + 'px';
      R.style.borderRadius = r(rh / 2) + 'px';
      R.style.background = this.o.rest || (scuro ? 'rgba(255,255,255,.13)' : 'rgba(0,0,0,.08)');
      R.style.opacity = r(ra);
    } else R.style.opacity = '0';
    /* la goccia premuta */
    var d = this.d, l = this.l, da = p * a;
    if (da <= 0.002 || this.width <= 4 || this.height <= 4) {
      d.style.opacity = '0';
      if (d.__filtro) { d.__filtro = ''; d.style.webkitBackdropFilter = ''; d.style.backdropFilter = ''; }
      if (l.firstChild && !this.isPressed) l.textContent = '';
      return;
    }
    var W = Math.round(this.width), H = Math.round(this.height), sc = this.scarto(), filtro = '', bg, sh;
    if (LENTE) {
      var f = filtroGoccia(W, H, Math.max(0.1, Math.round(p * 10) / 10));
      filtro = 'url(#' + f.id + ')';
      bg = 'url("' + f.luce + '") 0 0 / 100% 100% no-repeat, ' + (scuro ? 'rgba(42,45,53,.22)' : 'rgba(255,255,255,.18)');
      sh = '0 6px 16px rgba(0,0,0,' + (scuro ? '.35' : '.16') + '), inset 0 0 ' + r(8 * p) + 'px rgba(0,0,0,' + (scuro ? '.25' : '.1') + ')';
      l.style.opacity = '0';
    } else {
      bg = scuro ? 'radial-gradient(90% 70% at 32% 14%, rgba(255,255,255,.38), rgba(255,255,255,0) 62%), rgba(64,68,78,.93)'
        : 'radial-gradient(90% 70% at 32% 14%, rgba(255,255,255,.85), rgba(255,255,255,0) 62%), rgba(255,255,255,.9)';
      sh = scuro ? 'inset 0 0 0 1px rgba(255,255,255,.36), inset 1.5px 1.5px 2px rgba(255,255,255,.85), 0 14px 30px rgba(0,0,0,.45)'
        : 'inset 0 0 0 1px rgba(0,0,0,.07), inset 1.5px 1.5px 2px #fff, 0 11px 26px rgba(0,0,0,.2)';
      l.style.opacity = '1';
      l.style.transform = 'translate(' + r(-this.left) + 'px, ' + r(-this.top) + 'px) scale(' + r(1 + 0.22 * p) + ')';
      l.style.transformOrigin = r(this.left + this.width / 2) + 'px ' + r(this.top + this.height / 2) + 'px';
    }
    if (d.__filtro !== filtro) { d.__filtro = filtro; d.style.webkitBackdropFilter = filtro; d.style.backdropFilter = filtro; }
    d.style.left = r(this.left + sc.x) + 'px'; d.style.top = r(this.top + sc.y) + 'px';
    d.style.width = W + 'px'; d.style.height = H + 'px';
    d.style.opacity = r(da);
    d.style.transform = 'scale(' + r(1 + st) + ', ' + r(1 - st * 0.55) + ')';
    d.style.background = bg; d.style.boxShadow = sh;
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

  /* ---------- le bolle di vetro (il + e i tasti tondi): premute crescono con un rimbalzo e si illuminano sotto il mouse,
     come Glass.Regular.interactive() dell'app (molla 0,5 / 380 premendo, 0,42 / 300 lasciando) ---------- */
  function Bolla(el, senzaLuce, compagni) {
    this.el = el; this.compagni = compagni;
    el.classList.add('orizon-bolla');
    if (senzaLuce) el.__ozBagliore = false; this.p = 0; this.v = 0; this.giu = false; this.x = 0; this.y = 0; this.raf = 0; this.last = 0;
    var g = document.createElement('span');
    g.className = 'orizon-bagliore';
    g.setAttribute('aria-hidden', 'true');
    if (el.__ozBagliore !== false) el.appendChild(g);
    this.g = g;
    var self = this;
    var su = function () { if (!self.giu) return; self.giu = false; window.removeEventListener('pointerup', su, true); window.removeEventListener('pointercancel', su, true); self.kick(); };
    el.addEventListener('pointerdown', function (e) {
      if (e.button || el.getAttribute('aria-disabled') === 'true' || el.disabled) return;
      self.giu = true; self.pos(e);
      window.addEventListener('pointerup', su, true);
      window.addEventListener('pointercancel', su, true);
      self.kick();
    });
    el.addEventListener('pointermove', function (e) { if (self.giu) { self.pos(e); self.draw(); } });
    el.style.transform = 'scale(1)';
  }
  Bolla.prototype.pos = function (e) {
    var r = this.el.getBoundingClientRect(), k = (r.width && this.el.offsetWidth) ? r.width / this.el.offsetWidth : 1;
    this.x = (e.clientX - r.left) / k; this.y = (e.clientY - r.top) / k;
  };
  Bolla.prototype.kick = function () {
    if (this.raf) return;
    var self = this;
    this.last = performance.now();
    this.raf = requestAnimationFrame(function frame(now) {
      var dt = Math.max(0.001, Math.min(0.032, (now - self.last) / 1000));
      self.last = now;
      var t = self.giu ? 1 : 0, k = self.giu ? 380 : 300, z = self.giu ? 0.5 : 0.42, c = 2 * z * Math.sqrt(k);
      if (reduced) { self.p = t; self.v = 0; }
      else { self.v += (-k * (self.p - t) - c * self.v) * dt; self.p += self.v * dt; }
      var fermo = Math.abs(self.p - t) < 0.002 && Math.abs(self.v) < 0.02;
      if (fermo) { self.p = t; self.v = 0; }
      self.draw();
      self.raf = fermo ? 0 : requestAnimationFrame(frame);
    });
  };
  Bolla.prototype.draw = function () {
    var el = this.el, w = el.offsetWidth || 1, h = el.offsetHeight || 1, s = 1 + 6 / w * this.p;
    el.style.transform = 'scale(' + (Math.round(s * 1000) / 1000) + ')';
    /* chi sta dentro la pillola ma non è suo figlio (la foto della chat) cresce con lei, dallo stesso centro */
    if (this.compagni) {
      var b = el.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      this.compagni().forEach(function (c) {
        if (s === 1) { c.style.transform = ''; c.style.transformOrigin = ''; return; }
        var o = c.getBoundingClientRect(), k = Math.round(s * 1000) / 1000;
        if (!c.style.transform) c.style.transformOrigin = Math.round(cx - o.left) + 'px ' + Math.round(cy - o.top) + 'px';
        c.style.transform = 'scale(' + k + ')';
      });
    }
    var a = Math.max(0, Math.min(1, this.p)) * (chiaro() ? 0.35 : 0.16);
    this.g.style.opacity = a > 0.002 ? '1' : '0';
    this.g.style.background = 'radial-gradient(circle ' + Math.round(Math.min(w, h) * 1.2) + 'px at ' + Math.round(this.x) + 'px ' + Math.round(this.y) + 'px, rgba(255,255,255,' + (Math.round(a * 1000) / 1000) + '), rgba(255,255,255,0))';
  };
  function bolle(sel, senzaLuce) {
    $$(sel).forEach(function (el) { if (!el.__ozBolla) el.__ozBolla = new Bolla(el, senzaLuce); });
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
      /* come HomeTopBar: la foto e le azioni insieme in una pillola di vetro (GlassActionsPill) */
      testa.innerHTML = '<h1></h1><div class="orizon-pillola orizon-vetro oz-azioni">' +
        '<button type="button" class="orizon-tasto orizon-foto" data-a="profilo"></button>' +
        '<button type="button" class="orizon-tasto" data-a="cerca">' + ICON.cerca + '</button></div>';
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
    }
    /* GlassActionsPill: premendo esce la goccia (58 x alta la pillola + 10, 5 sopra), segue soltanto il mouse:
       il centro resta tra 24 e la larghezza - 24; i tasti sotto fanno da soli */
    var azioni = testa.querySelector('.oz-azioni');
    goccia(azioni, {
      items: function () { return $$('.orizon-tasto', azioni); },
      sel: function () { return -1; },
      gesture: 'feedback',
      layer: function () { return testa; },
      spec: function () { var w = azioni.offsetWidth, h = azioni.offsetHeight; return { w: 58, h: h + 10, top: -5, min: 24, max: w - 24 }; }
    });
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
      list.addEventListener('scroll', function () { bordi(); var g = list.parentElement && list.closest('[data-testid="primary-filters"]'); if (g && g.__goccia) g.__goccia.kick(); }, { passive: true });
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
      var opzioni = function () { return $$('[role="option"]', list); };
      /* come RoomListFiltersView: goccia larga 100 (alta come il filtro più 4+5 sopra e sotto), si afferra tenendo premuto */
      goccia(list, {
        items: opzioni,
        sel: function () { return opzioni().findIndex(function (b) { return b.getAttribute('aria-selected') === 'true'; }); },
        gesture: 'hold',
        layer: function () { return wrap; },
        spec: function (it) {
          var h = it.length ? it[0].h : 34, y = it.length ? it[0].y : 0, pad = 4, k = h / 36;
          return { w: Math.round(100 * k), h: h + (pad + 5) * 2, top: y - pad - 5, min: list.scrollLeft + 26, max: list.scrollLeft + list.clientWidth - 26 };
        }
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

  /* ---------- pillola in basso: Chat / Spazi e il + dentro la stessa pillola (OrizonBottomPill) ---------- */
  var basso = null, pillola = null, scheda = 0;
  function apriSpazi(on) {
    scheda = on ? 1 : 0;
    document.body.classList.toggle('orizon-spazi', !!on);
    if (on) {
      var sp = $('.mx_SpacePanel');
      if (sp && sp.classList.contains('collapsed')) { var tg = $('.mx_SpacePanel_toggleCollapse', sp); if (tg) tg.click(); }
      posizionaSpazi();
    }
    if (pillola) pillola.select(scheda);
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
      basso.innerHTML = '<div class="orizon-pillola orizon-vetro">' +
        '<div class="orizon-tabs" role="tablist">' +
        '<button type="button" class="orizon-tab on" role="tab" aria-selected="true"><span>' + ICON.chat + '<b data-t="chat"></b></span></button>' +
        '<button type="button" class="orizon-tab" role="tab" aria-selected="false"><span>' + ICON.spazi + '<b data-t="spazi"></b></span></button>' +
        '</div><span class="oz-piu-spazio" aria-hidden="true"></span>' +
        '<button type="button" class="orizon-piu oz-annidato">' + ICON.piu + '</button></div>';
      var tabs = $$('.orizon-tab', basso);
      tabs[0].onclick = function () {
        var wasSpaces = scheda === 1;
        apriSpazi(false);
        if (!wasSpaces && !inHome()) { var h = homeButton(); if (h) h.click(); }
      };
      tabs[1].onclick = function () { apriSpazi(scheda !== 1); };
      $('.orizon-piu', basso).onclick = function () {
        if (scheda === 1) { var n = $('.mx_SpacePanel .mx_SpaceButton_new'); if (n) n.click(); }
        else if (!(window.__orizonAvvia && window.__orizonAvvia())) dispatch('view_create_chat');
      };
    }
    if (basso.parentNode !== panel) {
      panel.appendChild(basso);
      pillola = null;
    }
    var cambiate = false;
    $$('[data-t]', basso).forEach(function (b) { var v = t(b.getAttribute('data-t')); if (b.textContent !== v) { b.textContent = v; cambiate = true; } });
    $('.orizon-piu', basso).setAttribute('aria-label', scheda === 1 ? t('spazi') : t('nuova'));
    if (!pillola) {
      pillola = new Pillola(basso);
      pillola.select(scheda, true);
      if (mini) { pillola.mini.x = pillola.mini.t = 1; pillola.draw(); }
    } else if (cambiate) { pillola.misura(); pillola.draw(); }
    var tr = pillola.track;
    tr.classList.add('orizon-con-goccia');
    /* la goccia come OrizonBottomPill: larga 84 (62 quando è piccola), alta come la pillola più 5 sopra e sotto;
       il centro resta tra la prima e l'ultima scheda; a riposo è la selezione sotto la scheda scelta */
    goccia(tr, {
      items: function () { return $$('.orizon-tab', basso); },
      sel: function () { return scheda; },
      gesture: 'select',
      layer: function () { return basso; },
      riposo: function (i) { var m = pillola.m(), pad = pillola.pad(m); return { x: pillola.inizio(i, i, m) - pad, y: 0, w: pillola.larga(i, i, m), h: pillola.alta(m) }; },
      spec: function () {
        var m = pillola.m(), pad = pillola.pad(m), h = pillola.alta(m);
        return { w: mix(PB.goccia, PB.gocciaMini, m), h: h + pad * 2 + PB.fuori * 2, top: -pad - PB.fuori,
          min: h / 2 - PB.bordo, max: pillola.fine(pillola.pos.x, m) - pad - h / 2 + PB.bordo };
      }
    });
  }

  /* scorrendo la lista verso il basso la pillola si fa piccola, tornando su torna grande (come sul telefono) */
  var mini = false, listaY = 0;
  function setMini(on) {
    if (on === mini) return;
    mini = on;
    if (basso) basso.classList.toggle('orizon-mini', on);
    if (pillola) pillola.setMini(on);
    kickGocce();
    segui(520);
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
    /* come GlassActionsPill: la goccia (58 x alta la pillola + 10) segue soltanto, i tasti fanno da soli */
    goccia(h, {
      items: function () { return $$(':scope > button[class*="_icon-button_"]:not(.orizon-via)', h).filter(function (b) { return b.offsetWidth > 0; }); },
      sel: function () { return -1; },
      gesture: 'feedback',
      spec: function () {
        var ax = h.__ax || 0, aw = h.__aw || 0, ay = h.__ay || 0;
        return { w: 58, h: 46 + 10, top: ay - 5, min: ax + 24, max: ax + aw - 24 };
      }
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
    applicaLente(h, 'v', true, w, 46, 23);
  }

  /* ---------- impostazioni: sezioni in pillola; la sezione aperta mostra il nome (lo allarga orizon.css), la goccia la segue ---------- */
  var setSel = null;
  function segui(ms) {
    var t0 = performance.now();
    (function f(now) { kickGocce(); if (now - t0 < ms) requestAnimationFrame(f); })(t0);
  }
  function settingsTabs() {
    var ul = $('.mx_TabbedView_tabsOnLeft .mx_TabbedView_tabLabels');
    if (!ul) { setSel = null; return; }
    var lis = $$(':scope > .mx_TabbedView_tabLabel', ul);
    if (!lis.length) return;
    ul.classList.add('orizon-con-goccia');
    if (!ul.__oscroll) { ul.__oscroll = true; ul.addEventListener('scroll', function () { if (ul.__goccia) ul.__goccia.kick(); }, { passive: true }); }
    goccia(ul, {
      items: function () { return $$(':scope > .mx_TabbedView_tabLabel', ul); },
      sel: function () { return $$(':scope > .mx_TabbedView_tabLabel', ul).findIndex(function (li) { return li.classList.contains('mx_TabbedView_tabLabel_active'); }); },
      gesture: 'select',
      layer: function () { return ul.parentElement; },
      spec: function (it) {
        var hh = it.length ? it[0].h : 40, y = it.length ? it[0].y : 0, f = it[0], z = it[it.length - 1];
        return { w: Math.round(84 * hh / 52), h: hh + 4 * 2 + 10, top: y - 4 - 5,
          min: Math.max(f ? f.x + hh / 2 - 2 : 0, ul.scrollLeft + 26), max: Math.min(z ? z.x + z.w - hh / 2 + 2 : 0, ul.scrollLeft + ul.clientWidth - 26) };
      }
    });
    var active = $(':scope > .mx_TabbedView_tabLabel_active', ul);
    if (active && active !== setSel) {
      var primo = setSel === null;
      setSel = active;
      /* il nome si apre in 320 ms: la goccia lo accompagna */
      segui(primo ? 120 : 520);
      if (active.scrollIntoView) setTimeout(function () { active.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduced || primo ? 'auto' : 'smooth' }); }, primo ? 0 : 340);
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

  /* ================================================================
     9. TUTTO IL VETRO DELL'APP
     Gli stessi pezzi dell'app Android (libraries/designsystem/.../orizon/glass), uno per uno, su tutto il computer:
       le isole (GlassIsland) con il bordo di luce, e il velo che sale sotto la riga (rememberGlassRowIndication);
       i campi di ricerca (GlassSearchField); le pillole (GlassPillButton); i tasti tondi (GlassIconButton);
       il + della chat e il suo menu che esce dal + (AttachmentsBottomSheet); le emoji con la goccia (EmojiPanel);
       i tasti grandi delle info (MainActionButton); e come si aprono e si chiudono finestre e menu.
     Le misure, i colori e le molle sono quelli dell'app; qui i dp diventano pixel.
     ================================================================ */

  /* ---------- 9a. le molle anche nel CSS ----------
     spring(dampingRatio, stiffness) di Compose: la curva esatta, campionata a 60 fotogrammi, diventa un easing linear().
     Nel CSS si usano come var(--oz-m-<smorzamento x 100>-<rigidità>), per esempio var(--oz-m-50-420). */
  var LINEARE = !!(window.CSS && CSS.supports && CSS.supports('transition-timing-function', 'linear(0, 1)'));
  function molla(z, k) {
    if (reduced) return { ms: 1, easing: 'linear' };
    if (!LINEARE) return { ms: 460, easing: z < 0.7 ? 'cubic-bezier(.3, 1.6, .45, 1)' : 'cubic-bezier(.25, 1.1, .35, 1)' };
    var w = Math.sqrt(k), dt = 1 / 60, xs = [], fine = 0;
    for (var i = 0; i <= 240; i++) {
      var t = i * dt, x;
      if (z < 1) { var wd = w * Math.sqrt(1 - z * z); x = 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + z * w / wd * Math.sin(wd * t)); }
      else x = 1 - Math.exp(-w * t) * (1 + w * t);
      xs.push(x);
      if (Math.abs(1 - x) > 0.003) fine = i;
    }
    var n = Math.min(xs.length, fine + 2), p = xs.slice(0, n).map(function (x) { return Math.round(x * 1000) / 1000; });
    p[0] = 0; p[n - 1] = 1;
    return { ms: Math.round((n - 1) * dt * 1000), easing: 'linear(' + p.join(',') + ')' };
  }
  (function () {
    var css = ':root{';
    [[0.5, 420], [0.5, 520], [0.4, 500], [0.42, 520], [0.62, 420], [0.55, 420], [0.45, 380], [0.6, 380], [0.62, 380],
      [0.55, 520], [0.7, 300], [0.72, 420], [0.75, 380]].forEach(function (m) {
      var c = molla(m[0], m[1]);
      css += '--oz-m-' + Math.round(m[0] * 100) + '-' + m[1] + ':' + c.ms + 'ms ' + c.easing + ';';
    });
    var st = document.createElement('style');
    st.id = 'oz-molle';
    st.textContent = css + '}';
    (document.head || document.documentElement).appendChild(st);
  })();
  /* un'animazione con la molla (trasformazione) e la dissolvenza lineare, come le transizioni di Compose */
  function animaMolla(el, da, a, z, k, origine) {
    if (reduced || !el.animate) return null;
    var m = molla(z, k);
    if (origine) el.style.transformOrigin = origine;
    return el.animate([{ transform: da }, { transform: a }], { duration: m.ms, easing: m.easing });
  }
  function dissolvi(el, da, a, ms, poi) {
    if (reduced || !el.animate) { if (poi) poi(); return null; }
    var x = el.animate([{ opacity: da }, { opacity: a }], { duration: ms, easing: 'linear', fill: 'forwards' });
    if (poi) x.onfinish = poi;
    return x;
  }
  var clamp = function (x, a, b) { return Math.max(a, Math.min(b, x)); };
  var r2 = function (n) { return Math.round(n * 100) / 100; };

  /* ---------- 9b. le isole (GlassIsland) ----------
     fondo pieno (5% di bianco nello scuro, 3,5% di nero nel chiaro), ombra (elevazione 10), una luce larga dentro al
     bordo e il bordo di luce: tutti e due con la sfumatura dall'angolo in alto a sinistra a quello in basso a destra,
     cioè lungo la diagonale: l'angolo dipende dalla forma, lo mette qui --oz-ang. */
  var ISOLE = '.ozf-isola, .orizon-info-isola, .mx_SettingsSubsection:not(.mx_SettingsSubsection .mx_SettingsSubsection), .mx_UserProfileSettings, ' +
    '.mx_SettingsTab .mx_SettingsSection_subSections:not(:has(.mx_SettingsSubsection)):not(:has(.mx_BetaCard)):not(:has(.mx_UserProfileSettings)):not(:empty), ' +
    '.mx_SettingsTab form.mx_SetIntegrationManager, .mx_SettingsTab .mx_SettingsSection_newUi:not(.mx_SettingsSection_newUi .mx_SettingsSection_newUi), ' +
    '.mx_SettingsTab .mx_BetaCard, .mx_UserInfo .mx_UserInfo_container:not(.mx_UserInfo_header), .mx_InviteDialog_userSections ul[role="listbox"]';
  function angolo(el) {
    var w = el.offsetWidth, h = el.offsetHeight;
    if (!w || !h) return;
    var a = (90 + Math.atan(h / w) * 180 / Math.PI).toFixed(1) + 'deg';
    if (el.__ozAng !== a) { el.__ozAng = a; el.style.setProperty('--oz-ang', a); }
  }
  var roAngolo = window.ResizeObserver ? new ResizeObserver(function (v) { v.forEach(function (x) { angolo(x.target); }); }) : null;
  function isola(el) {
    if (el.__ozIsola) return;
    /* un'isola dentro un'isola no: resta quella fuori */
    if (el.parentElement && el.parentElement.closest('.oz-isola')) return;
    el.__ozIsola = true;
    el.classList.add('oz-isola');
    angolo(el);
    if (roAngolo) roAngolo.observe(el);
  }
  /* nel pannello delle info Element non mette le voci in un contenitore: l'isola si disegna dietro a ogni gruppo
     di voci una sopra l'altra (tra un gruppo e l'altro c'è uno spazio) */
  function isoleDietro(cont, sel) {
    var righe = $$(sel, cont).filter(function (r) { return r.offsetHeight > 0; });
    var cr = cont.getBoundingClientRect(), gruppi = [], g = null, prec = null;
    righe.forEach(function (r) {
      var b = r.getBoundingClientRect();
      if (g && Math.abs(b.top - prec.bottom) < 1.5 && Math.abs(b.left - prec.left) < 1.5) { g.b = b.bottom; g.righe.push(r); }
      else { g = { t: b.top, b: b.bottom, l: b.left, w: b.width, righe: [r] }; gruppi.push(g); }
      prec = b;
    });
    var vecchie = $$(':scope > .oz-isola-dietro', cont);
    gruppi.forEach(function (g, i) {
      var d = vecchie[i];
      if (!d) {
        d = document.createElement('div');
        d.className = 'oz-isola oz-isola-dietro';
        d.setAttribute('aria-hidden', 'true');
        cont.appendChild(d);
      }
      var x = g.l - cr.left + cont.scrollLeft - cont.clientLeft, y = g.t - cr.top + cont.scrollTop - cont.clientTop;
      var k = Math.round(x) + ',' + Math.round(y) + ',' + Math.round(g.w) + ',' + Math.round(g.b - g.t);
      if (d.__k !== k) {
        d.__k = k;
        d.style.left = Math.round(x) + 'px'; d.style.top = Math.round(y) + 'px';
        d.style.width = Math.round(g.w) + 'px'; d.style.height = Math.round(g.b - g.t) + 'px';
        d.style.setProperty('--oz-ang', (90 + Math.atan((g.b - g.t) / g.w) * 180 / Math.PI).toFixed(1) + 'deg');
      }
      var rossa = g.righe.every(function (r) { return r.getAttribute('data-kind') === 'critical'; });
      if (d.classList.contains('oz-rossa') !== rossa) d.classList.toggle('oz-rossa', rossa);
    });
    vecchie.slice(gruppi.length).forEach(function (d) { d.remove(); });
  }
  function isole() {
    $$(ISOLE).forEach(isola);
    /* l'isola delle azioni che tolgono qualcosa (rimuovi, blocca...) è appena rossa */
    $$('.mx_UserInfo .oz-isola').forEach(function (el) {
      var v = $$('[class*="_item_"]', el), rossa = v.length > 0 && v.every(function (r) { return r.getAttribute('data-kind') === 'critical'; });
      if (el.classList.contains('oz-rossa') !== rossa) el.classList.toggle('oz-rossa', rossa);
    });
    $$('.mx_RightPanel [role="menubar"]').forEach(function (m) {
      if (!m.classList.contains('oz-con-isole')) m.classList.add('oz-con-isole');
      isoleDietro(m, '[class*="_item_"][role^="menuitem"]');
    });
  }

  /* ---------- 9c. il velo sotto la riga (rememberGlassRowIndication) ----------
     Premendo una riga sale un velo di vetro: compare in 60 ms e cresce con un rimbalzo (0,55 / 520) da 90% x 80%;
     resta almeno 110 ms, poi si spegne in 280 ms e torna piccolo (0,7 / 300). Sul computer c'è anche il mouse:
     passandoci sopra il velo sale a metà, premendo si accende tutto. */
  var RIGHE = '.ozf-riga, .orizon-info-riga, .mx_RightPanel [role="menubar"] [class*="_item_"][role^="menuitem"], ' +
    '.mx_UserInfo [class*="_item_"][role="button"], [role="menu"] [class*="_item_"][role^="menuitem"], .mx_IconizedContextMenu_item, ' +
    '.mx_SpotlightDialog_option:not(.mx_SpotlightDialog_recentlyViewed .mx_SpotlightDialog_option), [role="listbox"] > [class*="_richItem_"][role="option"], ' +
    '.mx_SettingsTab [class*="_inline-field_"]:not(.mx_ThemeChoicePanel_themeSelector):has(> [class*="_inline-field-control_"] input), .mx_SettingsFlag';
  var VELO_SOPRA = 0.55, MIN_VELO = 110;
  function Velo(r) {
    this.r = r; this.v = 0; this.g = new Spring(520, 0.55); this.sopra = false; this.giu = false; this.t0 = 0; this.tm = 0; this.raf = 0; this.last = 0;
    r.classList.add('oz-riga');
    r.__ozVelo = this;
  }
  Velo.prototype.forma = function () {
    var r = this.r, w = r.offsetWidth - 12, h = r.offsetHeight - 5;
    if (w <= 0 || h <= 0) return;
    r.style.setProperty('--oz-vr', Math.min(20, h / 2).toFixed(1) + 'px');
    r.style.setProperty('--oz-vang', (90 + Math.atan(h / w) * 180 / Math.PI).toFixed(1) + 'deg');
  };
  Velo.prototype.meta = function () { return this.giu ? 1 : this.sopra ? VELO_SOPRA : 0; };
  Velo.prototype.vai = function () {
    if (this.v < 0.01) this.forma();
    if (this.raf) return;
    var self = this;
    this.last = performance.now();
    this.raf = requestAnimationFrame(function f(now) {
      var dt = clamp((now - self.last) / 1000, 0.001, 0.032);
      self.last = now;
      var m = self.meta();
      if (reduced) { self.v = m; self.g.x = m > 0 ? 1 : 0; }
      else {
        /* visibilità: su in 60 ms, giù in 280 ms; crescita: molla, più morbida quando si spegne */
        if (self.v < m) self.v = Math.min(m, self.v + dt / 0.06);
        else if (self.v > m) self.v = Math.max(m, self.v - dt / 0.28);
        self.g.t = m > 0 ? 1 : 0;
        if (m > 0) { self.g.k = 520; self.g.z = 0.55; } else { self.g.k = 300; self.g.z = 0.7; }
        self.g.step(dt);
      }
      self.r.style.setProperty('--oz-v', self.v.toFixed(3));
      self.r.style.setProperty('--oz-g', self.g.x.toFixed(3));
      var fermo = Math.abs(self.v - m) < 0.001 && self.g.settled();
      if (fermo || !self.r.isConnected) { self.raf = 0; if (m === 0) { self.g.x = 0; self.r.style.setProperty('--oz-g', '0'); } return; }
      self.raf = requestAnimationFrame(f);
    });
  };
  Velo.prototype.entra = function () { this.sopra = true; this.vai(); };
  Velo.prototype.esci = function () { this.sopra = false; if (!this.giu) this.vai(); };
  Velo.prototype.premi = function () { clearTimeout(this.tm); this.giu = true; this.t0 = performance.now(); this.vai(); };
  Velo.prototype.lascia = function () {
    if (!this.giu) return;
    var self = this, d = performance.now() - this.t0;
    clearTimeout(this.tm);
    var fai = function () { self.giu = false; self.vai(); };
    if (d < MIN_VELO) this.tm = setTimeout(fai, MIN_VELO - d); else fai();
  };
  function veloDi(r) {
    if (!r || r.disabled || r.getAttribute('aria-disabled') === 'true') return null;
    return r.__ozVelo || new Velo(r);
  }
  var veloSopra = null, veliGiu = [];
  document.addEventListener('pointerover', function (e) {
    var r = e.target && e.target.closest ? e.target.closest(RIGHE) : null;
    if (r === veloSopra) return;
    if (veloSopra && veloSopra.__ozVelo) veloSopra.__ozVelo.esci();
    veloSopra = r;
    var v = veloDi(r);
    if (v) v.entra();
  }, true);
  document.addEventListener('pointerout', function (e) {
    if (e.relatedTarget || !veloSopra) return;
    if (veloSopra.__ozVelo) veloSopra.__ozVelo.esci();
    veloSopra = null;
  }, true);
  document.addEventListener('pointerdown', function (e) {
    if (e.button) return;
    var v = veloDi(e.target && e.target.closest ? e.target.closest(RIGHE) : null);
    if (v) { v.premi(); veliGiu.push(v); }
  }, true);
  var lasciaVeli = function () { veliGiu.forEach(function (v) { v.lascia(); }); veliGiu = []; };
  window.addEventListener('pointerup', lasciaVeli, true);
  window.addEventListener('pointercancel', lasciaVeli, true);
  window.addEventListener('blur', lasciaVeli);

  /* ---------- 9d. i campi di ricerca (GlassSearchField) ----------
     pillola di vetro alta 52; con il cursore dentro cresce un po' (1,025) con un rimbalzo (0,5 / 420);
     a destra la x per cancellare, che entra con un rimbalzo (0,5 / 520) quando c'è qualcosa scritto */
  var CERCHE = '.ozf-cerca, .mx_SpotlightDialog_searchBox, .mx_RoomSummaryCard_search > label, [class*="_picker_"] > [class*="_search_"], .mx_InviteDialog_editor';
  var X_ICONA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>';
  function svuota(inp) {
    try {
      var d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      d.set.call(inp, '');
    } catch (e) { inp.value = ''; }
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function cerche() {
    $$(CERCHE).forEach(function (c) {
      if (c.__ozCerca) return;
      var inp = $('input', c);
      if (!inp) return;
      c.__ozCerca = true;
      c.classList.add('oz-cerca');
      /* senza la sua lente, la lente la disegna il CSS a sinistra */
      if (!$(':scope > svg, :scope > .ozf-ic, :scope > [class*="_searchIcon_"]', c)) c.classList.add('oz-icona-finta');
      var x = document.createElement('button');
      x.type = 'button';
      x.className = 'oz-cancella';
      x.tabIndex = -1;
      x.setAttribute('aria-label', t('cancella'));
      x.innerHTML = X_ICONA;
      x.addEventListener('mousedown', function (e) { e.preventDefault(); });
      x.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); svuota(inp); inp.focus(); });
      c.appendChild(x);
      c.__ozInp = inp;
      inp.addEventListener('input', function () { pieno(c); });
    });
    $$('.oz-cerca').forEach(pieno);
  }
  function pieno(c) {
    var inp = c.__ozInp;
    if (!inp) return;
    var on = !!inp.value;
    if (c.classList.contains('oz-pieno') !== on) c.classList.toggle('oz-pieno', on);
  }

  /* ---------- 9e. menu e finestre: come entrano e come escono ----------
     Il menu del + esce dal + (scala da 0,18, perno in basso a sinistra, molla 0,62 / 420, dissolvenza 160 ms) e la
     conversazione dietro si scurisce (nero al 28%); chiudendo rimpicciolisce a 0,4 in 160 ms. Gli altri menu escono
     dal punto dove si è cliccato, le finestre crescono dal centro. Element toglie subito menu e finestre chiusi:
     una copia (ferma, non cliccabile) fa l'uscita al loro posto. */
  var ultimoClic = { x: 0, y: 0, t: 0 };
  document.addEventListener('pointerdown', function (e) { ultimoClic = { x: e.clientX, y: e.clientY, t: performance.now() }; }, true);
  var aperti = [];
  function origineDalClic(p) {
    var b = p.getBoundingClientRect();
    if (performance.now() - ultimoClic.t > 1200 || !b.width) return '50% 0';
    var x = clamp(ultimoClic.x - b.left, 0, b.width), y = clamp(ultimoClic.y - b.top, 0, b.height);
    return Math.round(x) + 'px ' + Math.round(y) + 'px';
  }
  function menuPiu(w, p) {
    var tasto = $('.mx_MessageComposer_buttonMenu'), riga = $('.mx_MessageComposer_row');
    if (tasto && riga) {
      var a = tasto.getBoundingClientRect(), c = riga.getBoundingClientRect();
      /* come AttachmentsBottomSheet: a sinistra sopra il +, 6 sopra la barra per scrivere */
      w.style.setProperty('left', Math.round(a.left) + 'px', 'important');
      w.style.setProperty('right', 'auto', 'important');
      w.style.setProperty('top', 'auto', 'important');
      w.style.setProperty('bottom', Math.round(window.innerHeight - c.top + 6) + 'px', 'important');
    }
    /* il velo scuro copre solo la conversazione */
    var bg = $(':scope > .mx_ContextualMenu_background', w), rv = $('.mx_RoomView');
    if (bg && rv) {
      var r = rv.getBoundingClientRect();
      bg.style.clipPath = 'inset(' + Math.round(r.top) + 'px ' + Math.round(window.innerWidth - r.right) + 'px ' + Math.round(window.innerHeight - r.bottom) + 'px ' + Math.round(r.left) + 'px)';
    }
    /* come sull'app, gli allegati stanno nel menu del +: in cima la voce "Allegato" (fa lo stesso del tasto con la graffetta) */
    var lista = $('.mx_IconizedContextMenu_optionList', p), su = $('.mx_MessageComposer_actions > .oz-allegato');
    if (lista && su && !$('.oz-voce-allegato', lista)) {
      var nome = su.getAttribute('aria-label') || '';
      var li = document.createElement('li');
      li.className = 'mx_AccessibleButton mx_IconizedContextMenu_item oz-voce-allegato';
      li.setAttribute('role', 'menuitem');
      li.tabIndex = -1;
      li.setAttribute('aria-label', nome);
      var ic = $('svg', su);
      if (ic) li.appendChild(ic.cloneNode(true));
      var s = document.createElement('span');
      s.className = 'mx_IconizedContextMenu_label';
      s.textContent = nome;
      li.appendChild(s);
      var vai = function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        var b = $(':scope > .mx_ContextualMenu_background', w);
        if (b) b.click();
        setTimeout(function () { su.click(); }, 0);
      };
      li.addEventListener('click', vai);
      li.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') vai(e); });
      lista.insertBefore(li, lista.firstChild);
    }
  }
  /* la goccia nelle categorie delle emoji (EmojiCategoryPill): larga 1,3 schede, alta 36 + 16, esce 4 sopra;
     trascinandola la lista va alla categoria sotto la goccia */
  function menuEmoji(w, p) {
    var picker = $('[class*="_picker_"]', p), nav = picker && $(':scope > nav[role="tablist"]', picker);
    if (!nav) return;
    nav.classList.add('oz-pillola-annidata', 'orizon-con-goccia');
    var tasti = function () { return $$(':scope > button', nav); };
    goccia(nav, {
      items: tasti,
      sel: function () { return tasti().findIndex(function (b) { return b.getAttribute('aria-selected') === 'true'; }); },
      gesture: 'select',
      layer: function () { return picker; },
      move: function (i, el) { if (!el.disabled) el.click(); },
      pick: function (i, el) { if (!el.disabled) el.click(); },
      spec: function (it) {
        var f = it[0], z = it[it.length - 1], tw = f ? f.w : 40, pad = 4;
        return { w: tw * 1.3, h: (f ? f.h : 36) + pad * 4, top: (f ? f.y : pad) - pad * 2, min: f ? f.x + f.w / 2 : 0, max: z ? z.x + z.w / 2 : 0 };
      }
    });
  }
  function menu() {
    $$('.mx_ContextualMenu_wrapper, [data-radix-popper-content-wrapper]').forEach(function (w) {
      if (w.__ozMenu || w.classList.contains('oz-fantasma')) return;
      var radix = !w.classList.contains('mx_ContextualMenu_wrapper');
      var p = radix ? $(':scope > [role="menu"]', w) : $(':scope > .mx_ContextualMenu', w);
      if (!p) return;
      w.__ozMenu = true;
      var tipo = w.classList.contains('mx_MessageComposer_Menu') ? 'piu' : $('[class*="_picker_"]', p) ? 'emoji' : 'menu';
      w.classList.add('oz-menu', 'oz-menu-' + tipo);
      if (tipo === 'piu') menuPiu(w, p);
      if (tipo === 'emoji') menuEmoji(w, p);
      var bg = $(':scope > .mx_ContextualMenu_background', w);
      if (tipo === 'piu') {
        animaMolla(p, 'scale(.18)', 'scale(1)', 0.62, 420, '8% 100%');
        dissolvi(p, 0, 1, 160);
        if (bg) dissolvi(bg, 0, 1, 220);
      } else {
        animaMolla(p, tipo === 'emoji' ? 'scale(.5)' : 'scale(.6)', 'scale(1)', 0.62, 420, tipo === 'emoji' ? '92% 100%' : origineDalClic(p));
        dissolvi(p, 0, 1, 160);
      }
      aperti.push({ w: w, p: p, tipo: tipo });
    });
    /* il menu del + segue il + (se la finestra cambia misura) */
    $$('.oz-menu-piu').forEach(function (w) { var p = $(':scope > .mx_ContextualMenu', w); if (p && !w.classList.contains('oz-fantasma')) menuPiu(w, p); });
    var piuAperto = !!$('.oz-menu-piu:not(.oz-fantasma)');
    var tasto = $('.mx_MessageComposer_buttonMenu');
    if (tasto && tasto.classList.contains('oz-aperto') !== piuAperto) tasto.classList.toggle('oz-aperto', piuAperto);
    aperti = aperti.filter(function (m) {
      if (m.w.isConnected) return true;
      esceMenu(m);
      return false;
    });
  }
  function fantasma(w) {
    w.classList.add('oz-fantasma');
    w.setAttribute('aria-hidden', 'true');
    try { w.inert = true; } catch (e) {}
    w.style.pointerEvents = 'none';
    document.body.appendChild(w);
    setTimeout(function () { if (w.isConnected) w.remove(); }, 600);
  }
  function esceMenu(m) {
    if (reduced || !m.p.animate) return;
    fantasma(m.w);
    var piu = m.tipo === 'piu';
    m.p.animate([{ transform: 'scale(1)' }, { transform: piu ? 'scale(.4)' : 'scale(.9)' }], { duration: 160, easing: 'cubic-bezier(.4, 0, 1, 1)', fill: 'forwards' });
    dissolvi(m.p, 1, 0, piu ? 140 : 130, function () { m.w.remove(); });
    var bg = $(':scope > .mx_ContextualMenu_background', m.w);
    if (bg) dissolvi(bg, 1, 0, 180);
  }
  /* le finestre di Element: crescono dal centro con la molla e il fondo si scurisce; chiudendo rimpiccioliscono */
  var finestreAperte = [];
  function finestre() {
    $$('.mx_Dialog_wrapper').forEach(function (w) {
      if (w.__ozFin || w.classList.contains('oz-fantasma')) return;
      var d = $('.mx_Dialog', w);
      if (!d) return;
      w.__ozFin = true;
      animaMolla(d, 'scale(.92)', 'scale(1)', 0.62, 420, '50% 50%');
      dissolvi(d, 0, 1, 160);
      var bg = $('.mx_Dialog_background', w);
      if (bg && !w.previousElementSibling) dissolvi(bg, 0, 1, 220);
      finestreAperte.push({ w: w, d: d, bg: bg });
    });
    finestreAperte = finestreAperte.filter(function (f) {
      if (f.w.isConnected) return true;
      if (reduced || !f.d.animate) return false;
      /* se ne è appena entrata un'altra al suo posto (finestra dopo finestra) esce solo la finestra, non il fondo */
      fantasma(f.w);
      f.d.animate([{ transform: 'scale(1)' }, { transform: 'scale(.94)' }], { duration: 180, easing: 'cubic-bezier(.4, 0, 1, 1)', fill: 'forwards' });
      dissolvi(f.d, 1, 0, 160, function () { f.w.remove(); });
      if (f.bg) { if ($('.mx_Dialog_wrapper:not(.oz-fantasma)')) f.bg.style.opacity = '0'; else dissolvi(f.bg, 1, 0, 200); }
      return false;
    });
  }

  /* ---------- 9f. il tasto per tornare in fondo alla chat: entra con un rimbalzo (scala da 0,3, 0,45 / 380) ---------- */
  function tastiTimeline() {
    $$('.mx_JumpToBottomButton, .mx_TopUnreadMessagesBar').forEach(function (b) {
      if (b.__ozEntrato) return;
      b.__ozEntrato = true;
      var x = $('.mx_JumpToBottomButton_scrollDown, .mx_TopUnreadMessagesBar_scrollUp', b) || b;
      animaMolla(x, 'translateY(' + (b.classList.contains('mx_TopUnreadMessagesBar') ? '-' : '') + '22px) scale(.3)', 'translateY(0) scale(1)', 0.45, 380, '50% 50%');
      dissolvi(x, 0, 1, 160);
    });
  }

  /* ---------- 9g. la pillola col nome nella chat: preme come vetro interattivo, la foto va con lei ---------- */
  function nomeChat() {
    var p = $('.mx_RoomHeader_infoWrapper');
    if (!p || p.__ozBolla) return;
    p.__ozBolla = new Bolla(p, false, function () { return $$('.mx_RoomHeader > .mx_WithPresenceIndicator, .mx_RoomHeader > .mx_BaseAvatar'); });
  }

  /* ---------- tutto insieme ---------- */
  var BOLLE = '.ozf-bianco, .orizon-azione-tondo, .mx_JumpToBottomButton_scrollDown, .mx_TopUnreadMessagesBar_scrollUp, ' +
    '.mx_InviteDialog_editor [class*="_pill_"], .mx_InviteDialog_goButton, .mx_RightPanel .mx_BaseCard_header > button[class*="_icon-button_"], ' +
    '.mx_Dialog_buttons button[class*="_button_"], .mx_Dialog_buttons .mx_Dialog_primary, .mx_Dialog_buttons button, .mx_IncomingCallToast_actionButton, ' +
    '.mx_IncomingLegacyCallToast_buttons [role="button"]';
  function tutto() {
    var su = $('.mx_MessageComposer_actions > button[class*="_icon-button_"]');
    if (su && !su.classList.contains('oz-allegato')) su.classList.add('oz-allegato');
    isole();
    /* le righe hanno subito il loro velo (spento): così niente fondi e righe di Element sotto */
    $$(RIGHE).forEach(function (r) { if (!r.classList.contains('oz-riga')) r.classList.add('oz-riga'); });
    cerche();
    menu();
    finestre();
    tastiTimeline();
    nomeChat();
    bolle(BOLLE);
  }
  /* ---------- quali vetri hanno la lente: 'v' pillole e tasti (Glass.Regular), 'p' finestre e menu (Glass.Thick) ---------- */
  var VETRI = [
    ['.orizon-vetro, .mx_RoomHeader_infoWrapper, .mx_TimelineSeparator > [class*="_content_"], .mx_MessageComposer_buttonMenu, ' +
      '[class*="_container_1opqj_"], .mx_LegacyCallEvent, .mx_ReplyPreview, .mx_Dialog_cancelButton, ' +
      '.mx_TabbedView_tabsOnLeft .mx_TabbedView_tabLabels, .ozf-vetro, .orizon-azione-tondo, .oz-cerca, .ozf-bianco, ' +
      '.mx_JumpToBottomButton_scrollDown, .mx_TopUnreadMessagesBar_scrollUp, .mx_InviteDialog_editor [class*="_pill_"], .mx_InviteDialog_goButton, .mx_IncomingCallToast_actionButton, ' +
      '.mx_RightPanel .mx_BaseCard_header > button[class*="_icon-button_"], .mx_Dialog_buttons button', 'v'],
    ['.mx_MessageComposer_row', 'v', true],
    ['.mx_Dialog, .mx_ContextualMenu, .mx_IconizedContextMenu, [role="menu"][data-state="open"], .mx_Toast_toast, ' +
      '.mx_MessageActionBar, .ozf-dialogo, #orizon-avviso', 'p']
  ];

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
      tutto();
      vetri(VETRI);
      bolle('#orizon-basso .orizon-piu, .ozf-tondo, .orizon-azione-tondo');
      bolle('.mx_MessageComposer_buttonMenu, .mx_Dialog_cancelButton', true);
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

/* ================================================================
   ORIZON 3 — le schermate dell'app Android anche sul computer:
   Avvia conversazione (dal +), Nuova stanza, Elenco delle stanze,
   Invita persone (con il codice QR), Accedi alla stanza tramite indirizzo,
   e nel pannello delle info i tasti tondi Silenzia / Chiama / Video
   con "Segna come non letto".
   Usa solo cose di Element che restano uguali tra una versione e l'altra
   (il client Matrix, il dispatcher, le classi mx_): se un giorno mancano,
   il + torna a fare quello che faceva Element e niente si rompe.
   ================================================================ */
(function () {
  'use strict';
  if (window.__orizon3) return;
  window.__orizon3 = true;

  var APP = 'Orizon';
  var LINK = 'https://app.4orizon.eu/#/user/';
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* QR Code Generator for JavaScript 1.4.4 — Copyright (c) 2009 Kazuhiko Arase — licenza MIT (http://www.opensource.org/licenses/mit-license.php).
     "QR Code" è un marchio registrato di DENSO WAVE INCORPORATED. */
  var QR = (function () { var qrcode=function(){var t=function(t,r){var e=t,n=g[r],o=null,i=0,a=null,u=[],f={},c=function(t,r){o=function(t){for(var r=new Array(t),e=0;e<t;e+=1){r[e]=new Array(t);for(var n=0;n<t;n+=1)r[e][n]=null}return r}(i=4*e+17),l(0,0),l(i-7,0),l(0,i-7),s(),h(),d(t,r),e>=7&&v(t),null==a&&(a=p(e,n,u)),w(a,r)},l=function(t,r){for(var e=-1;e<=7;e+=1)if(!(t+e<=-1||i<=t+e))for(var n=-1;n<=7;n+=1)r+n<=-1||i<=r+n||(o[t+e][r+n]=0<=e&&e<=6&&(0==n||6==n)||0<=n&&n<=6&&(0==e||6==e)||2<=e&&e<=4&&2<=n&&n<=4)},h=function(){for(var t=8;t<i-8;t+=1)null==o[t][6]&&(o[t][6]=t%2==0);for(var r=8;r<i-8;r+=1)null==o[6][r]&&(o[6][r]=r%2==0)},s=function(){for(var t=B.getPatternPosition(e),r=0;r<t.length;r+=1)for(var n=0;n<t.length;n+=1){var i=t[r],a=t[n];if(null==o[i][a])for(var u=-2;u<=2;u+=1)for(var f=-2;f<=2;f+=1)o[i+u][a+f]=-2==u||2==u||-2==f||2==f||0==u&&0==f}},v=function(t){for(var r=B.getBCHTypeNumber(e),n=0;n<18;n+=1){var a=!t&&1==(r>>n&1);o[Math.floor(n/3)][n%3+i-8-3]=a}for(n=0;n<18;n+=1){a=!t&&1==(r>>n&1);o[n%3+i-8-3][Math.floor(n/3)]=a}},d=function(t,r){for(var e=n<<3|r,a=B.getBCHTypeInfo(e),u=0;u<15;u+=1){var f=!t&&1==(a>>u&1);u<6?o[u][8]=f:u<8?o[u+1][8]=f:o[i-15+u][8]=f}for(u=0;u<15;u+=1){f=!t&&1==(a>>u&1);u<8?o[8][i-u-1]=f:u<9?o[8][15-u-1+1]=f:o[8][15-u-1]=f}o[i-8][8]=!t},w=function(t,r){for(var e=-1,n=i-1,a=7,u=0,f=B.getMaskFunction(r),c=i-1;c>0;c-=2)for(6==c&&(c-=1);;){for(var g=0;g<2;g+=1)if(null==o[n][c-g]){var l=!1;u<t.length&&(l=1==(t[u]>>>a&1)),f(n,c-g)&&(l=!l),o[n][c-g]=l,-1==(a-=1)&&(u+=1,a=7)}if((n+=e)<0||i<=n){n-=e,e=-e;break}}},p=function(t,r,e){for(var n=A.getRSBlocks(t,r),o=b(),i=0;i<e.length;i+=1){var a=e[i];o.put(a.getMode(),4),o.put(a.getLength(),B.getLengthInBits(a.getMode(),t)),a.write(o)}var u=0;for(i=0;i<n.length;i+=1)u+=n[i].dataCount;if(o.getLengthInBits()>8*u)throw"code length overflow. ("+o.getLengthInBits()+">"+8*u+")";for(o.getLengthInBits()+4<=8*u&&o.put(0,4);o.getLengthInBits()%8!=0;)o.putBit(!1);for(;!(o.getLengthInBits()>=8*u||(o.put(236,8),o.getLengthInBits()>=8*u));)o.put(17,8);return function(t,r){for(var e=0,n=0,o=0,i=new Array(r.length),a=new Array(r.length),u=0;u<r.length;u+=1){var f=r[u].dataCount,c=r[u].totalCount-f;n=Math.max(n,f),o=Math.max(o,c),i[u]=new Array(f);for(var g=0;g<i[u].length;g+=1)i[u][g]=255&t.getBuffer()[g+e];e+=f;var l=B.getErrorCorrectPolynomial(c),h=k(i[u],l.getLength()-1).mod(l);for(a[u]=new Array(l.getLength()-1),g=0;g<a[u].length;g+=1){var s=g+h.getLength()-a[u].length;a[u][g]=s>=0?h.getAt(s):0}}var v=0;for(g=0;g<r.length;g+=1)v+=r[g].totalCount;var d=new Array(v),w=0;for(g=0;g<n;g+=1)for(u=0;u<r.length;u+=1)g<i[u].length&&(d[w]=i[u][g],w+=1);for(g=0;g<o;g+=1)for(u=0;u<r.length;u+=1)g<a[u].length&&(d[w]=a[u][g],w+=1);return d}(o,n)};f.addData=function(t,r){var e=null;switch(r=r||"Byte"){case"Numeric":e=M(t);break;case"Alphanumeric":e=x(t);break;case"Byte":e=m(t);break;case"Kanji":e=L(t);break;default:throw"mode:"+r}u.push(e),a=null},f.isDark=function(t,r){if(t<0||i<=t||r<0||i<=r)throw t+","+r;return o[t][r]},f.getModuleCount=function(){return i},f.make=function(){if(e<1){for(var t=1;t<40;t++){for(var r=A.getRSBlocks(t,n),o=b(),i=0;i<u.length;i++){var a=u[i];o.put(a.getMode(),4),o.put(a.getLength(),B.getLengthInBits(a.getMode(),t)),a.write(o)}var g=0;for(i=0;i<r.length;i++)g+=r[i].dataCount;if(o.getLengthInBits()<=8*g)break}e=t}c(!1,function(){for(var t=0,r=0,e=0;e<8;e+=1){c(!0,e);var n=B.getLostPoint(f);(0==e||t>n)&&(t=n,r=e)}return r}())},f.createTableTag=function(t,r){t=t||2;var e="";e+='<table style="',e+=" border-width: 0px; border-style: none;",e+=" border-collapse: collapse;",e+=" padding: 0px; margin: "+(r=void 0===r?4*t:r)+"px;",e+='">',e+="<tbody>";for(var n=0;n<f.getModuleCount();n+=1){e+="<tr>";for(var o=0;o<f.getModuleCount();o+=1)e+='<td style="',e+=" border-width: 0px; border-style: none;",e+=" border-collapse: collapse;",e+=" padding: 0px; margin: 0px;",e+=" width: "+t+"px;",e+=" height: "+t+"px;",e+=" background-color: ",e+=f.isDark(n,o)?"#000000":"#ffffff",e+=";",e+='"/>';e+="</tr>"}return e+="</tbody>",e+="</table>"},f.createSvgTag=function(t,r,e,n){var o={};"object"==typeof arguments[0]&&(t=(o=arguments[0]).cellSize,r=o.margin,e=o.alt,n=o.title),t=t||2,r=void 0===r?4*t:r,(e="string"==typeof e?{text:e}:e||{}).text=e.text||null,e.id=e.text?e.id||"qrcode-description":null,(n="string"==typeof n?{text:n}:n||{}).text=n.text||null,n.id=n.text?n.id||"qrcode-title":null;var i,a,u,c,g=f.getModuleCount()*t+2*r,l="";for(c="l"+t+",0 0,"+t+" -"+t+",0 0,-"+t+"z ",l+='<svg version="1.1" xmlns="http://www.w3.org/2000/svg"',l+=o.scalable?"":' width="'+g+'px" height="'+g+'px"',l+=' viewBox="0 0 '+g+" "+g+'" ',l+=' preserveAspectRatio="xMinYMin meet"',l+=n.text||e.text?' role="img" aria-labelledby="'+y([n.id,e.id].join(" ").trim())+'"':"",l+=">",l+=n.text?'<title id="'+y(n.id)+'">'+y(n.text)+"</title>":"",l+=e.text?'<description id="'+y(e.id)+'">'+y(e.text)+"</description>":"",l+='<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>',l+='<path d="',a=0;a<f.getModuleCount();a+=1)for(u=a*t+r,i=0;i<f.getModuleCount();i+=1)f.isDark(a,i)&&(l+="M"+(i*t+r)+","+u+c);return l+='" stroke="transparent" fill="black"/>',l+="</svg>"},f.createDataURL=function(t,r){t=t||2,r=void 0===r?4*t:r;var e=f.getModuleCount()*t+2*r,n=r,o=e-r;return I(e,e,(function(r,e){if(n<=r&&r<o&&n<=e&&e<o){var i=Math.floor((r-n)/t),a=Math.floor((e-n)/t);return f.isDark(a,i)?0:1}return 1}))},f.createImgTag=function(t,r,e){t=t||2,r=void 0===r?4*t:r;var n=f.getModuleCount()*t+2*r,o="";return o+="<img",o+=' src="',o+=f.createDataURL(t,r),o+='"',o+=' width="',o+=n,o+='"',o+=' height="',o+=n,o+='"',e&&(o+=' alt="',o+=y(e),o+='"'),o+="/>"};var y=function(t){for(var r="",e=0;e<t.length;e+=1){var n=t.charAt(e);switch(n){case"<":r+="&lt;";break;case">":r+="&gt;";break;case"&":r+="&amp;";break;case'"':r+="&quot;";break;default:r+=n}}return r};return f.createASCII=function(t,r){if((t=t||1)<2)return function(t){t=void 0===t?2:t;var r,e,n,o,i,a=1*f.getModuleCount()+2*t,u=t,c=a-t,g={"██":"█","█ ":"▀"," █":"▄","  ":" "},l={"██":"▀","█ ":"▀"," █":" ","  ":" "},h="";for(r=0;r<a;r+=2){for(n=Math.floor((r-u)/1),o=Math.floor((r+1-u)/1),e=0;e<a;e+=1)i="█",u<=e&&e<c&&u<=r&&r<c&&f.isDark(n,Math.floor((e-u)/1))&&(i=" "),u<=e&&e<c&&u<=r+1&&r+1<c&&f.isDark(o,Math.floor((e-u)/1))?i+=" ":i+="█",h+=t<1&&r+1>=c?l[i]:g[i];h+="\n"}return a%2&&t>0?h.substring(0,h.length-a-1)+Array(a+1).join("▀"):h.substring(0,h.length-1)}(r);t-=1,r=void 0===r?2*t:r;var e,n,o,i,a=f.getModuleCount()*t+2*r,u=r,c=a-r,g=Array(t+1).join("██"),l=Array(t+1).join("  "),h="",s="";for(e=0;e<a;e+=1){for(o=Math.floor((e-u)/t),s="",n=0;n<a;n+=1)i=1,u<=n&&n<c&&u<=e&&e<c&&f.isDark(o,Math.floor((n-u)/t))&&(i=0),s+=i?g:l;for(o=0;o<t;o+=1)h+=s+"\n"}return h.substring(0,h.length-1)},f.renderTo2dContext=function(t,r){r=r||2;for(var e=f.getModuleCount(),n=0;n<e;n++)for(var o=0;o<e;o++)t.fillStyle=f.isDark(n,o)?"black":"white",t.fillRect(n*r,o*r,r,r)},f};t.stringToBytes=(t.stringToBytesFuncs={default:function(t){for(var r=[],e=0;e<t.length;e+=1){var n=t.charCodeAt(e);r.push(255&n)}return r}}).default,t.createStringToBytes=function(t,r){var e=function(){for(var e=S(t),n=function(){var t=e.read();if(-1==t)throw"eof";return t},o=0,i={};;){var a=e.read();if(-1==a)break;var u=n(),f=n()<<8|n();i[String.fromCharCode(a<<8|u)]=f,o+=1}if(o!=r)throw o+" != "+r;return i}(),n="?".charCodeAt(0);return function(t){for(var r=[],o=0;o<t.length;o+=1){var i=t.charCodeAt(o);if(i<128)r.push(i);else{var a=e[t.charAt(o)];"number"==typeof a?(255&a)==a?r.push(a):(r.push(a>>>8),r.push(255&a)):r.push(n)}}return r}};var r,e,n,o,i,a=1,u=2,f=4,c=8,g={L:1,M:0,Q:3,H:2},l=0,h=1,s=2,v=3,d=4,w=5,p=6,y=7,B=(r=[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],e=1335,n=7973,i=function(t){for(var r=0;0!=t;)r+=1,t>>>=1;return r},(o={}).getBCHTypeInfo=function(t){for(var r=t<<10;i(r)-i(e)>=0;)r^=e<<i(r)-i(e);return 21522^(t<<10|r)},o.getBCHTypeNumber=function(t){for(var r=t<<12;i(r)-i(n)>=0;)r^=n<<i(r)-i(n);return t<<12|r},o.getPatternPosition=function(t){return r[t-1]},o.getMaskFunction=function(t){switch(t){case l:return function(t,r){return(t+r)%2==0};case h:return function(t,r){return t%2==0};case s:return function(t,r){return r%3==0};case v:return function(t,r){return(t+r)%3==0};case d:return function(t,r){return(Math.floor(t/2)+Math.floor(r/3))%2==0};case w:return function(t,r){return t*r%2+t*r%3==0};case p:return function(t,r){return(t*r%2+t*r%3)%2==0};case y:return function(t,r){return(t*r%3+(t+r)%2)%2==0};default:throw"bad maskPattern:"+t}},o.getErrorCorrectPolynomial=function(t){for(var r=k([1],0),e=0;e<t;e+=1)r=r.multiply(k([1,C.gexp(e)],0));return r},o.getLengthInBits=function(t,r){if(1<=r&&r<10)switch(t){case a:return 10;case u:return 9;case f:case c:return 8;default:throw"mode:"+t}else if(r<27)switch(t){case a:return 12;case u:return 11;case f:return 16;case c:return 10;default:throw"mode:"+t}else{if(!(r<41))throw"type:"+r;switch(t){case a:return 14;case u:return 13;case f:return 16;case c:return 12;default:throw"mode:"+t}}},o.getLostPoint=function(t){for(var r=t.getModuleCount(),e=0,n=0;n<r;n+=1)for(var o=0;o<r;o+=1){for(var i=0,a=t.isDark(n,o),u=-1;u<=1;u+=1)if(!(n+u<0||r<=n+u))for(var f=-1;f<=1;f+=1)o+f<0||r<=o+f||0==u&&0==f||a==t.isDark(n+u,o+f)&&(i+=1);i>5&&(e+=3+i-5)}for(n=0;n<r-1;n+=1)for(o=0;o<r-1;o+=1){var c=0;t.isDark(n,o)&&(c+=1),t.isDark(n+1,o)&&(c+=1),t.isDark(n,o+1)&&(c+=1),t.isDark(n+1,o+1)&&(c+=1),0!=c&&4!=c||(e+=3)}for(n=0;n<r;n+=1)for(o=0;o<r-6;o+=1)t.isDark(n,o)&&!t.isDark(n,o+1)&&t.isDark(n,o+2)&&t.isDark(n,o+3)&&t.isDark(n,o+4)&&!t.isDark(n,o+5)&&t.isDark(n,o+6)&&(e+=40);for(o=0;o<r;o+=1)for(n=0;n<r-6;n+=1)t.isDark(n,o)&&!t.isDark(n+1,o)&&t.isDark(n+2,o)&&t.isDark(n+3,o)&&t.isDark(n+4,o)&&!t.isDark(n+5,o)&&t.isDark(n+6,o)&&(e+=40);var g=0;for(o=0;o<r;o+=1)for(n=0;n<r;n+=1)t.isDark(n,o)&&(g+=1);return e+=Math.abs(100*g/r/r-50)/5*10},o),C=function(){for(var t=new Array(256),r=new Array(256),e=0;e<8;e+=1)t[e]=1<<e;for(e=8;e<256;e+=1)t[e]=t[e-4]^t[e-5]^t[e-6]^t[e-8];for(e=0;e<255;e+=1)r[t[e]]=e;var n={glog:function(t){if(t<1)throw"glog("+t+")";return r[t]},gexp:function(r){for(;r<0;)r+=255;for(;r>=256;)r-=255;return t[r]}};return n}();function k(t,r){if(void 0===t.length)throw t.length+"/"+r;var e=function(){for(var e=0;e<t.length&&0==t[e];)e+=1;for(var n=new Array(t.length-e+r),o=0;o<t.length-e;o+=1)n[o]=t[o+e];return n}(),n={getAt:function(t){return e[t]},getLength:function(){return e.length},multiply:function(t){for(var r=new Array(n.getLength()+t.getLength()-1),e=0;e<n.getLength();e+=1)for(var o=0;o<t.getLength();o+=1)r[e+o]^=C.gexp(C.glog(n.getAt(e))+C.glog(t.getAt(o)));return k(r,0)},mod:function(t){if(n.getLength()-t.getLength()<0)return n;for(var r=C.glog(n.getAt(0))-C.glog(t.getAt(0)),e=new Array(n.getLength()),o=0;o<n.getLength();o+=1)e[o]=n.getAt(o);for(o=0;o<t.getLength();o+=1)e[o]^=C.gexp(C.glog(t.getAt(o))+r);return k(e,0).mod(t)}};return n}var A=function(){var t=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12,7,37,13],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]],r=function(t,r){var e={};return e.totalCount=t,e.dataCount=r,e},e={};return e.getRSBlocks=function(e,n){var o=function(r,e){switch(e){case g.L:return t[4*(r-1)+0];case g.M:return t[4*(r-1)+1];case g.Q:return t[4*(r-1)+2];case g.H:return t[4*(r-1)+3];default:return}}(e,n);if(void 0===o)throw"bad rs block @ typeNumber:"+e+"/errorCorrectionLevel:"+n;for(var i=o.length/3,a=[],u=0;u<i;u+=1)for(var f=o[3*u+0],c=o[3*u+1],l=o[3*u+2],h=0;h<f;h+=1)a.push(r(c,l));return a},e}(),b=function(){var t=[],r=0,e={getBuffer:function(){return t},getAt:function(r){var e=Math.floor(r/8);return 1==(t[e]>>>7-r%8&1)},put:function(t,r){for(var n=0;n<r;n+=1)e.putBit(1==(t>>>r-n-1&1))},getLengthInBits:function(){return r},putBit:function(e){var n=Math.floor(r/8);t.length<=n&&t.push(0),e&&(t[n]|=128>>>r%8),r+=1}};return e},M=function(t){var r=a,e=t,n={getMode:function(){return r},getLength:function(t){return e.length},write:function(t){for(var r=e,n=0;n+2<r.length;)t.put(o(r.substring(n,n+3)),10),n+=3;n<r.length&&(r.length-n==1?t.put(o(r.substring(n,n+1)),4):r.length-n==2&&t.put(o(r.substring(n,n+2)),7))}},o=function(t){for(var r=0,e=0;e<t.length;e+=1)r=10*r+i(t.charAt(e));return r},i=function(t){if("0"<=t&&t<="9")return t.charCodeAt(0)-"0".charCodeAt(0);throw"illegal char :"+t};return n},x=function(t){var r=u,e=t,n={getMode:function(){return r},getLength:function(t){return e.length},write:function(t){for(var r=e,n=0;n+1<r.length;)t.put(45*o(r.charAt(n))+o(r.charAt(n+1)),11),n+=2;n<r.length&&t.put(o(r.charAt(n)),6)}},o=function(t){if("0"<=t&&t<="9")return t.charCodeAt(0)-"0".charCodeAt(0);if("A"<=t&&t<="Z")return t.charCodeAt(0)-"A".charCodeAt(0)+10;switch(t){case" ":return 36;case"$":return 37;case"%":return 38;case"*":return 39;case"+":return 40;case"-":return 41;case".":return 42;case"/":return 43;case":":return 44;default:throw"illegal char :"+t}};return n},m=function(r){var e=f,n=t.stringToBytes(r),o={getMode:function(){return e},getLength:function(t){return n.length},write:function(t){for(var r=0;r<n.length;r+=1)t.put(n[r],8)}};return o},L=function(r){var e=c,n=t.stringToBytesFuncs.SJIS;if(!n)throw"sjis not supported.";!function(){var t=n("友");if(2!=t.length||38726!=(t[0]<<8|t[1]))throw"sjis not supported."}();var o=n(r),i={getMode:function(){return e},getLength:function(t){return~~(o.length/2)},write:function(t){for(var r=o,e=0;e+1<r.length;){var n=(255&r[e])<<8|255&r[e+1];if(33088<=n&&n<=40956)n-=33088;else{if(!(57408<=n&&n<=60351))throw"illegal char at "+(e+1)+"/"+n;n-=49472}n=192*(n>>>8&255)+(255&n),t.put(n,13),e+=2}if(e<r.length)throw"illegal char at "+(e+1)}};return i},D=function(){var t=[],r={writeByte:function(r){t.push(255&r)},writeShort:function(t){r.writeByte(t),r.writeByte(t>>>8)},writeBytes:function(t,e,n){e=e||0,n=n||t.length;for(var o=0;o<n;o+=1)r.writeByte(t[o+e])},writeString:function(t){for(var e=0;e<t.length;e+=1)r.writeByte(t.charCodeAt(e))},toByteArray:function(){return t},toString:function(){var r="";r+="[";for(var e=0;e<t.length;e+=1)e>0&&(r+=","),r+=t[e];return r+="]"}};return r},S=function(t){var r=t,e=0,n=0,o=0,i={read:function(){for(;o<8;){if(e>=r.length){if(0==o)return-1;throw"unexpected end of file./"+o}var t=r.charAt(e);if(e+=1,"="==t)return o=0,-1;t.match(/^\s$/)||(n=n<<6|a(t.charCodeAt(0)),o+=6)}var i=n>>>o-8&255;return o-=8,i}},a=function(t){if(65<=t&&t<=90)return t-65;if(97<=t&&t<=122)return t-97+26;if(48<=t&&t<=57)return t-48+52;if(43==t)return 62;if(47==t)return 63;throw"c:"+t};return i},I=function(t,r,e){for(var n=function(t,r){var e=t,n=r,o=new Array(t*r),i={setPixel:function(t,r,n){o[r*e+t]=n},write:function(t){t.writeString("GIF87a"),t.writeShort(e),t.writeShort(n),t.writeByte(128),t.writeByte(0),t.writeByte(0),t.writeByte(0),t.writeByte(0),t.writeByte(0),t.writeByte(255),t.writeByte(255),t.writeByte(255),t.writeString(","),t.writeShort(0),t.writeShort(0),t.writeShort(e),t.writeShort(n),t.writeByte(0);var r=a(2);t.writeByte(2);for(var o=0;r.length-o>255;)t.writeByte(255),t.writeBytes(r,o,255),o+=255;t.writeByte(r.length-o),t.writeBytes(r,o,r.length-o),t.writeByte(0),t.writeString(";")}},a=function(t){for(var r=1<<t,e=1+(1<<t),n=t+1,i=u(),a=0;a<r;a+=1)i.add(String.fromCharCode(a));i.add(String.fromCharCode(r)),i.add(String.fromCharCode(e));var f,c,g,l=D(),h=(f=l,c=0,g=0,{write:function(t,r){if(t>>>r!=0)throw"length over";for(;c+r>=8;)f.writeByte(255&(t<<c|g)),r-=8-c,t>>>=8-c,g=0,c=0;g|=t<<c,c+=r},flush:function(){c>0&&f.writeByte(g)}});h.write(r,n);var s=0,v=String.fromCharCode(o[s]);for(s+=1;s<o.length;){var d=String.fromCharCode(o[s]);s+=1,i.contains(v+d)?v+=d:(h.write(i.indexOf(v),n),i.size()<4095&&(i.size()==1<<n&&(n+=1),i.add(v+d)),v=d)}return h.write(i.indexOf(v),n),h.write(e,n),h.flush(),l.toByteArray()},u=function(){var t={},r=0,e={add:function(n){if(e.contains(n))throw"dup key:"+n;t[n]=r,r+=1},size:function(){return r},indexOf:function(r){return t[r]},contains:function(r){return void 0!==t[r]}};return e};return i}(t,r),o=0;o<r;o+=1)for(var i=0;i<t;i+=1)n.setPixel(i,o,e(i,o));var a=D();n.write(a);for(var u=function(){var t=0,r=0,e=0,n="",o={},i=function(t){n+=String.fromCharCode(a(63&t))},a=function(t){if(t<0);else{if(t<26)return 65+t;if(t<52)return t-26+97;if(t<62)return t-52+48;if(62==t)return 43;if(63==t)return 47}throw"n:"+t};return o.writeByte=function(n){for(t=t<<8|255&n,r+=8,e+=1;r>=6;)i(t>>>r-6),r-=6},o.flush=function(){if(r>0&&(i(t<<6-r),t=0,r=0),e%3!=0)for(var o=3-e%3,a=0;a<o;a+=1)n+="="},o.toString=function(){return n},o}(),f=a.toByteArray(),c=0;c<f.length;c+=1)u.writeByte(f[c]);return u.flush(),"data:image/gif;base64,"+u};return t}();qrcode.stringToBytesFuncs["UTF-8"]=function(t){return function(t){for(var r=[],e=0;e<t.length;e++){var n=t.charCodeAt(e);n<128?r.push(n):n<2048?r.push(192|n>>6,128|63&n):n<55296||n>=57344?r.push(224|n>>12,128|n>>6&63,128|63&n):(e++,n=65536+((1023&n)<<10|1023&t.charCodeAt(e)),r.push(240|n>>18,128|n>>12&63,128|n>>6&63,128|63&n))}return r}(t)}; return qrcode; })();

  /* ---------- parole (Element X / Orizon Android, nelle 23 lingue) ---------- */
  var DIZ = {"it":{"ka":"Avvia conversazione","k10":"Cerca qualcuno","k1f":"Nuova stanza","k2e":"Elenco delle stanze","k6":"Invita persone su %1$s","k32":"Accedi alla stanza tramite indirizzo","k12":"Suggerimenti","kf":"Nessun risultato","k11":"Risultati di ricerca","k31":"Si è verificato un errore durante il tentativo di avviare una chat","k22":"Nuova stanza","k5":"Crea","ke":"Nome","k21":"Aggiungi nome…","k2a":"Argomento (facoltativo)","k2b":"Aggiungi descrizione…","k27":"Chi ha accesso","k24":"Privato","k23":"Possono partecipare solo le persone invitate.","k26":"Pubblico","k25":"Chiunque può partecipare.","k29":"Indirizzo","k28":"Avrai bisogno di un indirizzo per renderlo visibile nella directory pubblica.","k20":"Si è verificato un errore durante la creazione della stanza","k15":"L'indirizzo di questa stanza esiste già. Prova a modificare il campo dell'indirizzo o a cambiare il nome della stanza","k16":"Alcuni caratteri non sono consentiti. Sono supportate solo lettere, cifre e i seguenti simboli ! $ & '() * +/; =? @ [] - . _","k8":"Ricerca","k1d":"Nessuna stanza pubblica","k1c":"Non c'è ancora nessuna stanza aperta a tutti. Creane una pubblica e comparirà qui.","k1e":"Nessuna stanza pubblica corrisponde a “%1$s”.","k1b":"Crea una stanza pubblica","k7":"Entra","k2d":"Caricamento fallito","kc":"Caricamento…","k1a":"Fai inquadrare il codice o manda il collegamento.","k9":"Condividi","k4":"Copia","kb":"Collegamento copiato negli appunti","k18":"🔐️ Unisciti a me su %1$s","k19":"Ehi, parliamo su %1$s: %2$s","k34":"Inserisci l'indirizzo…","k37":"es. #nome-stanza:4orizon.eu","k33":"Indirizzo non valido","k36":"Stanza non trovata","k35":"Stanza trovata","k3":"Continua","k0":"Indietro","k2":"Chiudi","kd":"Silenzia","k13":"Annulla silenzioso","k1":"Chiama","k14":"Video","k30":"Segna come non letto","k2f":"Segna come letto","k17":"Scegli una foto"},"en":{"ka":"Start chat","k10":"Search for someone","k1f":"New room","k2e":"Room directory","k6":"Invite people to %1$s","k32":"Join room by address","k12":"Suggestions","kf":"No results","k11":"Search results","k31":"An error occurred when trying to start a chat","k22":"New room","k5":"Create","ke":"Name","k21":"Add name…","k2a":"Topic (optional)","k2b":"Add description…","k27":"Who has access","k24":"Private","k23":"Only people invited can join.","k26":"Public","k25":"Anyone can join.","k29":"Address","k28":"You’ll need an address in order to make it visible in the public directory.","k20":"An error occurred when creating the room","k15":"This room address already exists. Please try editing the room address field or change the room name","k16":"Some characters are not allowed. Only letters, digits and the following symbols are supported ! $ & ‘ ( ) * + / ; = ? @ [ ] - . _","k8":"Search","k1d":"No public rooms","k1c":"There is no room open to everyone yet. Create a public one and it will show up here.","k1e":"No public room matches “%1$s”.","k1b":"Create a public room","k7":"Join","k2d":"Failed loading","kc":"Loading…","k1a":"Let them scan the code or send the link.","k9":"Share","k4":"Copy","kb":"Link copied to clipboard","k18":"🔐️ Join me on %1$s","k19":"Hey, talk to me on %1$s: %2$s","k34":"Enter address…","k37":"e.g. #room-name:4orizon.eu","k33":"Not a valid address","k36":"Room not found","k35":"Matching room found","k3":"Continue","k0":"Back","k2":"Close","kd":"Mute","k13":"Unmute","k1":"Call","k14":"Video","k30":"Mark as unread","k2f":"Mark as read","k17":"Choose a photo"},"de":{"ka":"Chat starten","k10":"Nach jemandem suchen","k1f":"Neuer Chat","k2e":"Chat-Verzeichnis","k6":"Lade Personen in %1$s ein","k32":"Chat per Adresse beitreten","k12":"Vorschläge","kf":"Keine Ergebnisse","k11":"Suchergebnisse","k31":"Beim Versuch, einen Chat zu starten, ist ein Fehler aufgetreten","k22":"Neue Gruppe","k5":"Erstellen","ke":"Name","k21":"Name hinzufügen…","k2a":"Thema (optional)","k2b":"Beschreibung hinzufügen…","k27":"Wer hat Zugang","k24":"Privat","k23":"Nur eingeladene Personen können beitreten.","k26":"Öffentlich","k25":"Alle können beitreten.","k29":"Adresse","k28":"Du benötigst eine Adresse, um diesen Chat im öffentlichen Verzeichnis sichtbar zu machen.","k20":"Beim Erstellen des Chats ist ein Fehler aufgetreten","k15":"Diese Chat-Adresse existiert bereits. Bitte bearbeite das Adressfeld des Chats oder ändere den Namen des Chats","k16":"Einige Zeichen sind nicht erlaubt. Es werden nur Buchstaben, Ziffern und die folgenden Symbole unterstützt: ! $ & ‘ ( ) * + / ; = ? @ [ ] - . _","k8":"Suchen","k1d":"Keine öffentlichen Räume","k1c":"Es gibt noch keinen Raum, der für alle offen ist. Erstelle einen öffentlichen, dann erscheint er hier.","k1e":"Kein öffentlicher Raum passt zu „%1$s“.","k1b":"Öffentlichen Raum erstellen","k7":"Beitreten","k2d":"Fehler beim Laden","kc":"Wird geladen …","k1a":"Lass den Code scannen oder schick den Link.","k9":"Teilen","k4":"Kopieren","kb":"Link in die Zwischenablage kopiert","k18":"🔐️ Begleite mich auf %1$s","k19":"Hey, sprich mit mir auf %1$s: %2$s","k34":"Chat Adresse eingeben …","k37":"z. B. #raumname:4orizon.eu","k33":"Keine gültige Adresse","k36":"Chat nicht gefunden","k35":"Passender Chat gefunden","k3":"Weiter","k0":"Zurück","k2":"Schließen","kd":"Stumm","k13":"Stummschaltung aufheben","k1":"Anruf","k14":"Video","k30":"Als ungelesen markieren","k2f":"Als gelesen markieren","k17":"Foto auswählen"},"fr":{"ka":"Démarrer une discussion","k10":"Rechercher quelqu’un","k1f":"Nouveau salon","k2e":"Annuaire des salons","k6":"Inviter des amis à %1$s","k32":"Saisir une adresse de salon","k12":"Suggestions","kf":"Aucun résultat","k11":"Résultats de la recherche","k31":"Une erreur s’est produite lors de la tentative de création de la discussion","k22":"Nouveau salon","k5":"Créer","ke":"Nom","k21":"Ajouter un nom…","k2a":"Sujet (facultatif)","k2b":"Ajouter une description…","k27":"Qui a accès","k24":"Privé","k23":"Seules les personnes invitées peuvent joindre.","k26":"Public","k25":"Tout le monde peut joindre","k29":"Adresse","k28":"Vous aurez besoin d’une adresse pour qu’il soit visible dans le répertoire public.","k20":"Une erreur s’est produite lors de la création du salon","k15":"Cette adresse de salon existe déjà, veuillez essayer de modifier le champ d’adresse de salon ou de modifier le nom du salon","k16":"Certains caractères ne sont pas autorisés. Seuls les lettres, les chiffres et les symboles suivants sont utilisables ! $ & ‘ ( ) * + / ; = ? @ [ ] - . _","k8":"Rechercher","k1d":"Aucun salon public","k1c":"Il n'y a encore aucun salon ouvert à tous. Créez-en un public et il apparaîtra ici.","k1e":"Aucun salon public ne correspond à « %1$s ».","k1b":"Créer un salon public","k7":"Rejoindre","k2d":"Échec du chargement","kc":"Chargement…","k1a":"Faites scanner le code ou envoyez le lien.","k9":"Partager","k4":"Copier","kb":"Lien copié dans le presse-papiers","k18":"🔐️ Rejoignez-moi sur %1$s","k19":"Salut, parle-moi sur %1$s : %2$s","k34":"Adresse du salon…","k37":"ex. #nom-du-salon:4orizon.eu","k33":"Ce n’est pas une adresse valide","k36":"Salon non trouvé","k35":"Ce salon existe","k3":"Continuer","k0":"Retour","k2":"Fermer","kd":"Mettre en sourdine","k13":"Retirer la sourdine","k1":"Appel","k14":"Vidéo","k30":"Marquer comme non lu","k2f":"Marquer comme lu","k17":"Choisir une photo"},"es":{"ka":"Iniciar chat","k10":"Buscar a alguien","k1f":"Nueva sala","k2e":"Directorio de salas","k6":"Invita a alguien a %1$s","k32":"Unirse a una sala por su dirección","k12":"Sugerencias","kf":"No hay resultados","k11":"Buscar resultados","k31":"Se ha producido un error al intentar iniciar un chat","k22":"Nueva sala","k5":"Crear","ke":"Nombre","k21":"Añadir nombre…","k2a":"Tema (opcional)","k2b":"Añadir descripción…","k27":"Quién tiene acceso","k24":"Privado","k23":"Solo las personas invitadas pueden unirse.","k26":"Público","k25":"Cualquiera puede unirse.","k29":"Dirección","k28":"Necesitarás una dirección de sala para que sea visible en el directorio de salas públicas.","k20":"Se ha producido un error al crear la sala","k15":"Esta dirección de sala ya existe. Intenta editar el campo de dirección de sala o cambia el nombre de la sala","k16":"No se permiten algunos caracteres. Solo se admiten letras, dígitos y los siguientes símbolos ! $ & ‘ ( ) * + / ; = ? @ [ ] - . _","k8":"Buscar","k1d":"No hay salas públicas","k1c":"Todavía no hay ninguna sala abierta a todos. Crea una pública y aparecerá aquí.","k1e":"Ninguna sala pública coincide con «%1$s».","k1b":"Crear una sala pública","k7":"Unirse","k2d":"Carga fallida","kc":"Cargando…","k1a":"Deja que escaneen el código o envía el enlace.","k9":"Compartir","k4":"Copiar","kb":"Enlace copiado al portapapeles","k18":"🔐️ Únete a mí en %1$s","k19":"Hola, puedes hablar conmigo en %1$s: %2$s","k34":"Introducir dirección…","k37":"p. ej. #nombre-de-sala:4orizon.eu","k33":"Dirección no válida","k36":"No se encontró la sala","k35":"Sala encontrada","k3":"Continuar","k0":"Atrás","k2":"Cerrar","kd":"Silenciar","k13":"Dejar de silenciar","k1":"Llamar","k14":"Vídeo","k30":"Marcar como no leído","k2f":"Marcar como leído","k17":"Elegir una foto"},"pt":{"ka":"Iniciar conversa","k10":"Pesquisar por alguém","k1f":"Nova sala","k2e":"Diretório de salas","k6":"Convidar amigos para %1$s","k32":"Entrar na sala pelo endereço","k12":"Sugestões","kf":"Sem resultados","k11":"Resultados da pesquisa","k31":"Ocorreu um erro ao tentar iniciar uma conversa","k5":"Criar","k2a":"Descrição (opcional)","k25":"Qualquer pessoa pode entrar.","k29":"Endereço","k28":"Para que esta sala seja visível no diretório público, precisa de ter um endereço.","k20":"Ocorreu um erro ao criar a sala","k15":"Este endereço de sala já existe, tente editar o campo de endereço da sala ou altere o nome da sala","k16":"Alguns caracteres não são permitidos. Apenas letras, dígitos e os seguintes símbolos são suportados! $ & ‘ ( ) * + / ; = ? @ [ ] - . _","k8":"Pesquisar","k1d":"Nenhuma sala pública","k1c":"Ainda não há nenhuma sala aberta a todos. Cria uma pública e ela aparecerá aqui.","k1e":"Nenhuma sala pública corresponde a “%1$s”.","k1b":"Criar uma sala pública","k7":"Entrar","k2d":"Falha ao carregar","kc":"A carregar…","k1a":"Deixa digitalizar o código ou envia a ligação.","k9":"Partilhar","k4":"Copiar","kb":"Ligação copiada para a área de transferência","k18":"🔐️ Junta-te a mim na %1$s","k19":"Alô! Fala comigo na %1$s: %2$s","k34":"Entrar…","k37":"ex.: #nome-da-sala:4orizon.eu","k33":"Não é um endereço válido","k36":"Sala não encontrada","k35":"Sala correspondente encontrado","k3":"Continuar","k0":"Voltar","k2":"Fechar","kd":"Silenciar","k13":"Dessilenciar","k1":"Chamar","k14":"Vídeo","k30":"Marcar como não lida","k2f":"Marcar como lida","k22":"Nova sala","ke":"Nome","k21":"Adicionar nome…","k2b":"Adicionar descrição…","k27":"Quem tem acesso","k24":"Privada","k23":"Só as pessoas convidadas podem entrar.","k26":"Pública","k17":"Escolher uma foto"},"nl":{"ka":"Chat starten","k10":"Iemand zoeken","k1f":"Nieuwe kamer","k2e":"Kamergids","k6":"Nodig mensen uit voor %1$s","k12":"Suggesties","kf":"Geen resultaten","k11":"Zoekresultaten","k31":"Er is een fout opgetreden bij het starten van een chat","k5":"Aanmaken","k2a":"Onderwerp (optioneel)","k24":"Privé","k26":"Openbaar","k25":"Iedereen kan toetreden tot deze kamer","k20":"Er is een fout opgetreden bij het aanmaken van de kamer","k8":"Zoeken","k1d":"Geen openbare kamers","k1c":"Er is nog geen kamer die voor iedereen open is. Maak een openbare kamer en die verschijnt hier.","k1e":"Geen openbare kamer komt overeen met ‘%1$s’.","k1b":"Openbare kamer maken","k7":"Deelnemen","k2d":"Laden mislukt","kc":"Laden…","k1a":"Laat de code scannen of stuur de link.","k9":"Delen","k4":"Kopiëren","kb":"Link gekopieerd naar klembord","k18":"🔐️ Sluit je bij mij aan op %1$s","k19":"Hé, praat met me op %1$s: %2$s","k37":"bijv. #kamernaam:4orizon.eu","k3":"Voortzetten","k0":"Terug","k2":"Sluiten","kd":"Dempen","k13":"Dempen opheffen","k1":"Bellen","k14":"Video","k30":"Markeren als ongelezen","k2f":"Markeren als gelezen","k32":"Deelnemen aan kamer via adres","k22":"Nieuwe kamer","ke":"Naam","k21":"Naam toevoegen…","k2b":"Beschrijving toevoegen…","k27":"Wie heeft toegang","k23":"Alleen uitgenodigde personen kunnen deelnemen.","k29":"Adres","k28":"Je hebt een adres nodig om de kamer zichtbaar te maken in de openbare gids.","k15":"Dit kameradres bestaat al. Pas het adres of de naam van de kamer aan","k16":"Sommige tekens zijn niet toegestaan. Alleen letters, cijfers en de volgende symbolen worden ondersteund ! $ & ' ( ) * + / ; = ? @ [ ] - . _","k34":"Adres invoeren…","k33":"Geen geldig adres","k36":"Kamer niet gevonden","k35":"Kamer gevonden","k17":"Kies een foto"},"pl":{"ka":"Rozpocznij chat","k10":"Szukaj osób","k1f":"Nowy pokój","k2e":"Katalog pokoi","k6":"Zaproś znajomych do %1$s","k32":"Dołącz do pokoju za pomocą adresu","k12":"Sugestie","kf":"Brak wyników","k11":"Wyniki wyszukiwania","k31":"Wystąpił błąd podczas próby rozpoczęcia czatu","k22":"Nowy pokój","k5":"Utwórz","ke":"Nazwa","k21":"Dodaj nazwę…","k2a":"Temat (opcjonalnie)","k2b":"Dodaj opis…","k27":"Kto ma dostęp","k24":"Prywatny","k23":"Dołączyć mogą tylko zaproszone osoby.","k26":"Publiczny","k25":"Każdy może dołączyć, w tym osoby spoza Twojej organizacji.","k29":"Adres","k28":"Aby ten pokój był widoczny w katalogu pomieszczeń publicznych, potrzebny jest adres pokoju.","k20":"Wystąpił błąd w trakcie tworzenia pokoju","k15":"Ten adres pokoju już istnieje. Spróbuj zmienić adres lub nazwę pokoju","k16":"Niektóre znaki są niedozwolone. Obsługiwane są tylko litery, cyfry i następujące symbole ! $ & ‘ ( ) * + / ; = ? @ [ ] - . _","k8":"Szukaj","k1d":"Brak pokojów publicznych","k1c":"Nie ma jeszcze żadnego pokoju otwartego dla wszystkich. Utwórz publiczny, a pojawi się tutaj.","k1e":"Żaden pokój publiczny nie pasuje do „%1$s”.","k1b":"Utwórz pokój publiczny","k7":"Dołącz","k2d":"Błąd wczytywania","kc":"Ładowanie…","k1a":"Pozwól zeskanować kod albo wyślij link.","k9":"Udostępnij","k4":"Kopiuj","kb":"Link został skopiowany do schowka","k18":"🔐️ Dołącz do mnie na %1$s","k19":"Hej, porozmawiajmy na %1$s: %2$s","k34":"Wprowadź adres…","k37":"np. #nazwa-pokoju:4orizon.eu","k33":"Nieprawidłowy adres","k36":"Nie znaleziono pokoju","k35":"Znaleziono pasujący pokój","k3":"Kontynuuj","k0":"Wróć","k2":"Zamknij","kd":"Wycisz","k13":"Wyłącz wyciszenie","k1":"Zadzwoń","k14":"Wideo","k30":"Oznacz jako nieprzeczytane","k2f":"Oznacz jako przeczytane","k17":"Wybierz zdjęcie"},"sv":{"ka":"Starta chat","k10":"Sök efter någon","k1f":"Nytt rum","k2e":"Rumskatalog","k6":"Bjud in personer till %1$s","k32":"Gå med i rum med adress","k12":"Förslag","kf":"Inga resultat","k11":"Sökresultat","k31":"Ett fel uppstod när du försökte starta en chatt","k5":"Skapa","k2a":"Ämne (valfritt)","k25":"Vem som helst kan gå med.","k29":"Adress","k28":"Du behöver en adress för att den ska synas i den offentliga katalogen.","k20":"Ett fel uppstod när rummet skapades","k15":"Den här rumsadressen finns redan. Försök att redigera adressfältet för rummet eller ändra rummets namn","k16":"Vissa tecken är inte tillåtna. Endast bokstäver, siffror och följande symboler stöds ! $ & ‘ ( ) * + / ; = ? @ [ ] - . _","k8":"Sök","k1d":"Inga offentliga rum","k1c":"Det finns inget rum som är öppet för alla än. Skapa ett offentligt så visas det här.","k1e":"Inget offentligt rum matchar ”%1$s”.","k1b":"Skapa ett offentligt rum","k7":"Gå med","k2d":"Misslyckades att ladda","kc":"Laddar …","k1a":"Låt dem skanna koden eller skicka länken.","k9":"Dela","k4":"Kopiera","kb":"Länk kopierad till klippbordet","k18":"🔐️ Häng med mig på %1$s","k19":"Hallå, prata med mig på %1$s: %2$s","k34":"Ange …","k37":"t.ex. #rumsnamn:4orizon.eu","k33":"Inte en giltig adress","k36":"Rummet hittades inte","k35":"Matchande rum hittades","k3":"Fortsätt","k0":"Tillbaka","k2":"Stäng","kd":"Tysta","k13":"Avtysta","k1":"Ring","k14":"Video","k30":"Markera som oläst","k2f":"Markera som läst","k22":"Nytt rum","ke":"Namn","k21":"Lägg till namn…","k2b":"Lägg till beskrivning…","k27":"Vem har åtkomst","k24":"Privat","k23":"Endast inbjudna personer kan gå med.","k26":"Offentligt","k17":"Välj ett foto"},"da":{"ka":"Start samtale","k10":"Søg efter nogen","k1f":"Nyt rum","k2e":"Register over rum","k6":"Invitér andre til %1$s","k32":"Tilslut dig rummet med adressen","k12":"Forslag","kf":"Ingen resultater","k11":"Søgeresultater","k31":"Der opstod en fejl under forsøget på at starte en samtale","k22":"Nyt rum","k5":"Opret","ke":"Navn","k21":"Tilføj navn…","k2a":"Emne (valgfrit)","k2b":"Tilføj beskrivelse…","k27":"Hvem har adgang","k24":"Privat","k23":"Kun inviterede brugere kan deltage.","k26":"Offentlig","k25":"Alle kan deltage.","k29":"Adresse","k28":"Hvis dette rum skal være synligt i det offentlige register, skal du bruge en adresse.","k20":"Der opstod en fejl ved oprettelsen af rummet","k15":"Denne rumadresse er allerede taget. Prøv at redigere rummets adressefelt eller at skifte rummets navn","k16":"Nogle tegn er ikke tilladt. Kun bogstaver, cifre og følgende symboler understøttes! $ & '() * +/; =? @ [] - . _","k8":"Søg","k1d":"Ingen offentlige rum","k1c":"Der er endnu intet rum, der er åbent for alle. Opret et offentligt, så vises det her.","k1e":"Intet offentligt rum matcher “%1$s”.","k1b":"Opret et offentligt rum","k7":"Deltag","k2d":"Indlæsning mislykkedes","kc":"Indlæser…","k1a":"Lad dem scanne koden, eller send linket.","k9":"Del","k4":"Kopiér","kb":"Linket er kopieret til udklipsholderen","k18":"🔐️ Kom med mig til %1$s","k19":"Hej, lad os snakkes på %1$s: %2$s","k34":"Indtast…","k37":"f.eks. #rumnavn:4orizon.eu","k33":"Ikke en gyldig adresse","k36":"Rum ikke fundet","k35":"Matchende rum fundet","k3":"Fortsæt","k0":"Tilbage","k2":"Luk","kd":"Lydløs","k13":"Slå lyden til","k1":"Opkald","k14":"Video","k30":"Marker som ulæst","k2f":"Marker som læst","k17":"Vælg et billede"},"fi":{"ka":"Aloita keskustelu","k10":"Etsi jotakuta","k1f":"Uusi huone","k2e":"Huoneluettelo","k6":"Kutsu ihmisiä %1$s -sovellukseen","k32":"Liity huoneeseen osoitteella","k12":"Ehdotukset","kf":"Ei tuloksia","k11":"Hakutulokset","k31":"Keskustelun aloituksessa tapahtui virhe","k22":"Uusi huone","k5":"Luo","ke":"Nimi","k21":"Lisää nimi…","k2a":"Aihe (valinnainen)","k2b":"Lisää kuvaus…","k27":"Kenellä on pääsy","k24":"Yksityinen","k23":"Vain kutsutut henkilöt voivat liittyä.","k26":"Julkinen","k25":"Kuka tahansa voi liittyä.","k29":"Osoite","k28":"Jotta tämä näkyisi julkisessa hakemistossa, tarvitset osoitteen.","k20":"Huoneen luomisessa tapahtui virhe","k15":"Tämä huoneen osoite on jo käytössä, yritä muokata huoneen osoitekenttää tai muuta huoneen nimeä","k16":"Jotkin merkit eivät ole sallittuja. Vain kirjaimet, numerot ja seuraavat symbolit ovat tuettuja ! $ & ‘ ( ) * + / ; = ? @ [ ] - . _","k8":"Hae","k1d":"Ei julkisia huoneita","k1c":"Kaikille avoimia huoneita ei vielä ole. Luo julkinen huone, niin se näkyy täällä.","k1e":"Mikään julkinen huone ei vastaa hakua ”%1$s”.","k1b":"Luo julkinen huone","k7":"Liity","k2d":"Lataus epäonnistui","kc":"Ladataan…","k1a":"Anna skannata koodi tai lähetä linkki.","k9":"Jaa","k4":"Kopioi","kb":"Linkki kopioitu leikepöydälle","k18":"🔐️ Liity seuraani %1$s -sovelluksessa","k19":"Hei, keskustele kanssani %1$s -sovelluksessa: %2$s","k34":"Kirjoita osoite…","k37":"esim. #huoneen-nimi:4orizon.eu","k33":"Osoite ei ole kelvollinen","k36":"Huonetta ei löytynyt","k35":"Täsmäävä huone löytyi","k3":"Jatka","k0":"Takaisin","k2":"Sulje","kd":"Mykistä","k13":"Poista mykistys","k1":"Soita","k14":"Video","k30":"Merkitse lukemattomaksi","k2f":"Merkitse luetuksi","k17":"Valitse kuva"},"cs":{"ka":"Zahájit chat","k10":"Hledat někoho","k1f":"Nová místnost","k2e":"Adresář místností","k6":"Pozvat přátele do %1$s","k32":"Vstoupit do místnosti pomocí adresy","k12":"Návrhy","kf":"Žádné výsledky","k11":"Výsledky hledání","k31":"Při pokusu o zahájení chatu došlo k chybě","k22":"Nová místnost","k5":"Vytvořit","ke":"Název","k21":"Přidat název…","k2a":"Téma (nepovinné)","k2b":"Přidat popis…","k27":"Kdo má přístup","k24":"Soukromé","k23":"Vstoupit mohou pouze pozvaní lidé.","k26":"Veřejné","k25":"Vstoupit může kdokoli.","k29":"Adresa","k28":"Budete potřebovat adresu, aby se zobrazovala ve veřejném adresáři.","k20":"Při vytváření místnosti došlo k chybě","k15":"Tato adresa místnosti již existuje, zkuste prosím upravit pole adresy místnosti nebo změnit název místnosti","k16":"Některé znaky nejsou povoleny. Podporovány jsou pouze písmena, číslice a následující symboly ! $ & ‘ ( ) * + / ; = ? @ [ ] - . _","k8":"Hledat","k1d":"Žádné veřejné místnosti","k1c":"Zatím tu není žádná místnost otevřená všem. Vytvořte veřejnou a objeví se tady.","k1e":"Žádná veřejná místnost neodpovídá „%1$s“.","k1b":"Vytvořit veřejnou místnost","k7":"Vstoupit","k2d":"Načítání se nezdařilo","kc":"Načítání…","k1a":"Nechte naskenovat kód nebo pošlete odkaz.","k9":"Sdílet","k4":"Kopírovat","kb":"Odkaz zkopírován do schránky","k18":"🔐️ Připojte se ke mně na %1$s","k19":"Ahoj, ozvi se mi na %1$s: %2$s","k34":"Zadejte…","k37":"např. #nazev-mistnosti:4orizon.eu","k33":"Neplatná adresa","k36":"Místnost nebyla nalezena","k35":"Odpovídající místnost nalezena","k3":"Pokračovat","k0":"Zpět","k2":"Zavřít","kd":"Ztlumit","k13":"Zrušit ztlumení","k1":"Hovor","k14":"Video","k30":"Označit jako nepřečtené","k2f":"Označit jako přečtené","k17":"Vybrat fotku"},"sk":{"ka":"Začať konverzáciu","k10":"Vyhľadať niekoho","k1f":"Nová miestnosť","k2e":"Adresár miestností","k6":"Pozvať ľudí do %1$s","k32":"Pripojte sa do miestnosti podľa adresy","k12":"Návrhy","kf":"Žiadne výsledky","k11":"Výsledky hľadania","k31":"Pri pokuse o spustenie konverzácie sa vyskytla chyba","k22":"Nová miestnosť","k5":"Vytvoriť","ke":"Meno","k21":"Pridať názov…","k2a":"Téma (voliteľné)","k2b":"Pridať popis…","k27":"Kto má prístup","k23":"Pripojiť sa môžu iba pozvaní ľudia.","k25":"Pripojiť sa môže ktokoľvek.","k29":"Adresa","k28":"Aby bola táto miestnosť viditeľná v adresári verejných miestností, budete potrebovať adresu miestnosti.","k20":"Pri vytváraní miestnosti došlo k chybe","k15":"Táto adresa miestnosti už existuje, skúste upraviť pole adresy miestnosti alebo zmeňte názov miestnosti","k16":"Niektoré znaky nie sú povolené. Podporované sú iba písmená, číslice a nasledujúce symboly ! $ & '() * +/; =? @ [] - . _","k8":"Hľadať","k1d":"Žiadne verejné miestnosti","k1c":"Zatiaľ tu nie je žiadna miestnosť otvorená pre všetkých. Vytvorte verejnú a zobrazí sa tu.","k1e":"Žiadna verejná miestnosť nezodpovedá „%1$s“.","k1b":"Vytvoriť verejnú miestnosť","k7":"Pripojiť sa","k2d":"Načítanie zlyhalo","kc":"Načítava sa…","k1a":"Nechajte naskenovať kód alebo pošlite odkaz.","k9":"Zdieľať","k4":"Kopírovať","kb":"Odkaz bol skopírovaný do schránky","k18":"🔐️ Pripojte sa ku mne na %1$s","k19":"Ahoj, porozprávajte sa so mnou na %1$s: %2$s","k34":"Zadajte…","k37":"napr. #nazov-miestnosti:4orizon.eu","k33":"Neplatná adresa","k36":"Miestnosť sa nenašla","k35":"Nájdená zodpovedajúca miestnosť","k3":"Pokračovať","k0":"Späť","k2":"Zavrieť","kd":"Stlmiť","k13":"Zrušiť stlmenie zvuku","k1":"Zavolať","k14":"Video","k30":"Označiť ako neprečítané","k2f":"Označiť ako prečítané","k24":"Súkromná","k26":"Verejná","k17":"Vybrať fotku"},"hu":{"ka":"Csevegés indítása","k10":"Személy keresése","k1f":"Új szoba","k2e":"Szobakatalógus","k6":"Ismerősök meghívása ide: %1$s","k32":"Csatlakozás a szobához cím szerint","k12":"Javaslatok","kf":"Nincs találat","k11":"Keresési találatok","k31":"Hiba történt a csevegés indításakor","k22":"Új szoba","k5":"Létrehozás","ke":"Név","k21":"Név hozzáadása…","k2a":"Téma (nem kötelező)","k2b":"Leírás hozzáadása…","k27":"Hozzáférésre jogosultak","k24":"Privát","k23":"Csak a meghívottak léphetnek be.","k26":"Nyilvános","k25":"Bárki csatlakozhat.","k29":"Cím","k28":"Ahhoz, hogy ez a szoba látható legyen a nyilvános szobák címtárában, meg kell adnia a szoba címét.","k20":"Hiba történt a szoba létrehozásakor","k15":"Ez a szobacím már létezik. Próbálja meg szerkeszteni a szobacím mezőt, vagy módosítsa a szoba nevét.","k16":"Egyes karakterek nem engedélyezettek. Csak a betűk, a számjegyek és a következő szimbólumok támogatottak: $ & '() * +/; =? @ [] - . _","k8":"Keresés","k1d":"Nincsenek nyilvános szobák","k1c":"Még nincs mindenki számára nyitott szoba. Hozz létre egy nyilvánosat, és itt fog megjelenni.","k1e":"Egyetlen nyilvános szoba sem felel meg ennek: „%1$s”.","k1b":"Nyilvános szoba létrehozása","k7":"Csatlakozás","k2d":"Sikertelen betöltés","kc":"Betöltés…","k1a":"Olvastasd be a kódot, vagy küldd el a linket.","k9":"Megosztás","k4":"Másolás","kb":"Hivatkozás a vágólapra másolva","k18":"🔐️ Csatlakozz hozzám itt: %1$s","k19":"Beszélgessünk itt: %1$s, %2$s","k34":"Cím megadása…","k37":"pl. #szoba-neve:4orizon.eu","k33":"Nem érvényes cím","k36":"Szoba nem található","k35":"Megfelelő szoba található","k3":"Folytatás","k0":"Vissza","k2":"Bezárás","kd":"Némítás","k13":"Némítás feloldása","k1":"Hívás","k14":"Videó","k30":"Megjelölés olvasatlanként","k2f":"Megjelölés olvasottként","k17":"Fotó kiválasztása"},"ro":{"ka":"Începeți discuția","k10":"Căutați pe cineva","k1f":"Cameră nouă","k2e":"Director de camere","k6":"Invitați prieteni în %1$s","k32":"Gasiți o cameră după adresă","k12":"Sugestii","kf":"Niciun rezultat","k11":"Rezultatele căutării","k31":"A apărut o eroare la încercarea începerii conversației","k22":"Cameră nouă","k5":"Creați","ke":"Nume","k21":"Adăugați un nume…","k2a":"Subiect (opțional)","k2b":"Adăugați o descriere…","k27":"Cine are acces","k24":"Privat","k23":"Doar persoanele invitate se pot alătura.","k26":"Public","k25":"Oricine se poate alătura acestei camere","k29":"Adresă","k28":"Pentru ca această cameră să fie vizibilă în directorul de camere publice, veți avea nevoie de o adresă de cameră.","k20":"A apărut o eroare la crearea camerei","k15":"Această adresă de cameră există deja. Încercați să editați câmpul adresei camerei sau să schimbați numele camerei.","k16":"Unele caractere nu sunt permise. Sunt acceptate doar literele, cifrele și următoarele simboluri ! $ & ‘ ( ) * + / ; = ? @ [ ] - . _","k8":"Căutați","k1d":"Nicio cameră publică","k1c":"Încă nu există nicio cameră deschisă tuturor. Creează una publică și va apărea aici.","k1e":"Nicio cameră publică nu corespunde cu „%1$s”.","k1b":"Creează o cameră publică","k7":"Alăturați-vă","k2d":"Încărcare eșuată","kc":"Se încarcă…","k1a":"Lasă-i să scaneze codul sau trimite linkul.","k9":"Partajați","k4":"Copiați","kb":"Linkul a fost copiat în clipboard","k18":"🔐️ Alăturați-vă mie în %1$s","k19":"Hei, vorbește cu mine pe %1$s: %2$s","k34":"Introduceți adresa…","k37":"ex. #nume-camera:4orizon.eu","k33":"Adresa nu e este validă","k36":"Nu a putut fi găsită nici o cameră","k35":"S-a găsit o cameră","k3":"Continuați","k0":"Înapoi","k2":"Închideți","kd":"Dezactivare sunet","k13":"Activare sunet","k1":"Apelați","k14":"Video","k30":"Marcați ca necitită","k2f":"Marcați ca citită","k17":"Alege o fotografie"},"bg":{"ka":"Започване на чат","k10":"Търсене на някого","k1f":"Нова стая","k6":"Поканване на хора в %1$s","k32":"Присъединяване към стая по адрес","k12":"Предложения","kf":"Няма резултати","k11":"Резултати от търсенето","k31":"Възникна грешка при опита за започване на чат","k5":"Създаване","k2a":"Тема за разговор (незадължително)","k25":"Всеки може да се присъедини.","k28":"За да бъде тази стая видима в директорията на общодостъпните стаи, ще ви е необходим адрес на стаята.","k20":"Възникна грешка при създаването на стаята","k8":"Търсене","k1d":"Няма публични стаи","k1c":"Все още няма стая, отворена за всички. Създайте публична и тя ще се появи тук.","k1e":"Няма публична стая, отговаряща на „%1$s“.","k1b":"Създаване на публична стая","k7":"Присъединяване","kc":"Зарежда се…","k1a":"Нека сканират кода или изпратете връзката.","k9":"Споделяне","k4":"Копиране","kb":"Връзката е копирана в клипборда","k18":"🔐️ Присъединете се към мен в %1$s","k19":"Хей, говорете с мен в %1$s: %2$s","k34":"Въведете…","k37":"напр. #име-на-стая:4orizon.eu","k33":"Не е валиден адрес","k36":"Стаята не е намерена","k3":"Продължаване","k0":"Назад","k2":"Затваряне","kd":"Заглушаване","k13":"Раззаглушаване","k1":"Обаждане","k14":"Видео","k30":"Отбелязване като непрочетено","k2f":"Отбелязване като прочетено","k2e":"Списък със стаи","k22":"Нова стая","ke":"Име","k21":"Добавете име…","k2b":"Добавете описание…","k27":"Кой има достъп","k24":"Частна","k23":"Могат да влизат само поканените.","k26":"Публична","k29":"Адрес","k15":"Този адрес на стая вече съществува. Променете адреса или името на стаята","k16":"Някои знаци не са позволени. Позволени са само букви, цифри и следните символи ! $ & ' ( ) * + / ; = ? @ [ ] - . _","k2d":"Неуспешно зареждане","k35":"Стаята е намерена","k17":"Изберете снимка"},"el":{"ka":"Έναρξη συνομιλίας","k10":"Αναζήτησε κάποιον","k1f":"Νέα αίθουσα","k2e":"Κατάλογος αιθουσών","k6":"Πρόσκληση ατόμων στο %1$s","k32":"Συμμετοχή σε αίθουσα μέσω διεύθυνσης","k12":"Προτάσεις","kf":"Κανένα αποτέλεσμα","k11":"Αποτελέσματα αναζήτησης","k31":"Παρουσιάστηκε σφάλμα κατά την προσπάθεια έναρξης μιας συνομιλίας","k22":"Νέα αίθουσα","k5":"Δημιουργία","ke":"Όνομα","k21":"Προσθήκη ονόματος…","k2a":"Θέμα (προαιρετικό)","k2b":"Προσθήκη περιγραφής…","k27":"Ποιος έχει πρόσβαση","k24":"Ιδιωτικό","k23":"Μόνο άτομα που έχουν προσκληθεί μπορούν να συμμετάσχουν.","k26":"Δημόσιο","k25":"Οποιοσδήποτε μπορεί να συμμετάσχει.","k29":"Διεύθυνση δωματίου","k28":"Θα χρειαστείτε μια διεύθυνση για να την κάνετε ορατή στον δημόσιο κατάλογο.","k20":"Προέκυψε σφάλμα κατά τη δημιουργία της αίθουσας","k15":"Αυτή η διεύθυνση αίθουσας υπάρχει ήδη. Παρακαλώ δοκιμάστε να επεξεργαστείτε το πεδίο διεύθυνσης αίθουσας ή αλλάξτε το όνομα της αίθουσας","k16":"Ορισμένοι χαρακτήρες δεν επιτρέπονται. Υποστηρίζονται μόνο γράμματα, ψηφία και τα ακόλουθα σύμβολα ! $ & '() * +/; = ? @ [] - . _","k8":"Αναζήτηση","k1d":"Δεν υπάρχουν δημόσια δωμάτια","k1c":"Δεν υπάρχει ακόμα δωμάτιο ανοιχτό σε όλους. Δημιουργήστε ένα δημόσιο και θα εμφανιστεί εδώ.","k1e":"Κανένα δημόσιο δωμάτιο δεν ταιριάζει με «%1$s».","k1b":"Δημιουργία δημόσιου δωματίου","k7":"Συμμετοχή","k2d":"Αποτυχία φόρτωσης","kc":"Φόρτωση…","k1a":"Αφήστε τους να σαρώσουν τον κωδικό ή στείλτε τον σύνδεσμο.","k9":"Κοινή χρήση","k4":"Αντιγραφή","kb":"Ο σύνδεσμος αντιγράφηκε στο πρόχειρο","k18":"🔐️ Έλα μαζί μου στο %1$s","k19":"Γεια, μίλα μου στην εφαρμογή %1$s :%2$s","k34":"Εισαγάγετε διεύθυνση…","k37":"π.χ. #onoma-domatiou:4orizon.eu","k33":"Μη έγκυρη διεύθυνση","k36":"Η αίθουσα δεν βρέθηκε","k35":"Βρέθηκε η αντίστοιχη αίθουσα","k3":"Συνέχεια","k0":"Πίσω","k2":"Κλείσιμο","kd":"Σίγαση","k13":"Άρση σίγασης","k1":"Κάλεσε","k14":"Βίντεο","k30":"Επισήμανση ως μη αναγνωσμένου","k2f":"Επισήμανση ως αναγνωσμένου","k17":"Επιλογή φωτογραφίας"},"hr":{"ka":"Započni razgovor","k10":"Potraži nekoga","k1f":"Nova soba","k2e":"Direktorij soba","k6":"Pozovi osobe u %1$s","k32":"Pridruži se sobi putem adrese","k12":"Prijedlozi","kf":"Nema rezultata","k11":"Rezultati pretraživanja","k31":"Došlo je do pogreške prilikom pokretanja razgovora","k22":"Nova soba","k5":"Stvori","ke":"Naziv","k21":"Dodaj ime…","k2a":"Tema (neobavezno)","k2b":"Dodaj opis…","k27":"Tko ima pristup","k24":"Privatno","k23":"Samo pozvane osobe mogu pristupiti ovoj sobi. Sve su poruke sveobuhvatno šifrirane.","k26":"Javno","k25":"Svatko se može pridružiti.","k29":"Adresa","k28":"Da bi ova soba bila vidljiva u javnom direktoriju soba, trebat će vam adresa sobe.","k20":"Došlo je do pogreške prilikom stvaranja sobe","k15":"Ova adresa sobe već postoji. Pokušajte urediti polje za adresu sobe ili promijeniti naziv sobe","k16":"Neki znakovi nisu dopušteni. Podržana su samo slova, brojke i simboli ! $ & ‘ ( ) * + / ; = ? @ [ ] - . _","k8":"Pretraži","k1d":"Nema javnih soba","k1c":"Još nema sobe otvorene svima. Stvorite javnu i pojavit će se ovdje.","k1e":"Nijedna javna soba ne odgovara „%1$s”.","k1b":"Stvori javnu sobu","k7":"Pridruži se","k2d":"Učitavanje nije uspjelo","kc":"Učitavanje…","k1a":"Neka skeniraju kôd ili pošaljite poveznicu.","k9":"Podijeli","k4":"Kopiraj","kb":"Poveznica je kopirana u međuspremnik.","k18":"🔐️ Pridruži mi se u %1$s","k19":"Hej, razgovaraj sa mnom u aplikaciji %1$s: %2$s","k34":"Unesite adresu…","k37":"npr. #naziv-sobe:4orizon.eu","k33":"Adresa nije valjana","k36":"Soba nije pronađena","k35":"Pronađena je odgovarajuća soba","k3":"Nastavi","k0":"Natrag","k2":"Zatvori","kd":"Isključi zvuk","k13":"Uključi zvuk","k1":"Poziv","k14":"Videozapis","k30":"Označi kao nepročitano","k2f":"Označi kao pročitano","k17":"Odaberi fotografiju"},"sl":{"ka":"Začni klepet","k10":"Poišči nekoga","k1f":"Nova soba","k2e":"Imenik sob","k6":"Povabi ljudi v %1$s","k32":"Pridruži se sobi prek naslova","k12":"Predlogi","kf":"Ni rezultatov","k11":"Rezultati iskanja","k31":"Pri začenjanju klepeta je prišlo do napake","k22":"Nova soba","k5":"Ustvari","ke":"Ime","k21":"Dodaj ime…","k2a":"Tema (neobvezno)","k2b":"Dodaj opis…","k27":"Kdo ima dostop","k24":"Zasebna","k23":"Pridružijo se lahko samo povabljeni.","k26":"Javna","k25":"Pridruži se lahko kdorkoli.","k29":"Naslov","k28":"Za prikaz v javnem imeniku potrebuješ naslov.","k20":"Pri ustvarjanju sobe je prišlo do napake","k15":"Ta naslov sobe že obstaja. Uredi naslov ali spremeni ime sobe","k16":"Nekateri znaki niso dovoljeni. Dovoljene so samo črke, številke in naslednji simboli ! $ & ' ( ) * + / ; = ? @ [ ] - . _","k8":"Iskanje","k1d":"Ni javnih sob","k1c":"Še ni nobene sobe, odprte za vse. Ustvari javno sobo in prikazala se bo tukaj.","k1e":"Nobena javna soba se ne ujema z »%1$s«.","k1b":"Ustvari javno sobo","k7":"Pridruži se","k2d":"Nalaganje ni uspelo","kc":"Nalaganje …","k1a":"Naj skenirajo kodo ali pa jim pošlji povezavo.","k9":"Deli","k4":"Kopiraj","kb":"Povezava je kopirana v odložišče","k18":"🔐️ Pridruži se mi v %1$s","k19":"Hej, pogovarjajva se v %1$s: %2$s","k34":"Vnesi naslov…","k37":"npr. #ime-sobe:4orizon.eu","k33":"Neveljaven naslov","k36":"Soba ni bila najdena","k3":"Nadaljuj","k0":"Nazaj","k2":"Zapri","kd":"Utišaj","k13":"Vklopi zvok","k1":"Pokliči","k14":"Video","k30":"Označi kot neprebrano","k2f":"Označi kot prebrano","k35":"Soba je najdena","k17":"Izberi fotografijo"},"et":{"ka":"Alusta vestlust","k10":"Otsi kedagi","k1f":"Uus jututuba","k2e":"Jututubade kataloog","k6":"Kutsu huvilisi kasutama rakendust %1$s","k32":"Liitu jututoaga aadressi alusel","k12":"Soovitused","kf":"Otsingul pole tulemusi","k11":"Otsingutulemused","k31":"Vestluse alustamisel tekkis viga","k22":"Uus jututuba","k5":"Loo","ke":"Nimi","k21":"Sisesta nimi…","k2a":"Teema (kui soovid lisada)","k2b":"Lisa kirjeldus…","k27":"Kellel on ligipääs","k24":"Privaatne","k23":"Ligipääs siia jututuppa on vaid kutse alusel.","k26":"Avalik","k25":"Kõik võivad selle jututoaga liituda.","k29":"Aadress","k28":"Selleks, et jututuba oleks nähtav jututubade avalikus kataloogis, vajab ta aadressi.","k20":"Jututoa loomisel tekkis viga","k15":"Selline jututoa aadress on juba olemas. Palun proovi muuta kas aadressi või jututoa nime","k16":"Mõned tähemärgid pole lubatud. Kasuta vaid tähti, numbreid ja neid kirjavahemärke ! $ & ‘ ( ) * + / ; = ? @ [ ] - . _","k8":"Otsi","k1d":"Avalikke jututubasid pole","k1c":"Kõigile avatud jututuba veel pole. Loo avalik ja see ilmub siia.","k1e":"Ükski avalik jututuba ei vasta päringule „%1$s“.","k1b":"Loo avalik jututuba","k7":"Liitu","k2d":"Andmeid ei õnnestunud laadida","kc":"Laadime…","k1a":"Lase koodi skannida või saada link.","k9":"Jaga","k4":"Kopeeri","kb":"Link on kopeeritud lõikelauale","k18":"🔐️ Liitu minuga rakenduses %1$s","k19":"Hei, suhtle minuga %1$s võrgus: %2$s","k34":"Sisesta aadress…","k37":"nt #ruumi-nimi:4orizon.eu","k33":"See pole kehtiv aadress","k36":"Jututuba ei leidu","k35":"Leidsime vastava jututoa","k3":"Jätka","k0":"Tagasi","k2":"Sulge","kd":"Summutatud","k13":"Lõpeta summutamine","k1":"Helista","k14":"Video","k30":"Märgi mitteloetuks","k2f":"Märgi loetuks","k17":"Vali foto"},"lv":{"ka":"Sākt tērzēšanu","k10":"Meklēt kādu","k1f":"Jauna istaba","k2e":"Istabu katalogs","k6":"Uzaicināt cilvēkus uz %1$s","k32":"Pievienoties istabai pēc adreses","k12":"Ieteikumi","kf":"Nav rezultātu","k11":"Meklēšanas rezultāti","k31":"Mēģinot sākt tērzēšanu, radās kļūda","k22":"Jauna istaba","k5":"Izveidot","ke":"Nosaukums","k21":"Pievienot nosaukumu…","k2a":"Temats (neobligāts)","k2b":"Pievienot aprakstu…","k27":"Kam ir piekļuve","k24":"Privāta","k23":"Pievienoties var tikai uzaicinātie.","k26":"Publiska","k25":"Pievienoties var ikviens.","k29":"Adrese","k28":"Lai istaba būtu redzama publiskajā katalogā, tai vajadzīga adrese.","k20":"Veidojot istabu, radās kļūda","k15":"Šāda istabas adrese jau pastāv. Labo adresi vai maini istabas nosaukumu","k16":"Dažas rakstzīmes nav atļautas. Atļauti ir tikai burti, cipari un šie simboli ! $ & ' ( ) * + / ; = ? @ [ ] - . _","k8":"Meklēt","k1d":"Nav publisku istabu","k1c":"Vēl nav nevienas visiem atvērtas istabas. Izveido publisku istabu, un tā parādīsies šeit.","k1e":"Neviena publiska istaba neatbilst “%1$s”.","k1b":"Izveidot publisku istabu","k7":"Pievienoties","k2d":"Neizdevās ielādēt","kc":"Ielādē…","k1a":"Ļauj noskenēt kodu vai nosūti saiti.","k9":"Kopīgot","k4":"Kopēt","kb":"Saite nokopēta starpliktuvē","k18":"🔐️ Pievienojies man %1$s","k19":"Sveiks, parunāsim %1$s: %2$s","k34":"Ievadi adresi…","k37":"piem., #istabas-nosaukums:4orizon.eu","k33":"Nederīga adrese","k36":"Istaba nav atrasta","k3":"Turpināt","k0":"Atpakaļ","k2":"Aizvērt","kd":"Izslēgt skaņu","k13":"Ieslēgt skaņu","k1":"Zvanīt","k14":"Video","k30":"Atzīmēt kā nelasītu","k2f":"Atzīmēt kā lasītu","k35":"Istaba atrasta","k17":"Izvēlēties fotoattēlu"},"lt":{"ka":"Pradėti pokalbį","k10":"Ieškoti ko nors","k1f":"Naujas kambarys","k6":"Kviesti žmones į „%1$s“","k12":"Pasiūlymai","kf":"Nėra rezultatų","k11":"Paieškos rezultatai","k31":"Bandant pradėti pokalbį įvyko klaida","k5":"Sukurti","k2a":"Tema (nebūtina)","k20":"Kuriant kambarį įvyko klaida","k8":"Ieškoti","k1d":"Viešų kambarių nėra","k1c":"Kol kas nėra jokio visiems atviro kambario. Sukurkite viešą ir jis atsiras čia.","k1e":"Nė vienas viešas kambarys neatitinka „%1$s“.","k1b":"Sukurti viešą kambarį","kc":"Įkeliama…","k1a":"Leiskite nuskenuoti kodą arba nusiųskite nuorodą.","k9":"Dalintis","k4":"Kopijuoti","kb":"Nuoroda nukopijuota į iškarpinę","k18":"🔐️ Prisijunkite prie manęs %1$s","k19":"Ei, pasikalbėkime naudojant %1$s: %2$s","k37":"pvz. #kambario-vardas:4orizon.eu","k3":"Tęsti","k0":"Atgal","k2":"Uždaryti","kd":"Nutildyti","k13":"Atšaukti nutildymą","k14":"Vaizdo įrašas","k2e":"Kambarių katalogas","k32":"Prisijungti prie kambario pagal adresą","k22":"Naujas kambarys","ke":"Pavadinimas","k21":"Pridėti pavadinimą…","k2b":"Pridėti aprašymą…","k27":"Kas turi prieigą","k24":"Privatus","k23":"Prisijungti gali tik pakviesti žmonės.","k26":"Viešas","k25":"Prisijungti gali bet kas.","k29":"Adresas","k28":"Kad kambarys būtų matomas viešajame kataloge, jam reikia adreso.","k15":"Toks kambario adresas jau yra. Pakeiskite adresą arba kambario pavadinimą","k16":"Kai kurie simboliai neleidžiami. Galima naudoti tik raides, skaitmenis ir šiuos simbolius ! $ & ' ( ) * + / ; = ? @ [ ] - . _","k7":"Prisijungti","k2d":"Nepavyko įkelti","k34":"Įveskite adresą…","k33":"Netinkamas adresas","k36":"Kambarys nerastas","k1":"Skambinti","k30":"Pažymėti kaip neskaitytą","k2f":"Pažymėti kaip skaitytą","k35":"Kambarys rastas","k17":"Pasirinkti nuotrauką"},"uk":{"ka":"Розпочати бесіду","k10":"Шукати когось","k1f":"Нова кімната","k2e":"Каталог кімнат","k6":"Запросити людей до %1$s","k32":"Приєднатися до кімнати за адресою","k12":"Пропозиції","kf":"Немає результатів","k11":"Результати пошуку","k31":"Під час спроби почати бесіду сталася помилка","k22":"Нова кімната","k5":"Створити","ke":"Назва","k21":"Додати назву…","k2a":"Тематика обговорень (необов’язково)","k2b":"Додати опис…","k27":"Хто має доступ","k24":"Приватний","k23":"Приєднатися можуть лише запрошені особи.","k26":"Публічний","k25":"Приєднатися може будь-хто.","k29":"Адреса","k28":"Вам знадобиться адреса, щоб зробити її видимою в загальнодоступному каталозі.","k20":"Під час створення кімнати сталася помилка","k15":"Ця адреса кімнати вже існує, будь ласка, спробуйте відредагувати поле адреси кімнати або змінити назву кімнати","k16":"Деякі символи не допускаються. Підтримуються тільки букви, цифри і наступні символи! $ & ‘ ( ) * + / ; = ? @ [ ] - . _","k8":"Шукати","k1d":"Немає публічних кімнат","k1c":"Поки що немає кімнати, відкритої для всіх. Створіть публічну, і вона з'явиться тут.","k1e":"Жодна публічна кімната не відповідає «%1$s».","k1b":"Створити публічну кімнату","k7":"Доєднатися","k2d":"Не вдалося завантажити","kc":"Завантаження","k1a":"Дайте відсканувати код або надішліть посилання.","k9":"Поділитися","k4":"Скопіювати","kb":"Посилання скопійовано в буфер обміну","k18":"🔐️ Приєднуйтеся до мене в %1$s","k19":"Вітаю, поспілкуйтеся зі мною в %1$s: %2$s","k34":"Увести адресу…","k37":"напр. #nazva-kimnaty:4orizon.eu","k33":"Недійсна адреса","k36":"Кімната не знайдена","k35":"Знайдено відповідну кімнату","k3":"Продовжити","k0":"Назад","k2":"Закрити","kd":"Вимкнути звук","k13":"Увімкнути звук","k1":"Зателефонувати","k14":"Відео","k30":"Позначити непрочитаним","k2f":"Позначити прочитаним","k17":"Вибрати фото"}};
  function lang() { var l = (document.documentElement.lang || 'it').slice(0, 2).toLowerCase(); return DIZ[l] ? l : 'en'; }
  function tr(k, a, b) {
    var s = (DIZ[lang()] || {})[k] || DIZ.en[k] || k;
    return s.replace('%1$s', a == null ? '' : a).replace('%2$s', b == null ? '' : b);
  }

  /* ---------- piccoli aiuti ---------- */
  function $(s, root) { return (root || document).querySelector(s); }
  function $$(s, root) { return Array.prototype.slice.call((root || document).querySelectorAll(s)); }
  function cli() { try { return window.mxMatrixClientPeg && window.mxMatrixClientPeg.get(); } catch (e) { return null; } }
  function dispatch(a) { try { if (window.mxDispatcher) window.mxDispatcher.dispatch(a); return !!window.mxDispatcher; } catch (e) { return false; } }
  function stanzaAperta() { try { return window.mxSdkContext.roomViewStore.getRoomId(); } catch (e) { return null; } }
  function chiaro() { return !!(document.body && document.body.classList.contains('cpd-theme-light')); }
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  var P = {
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    chev: '<path d="M9 6l6 6-6 6"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r=".9" fill="currentColor"/><circle cx="4.5" cy="12" r=".9" fill="currentColor"/><circle cx="4.5" cy="18" r=".9" fill="currentColor"/>',
    share: '<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="M8.2 10.8l7.6-4.1M8.2 13.2l7.6 4.1"/>',
    hash: '<path d="M9.5 3.5l-2 17M16.5 3.5l-2 17M4 9h16.5M3.5 15H20"/>',
    copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M15.5 8.5V6A2.5 2.5 0 0 0 13 3.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 20H4a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 4 8z"/><circle cx="12" cy="13.5" r="3.5"/>',
    bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    belloff: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0M4 4l16 16"/>',
    phone: '<path d="M5 4h3.5l1.5 4.5-2 1.5a11 11 0 0 0 6 6l1.5-2 4.5 1.5V19a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="3"/><path d="M16 10.5l5-3v9l-5-3z"/>',
    unread: '<path d="M20 12a8 8 0 0 1-11.8 7L4 20l1.1-4A8 8 0 1 1 20 12z"/><circle cx="12" cy="12" r="2" fill="currentColor"/>',
    read: '<path d="M20 12a8 8 0 0 1-11.8 7L4 20l1.1-4A8 8 0 1 1 20 12z"/><path d="M8.5 12l2.3 2.3 4.7-4.6"/>',
    people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 19.5c.9-3 3.4-4.8 6.5-4.8s5.6 1.8 6.5 4.8"/><path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18.2 14.9c1.6.7 2.7 2.1 3.3 4.1"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'
  };
  function icona(n, s) {
    var sp = document.createElement('span');
    sp.className = 'ozf-ic';
    sp.setAttribute('aria-hidden', 'true');
    sp.innerHTML = '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + P[n] + '</svg>';
    return sp;
  }

  /* ---------- foto (con l'accesso: i server nuovi vogliono il permesso anche per le miniature) ---------- */
  var foto = {};
  function caricaFoto(mxc, size, cb) {
    var c = cli();
    if (!c || !mxc || mxc.indexOf('mxc://') !== 0) return;
    var key = mxc + '@' + size;
    if (foto[key]) { if (foto[key].url) cb(foto[key].url); else foto[key].cb.push(cb); return; }
    var f = foto[key] = { cb: [cb] };
    var fine = function (url) { f.url = url; f.cb.forEach(function (x) { try { x(url); } catch (e) {} }); f.cb = []; };
    var conAuth = null, senza = null;
    try { conAuth = c.mxcUrlToHttp(mxc, size, size, 'crop', false, true, true); } catch (e) {}
    try { senza = c.mxcUrlToHttp(mxc, size, size, 'crop'); } catch (e) {}
    if (!conAuth) { if (senza) fine(senza); return; }
    fetch(conAuth, { headers: { Authorization: 'Bearer ' + c.getAccessToken() } }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.blob();
    }).then(function (b) { fine(URL.createObjectURL(b)); }).catch(function () { if (senza) fine(senza); });
  }
  /* stessi colori delle iniziali di Element (Compound) */
  function colore(id) { var t = 0; for (var i = 0; i < (id || '').length; i++) t += id.charCodeAt(i); return (t % 6) + 1; }
  function iniziale(nome) {
    var s = (nome || '?').replace(/^[@#!+]/, '').trim();
    var m = s.match(/./u);
    return (m ? m[0] : '?').toUpperCase();
  }
  function avatar(id, nome, mxc, size) {
    var n = colore(id);
    var a = h('span', { class: 'ozf-av', 'aria-hidden': 'true', style: 'width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * 0.42) + 'px;background:var(--cpd-color-bg-decorative-' + n + ');color:var(--cpd-color-text-decorative-' + n + ')', text: iniziale(nome) });
    if (mxc) caricaFoto(mxc, Math.max(64, size * 2), function (url) { a.style.backgroundImage = 'url("' + url + '")'; a.textContent = ''; a.classList.add('con-foto'); });
    return a;
  }

  /* ---------- copiare (anche dove gli appunti del browser non si possono usare) ---------- */
  function copia(testo) {
    var vecchio = function () {
      var prima = document.activeElement;
      var t = h('textarea', { style: 'position:fixed;left:-9999px;top:0;opacity:0' });
      t.value = testo; (F.root || document.body).appendChild(t); t.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      t.remove();
      try { if (prima && prima.focus) prima.focus({ preventScroll: true }); } catch (e) {}
      return ok;
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(testo).then(function () { return true; }, vecchio);
    } catch (e) {}
    return Promise.resolve(vecchio());
  }

  /* ---------- avviso di vetro in alto ---------- */
  var tAvviso = 0;
  function avviso(testo) {
    var a = $('#orizon-avviso');
    if (!a) { a = h('div', { id: 'orizon-avviso', role: 'status', 'aria-live': 'polite' }); document.body.appendChild(a); }
    a.textContent = testo;
    a.classList.remove('on'); void a.offsetWidth; a.classList.add('on');
    clearTimeout(tAvviso);
    tAvviso = setTimeout(function () { a.classList.remove('on'); }, 2600);
  }

  /* ================================================================
     le finestre
     ================================================================ */
  var F = { root: null, sec: null, pila: [], prima: null };
  function radice() {
    if (F.root && document.body.contains(F.root)) return F.root;
    var r = h('div', { id: 'orizon-finestre' });
    var velo = h('div', { class: 'ozf-velo', onclick: function () { chiudi(); } });
    r.appendChild(velo);
    /* i tasti premuti qui non arrivano a Element (le sue scorciatoie da tastiera) */
    r.addEventListener('keydown', function (e) {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); if (F.pila.length > 1) indietro(); else chiudi(); return; }
      if (e.key === 'Tab') trappola(e);
    });
    ['keyup', 'keypress'].forEach(function (t) { r.addEventListener(t, function (e) { e.stopPropagation(); }); });
    document.body.appendChild(r);
    F.root = r;
    return r;
  }
  function trappola(e) {
    var sec = F.sec; if (!sec) return;
    var f = $$('button:not([disabled]), input:not([disabled]), [tabindex="0"]', sec).filter(function (x) { return x.offsetWidth > 0 && x.getAttribute('aria-disabled') !== 'true'; });
    if (!f.length) return;
    var a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  }
  var VISTE = {};
  function mostra(vista, dati, comeNuova) {
    var r = radice();
    var aperta = r.classList.contains('aperta');
    if (!aperta) { F.prima = document.activeElement; F.pila = []; }
    if (comeNuova !== false) F.pila.push({ v: vista, d: dati });
    var v = VISTE[vista](dati || {});
    var sec = v.el;
    sec.setAttribute('role', 'dialog');
    sec.setAttribute('aria-modal', 'true');
    sec.classList.add('ozf-dialogo', 'entra');
    var vecchia = F.sec;
    F.sec = sec;
    r.appendChild(sec);
    if (vecchia) {
      vecchia.classList.add('esce');
      vecchia.setAttribute('aria-hidden', 'true');
      setTimeout(function () { vecchia.remove(); }, 260);
    }
    requestAnimationFrame(function () {
      r.classList.add('aperta');
      requestAnimationFrame(function () { sec.classList.remove('entra'); });
    });
    setTimeout(function () { var f = v.focus || $('input', sec) || $('button', sec); if (f) try { f.focus({ preventScroll: true }); } catch (e) {} }, 60);
  }
  function indietro() {
    if (F.pila.length < 2) { chiudi(); return; }
    F.pila.pop();
    var p = F.pila[F.pila.length - 1];
    mostra(p.v, p.d, false);
  }
  function chiudi(subito) {
    var r = F.root;
    if (!r || !r.classList.contains('aperta')) return;
    r.classList.remove('aperta');
    var sec = F.sec; F.sec = null; F.pila = [];
    if (sec) sec.classList.add('esce');
    setTimeout(function () { $$('.ozf-dialogo', r).forEach(function (s) { if (s !== F.sec) s.remove(); }); }, subito ? 0 : 280);
    try { if (F.prima && F.prima.focus && document.body.contains(F.prima)) F.prima.focus({ preventScroll: true }); } catch (e) {}
  }
  function aperta() { return !!(F.root && F.root.classList.contains('aperta')); }
  /* se il fuoco è finito fuori dalla finestra (un clic sul vetro), i tasti restano miei e non vanno a Element */
  document.addEventListener('keydown', function (e) {
    if (!aperta() || F.root.contains(e.target)) return;
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); if (F.pila.length > 1) indietro(); else chiudi(); }
    else if (e.key === 'Tab' && F.sec) { e.preventDefault(); var f = $('input, button', F.sec); if (f) f.focus(); }
  }, true);

  /* intestazione: indietro, titolo, chiudi (o un tasto a destra) */
  function testa(titolo, opt) {
    opt = opt || {};
    var kids = [];
    if (opt.indietro) kids.push(h('button', { type: 'button', class: 'ozf-tondo ozf-vetro', 'aria-label': tr('k0'), onclick: indietro }, [icona('back', 17)]));
    kids.push(h('h2', { id: 'ozf-titolo', text: titolo }));
    kids.push(opt.destra || h('button', { type: 'button', class: 'ozf-tondo ozf-vetro', 'aria-label': tr('k2'), onclick: function () { chiudi(); } }, [icona('x', 16)]));
    return h('div', { class: 'ozf-testa' }, kids);
  }
  function cercaCampo(ph, oninput, icon) {
    var inp = h('input', { type: 'text', placeholder: ph, 'aria-label': ph, autocomplete: 'off', spellcheck: 'false' });
    inp.addEventListener('input', oninput);
    return { el: h('label', { class: 'ozf-cerca ozf-vetro' }, [icona(icon || 'search', 18), inp]), input: inp };
  }
  function riga(icon, testo, onclick, extra) {
    var kids = [icona(icon, 19), h('span', { class: 'ozf-tx', text: testo })];
    if (extra !== false) kids.push(icona('chev', 16));
    return h('button', { type: 'button', class: 'ozf-riga', onclick: onclick }, kids);
  }
  function sezione(nome, larghezza, altezza, kids) {
    var s = h('section', { class: 'ozf-' + nome, 'aria-labelledby': 'ozf-titolo', style: '--w:' + larghezza + 'px;--h:' + altezza + 'px' }, kids);
    return s;
  }

  /* ---------- Avvia conversazione ---------- */
  function suggeriti() {
    var c = cli(); if (!c) return [];
    var dirette = {};
    try { var ev = c.getAccountData('m.direct'); dirette = (ev && ev.getContent()) || {}; } catch (e) {}
    var me = c.getUserId(), out = [], visti = {};
    Object.keys(dirette).forEach(function (uid) {
      if (uid === me) return;
      (dirette[uid] || []).forEach(function (rid) {
        var room = c.getRoom(rid);
        if (!room || room.getMyMembership() !== 'join') return;
        var t = 0; try { t = room.getLastActiveTimestamp(); } catch (e) {}
        if (!visti[uid] || visti[uid].t < t) {
          var m = room.getMember(uid), u = c.getUser(uid);
          visti[uid] = { id: uid, t: t, nome: (m && m.name) || (u && u.displayName) || uid, mxc: (m && m.getMxcAvatarUrl && m.getMxcAvatarUrl()) || (u && u.avatarUrl) || null };
        }
      });
    });
    Object.keys(visti).forEach(function (k) { out.push(visti[k]); });
    out.sort(function (a, b) { return b.t - a.t; });
    return out.slice(0, 8);
  }
  /* come sull'app: se con quella persona c'è già una chat a due, si apre quella */
  function chatEsistente(uid) {
    var c = cli(); if (!c) return null;
    var dirette = {};
    try { var ev = c.getAccountData('m.direct'); dirette = (ev && ev.getContent()) || {}; } catch (e) {}
    var meglio = null, t = -1;
    (dirette[uid] || []).forEach(function (rid) {
      var room = c.getRoom(rid);
      if (!room || room.getMyMembership() !== 'join') return;
      /* i membri possono non essere ancora caricati: scarto solo chi è uscito */
      var m = room.getMember(uid);
      if (m && m.membership !== 'join' && m.membership !== 'invite') return;
      if (room.getInvitedAndJoinedMemberCount() > 2) return;
      var ts = 0; try { ts = room.getLastActiveTimestamp(); } catch (e) {}
      if (ts > t) { t = ts; meglio = rid; }
    });
    return meglio;
  }
  function apriChat(uid) {
    chiudi();
    var rid = chatEsistente(uid);
    if (rid) { dispatch({ action: 'view_room', room_id: rid }); return; }
    if (!dispatch({ action: 'view_start_chat_or_reuse', user_id: uid })) avviso(tr('k31'));
  }
  VISTE.avvia = function () {
    var lista = h('div', { class: 'ozf-isola ozf-persone', role: 'list' });
    var etich = h('div', { class: 'ozf-etichetta' });
    var tCerca = 0, ultima = '';
    function persone(arr, vuoto) {
      lista.textContent = '';
      arr.forEach(function (p) {
        lista.appendChild(h('button', { type: 'button', class: 'ozf-riga ozf-persona', role: 'listitem', onclick: function () { apriChat(p.id); } }, [
          avatar(p.id, p.nome, p.mxc, 38),
          h('span', { class: 'ozf-tx' }, [h('span', { class: 'ozf-nome', text: p.nome }), h('span', { class: 'ozf-sub', text: p.id })])
        ]));
      });
      if (!arr.length && vuoto) lista.appendChild(h('p', { class: 'ozf-vuoto', text: vuoto }));
      lista.hidden = !arr.length && !vuoto;
      etich.hidden = lista.hidden;
    }
    function base() { var s = suggeriti(); etich.textContent = tr('k12'); persone(s, null); }
    var campo = cercaCampo(tr('k10'), function () {
      var q = campo.input.value.trim();
      clearTimeout(tCerca);
      if (!q) { ultima = ''; base(); return; }
      tCerca = setTimeout(function () { cerca(q); }, 260);
    });
    function cerca(q) {
      var c = cli(); if (!c) return;
      ultima = q;
      etich.textContent = tr('k11');
      var mx = /^@[^\s:]+:[^\s]+$/.test(q) ? q : null;
      c.searchUserDirectory({ term: q, limit: 20 }).then(function (r) {
        if (ultima !== q) return;
        var arr = (r.results || []).filter(function (u) { return u.user_id !== c.getUserId(); }).map(function (u) { return { id: u.user_id, nome: u.display_name || u.user_id, mxc: u.avatar_url }; });
        if (mx && !arr.some(function (p) { return p.id === mx; })) arr.unshift({ id: mx, nome: mx, mxc: null });
        persone(arr, tr('kf'));
      }, function () {
        if (ultima !== q) return;
        persone(mx ? [{ id: mx, nome: mx, mxc: null }] : [], tr('kf'));
      });
    }
    campo.input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var b = $('.ozf-persona', lista);
      if (b) { e.preventDefault(); b.click(); }
    });
    var azioni = h('div', { class: 'ozf-isola' }, [
      riga('plus', tr('k1f'), function () { mostra('nuova', {}); }),
      riga('list', tr('k2e'), function () { mostra('elenco', {}); }),
      riga('share', tr('k6', APP), function () { mostra('invita', {}); }),
      riga('hash', tr('k32'), function () { mostra('accedi', {}); })
    ]);
    base();
    var corpo = h('div', { class: 'ozf-corpo' }, [azioni, etich, lista]);
    return { el: sezione('avvia', 520, 610, [testa(tr('ka')), campo.el, corpo]), focus: campo.input };
  };

  /* ---------- Nuova stanza ---------- */
  function slug(s) {
    return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
      .replace(/\s+/g, '-').replace(/[^a-z0-9\-._]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  }
  var SIMBOLI = /^[A-Za-z0-9!$&'()*+\/;=?@\[\]\-._]+$/;
  VISTE.nuova = function (d) {
    var c = cli(), dominio = c ? c.getDomain() : '4orizon.eu';
    var stato = { pub: !!d.pubblica, file: null, aliasMano: false, aliasOk: true, invio: false };
    var crea = h('button', { type: 'button', class: 'ozf-bianco ozf-piccolo', 'aria-disabled': 'true', text: tr('k5') });
    /* foto */
    var scelta = h('input', { type: 'file', accept: 'image/*', hidden: true });
    var fotoBtn = h('button', { type: 'button', class: 'ozf-tondo ozf-vetro ozf-foto', 'aria-label': tr('k17') }, [icona('camera', 28), h('span', { class: 'ozf-piu', 'aria-hidden': 'true' }, [icona('plus', 15)])]);
    fotoBtn.onclick = function () { scelta.click(); };
    scelta.onchange = function () {
      var f = scelta.files && scelta.files[0];
      if (!f) return;
      stato.file = f;
      fotoBtn.style.backgroundImage = 'url("' + URL.createObjectURL(f) + '")';
      fotoBtn.classList.add('con-foto');
    };
    /* nome e argomento */
    var nome = h('input', { type: 'text', placeholder: tr('k21'), maxlength: '255' });
    var arg = h('input', { type: 'text', placeholder: tr('k2b') });
    var campi = h('div', { class: 'ozf-isola' }, [
      h('label', { class: 'ozf-campo' }, [h('span', { class: 'ozf-lab', text: tr('ke') }), nome]),
      h('label', { class: 'ozf-campo' }, [h('span', { class: 'ozf-lab', text: tr('k2a') }), arg])
    ]);
    /* chi ha accesso */
    function radio(pub, titolo, desc) {
      var b = h('button', { type: 'button', role: 'radio', class: 'ozf-riga ozf-radio' }, [
        h('span', { class: 'ozf-tx' }, [h('span', { text: titolo }), h('span', { class: 'ozf-sub', text: desc })]),
        h('span', { class: 'ozf-pallino', 'aria-hidden': 'true' }, [h('span')])
      ]);
      b.onclick = function () { stato.pub = pub; aggiorna(); if (pub) setTimeout(function () { alias.focus(); }, 30); };
      return b;
    }
    var rPriv = radio(false, tr('k24'), tr('k23'));
    var rPub = radio(true, tr('k26'), tr('k25'));
    var gruppo = h('div', { class: 'ozf-isola ozf-semplice', role: 'radiogroup', 'aria-label': tr('k27') }, [rPriv, rPub]);
    gruppo.addEventListener('keydown', function (e) {
      if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].indexOf(e.key) < 0) return;
      e.preventDefault(); stato.pub = !stato.pub; aggiorna(); (stato.pub ? rPub : rPriv).focus();
    });
    /* indirizzo (solo pubblica) */
    var alias = h('input', { type: 'text', placeholder: 'nome-stanza', 'aria-label': tr('k29'), autocomplete: 'off', spellcheck: 'false' });
    var errAlias = h('p', { class: 'ozf-nota ozf-errore', role: 'alert', hidden: true });
    var indirizzo = h('div', { class: 'ozf-blocco' }, [
      h('div', { class: 'ozf-etichetta', text: tr('k29') }),
      h('label', { class: 'ozf-isola ozf-alias' }, [h('span', { class: 'ozf-fisso', text: '#' }), alias, h('span', { class: 'ozf-fisso', text: ':' + dominio })]),
      h('p', { class: 'ozf-nota', text: tr('k28') }),
      errAlias
    ]);
    var errore = h('p', { class: 'ozf-nota ozf-errore', role: 'alert', hidden: true });
    var tAlias = 0;
    function controllaAlias() {
      var a = alias.value.trim();
      clearTimeout(tAlias);
      stato.aliasOk = false; errAlias.hidden = true;
      if (!stato.pub) { stato.aliasOk = true; return; }
      if (!a) return;
      if (!SIMBOLI.test(a)) { errAlias.textContent = tr('k16'); errAlias.hidden = false; return; }
      stato.aliasOk = true;
      tAlias = setTimeout(function () {
        var cc = cli(); if (!cc) return;
        cc.getRoomIdForAlias('#' + a + ':' + dominio).then(function () {
          if (alias.value.trim() !== a) return;
          stato.aliasOk = false; errAlias.textContent = tr('k15'); errAlias.hidden = false; aggiorna(true);
        }, function () {});
      }, 450);
    }
    function aggiorna(soloTasto) {
      if (!soloTasto) {
        rPriv.setAttribute('aria-checked', stato.pub ? 'false' : 'true');
        rPub.setAttribute('aria-checked', stato.pub ? 'true' : 'false');
        rPriv.tabIndex = stato.pub ? -1 : 0; rPub.tabIndex = stato.pub ? 0 : -1;
        indirizzo.hidden = !stato.pub;
        if (stato.pub && !stato.aliasMano) alias.value = slug(nome.value);
        controllaAlias();
      }
      var ok = nome.value.trim() && (!stato.pub || (alias.value.trim() && stato.aliasOk)) && !stato.invio;
      crea.setAttribute('aria-disabled', ok ? 'false' : 'true');
    }
    nome.addEventListener('input', function () { if (stato.pub && !stato.aliasMano) { alias.value = slug(nome.value); controllaAlias(); } aggiorna(true); });
    alias.addEventListener('input', function () { stato.aliasMano = alias.value.trim() !== ''; controllaAlias(); aggiorna(true); });
    [nome, arg, alias].forEach(function (i) { i.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); crea.click(); } }); });
    crea.onclick = function () {
      if (crea.getAttribute('aria-disabled') === 'true') return;
      var cc = cli(); if (!cc) return;
      stato.invio = true; aggiorna(true); errore.hidden = true;
      crea.classList.add('lavora');
      var pub = stato.pub;
      var opts = { name: nome.value.trim(), preset: pub ? 'public_chat' : 'private_chat', visibility: pub ? 'public' : 'private', initial_state: [] };
      if (arg.value.trim()) opts.topic = arg.value.trim();
      if (pub) opts.room_alias_name = alias.value.trim();
      /* come sull'app: le stanze private sono cifrate */
      if (!pub) opts.initial_state.push({ type: 'm.room.encryption', state_key: '', content: { algorithm: 'm.megolm.v1.aes-sha2' } });
      var pronto = stato.file ? cc.uploadContent(stato.file).then(function (r) { return r && r.content_uri; }, function () { return null; }) : Promise.resolve(null);
      pronto.then(function (url) {
        if (url) opts.initial_state.push({ type: 'm.room.avatar', state_key: '', content: { url: url } });
        return cc.createRoom(opts);
      }).then(function (r) {
        chiudi();
        dispatch({ action: 'view_room', room_id: r.room_id, justCreatedOpts: undefined });
      }, function (e) {
        stato.invio = false; crea.classList.remove('lavora');
        var code = e && (e.errcode || (e.data && e.data.errcode));
        errore.textContent = code === 'M_ROOM_IN_USE' ? tr('k15') : tr('k20');
        errore.hidden = false; aggiorna(true);
      });
    };
    aggiorna();
    var corpo = h('div', { class: 'ozf-corpo' }, [
      h('div', { class: 'ozf-centro' }, [fotoBtn, scelta]),
      campi,
      h('div', { class: 'ozf-etichetta', text: tr('k27') }),
      gruppo, indirizzo, errore
    ]);
    return { el: sezione('nuova', 520, 700, [testa(tr('k22'), { indietro: true, destra: crea }), corpo]), focus: nome };
  };

  /* ---------- Elenco delle stanze ---------- */
  VISTE.elenco = function () {
    var area = h('div', { class: 'ozf-corpo' });
    var tCerca = 0, ultima = null;
    function vuoto(q) {
      area.textContent = '';
      area.appendChild(h('div', { class: 'ozf-vuota' }, [
        h('span', { class: 'ozf-tondo ozf-vetro ozf-grande', 'aria-hidden': 'true' }, [icona('hash', 34)]),
        h('h3', { text: q ? tr('kf') : tr('k1d') }),
        h('p', { text: q ? tr('k1e', q) : tr('k1c') }),
        h('button', { type: 'button', class: 'ozf-bianco', onclick: function () { mostra('nuova', { pubblica: true }); } }, [icona('plus', 17), h('span', { text: tr('k1b') })])
      ]));
    }
    function carica(q) {
      var c = cli(); if (!c) return;
      ultima = q;
      if (!area.querySelector('.ozf-isola')) { area.textContent = ''; area.appendChild(h('p', { class: 'ozf-attesa', text: tr('kc') })); }
      var opts = { limit: 50 };
      if (q) opts.filter = { generic_search_term: q };
      c.publicRooms(opts).then(function (r) {
        if (ultima !== q) return;
        var stanze = (r && r.chunk) || [];
        if (!stanze.length) { vuoto(q); return; }
        area.textContent = '';
        var isola = h('div', { class: 'ozf-isola ozf-persone', role: 'list' });
        stanze.forEach(function (s) {
          var dentro = (function () { var rm = c.getRoom(s.room_id); return rm && rm.getMyMembership() === 'join'; })();
          var nomeS = s.name || s.canonical_alias || s.room_id;
          var vai = function () {
            if (dentro) { chiudi(); dispatch({ action: 'view_room', room_id: s.room_id }); return; }
            entra.classList.add('lavora');
            c.joinRoom(s.canonical_alias || s.room_id).then(function (rm) {
              chiudi(); dispatch({ action: 'view_room', room_id: (rm && rm.roomId) || s.room_id });
            }, function () { entra.classList.remove('lavora'); avviso(tr('k2d')); });
          };
          var entra = h('span', { class: 'ozf-entra', text: dentro ? '' : tr('k7') });
          isola.appendChild(h('button', { type: 'button', class: 'ozf-riga ozf-persona', role: 'listitem', onclick: vai }, [
            avatar(s.room_id, nomeS, s.avatar_url, 40),
            h('span', { class: 'ozf-tx' }, [
              h('span', { class: 'ozf-nome', text: nomeS }),
              h('span', { class: 'ozf-sub', text: s.topic || s.canonical_alias || '' })
            ]),
            h('span', { class: 'ozf-membri' }, [icona('people', 15), h('span', { text: String(s.num_joined_members || 0) })]),
            dentro ? icona('chev', 16) : entra
          ]));
        });
        area.appendChild(isola);
      }, function () {
        if (ultima !== q) return;
        area.textContent = '';
        area.appendChild(h('p', { class: 'ozf-attesa', text: tr('k2d') }));
      });
    }
    var campo = cercaCampo(tr('k8'), function () {
      var q = campo.input.value.trim();
      clearTimeout(tCerca);
      tCerca = setTimeout(function () { carica(q); }, 300);
    });
    carica('');
    return { el: sezione('elenco', 560, 600, [testa(tr('k2e'), { indietro: true }), campo.el, area]), focus: campo.input };
  };

  /* ---------- Invita (codice QR) ---------- */
  function qrSvg(testo) {
    try {
      var q = QR(0, 'M');
      q.addData(unescape(encodeURIComponent(testo)), 'Byte');
      q.make();
      var n = q.getModuleCount(), d = '';
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) d += 'M' + c + ' ' + r + 'h1v1h-1z';
      return '<svg viewBox="0 0 ' + n + ' ' + n + '" width="168" height="168" shape-rendering="crispEdges" role="img" aria-label="QR"><path fill="#0B0D10" d="' + d + '"/></svg>';
    } catch (e) { return ''; }
  }
  VISTE.invita = function () {
    var c = cli(), me = c ? c.getUserId() : '', u = c && c.getUser(me);
    var nomeMio = (u && u.displayName) || me;
    var link = LINK + me;
    var testo = tr('k19', APP, link);
    var qr = h('div', { class: 'ozf-qr', html: qrSvg(link) });
    var copiaBtn = h('button', { type: 'button', class: 'ozf-tondo ozf-vetro', 'aria-label': tr('k4') }, [icona('copy', 16)]);
    copiaBtn.onclick = function () { copia(testo).then(function () { avviso(tr('kb')); }); };
    var condividi = h('button', { type: 'button', class: 'ozf-bianco ozf-largo' }, [icona('share', 17), h('span', { text: tr('k9') })]);
    condividi.onclick = function () {
      var ua = navigator.userAgent || '';
      if (navigator.share && /Android|iPhone|iPad/i.test(ua)) { navigator.share({ title: tr('k18', APP), text: testo }).catch(function () {}); return; }
      copia(testo).then(function () { avviso(tr('kb')); });
    };
    var corpo = h('div', { class: 'ozf-corpo ozf-invita-corpo' }, [
      h('p', { class: 'ozf-sotto', text: tr('k1a') }),
      qr,
      h('div', { class: 'ozf-chi' }, [h('div', { class: 'ozf-chi-nome', text: nomeMio }), h('div', { class: 'ozf-sub', text: me })]),
      h('div', { class: 'ozf-isola ozf-messaggio' }, [
        h('div', { class: 'ozf-tx' }, [h('div', { class: 'ozf-msg-t', text: tr('k18', APP).replace(/^\S*🔐\S*\s*/, '') }), h('div', { class: 'ozf-sub', text: testo })]),
        copiaBtn
      ])
    ]);
    return { el: sezione('invita', 460, 660, [testa(tr('k6', APP), { indietro: true }), corpo, condividi]), focus: condividi };
  };

  /* ---------- Accedi alla stanza tramite indirizzo ---------- */
  VISTE.accedi = function () {
    var trovata = null, tCerca = 0, n = 0;
    var aiuto = h('p', { class: 'ozf-nota', id: 'ozf-aiuto', text: tr('k37') });
    var continua = h('button', { type: 'button', class: 'ozf-bianco ozf-largo', 'aria-disabled': 'true', text: tr('k3') });
    var campo = cercaCampo(tr('k34'), function () { controlla(); }, 'hash');
    campo.input.setAttribute('aria-describedby', 'ozf-aiuto');
    campo.el.classList.add('ozf-alto');
    function indirizzo() {
      var v = campo.input.value.trim();
      if (v && v[0] !== '#' && v[0] !== '!') v = '#' + v;
      return v;
    }
    function messaggio(t, tipo) {
      aiuto.textContent = t;
      aiuto.classList.toggle('ozf-errore', tipo === 'no');
      aiuto.classList.toggle('ozf-ok', tipo === 'si');
      aiuto.setAttribute('role', tipo === 'no' ? 'alert' : 'status');
    }
    function controlla() {
      var a = indirizzo(), mio = ++n;
      trovata = null; continua.setAttribute('aria-disabled', 'true');
      clearTimeout(tCerca);
      if (!a) { messaggio(tr('k37')); return; }
      if (!/^[#!][^\s:]+:[^\s:]+(:\d+)?$/.test(a)) { messaggio(tr('k37')); tCerca = setTimeout(function () { if (mio === n) messaggio(tr('k33'), 'no'); }, 900); return; }
      messaggio(tr('k37'));
      tCerca = setTimeout(function () {
        var c = cli(); if (!c) return;
        if (a[0] === '!') { trovata = { room_id: a, servers: [] }; messaggio(tr('k35'), 'si'); continua.setAttribute('aria-disabled', 'false'); return; }
        c.getRoomIdForAlias(a).then(function (r) {
          if (mio !== n) return;
          trovata = { room_id: r.room_id, servers: r.servers || [], alias: a };
          messaggio(tr('k35'), 'si');
          continua.setAttribute('aria-disabled', 'false');
        }, function () {
          if (mio !== n) return;
          messaggio(tr('k36'), 'no');
        });
      }, 450);
    }
    continua.onclick = function () {
      if (!trovata) return;
      chiudi();
      dispatch({ action: 'view_room', room_id: trovata.room_id, room_alias: trovata.alias, via_servers: trovata.servers });
    };
    campo.input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); continua.click(); } });
    var corpo = h('div', { class: 'ozf-corpo ozf-accedi-corpo' }, [campo.el, aiuto]);
    return { el: sezione('accedi', 540, 300, [testa(tr('k32'), { indietro: true }), corpo, continua]), focus: campo.input };
  };

  /* il + della pillola in basso e chi altro lo vuole */
  window.__orizonAvvia = function () { if (!cli() || !window.mxDispatcher) return false; mostra('avvia', {}); return true; };

  /* ================================================================
     pannello delle info: Silenzia / Chiama / Video e Segna come non letto
     ================================================================ */
  function silenziata(c, rid) {
    try {
      var o = (c.pushRules && c.pushRules.global && c.pushRules.global.override) || [];
      return o.some(function (r) { return r.rule_id === rid && r.enabled !== false && (!r.actions || !r.actions.length || r.actions.indexOf('dont_notify') >= 0); });
    } catch (e) { return false; }
  }
  function silenzia(c, rid, on) {
    if (on) return c.addPushRule('global', 'override', rid, { conditions: [{ kind: 'event_match', key: 'room_id', pattern: rid }], actions: [] });
    return c.deletePushRule('global', 'override', rid);
  }
  function nonLetta(room) {
    try {
      var m = room.getAccountData('m.marked_unread') || room.getAccountData('com.famedly.marked_unread');
      if (m && m.getContent().unread) return true;
      return room.getUnreadNotificationCount('total') > 0;
    } catch (e) { return false; }
  }
  function segna(c, room, unread) {
    var prom = c.setRoomAccountData(room.roomId, 'm.marked_unread', { unread: unread });
    if (!unread) {
      try { var ev = room.getLastLiveEvent && room.getLastLiveEvent(); if (ev) c.sendReadReceipt(ev); } catch (e) {}
    }
    return prom;
  }
  function tastiTesta() {
    var out = { video: null, voce: null };
    var bb = $$('.mx_RoomHeader > button[class*="_icon-button_"]:not(.orizon-via)');
    /* Element mette prima la videochiamata e poi la telefonata */
    if (bb.length >= 2) { out.video = bb[0]; out.voce = bb[1]; } else if (bb.length === 1) out.video = bb[0];
    return out;
  }
  var infoKey = '';
  function infoPannello() {
    var head = $('.mx_RoomSummaryCard header.mx_RoomSummaryCard_container');
    if (!head) return;
    var c = cli(), rid = stanzaAperta(), room = c && rid && c.getRoom(rid);
    if (!room) return;
    var box = head.nextElementSibling && head.nextElementSibling.classList.contains('orizon-info') ? head.nextElementSibling : null;
    if (!box) {
      box = h('div', { class: 'orizon-info' });
      head.parentNode.insertBefore(box, head.nextSibling);
      infoKey = '';
    }
    /* nelle chat a due: sotto il nome, l'indirizzo della persona */
    var alias = $('.mx_RoomSummaryCard_alias', head), altro = null;
    try { var dm = c.getAccountData('m.direct'), cont = (dm && dm.getContent()) || {}; Object.keys(cont).some(function (u) { if ((cont[u] || []).indexOf(rid) >= 0) { altro = u; return true; } return false; }); } catch (e) {}
    var idBox = $('.orizon-info-id', head);
    if (alias && !alias.textContent.trim() && altro) {
      if (!idBox) { idBox = h('div', { class: 'orizon-info-id' }); alias.parentNode.insertBefore(idBox, alias.nextSibling); }
      if (idBox.textContent !== altro) idBox.textContent = altro;
    } else if (idBox) idBox.remove();
    var muto = silenziata(c, rid), letta = !nonLetta(room), t = tastiTesta();
    var key = [lang(), rid, muto, letta, !!t.video, !!t.voce, t.video && t.video.getAttribute('aria-disabled'), t.voce && t.voce.getAttribute('aria-disabled')].join('|');
    if (key === infoKey && box.firstChild) return;
    infoKey = key;
    box.textContent = '';
    function azione(icon, testo, fn, dis) {
      return h('button', { type: 'button', class: 'orizon-azione', 'aria-disabled': dis ? 'true' : null, onclick: function () { if (!dis) fn(); } }, [
        h('span', { class: 'orizon-azione-tondo' }, [icona(icon, 20)]), h('span', { text: testo })
      ]);
    }
    var file = h('div', { class: 'orizon-azioni' }, [
      azione(muto ? 'belloff' : 'bell', muto ? tr('k13') : tr('kd'), function () {
        silenzia(c, rid, !muto).then(function () { infoKey = ''; setTimeout(infoPannello, 50); }, function () {});
      }),
      t.voce ? azione('phone', tr('k1'), function () { t.voce.click(); }, t.voce.getAttribute('aria-disabled') === 'true') : null,
      t.video ? azione('video', tr('k14'), function () { t.video.click(); }, t.video.getAttribute('aria-disabled') === 'true') : null
    ]);
    var isola = h('div', { class: 'orizon-info-isola' }, [
      h('button', { type: 'button', class: 'orizon-info-riga', onclick: function () {
        segna(c, room, letta).then(function () { infoKey = ''; setTimeout(infoPannello, 80); }, function () {});
      } }, [icona(letta ? 'unread' : 'read', 19), h('span', { text: letta ? tr('k30') : tr('k2f') })])
    ]);
    box.appendChild(file);
    box.appendChild(isola);
  }

  var queued = false;
  function sync() {
    queued = false;
    try {
      /* se Element apre una sua finestra (per esempio una conferma), la mia si chiude */
      if (aperta() && $('.mx_Dialog')) chiudi(true);
      infoPannello();
    } catch (e) { if (window.console) console.warn('orizon3', e); }
  }
  function schedule() { if (!queued) { queued = true; requestAnimationFrame(sync); } }
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-disabled', 'class'] });
  /* le regole delle notifiche e lo stato "non letto" cambiano senza toccare la pagina */
  var agganciato = false;
  (function aggancia() {
    var c = cli();
    if (!c || agganciato) { if (!agganciato) setTimeout(aggancia, 1000); return; }
    agganciato = true;
    try { c.on('accountData', function () { infoKey = ''; schedule(); }); c.on('Room.accountData', function () { infoKey = ''; schedule(); }); c.on('Room.receipt', function () { infoKey = ''; schedule(); }); } catch (e) {}
  })();
})();
