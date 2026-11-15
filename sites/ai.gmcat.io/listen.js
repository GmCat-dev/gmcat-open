/* "Listen" button for article pages (blog posts, AI briefs).
   Reads the article aloud with the voice built into the reader's own browser (Web Speech API).
   Nothing is sent anywhere and nothing is recorded. The bar stays hidden where the browser cannot speak.
   Markup (from the build): <div class="listen" data-listen hidden></div> inside the <article>. */
(function () {
  "use strict";
  var synth = window.speechSynthesis, bar = document.querySelector("[data-listen]");
  if (!bar || !synth || !window.SpeechSynthesisUtterance) return;
  var article = bar.closest("article");
  if (!article) return;

  // What gets read: headline, summary, then the article text. Not: sources, bylines, captions, navigation.
  var SKIP = ".sources, footer, nav, figure, .eyebrow, .post-meta, .archive-note, .biscuit-box, [data-listen], pre, script, style";
  var blocks = [].filter.call(article.querySelectorAll("h1, h2, h3, h4, p, li, blockquote"), function (el) {
    if (el.closest(SKIP)) return false;
    if (el.tagName !== "LI" && el.tagName !== "BLOCKQUOTE" && el.closest("li, blockquote")) return false;   // read once, via the parent
    if (el.tagName === "LI" && el.querySelector("ul, ol")) return false;                                   // nested lists: the inner items are read
    return el.textContent.trim().length > 0;
  });
  if (!blocks.length) return;

  // Short pieces keep every browser happy (long single utterances cut out in some).
  var EMOJI = null;
  try { EMOJI = new RegExp("[\\p{Extended_Pictographic}\\uFE0F\\u200D]", "gu"); } catch (e) {}   // voices read emoji names aloud otherwise
  function pieces(el) {
    var text = el.textContent;
    if (EMOJI) text = text.replace(EMOJI, " ");
    text = text.replace(/\s+/g, " ").trim();
    if (!/[A-Za-z0-9]/.test(text)) return [];
    if (/^H\d$/.test(el.tagName) && !/[.!?:]$/.test(text)) text += ".";   // a small pause after headings
    // Sentences end at . ! ? followed by a space, so "ai.gmcat.io" and "3.5" stay whole.
    var parts = [], from = 0, m, end = /[.!?]+["'”’)\]]*\s+/g;
    while ((m = end.exec(text))) { parts.push(text.slice(from, m.index + m[0].length)); from = m.index + m[0].length; }
    if (from < text.length) parts.push(text.slice(from));
    var out = [];
    parts.forEach(function (s) {
      s = s.trim();
      while (s.length > 220) {
        var cut = s.lastIndexOf(", ", 220);
        if (cut < 80) cut = s.lastIndexOf(" ", 220);
        if (cut < 1) cut = 220;
        out.push(s.slice(0, cut + 1).trim()); s = s.slice(cut + 1).trim();
      }
      if (s) out.push(s);
    });
    return out;
  }
  var queue = [];
  blocks.forEach(function (el, b) { pieces(el).forEach(function (t) { queue.push({ block: b, text: t }); }); });
  if (!queue.length) return;

  var SPEEDS = [1, 1.25, 1.5, 0.8], speed = 1;
  try { var saved = parseFloat(localStorage.getItem("gmcat-listen-speed")); if (SPEEDS.indexOf(saved) >= 0) speed = saved; } catch (e) {}

  var state = "idle", pos = 0, run = 0, voice = null, keepAlive = null;

  function pickVoice() {
    var all = synth.getVoices().filter(function (v) { return /^en([-_]|$)/i.test(v.lang); });
    if (!all.length) { voice = null; return; }
    var want = (navigator.language || "en-US").toLowerCase().replace("_", "-");
    function score(v) {
      var s = 0, n = v.name;
      if (/natural|neural|premium|enhanced|siri/i.test(n)) s += 8;
      if (/google/i.test(n)) s += 5;
      if (/samantha|daniel|karen|aria|jenny|libby|ava|allison/i.test(n)) s += 4;
      if (/compact|eloquence|espeak|novelty/i.test(n)) s -= 6;
      if (v.lang.toLowerCase().replace("_", "-") === want) s += 3;
      if (/^en[-_]us$/i.test(v.lang)) s += 1;
      if (v.default) s += 1;
      return s;
    }
    voice = all.sort(function (a, b) { return score(b) - score(a); })[0];
  }
  pickVoice();
  if (synth.addEventListener) synth.addEventListener("voiceschanged", pickVoice);

  // ---- the bar
  bar.innerHTML =
    '<button type="button" class="listen-main" data-act="toggle">' +
      '<svg class="listen-ico" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path class="i-play" d="M4 2h2v1h2v1h2v1h2v2h1v2h-1v2h-2v1H8v1H6v1H4z"/><path class="i-pause" d="M3 2h4v12H3zM9 2h4v12H9z"/></svg>' +
      '<span class="listen-label">Listen</span></button>' +
    '<button type="button" class="listen-speed" data-act="speed"></button>' +
    '<button type="button" class="listen-stop" data-act="stop" hidden>Stop</button>' +
    '<span class="listen-status" role="status" aria-live="polite"></span>';
  var main = bar.querySelector(".listen-main"), label = bar.querySelector(".listen-label"),
      speedBtn = bar.querySelector(".listen-speed"), stopBtn = bar.querySelector(".listen-stop"),
      status = bar.querySelector(".listen-status");
  var minutes = Math.max(1, Math.round(queue.reduce(function (n, q) { return n + q.text.split(" ").length; }, 0) / 165));

  function mark(b) {
    var old = article.querySelector(".listen-now");
    if (old) old.classList.remove("listen-now");
    if (b == null) return;
    var el = blocks[b];
    el.classList.add("listen-now");
    var r = el.getBoundingClientRect();
    if (r.top < 70 || r.bottom > window.innerHeight - 40) {
      var calm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ block: "center", behavior: calm ? "auto" : "smooth" });
    }
  }

  function render(note) {
    bar.dataset.state = state;
    label.textContent = state === "playing" ? "Pause" : state === "paused" ? "Resume" : "Listen";
    main.setAttribute("aria-label", state === "playing" ? "Pause reading" : state === "paused" ? "Resume reading" : "Listen to this article");
    speedBtn.textContent = speed + "×";
    speedBtn.setAttribute("aria-label", "Reading speed " + speed + " times. Tap to change.");
    stopBtn.hidden = state === "idle";
    status.textContent = note != null ? note : state === "idle" ? "About " + minutes + " min · read by your device’s voice" : state === "paused" ? "Paused" : "Reading aloud";
  }

  function halt() {            // stop the voice without letting old callbacks advance the queue
    run++;
    clearInterval(keepAlive);
    synth.cancel();
  }

  function speakNext() {
    if (pos >= queue.length) { halt(); state = "idle"; pos = 0; mark(null); render("Finished. Thanks for listening."); return; }
    var mine = run, item = queue[pos], u = new SpeechSynthesisUtterance(item.text);
    if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = "en-US";
    u.rate = speed;
    u.onend = function () { if (mine !== run) return; pos++; speakNext(); };
    u.onerror = function (ev) {
      if (mine !== run || ev.error === "canceled" || ev.error === "interrupted") return;
      halt(); state = "idle"; mark(null);
      render(ev.error === "not-allowed" ? "Tap Listen to start." : "Sorry, this browser could not read aloud.");
    };
    mark(item.block);
    synth.speak(u);
  }

  function play() {
    halt();
    state = "playing"; render();
    // Chrome on desktop goes silent after ~15 s with some voices unless nudged.
    keepAlive = setInterval(function () { if (synth.speaking && !synth.paused) { synth.pause(); synth.resume(); } }, 10000);
    speakNext();
  }
  // Pause = stop and remember the sentence. (The browser's own pause is unreliable on Android.)
  function pause() { halt(); state = "paused"; render(); }
  function stop() { halt(); state = "idle"; pos = 0; mark(null); render(); }

  bar.addEventListener("click", function (ev) {
    var btn = ev.target.closest("button[data-act]");
    if (!btn) return;
    var act = btn.dataset.act;
    if (act === "toggle") { if (state === "playing") pause(); else play(); }
    else if (act === "stop") stop();
    else if (act === "speed") {
      speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
      try { localStorage.setItem("gmcat-listen-speed", String(speed)); } catch (e) {}
      if (state === "playing") play(); else render();
    }
  });

  // Tap a paragraph while listening to jump there.
  article.addEventListener("click", function (ev) {
    if (state === "idle" || ev.target.closest("a, button, [data-listen]")) return;
    if (String(window.getSelection && window.getSelection()) !== "") return;
    for (var el = ev.target; el && el !== article; el = el.parentNode) {
      var b = blocks.indexOf(el);
      if (b < 0) continue;
      for (var i = 0; i < queue.length; i++) if (queue[i].block === b) { pos = i; play(); return; }
    }
  });

  synth.cancel();                                   // clear anything left over from a previous page
  window.addEventListener("pagehide", function () { halt(); });
  bar.hidden = false;
  render();
})();
