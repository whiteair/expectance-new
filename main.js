/* =========================================================
   EXPECTANCE — interactions
   Nav state, mobile menu, scroll reveals, portfolio filter,
   stat count-up. Vanilla, no dependencies.
   ========================================================= */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Current year ---------------------------------------------------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- Nav: scrolled state -------------------------------------------- */
  var nav = document.getElementById("nav");
  function onScroll() {
    if (window.scrollY > 24) nav.classList.add("is-scrolled");
    else nav.classList.remove("is-scrolled");
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---- Nav: mobile toggle --------------------------------------------- */
  var toggle = document.getElementById("navToggle");
  var links = document.querySelector(".nav__links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        links.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---- Scroll reveals -------------------------------------------------- */
  var revealEls = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  } else {
    var revealIO = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { revealIO.observe(el); });

    // Robustness: never leave content hidden if the observer is slow or
    // doesn't fire. Reveal whatever is already on screen and keep a scroll
    // fallback — content is always reachable even without IO callbacks.
    var revealOnScreen = function () {
      var vh = window.innerHeight;
      revealEls.forEach(function (el) {
        if (el.classList.contains("in")) return;
        var r = el.getBoundingClientRect();
        if (r.top < vh * 0.95 && r.bottom > 0) el.classList.add("in");
      });
    };
    requestAnimationFrame(revealOnScreen);
    window.addEventListener("scroll", revealOnScreen, { passive: true });
  }

  /* ---- Portfolio filter + show-more (capped at 3) ---------------------- */
  var chips = document.querySelectorAll(".work__filter .chip");
  var cases = document.querySelectorAll("#workList .case");
  var workMore = document.getElementById("workMore");
  var CAP = 3;
  var currentFilter = "all";
  var expanded = false;

  function applyWork() {
    var shown = 0;
    cases.forEach(function (card) {
      var domains = card.getAttribute("data-domain") || "";
      var matches = currentFilter === "all" || domains.indexOf(currentFilter) !== -1;
      var visible = matches && (expanded || shown < CAP);
      if (matches) shown++;
      card.classList.toggle("is-hidden", !visible);
      if (visible) card.classList.add("in");   // ensure revealed when un-capped
    });
    if (workMore) {
      workMore.hidden = shown <= CAP;
      workMore.textContent = expanded ? "Show less" : "Show more";
    }
  }

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      currentFilter = chip.getAttribute("data-filter");
      expanded = false;
      chips.forEach(function (c) { c.classList.remove("is-active"); });
      chip.classList.add("is-active");
      applyWork();
    });
  });
  if (workMore) {
    workMore.addEventListener("click", function () {
      expanded = !expanded;
      applyWork();
      if (!expanded) {
        document.getElementById("work").scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }
  applyWork();

  /* ---- Stat count-up --------------------------------------------------- */
  var stats = document.querySelectorAll(".stat__num");
  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-count")) || 0;
    var suffix = el.getAttribute("data-suffix") || "";
    if (reduceMotion) { el.textContent = target + suffix; return; }
    var dur = 1400, start = null;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = Math.round(target * eased) + (p === 1 ? suffix : "");
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if ("IntersectionObserver" in window) {
    var statIO = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { countUp(entry.target); obs.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    stats.forEach(function (s) { statIO.observe(s); });
  } else {
    stats.forEach(function (s) { s.textContent = s.getAttribute("data-count") + (s.getAttribute("data-suffix") || ""); });
  }

  /* ---- Headline word rotator (glitches between terms, settles on "you") - */
  var rotateWord = document.getElementById("rotateWord");
  if (rotateWord) {
    var WORDS = ["companies", "businesses", "factories", "enterprises", "you"];
    var GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz#%&/<>*$";
    if (reduceMotion) {
      // no scramble/flicker — but still settle on the final word
      // (leave it on "you", which is already shown)
    } else {
      var widx = 0;
      var glitchTo = function (target, done) {
        rotateWord.classList.add("is-glitching");
        var dur = 520, start = null;
        var stepFn = function (ts) {
          if (start === null) start = ts;
          var p = Math.min((ts - start) / dur, 1);
          var reveal = Math.floor(p * target.length);
          var out = "";
          for (var i = 0; i < target.length; i++) {
            out += i < reveal ? target.charAt(i) : GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length));
          }
          rotateWord.textContent = out;
          if (p < 1) { requestAnimationFrame(stepFn); }
          else { rotateWord.textContent = target; rotateWord.classList.remove("is-glitching"); if (done) done(); }
        };
        requestAnimationFrame(stepFn);
      };
      var nextWord = function () {
        if (widx >= WORDS.length) return;      // finished on "you"
        var word = WORDS[widx++];
        glitchTo(word);
        if (widx < WORDS.length) setTimeout(nextWord, 2000);
      };
      setTimeout(nextWord, 2000);              // start ~2s after load
    }
  }

})();
