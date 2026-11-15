(function () {
  "use strict";
  var text = document.getElementById("rv-text"), preview = document.getElementById("rv-preview");
  var fallback = "Paste something above, then shape the page into the view that feels most comfortable for you.";
  function render() {
    preview.textContent = text.value.trim() || fallback;
    [["size", "fontSize", "px", 1], ["line", "lineHeight", "", .1], ["letter", "letterSpacing", "em", .02], ["width", "maxWidth", "ch", 1]].forEach(function (x) {
      var input = document.getElementById("rv-" + x[0]), val = +input.value * x[3];
      preview.style[x[1]] = val + x[2]; document.getElementById("rv-" + x[0] + "-out").textContent = val + x[2];
    });
  }
  text.addEventListener("input", render);
  document.querySelectorAll(".reading-controls input").forEach(function (el) { el.addEventListener("input", render); });
  document.querySelectorAll("[data-paper]").forEach(function (btn) { btn.addEventListener("click", function () {
    document.querySelectorAll("[data-paper]").forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
    preview.dataset.paper = btn.dataset.paper;
  }); });
  render();
})();
