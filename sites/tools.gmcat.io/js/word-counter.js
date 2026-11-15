/* GmCat Toolbox: word & character counter. Everything happens in the browser. */
(function () {
  "use strict";
  var KEY = "gmcat-tools-wc";
  var ta = document.getElementById("wc-text");
  var status = document.getElementById("wc-status");
  var nf = new Intl.NumberFormat();
  var graphemeSeg = (window.Intl && Intl.Segmenter) ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
  var CJK = /[぀-ヿ㐀-䶿一-鿿豈-﫿]/g;
  var HAS_WORD = /[\p{L}\p{N}]/u;
  var PICTO = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;
  var URL_RE = /\bhttps?:\/\/[^\s]+|\b(?:www\.)?[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:com|io|net|org|co|app|dev|xyz|me|ly|gg|ai|tv|uk|ca|de|fr|jp|us|info|biz|edu|gov)\b(?:\/[^\s]*)?/gi;

  function graphemes(s) {
    if (!graphemeSeg) return Array.from(s);
    var out = [];
    for (var it = graphemeSeg.segment(s)[Symbol.iterator](), r = it.next(); !r.done; r = it.next()) out.push(r.value.segment);
    return out;
  }

  function countWords(s) {
    var n = 0;
    s.split(/\s+/).forEach(function (tok) {
      if (!tok) return;
      var cjk = tok.match(CJK);
      if (cjk) n += cjk.length;
      tok.replace(CJK, " ").split(/\s+/).forEach(function (t) { if (HAS_WORD.test(t)) n++; });
    });
    return n;
  }

  function countSentences(s) {
    return s.split(/[.!?…。！？]+["'”’)\]]*(?=\s|$)/).filter(function (p) { return HAS_WORD.test(p); }).length;
  }

  function countParagraphs(s) {
    return s.split(/\n\s*\n/).filter(function (p) { return p.trim(); }).length;
  }

  /* X ("twitter-text" v3 rules): links = 23, emoji = 2, code points in a few Latin/punctuation ranges = 1, everything else = 2. */
  function light(cp) {
    return cp <= 0x10ff || (cp >= 0x2000 && cp <= 0x200d) || (cp >= 0x2010 && cp <= 0x201f) || (cp >= 0x2032 && cp <= 0x2037);
  }
  function xCount(s) {
    var links = 0;
    s = s.replace(URL_RE, function () { links++; return ""; });
    var n = links * 23;
    graphemes(s).forEach(function (g) {
      if (PICTO.test(g)) { n += 2; return; }
      for (var i = 0; i < g.length; i++) {
        var cp = g.codePointAt(i);
        if (cp > 0xffff) i++;
        n += light(cp) ? 1 : 2;
      }
    });
    return n;
  }

  function duration(words, wpm) {
    if (!words) return "0 sec";
    var secs = Math.max(1, Math.round(words / wpm * 60));
    if (secs < 60) return secs + " sec";
    var m = Math.floor(secs / 60), r = secs % 60;
    if (m >= 10 || !r) return m + " min";
    return m + " min " + r + " sec";
  }

  function set(id, v) { document.getElementById(id).textContent = v; }

  function setLimit(id, used) {
    var el = document.getElementById("lim-" + id);
    var max = +el.dataset.max;
    var left = max - used;
    el.querySelector(".limit-n").textContent = nf.format(used) + " / " + nf.format(max) + (left < 0 ? "  (" + nf.format(-left) + " over)" : "");
    el.querySelector(".meter i").style.width = Math.min(100, used / max * 100) + "%";
    el.classList.toggle("near", left >= 0 && left <= max * 0.1);
    el.classList.toggle("over", left < 0);
  }

  function update() {
    var s = ta.value;
    var g = graphemes(s);
    var chars = g.length;
    var words = countWords(s);
    set("wc-words", nf.format(words));
    set("wc-chars", nf.format(chars));
    set("wc-nospace", nf.format(g.filter(function (c) { return !/^\s+$/.test(c); }).length));
    set("wc-sentences", nf.format(countSentences(s)));
    set("wc-paragraphs", nf.format(countParagraphs(s)));
    set("wc-reading", duration(words, 238));
    set("wc-speaking", duration(words, 150));
    setLimit("x", xCount(s));
    setLimit("bsky", chars);
    setLimit("threads", chars);
    setLimit("igbio", chars);
    try { if (s) localStorage.setItem(KEY, s); else localStorage.removeItem(KEY); } catch (err) { /* storage unavailable */ }
  }

  function flash(msg) {
    status.textContent = msg;
    clearTimeout(flash.t);
    flash.t = setTimeout(function () { status.textContent = ""; }, 2000);
  }

  document.getElementById("wc-copy").addEventListener("click", function () {
    if (!ta.value) { flash("Nothing to copy yet"); return; }
    var done = function () { flash("Copied!"); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(ta.value).then(done, function () { ta.select(); document.execCommand("copy"); done(); });
    } else { ta.select(); document.execCommand("copy"); done(); }
  });
  document.getElementById("wc-clear").addEventListener("click", function () {
    ta.value = ""; update(); ta.focus(); flash("Cleared");
  });

  try { var saved = localStorage.getItem(KEY); if (saved) ta.value = saved; } catch (err) { /* storage unavailable */ }
  ta.addEventListener("input", update);
  update();
})();
