(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Mobile nav ---------- */
  var burger = document.getElementById("burgerBtn");
  var navLinks = document.getElementById("navLinks");
  if (burger && navLinks) {
    burger.addEventListener("click", function () {
      var open = navLinks.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    navLinks.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        navLinks.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll(".reveal-up, .reveal-down");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach(function (el) {
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("in");
    });
  }

  /* ---------- Animated counters ---------- */
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  document.querySelectorAll("[data-count]").forEach(function (el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var prefix = el.getAttribute("data-prefix") || "";
    var suffix = el.getAttribute("data-suffix") || "";
    var decimals = el.getAttribute("data-decimals") ? parseInt(el.getAttribute("data-decimals"), 10) : 0;
    var started = false;

    function render(v) {
      el.textContent = prefix + v.toLocaleString("he-IL", { maximumFractionDigits: decimals, minimumFractionDigits: decimals }) + suffix;
    }

    if (reduceMotion || !("IntersectionObserver" in window)) {
      render(target);
      return;
    }

    var obs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting || started) return;
          started = true;
          obs.disconnect();
          var duration = 2600;
          var start = performance.now();
          function tick(now) {
            var t = Math.min((now - start) / duration, 1);
            render(easeOutCubic(t) * target);
            if (t < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
  });

  /* ---------- Services pinned rail (desktop) / stack (mobile) ---------- */
  var wrap = document.getElementById("svcWrap");
  var sticky = document.getElementById("svcSticky");
  var track = document.getElementById("svcTrack");
  var dotsWrap = document.getElementById("svcDots");

  if (wrap && sticky && track) {
    var cards = track.querySelectorAll(".svc-card");
    var count = cards.length;
    wrap.style.setProperty("--svc-count", String(count));

    if (dotsWrap) {
      dotsWrap.innerHTML = "";
      for (var i = 0; i < count; i++) {
        var d = document.createElement("span");
        if (i === 0) d.className = "on";
        dotsWrap.appendChild(d);
      }
    }

    var desktopMQ = window.matchMedia("(min-width: 768px)");
    var raf = 0;

    function setDots(active) {
      if (!dotsWrap) return;
      dotsWrap.querySelectorAll("span").forEach(function (s, idx) {
        s.classList.toggle("on", idx === active);
      });
    }

    function update() {
      raf = 0;
      if (!desktopMQ.matches || reduceMotion) {
        track.style.transform = "none";
        return;
      }
      var scrollable = wrap.offsetHeight - sticky.offsetHeight;
      var rect = wrap.getBoundingClientRect();
      var p = Math.min(1, Math.max(0, -rect.top / Math.max(1, scrollable)));
      var cardWidth = sticky.offsetWidth;
      track.style.transform = "translateX(-" + p * (count - 1) * cardWidth + "px)";
      setDots(Math.round(p * (count - 1)));
    }

    function onScroll() {
      if (!raf) raf = requestAnimationFrame(update);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }
})();
