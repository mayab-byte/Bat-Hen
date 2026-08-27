(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Not-yet-active contact placeholders ----------
     These links (phone/WhatsApp/email not filled in yet) carry
     aria-disabled + tabindex="-1", but browsers still navigate on
     click/Enter unless we stop it here. */
  document.querySelectorAll('[aria-disabled="true"]').forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
    });
  });

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

  /* ---------- Header services dropdown ---------- */
  document.querySelectorAll(".dropdown-toggle").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var item = btn.closest(".nav-item");
      var isOpen = item.classList.toggle("open");
      btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  });

  /* ---------- Reviews carousel arrows ---------- */
  /* RTL note: this scroller sits in a dir="rtl" document, where
     scrollLeft runs from 0 (first/rightmost card) down to a negative
     max (last/leftmost card) in every current browser (Chrome, Firefox,
     Safari). We scroll it directly via scrollLeft math instead of
     scrollIntoView({inline:"start"}) - Safari's RTL handling of that
     API has historically been inconsistent, which broke navigation in
     one direction while the other kept working. */
  document.querySelectorAll(".reviews-carousel").forEach(function (carousel) {
    var scroller = carousel.querySelector(".reviews-scroller");
    var prevBtn = carousel.querySelector(".carousel-arrow.prev");
    var nextBtn = carousel.querySelector(".carousel-arrow.next");
    if (!scroller || !prevBtn || !nextBtn) return;
    var cards = Array.prototype.slice.call(scroller.children);
    if (!cards.length) return;

    function step() {
      var gap = parseFloat(getComputedStyle(scroller).columnGap) || 20;
      return cards[0].getBoundingClientRect().width + gap;
    }

    function maxScroll() {
      return Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    }

    function scrollByStep(dir) {
      var target = scroller.scrollLeft - dir * step();
      target = Math.max(-maxScroll(), Math.min(0, target));
      scroller.scrollTo({ left: target, behavior: reduceMotion ? "auto" : "smooth" });
    }

    nextBtn.addEventListener("click", function () {
      scrollByStep(1);
    });
    prevBtn.addEventListener("click", function () {
      scrollByStep(-1);
    });
  });

  /* ---------- Service card videos ----------
     Mobile browsers don't always honor the autoplay attribute for
     off-screen video (some hold off loading/playing until the element
     is actually visible). Load + play explicitly once each card
     scrolls into view. */
  var svcVideos = document.querySelectorAll(".svc-grid-card video");
  if (svcVideos.length && "IntersectionObserver" in window) {
    var svcIo = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var v = entry.target;
          if (entry.isIntersecting) {
            if (v.preload !== "auto") v.preload = "auto";
            var playPromise = v.play();
            if (playPromise && playPromise.catch) playPromise.catch(function () {});
          } else {
            v.pause();
          }
        });
      },
      { threshold: 0.25 }
    );
    svcVideos.forEach(function (v) {
      svcIo.observe(v);
    });
  }

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll(".reveal-up, .reveal-down, .reveal-pop");
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
          var duration = 1800;
          var start = performance.now();
          function tick(now) {
            var t = Math.min((now - start) / duration, 1);
            render(easeOutCubic(t) * target);
            if (t < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.15 }
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
      track.style.transform = "translateX(" + p * (count - 1) * cardWidth + "px)";
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

/* ---------- Golden Wave Interactive (hero canvas) ----------
   A few flowing sine-based gold strands drift continuously (the "infinite"
   loop), and bend toward the cursor within a radius like a soft magnet -
   only on devices with a real mouse (hover:hover + pointer:fine); touch
   devices just get the looping video background, no canvas overhead. */
(function () {
  var canvas = document.getElementById("waveCanvas");
  if (!canvas) return;
  var hero = canvas.closest(".hero");
  if (!hero) return;

  var pointerMQ = window.matchMedia("(hover: hover) and (pointer: fine)");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ctx = canvas.getContext("2d");
  var W = 0, H = 0, DPR = 1;
  var rafId = null;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = hero.offsetWidth;
    H = hero.offsetHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  var mouse = { x: -9999, y: -9999 };
  var mouseTarget = { x: -9999, y: -9999 };

  function onMove(e) {
    var rect = hero.getBoundingClientRect();
    mouseTarget.x = e.clientX - rect.left;
    mouseTarget.y = e.clientY - rect.top;
  }
  function onLeave() {
    mouseTarget.x = -9999;
    mouseTarget.y = -9999;
  }

  var STRANDS = [
    { amp: 42, freq: 1.25, speed: 0.32, baseY: 0.40, width: 2.2, alpha: 0.5 },
    { amp: 56, freq: 1.0, speed: 0.20, baseY: 0.5, width: 1.6, alpha: 0.32 },
    { amp: 30, freq: 1.55, speed: 0.46, baseY: 0.6, width: 1.2, alpha: 0.26 },
  ];
  var COLORS = ["#DBC292", "#C1A575", "#F2E2C2"];
  var N = 46;
  var t = 0;
  var pullRadius = 220;

  function frame() {
    ctx.clearRect(0, 0, W, H);
    mouse.x += (mouseTarget.x - mouse.x) * 0.08;
    mouse.y += (mouseTarget.y - mouse.y) * 0.08;

    STRANDS.forEach(function (s, si) {
      ctx.beginPath();
      for (var i = 0; i <= N; i++) {
        var px = (i / N) * W;
        var py = s.baseY * H + Math.sin((i / N) * Math.PI * 2 * s.freq + t * s.speed) * s.amp;

        var dx = px - mouse.x;
        var dy = py - mouse.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < pullRadius) {
          var pull = 1 - dist / pullRadius;
          pull *= pull;
          py += (mouse.y - py) * pull * 0.55;
          px += (mouse.x - px) * pull * 0.12;
        }

        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = COLORS[si % COLORS.length];
      ctx.globalAlpha = s.alpha;
      ctx.lineWidth = s.width;
      ctx.shadowColor = COLORS[si % COLORS.length];
      ctx.shadowBlur = 8;
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    t += 0.016;
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (rafId) return;
    resize();
    hero.addEventListener("mousemove", onMove);
    hero.addEventListener("mouseleave", onLeave);
    window.addEventListener("resize", resize);
    if (reduceMotion) {
      frame();
      cancelAnimationFrame(rafId);
      rafId = null;
    } else {
      frame();
    }
  }

  function stop() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    hero.removeEventListener("mousemove", onMove);
    hero.removeEventListener("mouseleave", onLeave);
    ctx.clearRect(0, 0, W, H);
  }

  function sync() {
    if (pointerMQ.matches) start();
    else stop();
  }

  sync();
  pointerMQ.addEventListener("change", sync);
})();

