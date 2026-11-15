/* GmCat Toolbox: unit converter. Each unit is [label, size in the category's base unit]. */
(function () {
  "use strict";
  var CUP = 236.5882365; /* mL in a US cup */
  var CATS = {
    length: { name: "Length", base: "m", def: ["ft", "m"], units: {
      mm: ["Millimeters", 0.001], cm: ["Centimeters", 0.01], m: ["Meters", 1], km: ["Kilometers", 1000],
      in: ["Inches", 0.0254], ft: ["Feet", 0.3048], yd: ["Yards", 0.9144], mi: ["Miles", 1609.344], nmi: ["Nautical miles", 1852] } },
    weight: { name: "Weight", def: ["lb", "kg"], units: {
      mg: ["Milligrams", 0.001], g: ["Grams", 1], kg: ["Kilograms", 1000], t: ["Metric tonnes", 1e6],
      oz: ["Ounces", 28.349523125], lb: ["Pounds", 453.59237], st: ["Stone", 6350.29318], ton: ["US tons", 907184.74] } },
    volume: { name: "Volume", def: ["gal", "l"], units: {
      ml: ["Milliliters", 1], l: ["Liters", 1000], tsp: ["Teaspoons (US)", 4.92892159375], tbsp: ["Tablespoons (US)", 14.78676478125],
      floz: ["Fluid ounces (US)", 29.5735295625], cup: ["Cups (US)", CUP], mcup: ["Cups (metric)", 250],
      pt: ["Pints (US)", 473.176473], qt: ["Quarts (US)", 946.352946], gal: ["Gallons (US)", 3785.411784],
      ukpt: ["Pints (UK)", 568.26125], ukgal: ["Gallons (UK)", 4546.09], m3: ["Cubic meters", 1e6] } },
    temp: { name: "Temperature", def: ["f", "c"], units: { c: ["Celsius (°C)"], f: ["Fahrenheit (°F)"], k: ["Kelvin (K)"] } },
    cooking: { name: "Cooking", def: ["cup", "g"], units: {
      tsp: ["Teaspoons", 4.92892159375, "v"], tbsp: ["Tablespoons", 14.78676478125, "v"], floz: ["Fluid ounces", 29.5735295625, "v"],
      cup: ["Cups (US)", CUP, "v"], mcup: ["Cups (metric)", 250, "v"], ml: ["Milliliters", 1, "v"], l: ["Liters", 1000, "v"],
      g: ["Grams", 1, "w"], kg: ["Kilograms", 1000, "w"], oz: ["Ounces (weight)", 28.349523125, "w"], lb: ["Pounds", 453.59237, "w"] } },
    speed: { name: "Speed", def: ["mph", "kmh"], units: {
      ms: ["Meters per second", 1], kmh: ["Kilometers per hour", 1 / 3.6], mph: ["Miles per hour", 0.44704],
      kn: ["Knots", 1852 / 3600], fts: ["Feet per second", 0.3048] } },
    area: { name: "Area", def: ["ft2", "m2"], units: {
      cm2: ["Square centimeters", 1e-4], m2: ["Square meters", 1], ha: ["Hectares", 1e4], km2: ["Square kilometers", 1e6],
      in2: ["Square inches", 0.00064516], ft2: ["Square feet", 0.09290304], yd2: ["Square yards", 0.83612736],
      ac: ["Acres", 4046.8564224], mi2: ["Square miles", 2589988.110336] } },
    time: { name: "Time", def: ["h", "min"], units: {
      s: ["Seconds", 1], min: ["Minutes", 60], h: ["Hours", 3600], d: ["Days", 86400], wk: ["Weeks", 604800],
      yr: ["Years (365.25 days)", 31557600] } }
  };
  /* Grams per US cup (spooned and leveled where it matters). */
  var INGREDIENTS = [
    ["All-purpose flour", 120], ["Whole wheat flour", 113], ["Granulated sugar", 200], ["Brown sugar (packed)", 213],
    ["Powdered sugar", 113], ["Butter", 227], ["Water", 236.6], ["Milk", 244], ["Vegetable oil", 218], ["Honey", 340],
    ["Rolled oats", 89], ["White rice (uncooked)", 185], ["Cocoa powder", 85], ["Chocolate chips", 170], ["Table salt", 288]
  ];
  var NOTES = {
    cooking: "Cooking weights are typical values and vary with how you fill the cup. Spoons and fluid ounces are US sizes.",
    volume: "US and UK pints and gallons are different sizes, so check which one your recipe or label uses.",
    time: "A year here is 365.25 days, the average including leap years."
  };

  var $ = function (id) { return document.getElementById(id); };
  var tabs = $("uc-tabs"), fromSel = $("uc-from"), toSel = $("uc-to"), fromVal = $("uc-from-val"), toVal = $("uc-to-val");
  var ingSel = $("uc-ing"), ingWrap = $("uc-ing-wrap"), all = $("uc-all"), sentence = $("uc-sentence"), note = $("uc-note");
  var cat = "length";
  var display = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 7 });

  function fmt(n) {
    if (!isFinite(n)) return "—";
    var a = Math.abs(n);
    if (a !== 0 && (a < 1e-6 || a >= 1e15)) return n.toExponential(4);
    return display.format(n);
  }
  function raw(n) { /* value for an <input type=number> */
    if (!isFinite(n)) return "";
    return String(parseFloat(n.toPrecision(10)));
  }

  /* Convert value x from unit a to unit b in the current category. */
  function convert(x, a, b) {
    if (cat === "temp") {
      var c = a === "c" ? x : a === "f" ? (x - 32) * 5 / 9 : x - 273.15;
      return b === "c" ? c : b === "f" ? c * 9 / 5 + 32 : c + 273.15;
    }
    var U = CATS[cat].units;
    var base = x * U[a][1];
    if (cat === "cooking" && U[a][2] !== U[b][2]) {
      var gPerMl = INGREDIENTS[+ingSel.value][1] / CUP;
      base = U[a][2] === "v" ? base * gPerMl : base / gPerMl;
    }
    return base / U[b][1];
  }

  function fillUnits() {
    var C = CATS[cat], opts = "";
    Object.keys(C.units).forEach(function (k) { opts += '<option value="' + k + '">' + C.units[k][0] + "</option>"; });
    fromSel.innerHTML = opts; toSel.innerHTML = opts;
    fromSel.value = C.def[0]; toSel.value = C.def[1];
    ingWrap.hidden = cat !== "cooking";
    note.textContent = NOTES[cat] || "";
  }

  var SYM = { mm: "mm", cm: "cm", m: "m", km: "km", in: "in", ft: "ft", yd: "yd", mi: "mi", nmi: "nmi",
    mg: "mg", g: "g", kg: "kg", t: "t", oz: "oz", lb: "lb", st: "st", ton: "US tons", ml: "mL", l: "L", tsp: "tsp", tbsp: "tbsp",
    floz: "fl oz", cup: "cups (US)", mcup: "cups (metric)", pt: "US pints", qt: "US quarts", gal: "US gallons", ukpt: "UK pints",
    ukgal: "UK gallons", m3: "m\u00b3", c: "\u00b0C", f: "\u00b0F", k: "K", ms: "m/s", kmh: "km/h", mph: "mph", kn: "knots",
    fts: "ft/s", cm2: "cm\u00b2", m2: "m\u00b2", ha: "hectares", km2: "km\u00b2", in2: "sq in", ft2: "sq ft", yd2: "sq yd",
    ac: "acres", mi2: "sq mi", s: "sec", min: "min", h: "hours", d: "days", wk: "weeks", yr: "years" };
  function short(k) { return SYM[k] || k; }

  function render(from) {
    var a = fromSel.value, b = toSel.value;
    if (from === "to") {
      var y = parseFloat(toVal.value);
      fromVal.value = isFinite(y) ? raw(convert(y, b, a)) : "";
    } else {
      var x0 = parseFloat(fromVal.value);
      toVal.value = isFinite(x0) ? raw(convert(x0, a, b)) : "";
    }
    var x = parseFloat(fromVal.value);
    if (!isFinite(x)) { sentence.textContent = "Enter a number to convert."; all.innerHTML = ""; return; }
    var r = convert(x, a, b);
    var ing = cat === "cooking" && CATS.cooking.units[a][2] !== CATS.cooking.units[b][2] ? " of " + INGREDIENTS[+ingSel.value][0].toLowerCase() : "";
    sentence.innerHTML = "<b>" + fmt(x) + " " + short(a) + "</b>" + ing + " = <b>" + fmt(r) + " " + short(b) + "</b>";
    var html = "";
    Object.keys(CATS[cat].units).forEach(function (k) {
      if (k === a) return;
      html += '<div class="uc-cell' + (k === b ? " on" : "") + '"><b>' + fmt(convert(x, a, k)) + "</b><span>" + CATS[cat].units[k][0] + "</span></div>";
    });
    all.innerHTML = html;
  }

  function pick(k) {
    cat = k;
    tabs.querySelectorAll("button").forEach(function (t) {
      var on = t.dataset.cat === k;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    });
    fillUnits();
    render("from");
  }

  Object.keys(CATS).forEach(function (k) {
    var t = document.createElement("button");
    t.type = "button"; t.className = "tab"; t.dataset.cat = k; t.setAttribute("role", "tab"); t.textContent = CATS[k].name;
    t.addEventListener("click", function () { pick(k); });
    tabs.appendChild(t);
  });
  tabs.addEventListener("keydown", function (ev) {
    if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
    var keys = Object.keys(CATS), i = keys.indexOf(cat);
    i = (i + (ev.key === "ArrowRight" ? 1 : keys.length - 1)) % keys.length;
    pick(keys[i]);
    tabs.querySelector('[data-cat="' + keys[i] + '"]').focus();
  });
  ingSel.innerHTML = INGREDIENTS.map(function (g, i) { return '<option value="' + i + '">' + g[0] + "</option>"; }).join("");

  fromVal.addEventListener("input", function () { render("from"); });
  toVal.addEventListener("input", function () { render("to"); });
  fromSel.addEventListener("change", function () { render("from"); });
  toSel.addEventListener("change", function () { render("from"); });
  ingSel.addEventListener("change", function () { render("from"); });
  $("uc-swap").addEventListener("click", function () {
    var a = fromSel.value; fromSel.value = toSel.value; toSel.value = a;
    fromVal.value = toVal.value || fromVal.value;
    render("from");
  });

  pick("length");
})();
