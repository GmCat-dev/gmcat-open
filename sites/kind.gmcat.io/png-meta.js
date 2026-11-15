/* GmCat PNG save (Turtle, 2026-11-15): saves a canvas as a PNG with a friendly name and GmCat text metadata
   (Title, Author, Description, Copyright, Source, Keywords), so the file can be found later by searching "GmCat".
   gmSavePng(canvas, "GmCat Kind card - Thank you [GmCat.io].png", {Title: "...", Description: "...", Source: "https://..."}) */
(function () {
  "use strict";
  var table = [];
  for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; }
  function crc(bytes) { var c = 0xffffffff; for (var i = 0; i < bytes.length; i++) c = table[(c ^ bytes[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
  function u32(v) { return [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255]; }
  function latin1(s) { var out = []; s = String(s).replace(/©/g, "(c)"); for (var i = 0; i < s.length; i++) { var ch = s.charCodeAt(i); out.push(ch < 256 ? ch : 63); } return out; }
  function chunk(key, value) {
    var body = [116, 69, 88, 116].concat(latin1(key), [0], latin1(value));   // "tEXt" + keyword + NUL + text
    return u32(body.length - 4).concat(body, u32(crc(body)));
  }
  window.gmSavePng = function (canvas, filename, meta) {
    var m = Object.assign({ Author: "GmCat (gmcat.io)", Copyright: "(c) GmCat.io", Keywords: "GmCat; GmCat.io; pixel cat; pixel art" }, meta || {});
    var b64 = canvas.toDataURL("image/png").split(",")[1], bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    var extra = [];
    Object.keys(m).forEach(function (k) { if (m[k]) extra = extra.concat(chunk(k, m[k])); });
    var out = new Uint8Array(bytes.length + extra.length);
    out.set(bytes.subarray(0, 33)); out.set(extra, 33); out.set(bytes.subarray(33), 33 + extra.length);   // after the IHDR chunk
    var url = URL.createObjectURL(new Blob([out], { type: "image/png" })), a = document.createElement("a");
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  };
})();
