(function () {
  "use strict";
  var incoming = new URLSearchParams(location.search);
  /* Shared links made before the recipient page existed carried a type (and
     sometimes a message) on /cards/. Art and reply links carry only ?art=. */
  if (incoming.has("type") || incoming.has("message")) {
    location.replace("/cards/view/?" + incoming.toString());
    return;
  }
  var TYPES = {
    "encouragement": { label: "A little encouragement", bg: "#f7eadc", ink: "#342641", accent: "#e98261" },
    "thank-you": { label: "Thank you", bg: "#e5f0e8", ink: "#24382d", accent: "#4f9b70" },
    "birthday": { label: "Happy birthday", bg: "#f5e5ee", ink: "#40263a", accent: "#d86f9c" },
    "sympathy": { label: "Thinking of you", bg: "#e9e8f2", ink: "#2e2d42", accent: "#7773a8" },
    "just-because": { label: "Just because", bg: "#f7efcf", ink: "#3e3422", accent: "#d79d3f" }
  };
  var $ = function (id) { return document.getElementById(id); };
  var all = [], filtered = [], selected = null, visible = 24, image = new Image(), drawTimer;
  var canvas = $("kind-card"), ctx = canvas.getContext("2d"), status = $("card-status");

  function safeParams() {
    var p = new URLSearchParams(location.search), type = p.get("type"), message = p.get("message") || "", art = p.get("art") || "";
    if (!TYPES[type]) type = "encouragement";
    if (message.length > 160) { message = ""; status.textContent = "That shared message was too long, so it was left out."; }
    return { art: /^[a-z0-9-]{8,40}$/i.test(art) ? art : "", type: type, message: message.replace(/[\u0000-\u001f\u007f]/g, " ") };
  }

  /* Short card links (Turtle, 2026-11-15): /c/<6 art chars>-<type letter><suggested message number>. Nothing is stored:
     a suggested message travels as its number; the sender's own words travel after "#", which browsers never send to the server. */
  var CODES = { "encouragement": "e", "thank-you": "t", "birthday": "b", "sympathy": "s", "just-because": "j" };
  function ownMessage() {
    var m = $("card-message").value.trim(), list = (window.KIND_CARD_MESSAGES || {})[$("card-type").value] || [];
    return m && list.indexOf(m) === -1;
  }
  var SEALS = { red: "r", coral: "c", green: "g", pink: "p", lavender: "l", gold: "y" };
  function sealChoice() { var c = document.querySelector('input[name="card-seal"]:checked'); return window.KIND_SEAL_PICKER && c && SEALS[c.value] ? c.value : ""; }
  function cardUrl() {
    var type = $("card-type").value, message = $("card-message").value.trim(), seal = sealChoice(), sealPart = seal ? "-" + SEALS[seal] : "";
    if (window.KIND_SHORT_LINKS && selected && CODES[type]) {
      var list = (window.KIND_CARD_MESSAGES || {})[type] || [], n = list.indexOf(message);
      var code = location.origin + "/c/" + selected.i.replace(/^gmcat-/, "").slice(0, 6) + "-" + CODES[type];
      if (!message) return code + sealPart;
      if (n >= 0) return code + (n + 1) + sealPart;
      return code + sealPart + "#" + encodeURIComponent(message).replace(/%20/g, "+");
    }
    var p = new URLSearchParams();
    if (selected) p.set("art", selected.i);
    p.set("type", $("card-type").value);
    var message = $("card-message").value.trim();
    if (message) p.set("message", message);
    if (seal) p.set("seal", seal);
    return location.origin + "/cards/view/?" + p.toString();
  }

  function updateUrl() {
    try { history.replaceState(null, "", selected ? "/cards/?art=" + encodeURIComponent(selected.i) : "/cards/"); } catch (e) { /* preview still works */ }
  }

  function renderChoices() {
    var box = $("card-art-results"); box.textContent = "";
    filtered.slice(0, visible).forEach(function (item) {
      var b = document.createElement("button"), pic = document.createElement("img");
      b.type = "button"; b.className = "card-art-choice" + (selected && selected.i === item.i ? " active" : "");
      b.title = item.t; b.setAttribute("aria-label", "Use " + item.t); pic.src = "https://art.gmcat.io/a/t/" + item.i + ".webp"; pic.alt = ""; pic.loading = "lazy";
      b.appendChild(pic); b.addEventListener("click", function () { choose(item); }); box.appendChild(b);
    });
    $("card-more").hidden = visible >= filtered.length;
  }

  function choose(item) {
    selected = item; renderChoices(); status.textContent = "Loading “" + item.t + "”…";
    image.onload = function () { status.textContent = ""; draw(); };
    image.onerror = function () { status.textContent = "This artwork could not load. Please choose another."; drawPlaceholder(); };
    image.src = "/art/" + item.i + ".jpg";
    updateUrl();
  }

  function cover(img, x, y, w, h) {
    var scale = Math.max(w / img.naturalWidth, h / img.naturalHeight), sw = w / scale, sh = h / scale;
    ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
  }

  function rounded(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function lines(text, maxWidth, maxLines) {
    var words = text.trim().split(/\s+/).filter(Boolean), out = [], line = "";
    words.forEach(function (word) {
      var test = line ? line + " " + word : word;
      if (ctx.measureText(test).width <= maxWidth || !line) line = test;
      else { out.push(line); line = word; }
    });
    if (line) out.push(line);
    if (out.length > maxLines) { out = out.slice(0, maxLines); while (ctx.measureText(out[maxLines - 1] + "…").width > maxWidth) out[maxLines - 1] = out[maxLines - 1].slice(0, -1); out[maxLines - 1] += "…"; }
    return out;
  }

  function drawPlaceholder() {
    var style = TYPES[$("card-type").value]; ctx.fillStyle = style.bg; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = style.ink; ctx.textAlign = "center"; ctx.font = "700 44px sans-serif"; ctx.fillText("Choose a GmCat artwork", 540, 620);
  }

  function draw() {
    if (!selected || !image.complete || !image.naturalWidth) return drawPlaceholder();
    var style = TYPES[$("card-type").value], message = $("card-message").value.trim() || "A little kindness, from me to you.";
    ctx.fillStyle = style.bg; ctx.fillRect(0, 0, 1080, 1350);
    ctx.save(); rounded(54, 54, 972, 820, 34); ctx.clip(); cover(image, 54, 54, 972, 820); ctx.restore();
    ctx.fillStyle = style.accent; ctx.fillRect(54, 906, 126, 12);
    ctx.fillStyle = style.ink; ctx.textAlign = "left"; ctx.font = "800 34px sans-serif"; ctx.fillText(style.label.toUpperCase(), 54, 974);
    ctx.font = "800 54px sans-serif"; var wrapped = lines(message, 972, 4), y = 1058;
    wrapped.forEach(function (line) { ctx.fillText(line, 54, y); y += 67; });
    ctx.font = "700 25px sans-serif"; ctx.fillStyle = style.accent; ctx.fillText("GmCat Kind  •  kind.gmcat.io", 54, 1300);
    ctx.textAlign = "right"; ctx.fillText("♡", 1026, 1300); ctx.textAlign = "left";
    updateUrl();
  }

  function scheduleDraw() { clearTimeout(drawTimer); drawTimer = setTimeout(draw, 60); }

  function drawQR() {
    var qr = qrcode(0, "M"), url = cardUrl(); qr.addData(url); qr.make();
    var c = $("card-qr"), n = qr.getModuleCount(), quiet = 4, cell = Math.floor(280 / (n + quiet * 2)), size = cell * (n + quiet * 2), qx = c.getContext("2d");
    c.width = c.height = size; qx.fillStyle = "#fff"; qx.fillRect(0, 0, size, size); qx.fillStyle = "#1e2537";
    for (var r = 0; r < n; r++) for (var col = 0; col < n; col++) if (qr.isDark(r, col)) qx.fillRect((col + quiet) * cell, (r + quiet) * cell, cell, cell);
  }

  /* Suggested messages: fill the box with a real, editable message for the chosen card type, so nobody starts
     from an empty box. A new type or "Different idea" replaces it only while it's still an untouched suggestion. */
  var IDEAS = window.KIND_CARD_MESSAGES || {}, lastIdea = "";
  function pickIdea(type) {
    var list = IDEAS[type] || [], current = $("card-message").value;
    if (!list.length) return "";
    var choices = list.filter(function (m) { return m !== current; });
    return choices[Math.floor(Math.random() * choices.length)] || list[0];
  }
  function suggest(force) {
    var box = $("card-message"), untouched = !box.value.trim() || box.value === lastIdea;
    if (!force && !untouched) return;
    lastIdea = pickIdea($("card-type").value);
    box.value = lastIdea; $("card-count").textContent = lastIdea.length;
  }
  var initial = safeParams(); $("card-type").value = initial.type; $("card-message").value = initial.message; $("card-count").textContent = initial.message.length;
  if (!initial.message) suggest(false);
  fetch("/art-index.json").then(function (response) { if (!response.ok) throw Error(); return response.json(); }).then(function (data) {
    all = data.filter(function (item) { return /^[a-z0-9-]{8,40}$/i.test(item.i); }); filtered = all;
    choose(all.find(function (item) { return item.i === initial.art; }) || all[0]); renderChoices();
  }).catch(function () { status.textContent = "The artwork list could not load. Please refresh the page."; drawPlaceholder(); });
  $("card-search").addEventListener("input", function () { var term = this.value.trim().toLowerCase(); filtered = term ? all.filter(function (item) { return (item.t + " " + item.c + " " + item.s).toLowerCase().indexOf(term) !== -1; }) : all; visible = 24; renderChoices(); });
  $("card-more").addEventListener("click", function () { visible += 24; renderChoices(); });
  $("card-type").addEventListener("change", function () { suggest(false); draw(); });
  $("card-idea").addEventListener("click", function () { suggest(true); draw(); $("card-message").focus(); });
  $("card-message").addEventListener("input", function () { $("card-count").textContent = this.value.length; scheduleDraw(); });
  $("card-form").addEventListener("submit", function (event) { event.preventDefault(); });
  $("card-download").addEventListener("click", function () { draw(); var a = document.createElement("a"); if (window.gmSavePng) { var lab = (TYPES[$("card-type").value] || {}).label || "Kind card"; return gmSavePng(canvas, "GmCat Kind card - " + lab + " [GmCat.io].png", { Title: "GmCat Kind card - " + lab, Description: "A free GmCat Kind card made at kind.gmcat.io", Source: "https://kind.gmcat.io/cards/", Keywords: "GmCat; GmCat.io; GmCat Kind; kind card; pixel cat; " + lab }); } a.href = canvas.toDataURL("image/png"); a.download = "gmcat-kind-card.png"; a.click(); });
  $("card-share").addEventListener("click", function () { var url = cardUrl(); $("card-share-url").textContent = url; $("card-link-box").hidden = false; if ($("card-why")) $("card-why").hidden = !(window.KIND_SHORT_LINKS && ownMessage()); if (navigator.share) navigator.share({ title: "A GmCat Kind Card", url: url }).catch(function () {}); });
  $("card-copy").addEventListener("click", function () { var b = this, url = cardUrl(); (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { b.textContent = "Copied!"; }, function () { b.textContent = "Select the link above to copy"; }); });
  $("card-qr-show").addEventListener("click", function () { drawQR(); $("card-qr-box").hidden = false; });
  $("card-qr-save").addEventListener("click", function () { var a = document.createElement("a"); if (window.gmSavePng) return gmSavePng($("card-qr"), "GmCat Kind card - QR code [GmCat.io].png", { Title: "GmCat Kind card QR code", Source: "https://kind.gmcat.io/cards/" }); a.href = $("card-qr").toDataURL("image/png"); a.download = "gmcat-kind-card-qr.png"; a.click(); });
})();
