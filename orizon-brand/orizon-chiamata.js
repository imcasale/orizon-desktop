/* Orizon: la chiamata (Element Call dentro Orizon desktop).
   La pillola dei comandi e le sezioni delle impostazioni hanno la goccia di vetro dell'app Android:
   segue il mouse, premuta diventa una lente che ingrandisce, lasciata su un tasto lo preme.
   Lo carica widgets/element-call/index.html (lo collega prepara-webapp.py); lo stile sta in orizon-chiamata.css. */
(function () {
  'use strict';
  if (window.__orizonChiamata) return;
  window.__orizonChiamata = true;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, root) { return (root || document).querySelector(s); }
  function $$(s, root) { return Array.prototype.slice.call((root || document).querySelectorAll(s)); }

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
    d.className = 'oz-goccia';
    d.setAttribute('aria-hidden', 'true');
    var l = document.createElement('span');
    l.className = 'oz-goccia-lente';
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

  /* la pillola: i tasti visibili (il microfono e la fotocamera con la loro freccina contano come uno) */
  var usato = 0;
  function vociPillola(bar) {
    return Array.prototype.slice.call(bar.children).filter(function (el) {
      return !el.classList.contains('oz-goccia') && !el.classList.contains('orizon-riposo') && el.offsetWidth > 0 && el.offsetHeight > 0;
    });
  }
  function pillola() {
    var bar = $('[data-testid="footer-container"] [class*="_buttons_"]');
    if (!bar) return;
    if (!bar.__ozClic) {
      bar.__ozClic = true;
      /* la goccia resta sull'ultimo tasto usato */
      bar.addEventListener('click', function (e) {
        var voci = vociPillola(bar);
        for (var i = 0; i < voci.length; i++) if (voci[i].contains(e.target)) { usato = i; break; }
      }, true);
    }
    /* come OrizonCallPill: goccia 84 x 78, 5 sopra la pillola; il centro tra il primo e l'ultimo tasto */
    goccia(bar, {
      items: function () { return vociPillola(bar); },
      sel: function () { return usato; },
      gesture: 'select',
      rest: chiaro() ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.13)',
      layer: function () { return bar.parentElement; },
      spec: function (it) {
        var f = it[0], z = it[it.length - 1];
        return { w: 84, h: 78, top: -5, min: f ? f.x + f.w / 2 : 0, max: z ? z.x + z.w / 2 : 0 };
      },
      pick: function (i, el) {
        usato = i;
        var g = bar.__goccia, menu = $('[class*="_menuButton_"]', el);
        if (menu && g) {
          /* lasciata sulla freccina apre il menu, altrove preme il tasto */
          var mr = menu.getBoundingClientRect(), hr = bar.getBoundingClientRect(), k = g.scale();
          var x = (mr.left - hr.left) / k;
          if (g.px >= x) { menu.click(); return; }
          var main = $('button:not([class*="_menuButton_"])', el);
          if (main) { main.click(); return; }
        }
        (el.matches('button') ? el : ($('button', el) || el)).click();
      }
    });
  }
  /* le sezioni delle impostazioni (Audio, Video, Preferenze) */
  function sezioni() {
    var ul = $('[role="dialog"] [role="tablist"]');
    if (!ul) return;
    goccia(ul, {
      items: function () { return $$('[role="tab"]', ul); },
      sel: function () { return $$('[role="tab"]', ul).findIndex(function (b) { return b.getAttribute('aria-selected') === 'true'; }); },
      gesture: 'select',
      layer: function () { return ul.parentElement; },
      spec: function (it) {
        var h = it.length ? it[0].h : 36, y = it.length ? it[0].y : 0, f = it[0], z = it[it.length - 1];
        return { w: Math.round(84 * h / 52), h: h + 18, top: y - 9, min: f ? f.x + h / 2 : 0, max: z ? z.x + z.w - h / 2 : 0 };
      }
    });
  }
  /* i vetri con la lente: la pillola dei comandi e i tasti tondi come le pillole dell'app, menu e pannelli più spessi */
  var VETRI = [
    ['[data-testid="footer-container"] [class*="_buttons_"], [data-testid="settings-bottom-left"], [data-testid="footer-container"] fieldset[class*="_layout_"], [data-testid="videoTile"] [class*="_nameTag_"]', 'v'],
    ['[role="menu"][data-state="open"], [class*="_modal_"][role="dialog"]', 'p']
  ];
  var queued = false;
  function sync() {
    queued = false;
    try { pillola(); sezioni(); vetri(VETRI); kickGocce(); } catch (e) { if (window.console) console.warn('orizon-chiamata', e); }
  }
  function schedule() { if (!queued) { queued = true; requestAnimationFrame(sync); } }
  function start() {
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'aria-checked', 'aria-selected', 'aria-expanded', 'data-state'] });
    window.addEventListener('resize', schedule);
    schedule();
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
