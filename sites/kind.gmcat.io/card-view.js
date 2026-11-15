(function () {
  "use strict";
  var TYPES = {
    "encouragement": { label: "A little encouragement", bg: "#f7eadc", ink: "#342641", accent: "#e98261" },
    "thank-you": { label: "Thank you", bg: "#e5f0e8", ink: "#24382d", accent: "#4f9b70" },
    "birthday": { label: "Happy birthday", bg: "#f5e5ee", ink: "#40263a", accent: "#d86f9c" },
    "sympathy": { label: "Thinking of you", bg: "#e9e8f2", ink: "#2e2d42", accent: "#7773a8" },
    "just-because": { label: "Just because", bg: "#f7efcf", ink: "#3e3422", accent: "#d79d3f" }
  };
  var p = new URLSearchParams(location.search), type = p.get("type"), art = p.get("art") || "", message = p.get("message") || "";
  /* Short links: /c/<6 art chars>-<type letter><suggested message number>, or the sender's own words after "#". */
  var short = location.pathname.match(/^\/c\/([a-f0-9]{6})-([etbsj])(\d{0,3})(?:-([rcgply]))?\/?$/), shortArt = "";
  var sealColour = { r: "red", c: "coral", g: "green", p: "pink", l: "lavender", y: "gold" }[short ? short[4] : ""] || p.get("seal") || "";
  if (short) {
    type = { e: "encouragement", t: "thank-you", b: "birthday", s: "sympathy", j: "just-because" }[short[2]];
    shortArt = short[1]; art = "";
    var list = (window.KIND_CARD_MESSAGES || {})[type] || [];
    if (short[3]) message = list[parseInt(short[3], 10) - 1] || "";
    else { try { message = decodeURIComponent(location.hash.slice(1).replace(/\+/g, " ")); } catch (e) { message = ""; } }
  }
  if (!TYPES[type]) type = "encouragement";
  if (!/^[a-z0-9-]{8,40}$/i.test(art)) art = "";
  message = message.length <= 160 ? message.replace(/[\u0000-\u001f\u007f]/g, " ").trim() : "";
  if (!message) message = "A little kindness, from me to you.";
  var style = TYPES[type], image = document.getElementById("card-view-art"), status = document.getElementById("card-view-status");
  var card = document.getElementById("received-card");
  var scene = document.getElementById("card-scene"), openTimer;
  scene.classList.add("type-" + type);
  scene.style.setProperty("--fx", style.accent);
  card.style.setProperty("--card-bg", style.bg); card.style.setProperty("--card-ink", style.ink); card.style.setProperty("--card-accent", style.accent);
  document.getElementById("card-view-type").textContent = style.label;
  document.getElementById("card-view-message").textContent = message;
  document.getElementById("card-reply").href = "/cards/" + (art ? "?art=" + encodeURIComponent(art) : "");

  /* Opening v2 (card-open.css): a real envelope with the card inside it. Tap anywhere to skip. */
  var TOTAL = 3900;
  function el(tag, cls, parent) { var e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }
  var stage = el("div", "ko-stage"), env = el("div", "ko-env", stage); stage.setAttribute("aria-hidden", "true");
  el("div", "ko-shadow", env);
  var parts = el("div", "ko-parts", env); el("div", "ko-back", parts);
  var mini = el("div", "ko-card", parts), miniArt = el("div", "ko-card-art", mini); el("div", "ko-card-bar", mini); el("div", "ko-card-label", mini).textContent = style.label;
  el("div", "ko-pocket", parts); el("div", "ko-flap", parts);
  var seal = el("div", "ko-seal", parts); seal.textContent = "GM";
  /* Wax seal with GmCat's face (2026-11-15): the sender's colour, else the card type's colour. */
  var TYPE_SEAL = { "encouragement": "coral", "thank-you": "green", "birthday": "pink", "sympathy": "lavender", "just-because": "gold" };
  if (window.KIND_TAP_TO_OPEN) {
    var sc = /^(red|coral|green|pink|lavender|gold)$/.test(sealColour) ? sealColour : TYPE_SEAL[type] || "coral";
    seal.textContent = ""; seal.classList.add("ko-seal-wax");
    var simg = el("img", "", seal); simg.src = "/seals/emboss-" + sc + ".svg"; simg.alt = ""; simg.draggable = false;
  }
  var hint = el("p", "ko-hint", env); hint.textContent = "Tap the seal to open";
  for (var b = 0; b < 6; b++) el("i", "ko-bit", parts).style.setProperty("--n", b);
  var burst = el("div", "ko-burst"); burst.setAttribute("aria-hidden", "true");
  for (var n = 0; n < 16; n++) el("i", "", burst).style.setProperty("--n", n);
  ["--card-bg", "--card-ink", "--card-accent"].forEach(function (v, i) { stage.style.setProperty(v, [style.bg, style.ink, style.accent][i]); });
  if (art) miniArt.style.backgroundImage = "url('/art/" + art + ".jpg')";
  scene.appendChild(stage); scene.appendChild(burst);
  scene.classList.add("v2");

  function finishOpening() {
    clearTimeout(openTimer); scene.classList.remove("ko-playing", "replay"); scene.classList.add("opened");
  }
  function startOpening(fromTap) {
    clearTimeout(openTimer); scene.classList.remove("opened", "replay", "ko-playing", "ko-waiting", "ko-tapped");
    scene.style.setProperty("--ko-t0", fromTap ? "1s" : "0s");
    void scene.offsetWidth;   /* restart the CSS animations */
    scene.classList.add("ko-playing"); if (fromTap) scene.classList.add("ko-tapped");
    openTimer = setTimeout(finishOpening, fromTap ? TOTAL - 1000 : TOTAL);
  }
  /* Tap to open (Turtle, 2026-11-15): the envelope waits and wiggles until the seal (or the envelope) is tapped. */
  var TAP = !!window.KIND_TAP_TO_OPEN;
  function waitForTap() {
    clearTimeout(openTimer); scene.classList.remove("opened", "replay", "ko-playing", "ko-tapped");
    void scene.offsetWidth; scene.classList.add("ko-waiting");
    seal.setAttribute("role", "button"); seal.setAttribute("tabindex", "0"); seal.setAttribute("aria-label", "Open your card");
    stage.removeAttribute("aria-hidden");
  }
  function openFromTap() { stage.setAttribute("aria-hidden", "true"); seal.removeAttribute("tabindex"); startOpening(true); }
  if (TAP) waitForTap(); else startOpening();
  env.addEventListener("click", function () { if (scene.classList.contains("ko-waiting")) openFromTap(); });
  seal.addEventListener("keydown", function (event) { if ((event.key === "Enter" || event.key === " ") && scene.classList.contains("ko-waiting")) { event.preventDefault(); openFromTap(); } });
  document.addEventListener("pointerdown", function (event) {
    if (event.target.closest && event.target.closest("#card-replay")) return;
    if (scene.classList.contains("ko-waiting")) return;
    if (!scene.classList.contains("opened")) finishOpening();
  }, { passive: true });
  document.getElementById("card-replay").addEventListener("click", function () { if (TAP) waitForTap(); else startOpening(); });

  function rounded(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
  function cover(ctx, img, x, y, w, h) { var scale=Math.max(w/img.naturalWidth,h/img.naturalHeight),sw=w/scale,sh=h/scale;ctx.drawImage(img,(img.naturalWidth-sw)/2,(img.naturalHeight-sh)/2,sw,sh,x,y,w,h); }
  function lines(ctx, text, width, max) { var words=text.split(/\s+/),out=[],line="";words.forEach(function(word){var test=line?line+" "+word:word;if(ctx.measureText(test).width<=width||!line)line=test;else{out.push(line);line=word;}});if(line)out.push(line);if(out.length>max){out=out.slice(0,max);while(out[max-1].length&&ctx.measureText(out[max-1]+"…").width>width)out[max-1]=out[max-1].slice(0,-1);out[max-1]+="…";}return out; }
  function save() {
    if (!image.complete || !image.naturalWidth) { status.textContent = "The artwork is still loading."; return; }
    var canvas=document.createElement("canvas"),ctx=canvas.getContext("2d");canvas.width=1080;canvas.height=1350;ctx.fillStyle=style.bg;ctx.fillRect(0,0,1080,1350);ctx.save();rounded(ctx,54,54,972,820,34);ctx.clip();cover(ctx,image,54,54,972,820);ctx.restore();ctx.fillStyle=style.accent;ctx.fillRect(54,906,126,12);ctx.fillStyle=style.ink;ctx.textAlign="left";ctx.font="800 34px sans-serif";ctx.fillText(style.label.toUpperCase(),54,974);ctx.font="800 54px sans-serif";var y=1058;lines(ctx,message,972,4).forEach(function(line){ctx.fillText(line,54,y);y+=67;});ctx.font="700 25px sans-serif";ctx.fillStyle=style.accent;ctx.fillText("GmCat Kind  •  kind.gmcat.io",54,1300);ctx.textAlign="right";ctx.fillText("♡",1026,1300);if(window.gmSavePng){gmSavePng(canvas,"GmCat Kind card - "+style.label+" [GmCat.io].png",{Title:"GmCat Kind card - "+style.label,Description:"A free GmCat Kind card made at kind.gmcat.io",Source:"https://kind.gmcat.io/cards/",Keywords:"GmCat; GmCat.io; GmCat Kind; kind card; pixel cat; "+style.label});}else{var a=document.createElement("a");a.href=canvas.toDataURL("image/png");a.download="gmcat-kind-card.png";a.click();}status.textContent="Card image ready.";
  }
  document.getElementById("card-view-save").addEventListener("click", save);
  if (!art && !shortArt) { image.hidden=true; status.textContent="This card link is missing its artwork."; return; }
  fetch("/art-index.json").then(function(r){if(!r.ok)throw Error();return r.json();}).then(function(items){if(shortArt){var hit=items.filter(function(item){return item.i.indexOf("gmcat-"+shortArt)===0;})[0];if(!hit)throw Error();art=hit.i;miniArt.style.backgroundImage="url('/art/"+art+".jpg')";document.getElementById("card-reply").href="/cards/?art="+encodeURIComponent(art);}if(!items.some(function(item){return item.i===art;}))throw Error();image.src="/art/"+art+".jpg";}).catch(function(){image.hidden=true;status.textContent="This card's artwork could not be found.";});
  image.addEventListener("error", function(){image.hidden=true;status.textContent="This card's artwork could not load.";});
})();
