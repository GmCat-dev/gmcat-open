(function () {
  "use strict";
  var fg = document.getElementById("cc-fg"), bg = document.getElementById("cc-bg");
  var fgp = document.getElementById("cc-fg-picker"), bgp = document.getElementById("cc-bg-picker");
  function valid(v) { return /^#[0-9a-f]{6}$/i.test(v); }
  function luminance(hex) {
    return [1, 3, 5].map(function (i) { var n = parseInt(hex.slice(i, i + 2), 16) / 255; return n <= .04045 ? n / 12.92 : Math.pow((n + .055) / 1.055, 2.4); })
      .reduce(function (sum, n, i) { return sum + n * [.2126, .7152, .0722][i]; }, 0);
  }
  function result(id, pass) { var el = document.getElementById(id); el.textContent = pass ? "Pass" : "Fail"; el.className = pass ? "pass" : "fail"; }
  function update() {
    var a = fg.value.trim(), b = bg.value.trim();
    fg.classList.toggle("invalid", !valid(a)); bg.classList.toggle("invalid", !valid(b));
    if (!valid(a) || !valid(b)) return;
    fgp.value = a; bgp.value = b;
    var l1 = luminance(a), l2 = luminance(b), ratio = (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05);
    document.getElementById("cc-ratio").textContent = ratio.toFixed(2) + ":1";
    document.getElementById("cc-summary").textContent = ratio >= 7 ? "Excellent contrast" : ratio >= 4.5 ? "Good contrast" : ratio >= 3 ? "Works for large text only" : "More contrast needed";
    result("cc-aa", ratio >= 4.5); result("cc-aa-large", ratio >= 3); result("cc-aaa", ratio >= 7);
    var p = document.getElementById("cc-preview"); p.style.color = a; p.style.backgroundColor = b;
  }
  [[fg, fgp], [bg, bgp]].forEach(function (pair) {
    pair[0].addEventListener("input", update);
    pair[1].addEventListener("input", function () { pair[0].value = pair[1].value; update(); });
  });
  document.getElementById("cc-swap").addEventListener("click", function () { var x = fg.value; fg.value = bg.value; bg.value = x; update(); });
  update();
})();
