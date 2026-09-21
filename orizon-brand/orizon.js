(function () {
  var f = null;
  function show() {
    if (f) return;
    f = document.createElement('iframe');
    f.src = '/brand/pages/welcome.html';
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
  function fix() {
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) {
      if (m.content !== '#1A0AAF') m.content = '#1A0AAF';
    });
  }
  fix();
  new MutationObserver(fix).observe(document.head, { childList: true, subtree: true, attributes: true });
})();
