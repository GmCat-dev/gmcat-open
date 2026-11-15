(function () {
  "use strict";
  var prompts = [
    ["any", "kindness", "You make people feel welcome, and that matters."], ["any", "effort", "I noticed how much care you put into that."], ["any", "character", "You are someone people can count on."], ["any", "creativity", "I love the way your mind approaches things differently."],
    ["friend", "kindness", "You listen without making me feel rushed."], ["friend", "character", "I can be myself around you, and I really value that."], ["friend", "effort", "You keep showing up for the people you care about."], ["friend", "creativity", "You always find a way to make ordinary moments fun."],
    ["family", "kindness", "The little things you do make home feel warmer."], ["family", "character", "I admire how you stay true to what matters to you."], ["family", "effort", "I see how hard you work for the people you love."], ["family", "creativity", "You bring such thoughtful ideas to our family."],
    ["school", "kindness", "You help people feel included."], ["school", "effort", "Your hard work made a real difference to the group."], ["school", "character", "You ask thoughtful questions and give others room to speak."], ["school", "creativity", "Your idea made me see the problem in a new way."],
    ["work", "kindness", "You make this team a more supportive place."], ["work", "effort", "Your preparation made that go much more smoothly."], ["work", "character", "I appreciate how calmly and clearly you handle challenges."], ["work", "creativity", "That was a smart solution I would not have considered."]
  ];
  var out = document.getElementById("cp-text"), last = "";
  function choose() { var who = document.getElementById("cp-for").value, focus = document.getElementById("cp-focus").value; var pool = prompts.filter(function (p) { return (who === "any" || p[0] === who || p[0] === "any") && (focus === "any" || p[1] === focus); }); var different = pool.filter(function (p) { return p[2] !== last; }); var pick = (different.length ? different : pool)[Math.floor(Math.random() * (different.length ? different.length : pool.length))]; last = pick[2]; out.textContent = last; }
  document.getElementById("cp-another").addEventListener("click", choose); document.getElementById("cp-for").addEventListener("change", choose); document.getElementById("cp-focus").addEventListener("change", choose);
  document.getElementById("cp-copy").addEventListener("click", function () { var status = document.getElementById("cp-status"); if (navigator.clipboard) navigator.clipboard.writeText(last).then(function () { status.textContent = "Copied!"; }); else { status.textContent = "Select the prompt to copy it."; } });
  choose();
})();
