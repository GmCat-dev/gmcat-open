/* GmCat Toolbox: everyday calculators (percentages, tip & split, discount). */
(function () {
  "use strict";
  var money = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var plain = new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 });
  var pct = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

  function v(id) {
    var raw = document.getElementById(id).value;
    if (raw === "") return NaN;
    return parseFloat(raw);
  }
  function out(id, text) { document.getElementById(id).textContent = text; }
  function ok() { for (var i = 0; i < arguments.length; i++) if (!isFinite(arguments[i])) return false; return true; }
  var DASH = "—";

  function percentages() {
    var a = v("p1a"), b = v("p1b");
    out("p1r", ok(a, b) ? plain.format(a * b / 100) : DASH);
    a = v("p2a"); b = v("p2b");
    out("p2r", ok(a, b) && b !== 0 ? pct.format(a / b * 100) + "%" : DASH);
    a = v("p3a"); b = v("p3b");
    if (ok(a, b) && a !== 0) {
      var c = (b - a) / Math.abs(a) * 100;
      out("p3r", (c > 0 ? "+" : "") + pct.format(c) + "%" + (c > 0 ? " increase" : c < 0 ? " decrease" : ""));
    } else out("p3r", DASH);
  }

  function tips() {
    var bill = v("t-bill"), p = v("t-pct"), people = Math.max(1, Math.floor(v("t-people")) || 1);
    document.querySelectorAll("[data-tip]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(+btn.dataset.tip === p));
    });
    if (!ok(bill, p) || bill < 0) { ["t-tip", "t-total", "t-each"].forEach(function (id) { out(id, DASH); }); return; }
    var tip = bill * p / 100, total = bill + tip, each = total / people;
    if (document.getElementById("t-round").checked) {
      each = Math.ceil(each - 1e-9);
      total = each * people;
      tip = total - bill;
    }
    out("t-tip", money.format(tip));
    out("t-total", money.format(total));
    out("t-each", money.format(each) + (people > 1 ? " × " + people : ""));
  }

  function discount() {
    var price = v("d-price"), off = v("d-off"), tax = v("d-tax");
    if (!isFinite(tax)) tax = 0;
    if (!ok(price, off)) { ["d-save", "d-sale", "d-final"].forEach(function (id) { out(id, DASH); }); return; }
    var save = price * off / 100, sale = price - save;
    out("d-save", money.format(save));
    out("d-sale", money.format(sale));
    out("d-final", money.format(sale * (1 + tax / 100)));
  }

  function all() { percentages(); tips(); discount(); }

  document.querySelectorAll("[data-tip]").forEach(function (btn) {
    btn.addEventListener("click", function () { document.getElementById("t-pct").value = btn.dataset.tip; tips(); });
  });
  document.querySelectorAll(".calc input").forEach(function (el) {
    el.addEventListener("input", all);
    el.addEventListener("change", all);
  });
  all();
})();
