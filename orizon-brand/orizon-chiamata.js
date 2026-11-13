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
  /* la goccia premuta: lente più piccola (10dp / 14dp), ingrandimento e colori separati ai bordi */
  function filtroGoccia(w, h, p) {
    var key = 'g' + w + 'x' + h + 'p' + p, v = daCache(key);
    if (v) return v;
    var r = Math.min(w, h) / 2, mp = mappaLente(w, h, r, 10 * p, 14 * p, 1 + 0.22 * p), k = 0.05 * p, S = mp.S;
    var canale = function (s, m, n) {
      return '<feDisplacementMap in="SourceGraphic" in2="m" scale="' + s.toFixed(2) + '" xChannelSelector="R" yChannelSelector="G" result="d' + n + '"/>' +
        '<feColorMatrix in="d' + n + '" type="matrix" values="' + m + '" result="c' + n + '"/>';
    };
    v = nuovoFiltro(key, w, h,
      '<feImage href="' + mp.url + '" x="0" y="0" width="' + w + '" height="' + h + '" preserveAspectRatio="none" result="m"/>' +
      canale(S * (1 + k), '1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0', 'r') +
      canale(S, '0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0', 'g') +
      canale(S * (1 - k), '0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0', 'b') +
      '<feComposite in="cr" in2="cg" operator="arithmetic" k2="1" k3="1" result="rg"/>' +
      '<feComposite in="rg" in2="cb" operator="arithmetic" k2="1" k3="1"/>');
    v.luce = filoLuce(w, h, r, 0.5 * p);
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
  function Goccia(host, o) {
    this.host = host; this.o = o;
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    /* o.layer(): dove mettere la goccia. Fuori dal vetro della pillola, così (come sull'app) ingrandisce
       sia la pillola sia quello che c'è dietro: dentro un vetro vedrebbe solo il vetro */
    var ly = o.layer && o.layer();
    if (ly && getComputedStyle(ly).position === 'static') ly.style.position = 'relative';
    var d = document.createElement('span');
    d.className = 'oz-goccia';
    d.setAttribute('aria-hidden', 'true');
    var l = document.createElement('span');
    l.className = 'oz-goccia-lente';
    d.appendChild(l);
    this.d = d; this.l = l;
    this.s = { x: 0, w: 0, t: 0, h: 0, a: 0, g: 0, st: 0, sk: 0, vx: 0, vw: 0, vt: 0, vh: 0, va: 0, vg: 0, vst: 0, vsk: 0 };
    this.hov = null; this.down = false; this.moved = false; this.px = 0; this.x0 = 0; this.raf = 0; this.last = 0; this.pid = null;
    var self = this;
    this.on = {
      move: function (e) { if (!self.down) self.move(e); },
      leave: function () { if (!self.down && self.hov) { self.hov = null; self.kick(); } },
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
  Goccia.prototype.strato = function () { return (this.o.layer && this.o.layer()) || this.host; };
  Goccia.prototype.attach = function () { var ly = this.strato(); if (this.d.parentNode !== ly) ly.appendChild(this.d); };
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
    this.down = false; this.lens = false; clearTimeout(this.tLens);
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
        this.accendi();
      }
      this.kick();
      return;
    }
    if (e.pointerType === 'touch') return;
    var it = this.rects(), i = this.at(it, this.local(e)), el = i >= 0 ? it[i].el : null;
    if (el !== this.hov) {
      this.hov = el; this.kick();
      /* una voce tagliata dal bordo: la pillola scorre per mostrarla intera */
      if (el && this.o.reveal) this.o.reveal(el);
    }
  };
  Goccia.prototype.press = function (e) {
    if (e.button) return;
    var it = this.rects(), i = this.at(it, this.local(e));
    if (i < 0) return;
    this.down = true; this.moved = false; this.lens = false; this.px = this.x0 = this.local(e);
    this.hov = it[i].el;
    this.ascolta(true);
    /* un clic veloce sceglie e basta; tenendo premuto (o trascinando) la goccia diventa una lente */
    var self = this;
    clearTimeout(this.tLens);
    this.tLens = setTimeout(function () { if (self.down) self.accendi(); }, 170);
    this.kick();
  };
  Goccia.prototype.accendi = function () {
    if (this.lens || !this.down) return;
    this.lens = true;
    this.s.vst += 2.6;
    /* con la lente vera la goccia ingrandisce quello che ha sotto; senza, mostra una copia ingrandita delle voci */
    if (!LENTE) this.lente(this.rects());
    this.kick();
  };
  Goccia.prototype.release = function () {
    if (!this.down) return;
    this.down = false; this.lens = false; clearTimeout(this.tLens);
    this.ascolta(false);
    if (this.pid != null) { try { this.host.releasePointerCapture(this.pid); } catch (err) {} this.pid = null; }
    if (this.moved) {
      var it = this.rects();
      if (it.length) {
        var i = this.nearest(it, this.px);
        this.hov = it[i].el;
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
    var it = this.rects(), s = this.s, sw = this.o.swell == null ? 6 : this.o.swell, T;
    if (!it.length) return { x: s.x, w: s.w, t: s.t, h: s.h, a: 0, g: 0 };
    if (this.down && this.lens) {
      var n = this.nearest(it, this.px), w = it[n].w + 14, f = it[0], z = it[it.length - 1];
      var cx = Math.max(f.x + f.w / 2, Math.min(z.x + z.w / 2, this.px));
      T = { x: cx - w / 2, w: w, t: it[n].y - sw, h: it[n].h + sw * 2, a: 1, g: 1 };
    } else {
      var hi = -1;
      if (this.hov) for (var q = 0; q < it.length; q++) if (it[q].el === this.hov) { hi = q; break; }
      var i = hi >= 0 ? hi : this.o.sel();
      if (i < 0 || i >= it.length) return { x: s.x, w: s.w, t: s.t, h: s.h, a: 0, g: 0 };
      T = { x: it[i].x, w: it[i].w, t: it[i].y, h: it[i].h, a: 1, g: 0 };
    }
    var c = this.o.clip && this.o.clip();
    if (c) {
      var L = Math.max(T.x, c.l), R = Math.min(T.x + T.w, c.r);
      if (R - L < 24) { L = Math.min(L, c.r - 24); R = L + 24; }
      T.x = L; T.w = R - L;
    }
    return T;
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
    var lens = this.down && this.lens, k = lens ? 700 : 380, c = lens ? 30 : 19, m = false;
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
    var W = r(Math.max(0, s.w)), H = r(Math.max(0, s.h)), filtro = '';
    if (LENTE && g > 0.02 && s.w > 8 && s.h > 8) {
      /* premuta: la lente vera, come la goccia dell'app (lente 10dp/14dp, ingrandimento 1,22, colori separati ai bordi) */
      W = Math.round(s.w); H = Math.round(s.h);
      var f = filtroGoccia(W, H, Math.max(0.1, Math.round(g * 10) / 10));
      filtro = 'url(#' + f.id + ')';
      var scuro = !chiaro();
      var vr = scuro ? [255, 42] : [0, 255], va = scuro ? [0.11, 0.22] : [0.07, 0.18];
      var c0 = Math.round(vr[0] + (vr[1] - vr[0]) * g), c1 = scuro ? Math.round(255 + (45 - 255) * g) : c0, c2 = scuro ? Math.round(255 + (53 - 255) * g) : c0;
      bg = 'url("' + f.luce + '") 0 0 / 100% 100% no-repeat, rgba(' + c0 + ',' + c1 + ',' + c2 + ',' + r(va[0] + (va[1] - va[0]) * g) + ')';
      sh = '0 ' + r(6 * g) + 'px ' + r(16 * g) + 'px rgba(0,0,0,' + r((scuro ? 0.35 : 0.16) * g) + '), inset 0 0 ' + r(8 * g) + 'px rgba(0,0,0,' + r((scuro ? 0.25 : 0.1) * g) + ')';
    }
    if (d.__filtro !== filtro) { d.__filtro = filtro; d.style.webkitBackdropFilter = filtro; d.style.backdropFilter = filtro; }
    var sc = this.scarto();
    d.style.left = r(s.x + sc.x) + 'px'; d.style.top = r(s.t + sc.y) + 'px';
    d.style.width = W + 'px'; d.style.height = H + 'px';
    d.style.opacity = r(Math.max(0, Math.min(1, s.a)));
    d.style.transform = 'scale(' + r(1 + s.st) + ', ' + r(1 - s.st * 0.55) + ')';
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

  /* la pillola: i tasti visibili (il microfono e la fotocamera con la loro freccina contano come uno) */
  var usato = -1;
  function vociPillola(bar) {
    return Array.prototype.slice.call(bar.children).filter(function (el) {
      return !el.classList.contains('oz-goccia') && el.offsetWidth > 0 && el.offsetHeight > 0;
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
    goccia(bar, {
      items: function () { return vociPillola(bar); },
      sel: function () { return usato; },
      pill: function () { return bar; },
      layer: function () { return bar.parentElement; },
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
      swell: 4
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
