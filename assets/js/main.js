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

  function embedIframe(ref) {
    var v = String(ref || "");
    var ig = v.match(/^ig:(reel|p|tv):([A-Za-z0-9_-]+)$/);
    if (ig) {
      return '<iframe src="https://www.instagram.com/' + ig[1] + '/' + ig[2] +
        '/embed" title="Instagram video" scrolling="no" allow="encrypted-media; fullscreen" ' +
        'allowfullscreen></iframe>';
    }
    return '<iframe src="https://www.youtube.com/embed/' + v +
      '?rel=0" title="Video" allow="accelerometer; clipboard-write; ' +
      'encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>';
  }

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
    var lbVideo = $("#lightbox-video");
    var lbCap = $("#lightbox-cap");
    var statusEl = $("#lightbox-status");
    var statusText = statusEl ? $(".media-status-text", statusEl) : null;
    var items = [];
    var idx = 0;
    var loadToken = 0;
    var hideTimer = null;

    var ITEM_SELECTOR = ".gallery-item, [data-lightbox]";

    function setStatus(message, isError, autoHide) {
      if (!statusEl) return;
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      if (statusText) statusText.textContent = message || "";
      statusEl.hidden = !message;
      statusEl.classList.toggle("is-error", !!isError);
      statusEl.classList.toggle("is-loading", !!message && !isError);
      if (message && autoHide) {
        hideTimer = window.setTimeout(function () {
          if (statusEl) statusEl.hidden = true;
        }, autoHide);
      }
    }

    function collect(setName) {
      // Items sharing a data-lightbox-set navigate together; items without one
      // form the default set for the page.
      setName = setName || "";
      items = $all(ITEM_SELECTOR).filter(function (el) {
        return (el.getAttribute("data-lightbox-set") || "") === setName;
      });
    }

    function captionOf(el) {
      if (el.hasAttribute("data-caption")) return el.getAttribute("data-caption");
      var cap = el.querySelector(".gallery-cap, figcaption");
      return cap ? cap.textContent : "";
    }

    function mediaOf(el) {
      if (!window.SiteMedia) return null;
      var id = el.getAttribute("data-media-id");
      if (id) {
        var v = window.SiteMedia.getVideo(id);
        if (v) return v;
        var i = window.SiteMedia.getImage(id);
        if (i) return i;
      }
      var legacy = el.getAttribute("data-video");
      if (legacy) return window.SiteMedia.resolveEntry({ video: legacy });
      var src = el.getAttribute("data-src");
      if (src) return window.SiteMedia.resolveEntry({ src: src });
      return null;
    }

    function preloadImage(url, token, onLoad, onError) {
      var settled = false;
      var timer = null;
      var pre = new Image();
      pre.decoding = "async";

      function finish(ok) {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        if (token !== loadToken) return;
        if (ok) onLoad();
        else onError();
      }

      pre.onload = function () { finish(true); };
      pre.onerror = function () { finish(false); };
      timer = window.setTimeout(function () { finish(false); }, 12000);
      pre.src = url;
    }

    function show(i) {
      if (!items.length) return;
      idx = (i % items.length + items.length) % items.length;
      var el = items[idx];
      var media = mediaOf(el);
      var legacyVideo = el.getAttribute("data-video");
      if (lbCap) lbCap.textContent = captionOf(el);

      if (media && media.type === "video") {
        // Video item: swap the image out for a lazily-created player.
        if (lbImg) {
          lbImg.hidden = true;
          lbImg.removeAttribute("src");
          lbImg.removeAttribute("alt");
          lbImg.style.aspectRatio = "";
        }
        if (lbVideo) {
          lbVideo.hidden = false;
          lbVideo.innerHTML = "";
          lbVideo.classList.toggle("is-portrait", window.SiteMedia.isPortrait(media.aspectRatio));
          lbVideo.style.aspectRatio = window.SiteMedia.cssAspect(media.aspectRatio);
          var frame = window.SiteMedia.createVideoFrame(media, { lightbox: true });
          if (frame) lbVideo.appendChild(frame);
        }
        setStatus("");
      } else if (!media && legacyVideo) {
        if (lbImg) {
          lbImg.hidden = true;
          lbImg.removeAttribute("src");
          lbImg.removeAttribute("alt");
        }
        if (lbVideo) {
          lbVideo.hidden = false;
          lbVideo.classList.toggle("is-portrait", /^ig:/.test(legacyVideo));
          lbVideo.style.aspectRatio = /^ig:/.test(legacyVideo) ? "9 / 16" : "16 / 9";
          lbVideo.innerHTML = embedIframe(legacyVideo);
        }
        setStatus("");
      } else {
        if (lbVideo) {
          lbVideo.hidden = true;
          lbVideo.classList.remove("is-portrait");
          lbVideo.style.aspectRatio = "";
          lbVideo.innerHTML = "";
        }
        if (lbImg) {
          lbImg.hidden = false;
          var img = el.querySelector("img");
          var low = el.getAttribute("data-preview") || (img ? img.getAttribute("src") : "");
          var full = el.getAttribute("data-full-src") || (media ? media.fullUrl : "") || "";
          var fallback = el.getAttribute("data-fallback-src") || (media ? media.fallbackUrl : "") || "";
          var alt = img ? (img.getAttribute("alt") || "") : "";
          var token = ++loadToken;

          lbImg.style.aspectRatio = media && media.ratio
            ? window.SiteMedia.cssAspect(media.ratio) : "";

          lbImg.onerror = function () {
            this.onerror = null;
            if (low && this.src !== low) this.src = low;
          };
          if (low) lbImg.setAttribute("src", low);
          else lbImg.removeAttribute("src");
          lbImg.setAttribute("alt", alt);

          if (!low && !full) {
            setStatus("This image is not available.", true, 6000);
          } else if (full && full !== low) {
            setStatus("Loading high-resolution image…");
            preloadImage(full, token, function () {
              if (!lbImg || lbImg.hidden) return;
              lbImg.src = full;
              setStatus("");
            }, function () {
              if (fallback && fallback !== low && fallback !== full) {
                preloadImage(fallback, token, function () {
                  if (!lbImg || lbImg.hidden) return;
                  lbImg.src = fallback;
                  setStatus("");
                }, function () {
                  setStatus("High-resolution image unavailable. Showing a smaller preview.", true, 6000);
                });
              } else {
                setStatus("High-resolution image unavailable. Showing a smaller preview.", true, 6000);
              }
            });
          } else {
            setStatus("");
          }
        }
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
      if (lbVideo) {
        lbVideo.hidden = true;
        lbVideo.classList.remove("is-portrait");
        lbVideo.style.aspectRatio = "";
        lbVideo.innerHTML = "";
      }
      setStatus("");
      var el = items[idx];
      if (el && el.focus) el.focus();
    }

    document.addEventListener("click", function (e) {
      var item = e.target.closest(ITEM_SELECTOR);
      if (item) {
        e.preventDefault();
        collect(item.getAttribute("data-lightbox-set") || "");
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

  /* ---------- Inline video embeds (project pages) ---------- */
  function initVideoEmbeds() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest(".video-embed");
      if (!btn) return;
      e.preventDefault();
      if (window.SiteMedia) {
        window.SiteMedia.activateVideo(btn);
        return;
      }
      var id = btn.getAttribute("data-video");
      if (!id) return;
      var frame = document.createElement("div");
      frame.className = "video-frame";
      if (/^ig:/.test(id)) frame.classList.add("is-portrait");
      frame.innerHTML = embedIframe(id);
      btn.parentNode.replaceChild(frame, btn);
    });
  }

  /* ---------- Home background parallax ----------
     The photo is anchored to the banner's bottom and the page's bottom, and drifts
     slower than the content (asynchronous scrolling) while showing the whole image. */
  function initParallax() {
    var layer = $(".home-bg-img");
    var hero = $(".hero");
    if (!layer) return;

    function apply() {
      var winH = window.innerHeight;
      var max = Math.max(1, document.documentElement.scrollHeight - winH);
      var start = hero ? (hero.offsetTop + hero.offsetHeight) : 0;
      var span = Math.max(1, max - start);
      var progress = Math.min(1, Math.max(0, (window.pageYOffset - start) / span));
      var travel = layer.offsetHeight - winH;
      layer.style.transform = "translate3d(0," + (-travel * progress) + "px,0)";
    }

    window.addEventListener("scroll", apply, { passive: true });
    window.addEventListener("resize", apply);
    window.addEventListener("load", apply);
    apply();
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

  /* ---------- Resume downloads ---------- */
  // The PDF is rebuilt by Publish.command, but browsers may cache the old file.
  // Add a unique query string on click so the download is always the newest copy.
  function initResumeDownloads() {
    $all("[data-resume-download]").forEach(function (link) {
      link.addEventListener("click", function () {
        var href = link.getAttribute("href");
        if (!href || href === "#") return;
        try {
          var url = new URL(href, window.location.href);
          url.searchParams.set("v", Date.now());
          link.setAttribute("href", url.toString());
        } catch (e) {}
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    initNav();
    initFooter();
    initGallery();
    initSliders();
    initVideoEmbeds();
    initParallax();
    initReveal();
    initResumeDownloads();
  });
})();
