/* GmCat Share (Turtle, 2026-11-15): one share dialog for every free download page (art, wallpapers, later comics + videos).
   Shares the SHORT link (e.g. https://art.gmcat.io/a/chess-3f6c), which forwards to the full descriptive page.
   Use:  <button type="button" class="btn" data-share data-share-url="https://art.gmcat.io/a/chess-3f6c"
                 data-share-title="GmCat playing chess" data-share-image="https://art.gmcat.io/art/files/gmcat-playing-chess.jpg">Share</button>
   or from script: gmShare({url, title, image}).  QR codes need /vendor/qrcode.js (loaded on first use). */
(function () {
  "use strict";
  var dlg, cur = {};
  var css = "" +
    "#gm-share{width:min(440px,calc(100% - 24px));padding:0;border:1px solid var(--line,#ccc);border-radius:18px;background:var(--panel,#fff);color:var(--cream,#222)}" +
    "#gm-share::backdrop{background:#05020bcc}" +
    "#gm-share .gs-body{padding:24px 22px 22px}" +
    "#gm-share h2{margin:0 36px 14px 0;font-size:1.25rem}" +
    "#gm-share .gs-x{position:absolute;top:10px;right:12px;width:40px;height:40px;border-radius:50%;border:1px solid var(--line,#ccc);background:var(--panel2,#f4f4f4);color:inherit;font-size:24px;cursor:pointer}" +
    "#gm-share .gs-link{display:flex;gap:8px;margin-bottom:16px}" +
    "#gm-share .gs-link input{flex:1;min-width:0;font:inherit;font-size:14px;padding:10px 12px;border-radius:10px;border:1px solid var(--line,#ccc);background:var(--tint,#fafafa);color:inherit}" +
    "#gm-share .gs-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}" +
    "#gm-share .gs-t{display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 4px;border-radius:12px;border:1px solid var(--line,#ccc);background:var(--tint,#fafafa);color:inherit;font:inherit;font-size:12px;font-weight:700;text-decoration:none;cursor:pointer}" +
    "#gm-share .gs-t:hover{border-color:var(--orange,#9aa3dd)}" +
    "#gm-share .gs-t svg{width:26px;height:26px}" +
    "#gm-share .gs-qr{text-align:center;margin-top:16px}#gm-share .gs-qr canvas{width:min(240px,100%);height:auto;border-radius:8px}" +
    "@media (max-width:380px){#gm-share .gs-grid{grid-template-columns:repeat(3,1fr)}}";
  var I = {
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.8 3h3.1l-6.8 7.8 8 10.2h-6.3l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.9 3h6.4l4.4 5.9zm-1.1 16.2h1.7L7.4 4.7H5.6z"/></svg>',
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#e60023" d="M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.3-5.4s-.3-.7-.3-1.6c0-1.5.9-2.6 2-2.6.9 0 1.4.7 1.4 1.5 0 .9-.6 2.3-.9 3.6-.3 1.1.5 1.9 1.6 1.9 1.9 0 3.3-2 3.3-4.9 0-2.6-1.8-4.4-4.5-4.4-3 0-4.8 2.3-4.8 4.6 0 .9.4 1.9.8 2.4l.1.4-.3 1.2c0 .2-.2.3-.4.2-1.3-.6-2.1-2.5-2.1-4.1 0-3.3 2.4-6.4 7-6.4 3.7 0 6.5 2.6 6.5 6.1 0 3.7-2.3 6.6-5.5 6.6-1.1 0-2.1-.6-2.5-1.2l-.7 2.6c-.2.9-.9 2.1-1.4 2.8A10 10 0 1 0 12 2z"/></svg>',
    fb: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#1877f2" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z"/></svg>',
    rd: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#ff4500"/><path fill="#fff" d="M19 12a1.6 1.6 0 0 0-2.7-1.1 7.8 7.8 0 0 0-4.2-1.3l.7-3.4 2.4.5a1.1 1.1 0 1 0 .1-.7l-2.7-.6-.8 3.9a7.8 7.8 0 0 0-4.3 1.3A1.6 1.6 0 1 0 5.8 13a3 3 0 0 0 0 .5c0 2.5 2.8 4.5 6.2 4.5s6.2-2 6.2-4.5V13a1.6 1.6 0 0 0 .8-1zm-10.4 1.1a1.1 1.1 0 1 1 1.1 1.1 1.1 1.1 0 0 1-1.1-1.1zm6.2 2.9a4.2 4.2 0 0 1-2.8.9 4.2 4.2 0 0 1-2.8-.9.3.3 0 0 1 .4-.4 3.6 3.6 0 0 0 2.4.7 3.6 3.6 0 0 0 2.4-.7.3.3 0 1 1 .4.4zm-.2-1.8a1.1 1.1 0 1 1 1.1-1.1 1.1 1.1 0 0 1-1.1 1.1z"/></svg>',
    wa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#25d366" d="M12 1.5A10.4 10.4 0 0 0 3 17.1L1.5 22.5l5.5-1.4A10.4 10.4 0 1 0 12 1.5z"/><path fill="#fff" d="M17.4 14.6c-.3-.1-1.7-.8-2-.9s-.5-.1-.7.1-.8 1-.9 1.2-.3.2-.6.1a7.5 7.5 0 0 1-3.7-3.2c-.3-.5.3-.5.8-1.6.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6a1.1 1.1 0 0 0-.8.4 3.4 3.4 0 0 0-1 2.5 5.9 5.9 0 0 0 1.2 3.1 13.5 13.5 0 0 0 5.2 4.6c1.9.8 2.7.9 3.6.7a3.1 3.1 0 0 0 2-1.4 2.5 2.5 0 0 0 .2-1.4c-.1-.1-.3-.2-.6-.3z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M3 5h18v14H3zM3 6l9 7 9-7"/></svg>',
    qr: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 3h8v8H3zm2 2v4h4V5zm8-2h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm8-2h3v3h-3zm3 3h3v3h-3zm3-3h2v3h-2zm-6 6h3v2h-3zm6 0h2v2h-2z"/></svg>',
    more: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M12 3v12M7 8l5-5 5 5M5 13v8h14v-8"/></svg>'
  };
  function enc(s) { return encodeURIComponent(s || ""); }
  function safeName(s) { return (s || "GmCat").replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim(); }
  function track(ev, meta) { try { if (window.gmcatInsights) gmcatInsights.track(ev, meta); } catch (e) {} }
  function tile(label, icon, href) {
    var el = document.createElement(href ? "a" : "button");
    el.className = "gs-t"; el.innerHTML = icon + "<span></span>"; el.lastChild.textContent = label;
    if (href) { el.href = href; el.target = "_blank"; el.rel = "noopener"; } else el.type = "button";
    el.addEventListener("click", function () { track("share", { to: label, url: cur.url }); });
    return el;
  }
  function loadQR(done) {
    if (window.qrcode) return done();
    var s = document.createElement("script"); s.src = "/vendor/qrcode.js"; s.onload = done; document.head.appendChild(s);
  }
  function drawQR(canvas) {
    var qr = qrcode(0, "M"); qr.addData(cur.url); qr.make();
    var n = qr.getModuleCount(), quiet = 4, cell = Math.max(4, Math.floor(480 / (n + quiet * 2))), size = cell * (n + quiet * 2), cx = canvas.getContext("2d");
    canvas.width = canvas.height = size; cx.fillStyle = "#fff"; cx.fillRect(0, 0, size, size); cx.fillStyle = "#1e2537";
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (qr.isDark(r, c)) cx.fillRect((c + quiet) * cell, (r + quiet) * cell, cell, cell);
  }
  function build() {
    var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    dlg = document.createElement("dialog"); dlg.id = "gm-share"; dlg.setAttribute("aria-labelledby", "gs-title");
    dlg.innerHTML = '<button class="gs-x" type="button" aria-label="Close">×</button><div class="gs-body"><h2 id="gs-title">Share</h2>' +
      '<div class="gs-link"><label class="skip" for="gs-url">Short link</label><input id="gs-url" readonly><button class="btn primary" type="button" id="gs-copy">Copy link</button></div>' +
      '<div class="gs-grid" id="gs-grid"></div><div class="gs-qr" id="gs-qr" hidden><canvas aria-label="QR code for this page"></canvas>' +
      '<div class="btn-row" style="justify-content:center"><button class="btn" type="button" id="gs-qrsave">Save QR code</button></div></div></div>';
    document.body.appendChild(dlg);
    dlg.querySelector(".gs-x").onclick = function () { dlg.close(); };
    dlg.addEventListener("click", function (ev) { if (ev.target === dlg) dlg.close(); });
    dlg.querySelector("#gs-copy").onclick = function () {
      var b = this, inp = dlg.querySelector("#gs-url");
      var ok = function () { b.textContent = "Copied!"; track("share", { to: "Copy link", url: cur.url }); };
      if (navigator.clipboard) navigator.clipboard.writeText(cur.url).then(ok, function () { inp.select(); });
      else { inp.select(); try { document.execCommand("copy"); ok(); } catch (e) {} }
    };
    dlg.querySelector("#gs-qrsave").onclick = function () {
      var a = document.createElement("a"); a.href = dlg.querySelector("#gs-qr canvas").toDataURL("image/png");
      a.download = safeName(cur.title) + " - QR code [GmCat.io].png"; a.click();
    };
  }
  window.gmShare = function (o) {
    if (!dlg) build();
    cur = { url: o.url || location.href, title: o.title || document.title, image: o.image || "" };
    var text = cur.title + " · GmCat.io";
    dlg.querySelector("#gs-title").textContent = o.heading || "Share";
    dlg.querySelector("#gs-url").value = cur.url;
    dlg.querySelector("#gs-copy").textContent = "Copy link";
    dlg.querySelector("#gs-qr").hidden = true;
    var g = dlg.querySelector("#gs-grid"); g.textContent = "";
    g.appendChild(tile("X", I.x, "https://x.com/intent/post?text=" + enc(text) + "&url=" + enc(cur.url) + "&via=GmCatIO"));
    g.appendChild(tile("Pinterest", I.pin, "https://www.pinterest.com/pin/create/button/?url=" + enc(cur.url) + "&media=" + enc(cur.image) + "&description=" + enc(text)));
    g.appendChild(tile("Facebook", I.fb, "https://www.facebook.com/sharer/sharer.php?u=" + enc(cur.url)));
    g.appendChild(tile("Reddit", I.rd, "https://www.reddit.com/submit?url=" + enc(cur.url) + "&title=" + enc(text)));
    g.appendChild(tile("WhatsApp", I.wa, "https://wa.me/?text=" + enc(text + " " + cur.url)));
    g.appendChild(tile("Email", I.mail, "mailto:?subject=" + enc(text) + "&body=" + enc(cur.title + "\n" + cur.url)));
    var q = tile("QR code", I.qr); q.onclick = function () {
      track("share", { to: "QR code", url: cur.url });
      loadQR(function () { drawQR(dlg.querySelector("#gs-qr canvas")); dlg.querySelector("#gs-qr").hidden = false; });
    };
    g.appendChild(q);
    if (navigator.share) {
      var m = tile("More apps", I.more); m.onclick = function () { navigator.share({ title: text, url: cur.url }).catch(function () {}); track("share", { to: "More apps", url: cur.url }); };
      g.appendChild(m);
    }
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
  };
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest && ev.target.closest("[data-share]");
    if (!b) return;
    ev.preventDefault();
    gmShare({ url: b.getAttribute("data-share-url"), title: b.getAttribute("data-share-title"), image: b.getAttribute("data-share-image"), heading: b.getAttribute("data-share-heading") });
  });
})();
