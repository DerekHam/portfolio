/* ==========================================================================
   Site behavior (not content)
   - Theme toggle (dark/light, persisted)
   - Mobile navigation
   - Footer year
   - Scroll reveal (also picks up content added later by render.js)
   ========================================================================== */

(function () {
  "use strict";

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ---------- Theme ---------- */
  function initTheme() {
    var btn = $(".theme-toggle");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
    });
  }

  /* ---------- Mobile nav ---------- */
  function initNav() {
    var toggle = $(".nav-toggle");
    var nav = $("#site-nav");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    $all("a", nav).forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Footer year ---------- */
  function initFooter() {
    var y = $("#year");
    if (y) y.textContent = new Date().getFullYear();
  }

  /* ---------- Gallery lightbox ---------- */
  function initGallery() {
    var lb = $("#lightbox");
    if (!lb) return;
    var lbImg = $("#lightbox-img");
    var lbCap = $("#lightbox-cap");
    var items = [];
    var idx = 0;

    var ITEM_SELECTOR = ".gallery-item, [data-lightbox]";

    function collect() { items = $all(ITEM_SELECTOR); }

    function captionOf(el) {
      if (el.hasAttribute("data-caption")) return el.getAttribute("data-caption");
      var cap = el.querySelector(".gallery-cap, figcaption");
      return cap ? cap.textContent : "";
    }

    // High-res variant of an assets/img path lives under assets/hi (unless data-full says otherwise).
    function highResOf(el, low) {
      if (el.hasAttribute("data-full")) return el.getAttribute("data-full");
      var marker = "assets/img/";
      var i = low ? low.indexOf(marker) : -1;
      if (i < 0) return "";
      return low.slice(0, i) + "assets/hi/" + low.slice(i + marker.length);
    }

    var loadToken = 0;

    function show(i) {
      if (!items.length) return;
      idx = (i % items.length + items.length) % items.length;
      var el = items[idx];
      var img = el.querySelector("img");
      var low = el.getAttribute("data-src") || (img ? img.getAttribute("src") : "");
      var high = highResOf(el, low);
      var alt = img ? (img.getAttribute("alt") || "") : "";
      var token = ++loadToken;

      if (lbImg) {
        lbImg.onerror = function () { this.onerror = null; if (this.src !== low) this.src = low; };
        lbImg.setAttribute("src", low);
        lbImg.setAttribute("alt", alt);
      }
      if (lbCap) lbCap.textContent = captionOf(el);

      // Show the low-res instantly, then swap in the high-res once it is ready.
      if (high && high !== low) {
        var pre = new Image();
        pre.onload = function () {
          if (token === loadToken && lbImg) lbImg.src = high;
        };
        pre.src = high;
      }
      lb.hidden = false;
      lb.setAttribute("aria-hidden", "false");
      document.body.classList.add("lightbox-open");
      var closeBtn = $("[data-close]", lb);
      if (closeBtn) closeBtn.focus();
    }

    function close() {
      lb.hidden = true;
      lb.setAttribute("aria-hidden", "true");
      document.body.classList.remove("lightbox-open");
      var el = items[idx];
      if (el && el.focus) el.focus();
    }

    document.addEventListener("click", function (e) {
      var item = e.target.closest(ITEM_SELECTOR);
      if (item) {
        e.preventDefault();
        collect();
        show(items.indexOf(item));
        return;
      }
      if (lb.hidden) return;
      if (e.target.closest("[data-close]") || e.target === lb) close();
      else if (e.target.closest("[data-prev]")) show(idx - 1);
      else if (e.target.closest("[data-next]")) show(idx + 1);
    });

    document.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") show(idx - 1);
      else if (e.key === "ArrowRight") show(idx + 1);
    });
  }

  /* ---------- Horizontal sliders (project image galleries) ---------- */
  function initSliders() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest(".project-gallery-nav");
      if (!btn) return;
      var wrap = btn.closest(".project-gallery-wrap");
      var track = wrap && wrap.querySelector(".project-gallery");
      if (!track) return;
      var fig = track.querySelector(".project-figure");
      if (!fig) return;
      var styles = window.getComputedStyle(track);
      var gap = parseFloat(styles.columnGap || styles.gap) || 14;
      var step = fig.getBoundingClientRect().width + gap;
      var dir = btn.classList.contains("gallery-next") ? 1 : -1;
      track.scrollBy({ left: dir * step, behavior: "smooth" });
    });
  }

  /* ---------- Scroll reveal ---------- */
  var io = null;

  function observe(el) {
    if (io) io.observe(el);
    else el.classList.add("is-visible");
  }

  function initReveal() {
    var items = $all(".reveal");
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });

    items.forEach(observe);

    var mo = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        Array.prototype.slice.call(m.addedNodes).forEach(function (n) {
          if (n.nodeType !== 1) return;
          if (n.classList && n.classList.contains("reveal")) observe(n);
          $all(".reveal", n).forEach(observe);
        });
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    initNav();
    initFooter();
    initGallery();
    initSliders();
    initReveal();
  });
})();
