/* ==========================================================================
   Project PDF export
   --------------------------------------------------------------------------
   Builds a clean, print-ready version of the current project page — title,
   meta, description, every image in a compact grid, and the link list — then
   renders it to a single multi-page A4 PDF with the site's styling intact.

   The PDF engine (html2pdf.js, which bundles html2canvas + jsPDF) is loaded
   lazily on the first click so project pages stay lightweight.
   ========================================================================== */

(function () {
  "use strict";

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function el(tag, cls) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    return node;
  }

  function plain(html) {
    var d = document.createElement("div");
    d.innerHTML = html == null ? "" : String(html);
    return d.textContent || "";
  }

  /* ---------- Media helpers (same rules as render.js) ---------- */
  function youtubeId(value) {
    if (!value) return "";
    var v = String(value).trim();
    var m = v.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([A-Za-z0-9_-]{6,})/i);
    if (m) return m[1];
    if (/^[A-Za-z0-9_-]{6,}$/.test(v)) return v;
    return "";
  }

  function instagramRef(value) {
    if (!value) return null;
    var m = String(value).trim().match(/instagram\.com\/(reels?|p|tv)\/([A-Za-z0-9_-]+)/i);
    if (!m) return null;
    var kind = m[1].toLowerCase();
    if (kind === "reels") kind = "reel";
    return { kind: kind, id: m[2] };
  }

  function mediaInfo(item) {
    if (typeof item === "string") return { type: "image", src: item };
    var o = item || {};
    var vid = youtubeId(o.video || o.youtube);
    if (vid) {
      return {
        type: "video", provider: "youtube", video: vid,
        poster: o.poster || "", caption: o.caption || "", title: o.title || ""
      };
    }
    var ig = instagramRef(o.video || o.instagram);
    if (ig) {
      return {
        type: "video", provider: "instagram", kind: ig.kind, video: ig.id,
        poster: o.poster || "", caption: o.caption || "", title: o.title || ""
      };
    }
    if (o.embed) {
      return {
        type: "embed", src: o.embed, caption: o.caption || "", title: o.title || "",
        preview: o.preview || o.poster || ""
      };
    }
    return { type: "image", src: o.src || "", caption: o.caption || "", alt: o.alt || "", full: o.full || "" };
  }

  function videoPoster(info) {
    if (info.poster) return info.poster;
    if (info.provider === "instagram") return "";
    return "https://img.youtube.com/vi/" + info.video + "/hqdefault.jpg";
  }

  function videoUrl(info) {
    if (info.provider === "instagram") {
      return "https://www.instagram.com/" + (info.kind || "reel") + "/" + info.video + "/";
    }
    return "https://www.youtube.com/watch?v=" + info.video;
  }

  /* Deterministic file name for an auto-generated embed screenshot. Keep this
     in sync with Scripts/build-embed-previews.py. */
  function embedPreviewPath(url) {
    var slug = String(url || "")
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100);
    return "assets/previews/" + (slug || "embed") + ".png";
  }

  /* Convert an image to an inline data URL. This keeps the PDF canvas
     untainted (important for remote YouTube posters) and lets us fall back to
     a placeholder tile when an image cannot be read. */
  function toDataUrl(src) {
    return new Promise(function (resolve) {
      if (!src) { resolve(null); return; }
      var img = new Image();
      var settled = false;
      var timer = null;

      function finish(value) {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        resolve(value);
      }

      var isRemote = /^https?:\/\//i.test(src) && (function () {
        try { return new URL(src, window.location.href).origin !== window.location.origin; }
        catch (e) { return true; }
      })();
      if (isRemote) img.crossOrigin = "anonymous";

      /* Never let a slow or blocked remote image stall the whole export. */
      timer = setTimeout(function () { finish(null); }, 10000);

      img.onload = function () {
        try {
          var w = img.naturalWidth || img.width;
          var h = img.naturalHeight || img.height;
          if (!w || !h) { finish(null); return; }
          var max = 1400;
          if (w > max || h > max) {
            var scale = Math.min(max / w, max / h);
            w = Math.max(1, Math.round(w * scale));
            h = Math.max(1, Math.round(h * scale));
          }
          var canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          var ctx = canvas.getContext("2d");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          finish(canvas.toDataURL("image/jpeg", 0.9));
        } catch (e) {
          finish(null);
        }
      };
      img.onerror = function () { finish(null); };
      img.src = src;
    });
  }

  /* ---------- PDF engine ---------- */
  function loadPdfEngine() {
    if (window.html2pdf) return Promise.resolve(window.html2pdf);
    if (window.__html2pdfPromise) return window.__html2pdfPromise;

    window.__html2pdfPromise = new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = "assets/vendor/html2pdf.bundle.min.js";
      script.onload = function () {
        if (window.html2pdf) resolve(window.html2pdf);
        else reject(new Error("The PDF engine did not initialise."));
      };
      script.onerror = function () {
        reject(new Error("The PDF engine could not be loaded."));
      };
      document.head.appendChild(script);
    });
    return window.__html2pdfPromise;
  }

  /* ---------- Build the print document ---------- */
  function sectionTitle(text) {
    var h = el("h2", "pdf-section-title");
    h.textContent = text;
    return h;
  }

  function mediaFigure(m, project) {
    var fig = el("figure", "pdf-media-item");

    var clickable = m.type === "video" || m.type === "embed";
    var thumb = el(clickable ? "a" : "div", "pdf-thumb");
    if (clickable) {
      thumb.href = m.type === "video" ? videoUrl(m) : m.src;
      thumb.target = "_blank";
      thumb.rel = "noopener";
    }

    if (m.type === "embed") {
      thumb.classList.add("pdf-thumb--embed", "pdf-thumb--embed-shot");

      /* Show the embedded page the way it looks on the site: use an explicit
         preview, else an auto-generated screenshot, else the project thumbnail.
         The label/URL are removed by hydrateImages when a shot loads. */
      var previewSrc = m.preview || embedPreviewPath(m.src);
      var shot = el("img");
      shot.setAttribute("data-pdf-src", previewSrc);
      if (project.thumbnail) shot.setAttribute("data-pdf-fallback", project.thumbnail);
      shot.setAttribute("alt", plain(m.title || m.caption || project.title || "") || "Embedded page");
      thumb.appendChild(shot);

      var embedLabel = el("span", "pdf-thumb-label");
      embedLabel.textContent = m.title ? plain(m.title) : "Embedded page";
      thumb.appendChild(embedLabel);
      var host = el("span", "pdf-thumb-url");
      host.textContent = String(m.src || "").replace(/^https?:\/\//i, "").replace(/\/$/, "");
      thumb.appendChild(host);

      var badge = el("span", "pdf-embed-badge");
      badge.textContent = "Live page";
      thumb.appendChild(badge);
    } else {
      var src = m.type === "video" ? videoPoster(m) : m.src;
      if (m.type === "video") thumb.classList.add("pdf-thumb--video");

      if (src) {
        var img = el("img");
        img.setAttribute("data-pdf-src", src);
        img.setAttribute("alt", plain(m.alt || m.caption || project.title || "") || (m.type === "video" ? "Video" : "Project image"));
        thumb.appendChild(img);
      } else {
        thumb.classList.add("pdf-thumb--empty");
        /* Videos without a poster just keep the play badge. */
        if (m.type !== "video") {
          var emptyLabel = el("span", "pdf-thumb-label");
          emptyLabel.textContent = "Image unavailable";
          thumb.appendChild(emptyLabel);
        }
      }

      if (m.type === "video") {
        var play = el("span", "pdf-play");
        play.setAttribute("aria-hidden", "true");
        thumb.appendChild(play);
      }
    }

    fig.appendChild(thumb);

    if (m.caption) {
      var cap = el("figcaption");
      cap.textContent = m.caption;
      fig.appendChild(cap);
    } else if (m.type === "video") {
      var vnote = el("figcaption", "pdf-media-note");
      vnote.textContent = "Watch video";
      fig.appendChild(vnote);
    }

    return fig;
  }

  function hydrateImages(root) {
    var imgs = $all("img[data-pdf-src]", root);
    return Promise.all(imgs.map(function (img) {
      var fallback = img.getAttribute("data-pdf-fallback") || "";

      function finish(data) {
        if (data) {
          img.setAttribute("src", data);
          img.removeAttribute("data-pdf-src");
          img.removeAttribute("data-pdf-fallback");
          var thumb = img.closest(".pdf-thumb");
          if (thumb) {
            /* A screenshot replaces the placeholder label/address. */
            var label = thumb.querySelector(".pdf-thumb-label");
            var url = thumb.querySelector(".pdf-thumb-url");
            if (label && label.parentNode) label.parentNode.removeChild(label);
            if (url && url.parentNode) url.parentNode.removeChild(url);
          }
          return;
        }

        if (fallback) {
          var next = fallback;
          fallback = "";
          return toDataUrl(next).then(finish);
        }

        var emptyThumb = img.closest(".pdf-thumb");
        if (emptyThumb) {
          emptyThumb.classList.add("pdf-thumb--empty");
          if (emptyThumb.classList.contains("pdf-thumb--embed")) {
            emptyThumb.classList.remove("pdf-thumb--embed-shot");
            var badge = emptyThumb.querySelector(".pdf-embed-badge");
            if (badge && badge.parentNode) badge.parentNode.removeChild(badge);
          } else if (!emptyThumb.classList.contains("pdf-thumb--video")) {
            /* A video keeps just its play badge (like the site's posterless
               tiles); a photo gets a short note instead of an empty box. */
            var emptyLabel = el("span", "pdf-thumb-label");
            emptyLabel.textContent = "Image unavailable";
            emptyThumb.insertBefore(emptyLabel, emptyThumb.firstChild);
          }
        }
        if (img.parentNode) img.parentNode.removeChild(img);
      }

      return toDataUrl(img.getAttribute("data-pdf-src")).then(finish);
    }));
  }

  function projectBlock(project, site) {
    var block = el("div", "pdf-project");

    /* Header */
    var head = el("header", "pdf-head");
    var brand = el("div", "pdf-brand");
    var mark = el("span", "pdf-brand-mark");
    mark.textContent = (site && site.brandMark) || "DH";
    var name = el("span", "pdf-brand-name");
    name.textContent = (site && site.name) || "Portfolio";
    brand.appendChild(mark);
    brand.appendChild(name);
    head.appendChild(brand);

    var kicker = el("p", "pdf-kicker");
    kicker.textContent = "Project";
    head.appendChild(kicker);

    var title = el("h1", "pdf-title");
    title.innerHTML = project.title || "Project";
    head.appendChild(title);

    var meta = el("div", "pdf-meta");
    if (project.date) {
      var date = el("span", "pdf-date");
      date.textContent = project.date;
      meta.appendChild(date);
    }
    (project.tags || []).forEach(function (tag) {
      var t = el("span", "tag");
      t.textContent = tag;
      meta.appendChild(t);
    });
    if (meta.children.length) head.appendChild(meta);

    if (project.summary) {
      var summary = el("p", "pdf-summary");
      summary.textContent = plain(project.summary);
      head.appendChild(summary);
    }
    block.appendChild(head);

    /* Media grid first: every image/video, in compact rows */
    var raw = (project.images && project.images.length)
      ? project.images
      : (project.thumbnail ? [project.thumbnail] : []);
    if (raw.length) {
      var mediaSection = el("section", "pdf-section pdf-media-section");
      var only = raw.length === 1 ? mediaInfo(raw[0]) : null;
      var heading = "Images & media";
      if (only) heading = only.type === "embed" ? "Embedded page" : (only.type === "video" ? "Video" : "Image");
      mediaSection.appendChild(sectionTitle(heading));
      var grid = el("div", "pdf-media");
      var perRow = raw.length === 1 ? 1 : (raw.length === 2 ? 2 : 4);
      if (raw.length === 1) grid.classList.add("pdf-media--single");
      else if (raw.length === 2) grid.classList.add("pdf-media--pair");
      for (var i = 0; i < raw.length; i += perRow) {
        var row = el("div", "pdf-media-row");
        raw.slice(i, i + perRow).forEach(function (item) {
          row.appendChild(mediaFigure(mediaInfo(item), project));
        });
        grid.appendChild(row);
      }
      mediaSection.appendChild(grid);
      block.appendChild(mediaSection);
    }

    /* Overview */
    var desc = project.description;
    desc = Array.isArray(desc) ? desc.join("") : (desc || "");
    if (desc) {
      var overview = el("section", "pdf-section");
      overview.appendChild(sectionTitle("Overview"));
      var prose = el("div", "prose pdf-prose");
      prose.innerHTML = desc;
      overview.appendChild(prose);
      block.appendChild(overview);
    }

    /* Links */
    if (project.links && project.links.length) {
      var linksSection = el("section", "pdf-section pdf-links-section");
      linksSection.appendChild(sectionTitle("Links"));
      var list = el("ul", "pdf-link-list");
      project.links.forEach(function (link) {
        var li = el("li");
        var a = el("a", "pdf-link");
        a.href = link.url || "#";
        a.target = "_blank";
        a.rel = "noopener";

        var linkLabel = el("span", "pdf-link-label");
        linkLabel.textContent = link.label || link.url || "Link";
        a.appendChild(linkLabel);

        if (link.url) {
          var url = el("span", "pdf-link-url");
          url.textContent = link.url;
          a.appendChild(url);
        }
        li.appendChild(a);
        list.appendChild(li);
      });
      linksSection.appendChild(list);
      block.appendChild(linksSection);
    }

    return block;
  }

  function featuredProjects(projects) {
    return (projects || []).filter(function (p) {
      return p && p.featured === true;
    }).sort(function (a, b) {
      return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
    });
  }

  async function buildDocument(projects, site, footerLabel) {
    var doc = el("article", "pdf-doc");

    projects.forEach(function (project, index) {
      var block = projectBlock(project, site);
      if (index > 0) block.classList.add("pdf-project--new-page");
      doc.appendChild(block);
    });

    /* Footer (once per document) */
    var foot = el("footer", "pdf-foot");
    var footName = el("span");
    footName.textContent = ((site && site.name) || "Portfolio") + " — " + (footerLabel || "Project export");
    var footDate = el("span");
    try {
      footDate.textContent = "Exported " + new Date().toLocaleDateString(undefined, {
        year: "numeric", month: "short", day: "numeric"
      });
    } catch (e) {
      footDate.textContent = "Exported " + new Date().toDateString();
    }
    foot.appendChild(footName);
    foot.appendChild(footDate);
    doc.appendChild(foot);

    /* Inline all images so the canvas stays clean */
    await hydrateImages(doc);
    return doc;
  }

  function safeFilename(name) {
    var base = String(name || "Project");
    base = base.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim();
    return base + " — Derek Han.pdf";
  }

  async function downloadPdf(projects, site, footerLabel, filename) {
    var host = el("div", "pdf-export-host");
    var doc = await buildDocument(projects, site, footerLabel);
    host.appendChild(doc);
    document.body.appendChild(host);

    try {
      var html2pdf = await loadPdfEngine();
      if (document.fonts && document.fonts.ready) {
        try {
          await Promise.race([
            document.fonts.ready,
            new Promise(function (resolve) { setTimeout(resolve, 2000); })
          ]);
        } catch (e) {}
      }
      /* Give the browser a moment to lay out the off-screen document. A timer
         (rather than requestAnimationFrame) also works in background tabs. */
      await new Promise(function (resolve) { setTimeout(resolve, 80); });

      /* Use a crisp scale, but reduce very tall documents so the raster stays
         inside browser canvas limits. */
      var height = doc.getBoundingClientRect().height || doc.offsetHeight || 0;
      var scale = 2;
      if (height > 0 && height * scale > 26000) scale = Math.max(0.5, 26000 / height);

      await html2pdf().set({
        margin: [12, 13, 12, 13],
        filename: filename || safeFilename("Project"),
        image: { type: "jpeg", quality: 0.92 },
        enableLinks: true,
        html2canvas: {
          scale: scale,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait", compress: true },
        pagebreak: {
          mode: ["css", "legacy"],
          avoid: [
            ".pdf-head",
            ".pdf-section-title",
            ".pdf-media-row",
            ".pdf-media-item",
            ".pdf-media-item figcaption",
            ".pdf-prose p",
            ".pdf-prose li",
            ".pdf-prose h2",
            ".pdf-prose h3",
            ".pdf-link-list li"
          ]
        }
      }).from(doc).save();
    } finally {
      if (host.parentNode) host.parentNode.removeChild(host);
    }
  }

  /* ---------- Page wiring ---------- */
  function init() {
    if (document.body.getAttribute("data-page") !== "project") return;

    var btnOne = $("#project-export");
    var btnAll = $("#project-export-all");
    if (!btnOne && !btnAll) return;

    var project = null;
    var site = null;
    var projects = [];
    var busy = false;

    function setButtonsBusy(active) {
      [btnOne, btnAll].forEach(function (b) {
        if (!b) return;
        b.disabled = active;
        if (!active) b.removeAttribute("aria-busy");
      });
    }

    function run(button, list, footerLabel, filename) {
      if (busy || !list || !list.length) return;
      busy = true;
      var label = $("span", button);
      var original = label ? label.textContent : "";
      setButtonsBusy(true);
      button.setAttribute("aria-busy", "true");
      if (label) label.textContent = "Preparing…";

      downloadPdf(list, site, footerLabel, filename).catch(function (err) {
        console.error(err);
        window.alert("Sorry, the PDF could not be created. Please try again, or use your browser's Print option and choose “Save as PDF”.");
      }).finally(function () {
        busy = false;
        setButtonsBusy(false);
        if (label) label.textContent = original;
      });
    }

    document.addEventListener("project:rendered", function (e) {
      var detail = e.detail || {};
      project = detail.project || null;
      site = detail.site || null;
      projects = detail.projects || [];
      if (project && btnOne) btnOne.hidden = false;
      if (btnAll && featuredProjects(projects).length) btnAll.hidden = false;
    });

    if (btnOne) {
      btnOne.addEventListener("click", function () {
        if (!project) return;
        run(
          btnOne,
          [project],
          "Project export",
          safeFilename(plain(project.title) || "Project")
        );
      });
    }

    if (btnAll) {
      btnAll.addEventListener("click", function () {
        var list = featuredProjects(projects);
        if (!list.length) return;
        run(
          btnAll,
          list,
          "Featured projects",
          safeFilename(list.length + " Featured Projects")
        );
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
