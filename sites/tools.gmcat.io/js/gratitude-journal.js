(function () {
  "use strict";
  var KEY = "gmcat-tools-gratitude-v1", input = document.getElementById("gj-text"), list = document.getElementById("gj-entries"), status = document.getElementById("gj-status");
  var prompts = ["What made today a little gentler?", "Who helped you feel seen recently?", "What ordinary thing felt good today?", "What did your body help you do today?", "What is one place that helps you breathe easier?", "What are you glad you noticed?", "What small kindness reached you?", "What are you looking forward to?"];
  function load() { try { var x = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(x) ? x.slice(0, 100) : []; } catch (e) { return []; } }
  var entries = load();
  function store() { try { localStorage.setItem(KEY, JSON.stringify(entries)); return true; } catch (e) { status.textContent = "This browser could not save the entry."; return false; } }
  function render() {
    list.textContent = ""; document.getElementById("gj-empty").hidden = entries.length > 0;
    document.getElementById("gj-count").textContent = entries.length + (entries.length === 1 ? " entry" : " entries");
    entries.forEach(function (entry) {
      var li = document.createElement("li"), p = document.createElement("p"), foot = document.createElement("div"), time = document.createElement("time"), del = document.createElement("button");
      p.textContent = entry.text; time.textContent = new Date(entry.at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
      del.type = "button"; del.className = "linkbtn"; del.textContent = "Delete"; del.setAttribute("aria-label", "Delete entry from " + time.textContent);
      del.addEventListener("click", function () { entries = entries.filter(function (x) { return x.id !== entry.id; }); store(); render(); });
      foot.append(time, del); li.append(p, foot); list.appendChild(li);
    });
  }
  function another() { var now = document.getElementById("gj-prompt").textContent, choices = prompts.filter(function (x) { return x !== now; }); document.getElementById("gj-prompt").textContent = choices[Math.floor(Math.random() * choices.length)]; }
  document.getElementById("gj-save").addEventListener("click", function () { var value = input.value.trim(); if (!value) { status.textContent = "Write one small thing first."; input.focus(); return; } entries.unshift({ id: Date.now(), at: new Date().toISOString(), text: value.slice(0, 500) }); entries = entries.slice(0, 100); if (store()) { input.value = ""; status.textContent = "Saved on this device."; render(); } });
  document.getElementById("gj-new-prompt").addEventListener("click", another);
  document.getElementById("gj-clear").addEventListener("click", function () { if (entries.length && window.confirm("Delete every gratitude entry from this device?")) { entries = []; try { localStorage.removeItem(KEY); } catch (e) {} render(); status.textContent = "All entries deleted."; } });
  render();
})();
