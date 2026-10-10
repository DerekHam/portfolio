/* ==========================================================================
   Content renderer
   --------------------------------------------------------------------------
   Loads JSON from /data and binds it into the page's HTML.

   HTML conventions:
     <body data-page="contact">          -> loads data/site.json + data/contact.json
     data-bind="path.to.value"            -> fills text (or HTML with data-html)
     data-attrs="href:url,src:image"      -> fills attributes from paths
     data-html                            -> treat the bound value as HTML
     data-list="path.to.array"            -> element containing a <template>;
                                             the template is cloned per item
     data-bind="."                        -> the item itself (for lists of strings)
   Project pages (projects.html / project.html) are handled specially.
   ========================================================================== */

(function () {
  "use strict";

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function loadJSON(path) {
    return fetch(path, { cache: "no-cache" }).then(function (res) {
      if (!res.ok) throw new Error(path + " (" + res.status + ")");
      return res.json();
    });
  }

  function getPath(obj, path) {
    if (!path || path === ".") return obj;
    return path.split(".").reduce(function (o, k) {
      return (o == null ? undefined : o[k]);
    }, obj);
  }

  /* Strip HTML tags to get plain text (for <title>, alt, etc.). */
  function plain(html) {
    var d = document.createElement("div");
    d.innerHTML = html == null ? "" : String(html);
    return d.textContent || "";
  }

  /* ---------- Attribute binding ---------- */
  function applyAttrs(el, scope) {
    var spec = el.getAttribute("data-attrs");
    if (!spec) return;
    spec.split(",").forEach(function (pair) {
      var i = pair.indexOf(":");
      if (i < 0) return;
      var attr = pair.slice(0, i).trim();
      var path = pair.slice(i + 1).trim();
      var val = getPath(scope, path);
      if (val == null || val === "") {
        el.removeAttribute(attr);
        if (attr === "href") el.classList.add("no-link");
      } else {
        el.setAttribute(attr, val);
        if (attr === "href") el.classList.remove("no-link");
      }
    });
  }

  function bindEl(el, scope) {
    applyAttrs(el, scope);
    if (!el.hasAttribute("data-bind")) return;
    var val = getPath(scope, el.getAttribute("data-bind"));
    if (el.hasAttribute("data-html")) {
      el.innerHTML = val == null ? "" : String(val);
    } else {
      el.textContent = val == null ? "" : String(val);
    }
  }

  /* ---------- List rendering ---------- */
  function renderList(container, scope) {
    var path = container.getAttribute("data-list");
    var tpl = null;
    Array.prototype.slice.call(container.children).forEach(function (ch) {
      if (!tpl && ch.tagName === "TEMPLATE") tpl = ch;
    });
    if (!tpl) return;

    var items = getPath(scope, path);
    if (!Array.isArray(items)) items = items == null ? [] : [items];

    Array.prototype.slice.call(container.children).forEach(function (ch) {
      if (ch !== tpl) container.removeChild(ch);
    });

    items.forEach(function (item) {
      var frag = tpl.content.cloneNode(true);
      bindScope(frag, item);
      container.appendChild(frag);
    });
  }

  /* Bind a root node against a scope object. Expands nested lists first. */
  function bindScope(root, scope) {
    $all("[data-list]", root).forEach(function (c) { renderList(c, scope); });
    $all("[data-bind], [data-attrs]", root).forEach(function (el) {
      if (el.closest("[data-list]")) return;
      bindEl(el, scope);
    });
  }

  /* ---------- Site-wide values ---------- */
  function applySite(site) {
    $all("[data-social]").forEach(function (el) {
      var key = el.getAttribute("data-social");
      var url = site.social ? site.social[key] : null;
      if (url) { el.setAttribute("href", url); el.classList.remove("no-link"); }
    });
  }

  /* ---------- Projects ---------- */
  function cardNode(p) {
    var tpl = document.getElementById("project-card");
    if (!tpl) return null;
    var frag = tpl.content.cloneNode(true);
    var url = "project.html?id=" + encodeURIComponent(p.id || "");

    var media = frag.querySelector(".card-media");
    if (media) media.setAttribute("href", url);
    var titleLink = frag.querySelector(".card-title a");
    if (titleLink) titleLink.setAttribute("href", url);
    var img = frag.querySelector(".card-media img");
    if (img) {
      img.setAttribute("src", p.thumbnail || "assets/img/placeholder.svg");
      img.setAttribute("alt", plain(p.title) || "Project");
    }
    var article = frag.querySelector(".card");
    if (article) article.setAttribute("data-tags", (p.tags || []).join("|"));

    bindScope(frag, p);
    return frag;
  }

  /* Projects are always ordered by id, ascending — my ranking, most important
     first. Numeric-aware, so "2" comes before "10". */
  function byId(a, b) {
    return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
  }

  function renderFeatured(projects) {
    var grid = $("#featured-projects");
    if (!grid) return;
    var list = projects.filter(function (p) { return p.featured; });
    if (!list.length) list = projects.slice(0, 3);
    if (!list.length) {
      grid.innerHTML = '<p class="empty-state" style="grid-column:1/-1;">No projects yet.</p>';
      return;
    }
    list.slice().sort(byId).forEach(function (p) { var n = cardNode(p); if (n) grid.appendChild(n); });
  }

  function renderProjectGrid(projects) {
    var grid = $("#project-grid");
    if (!grid) return;
    if (!projects.length) {
      grid.innerHTML = '<p class="empty-state" style="grid-column:1/-1;">No projects yet. Add some in data/projects.json.</p>';
      return;
    }

    var currentFilter = "All";

    function applyFilter() {
      $all(".card", grid).forEach(function (card) {
        var cardTags = (card.getAttribute("data-tags") || "").split("|");
        card.style.display = (currentFilter === "All" || cardTags.indexOf(currentFilter) !== -1) ? "" : "none";
      });
    }

    // Always shown in my ranking order: ascending by id.
    projects.slice().sort(byId).forEach(function (p) {
      var n = cardNode(p);
      if (n) grid.appendChild(n);
    });

    var bar = $("#filter-bar");
    if (bar) {
      var seen = {}, tags = [];
      projects.forEach(function (p) {
        (p.tags || []).forEach(function (t) { if (!seen[t]) { seen[t] = true; tags.push(t); } });
      });
      tags.sort();
      ["All"].concat(tags).forEach(function (t, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "filter-btn";
        b.setAttribute("data-filter", t);
        b.setAttribute("aria-pressed", i === 0 ? "true" : "false");
        b.textContent = t;
        bar.appendChild(b);
      });
      bar.addEventListener("click", function (e) {
        var btn = e.target.closest(".filter-btn");
        if (!btn) return;
        $all(".filter-btn", bar).forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
        btn.setAttribute("aria-pressed", "true");
        currentFilter = btn.getAttribute("data-filter");
        applyFilter();
      });
    }

  }

  function renderProjectDetail(projects) {
    var params = new URLSearchParams(window.location.search);
    var id = params.get("id");
    var p = projects.filter(function (x) { return String(x.id) === String(id); })[0];

    var titleEl = $("#project-title");
    var metaEl = $("#project-meta");
    var descEl = $("#project-description");
    var imgWrap = $("#project-images");
    var linkWrap = $("#project-links");

    if (!p) {
      if (titleEl) titleEl.textContent = "Project not found";
      if (descEl) descEl.innerHTML = '<p class="empty-state">Project not found. <a href="projects.html">Back to all projects</a>.</p>';
      return;
    }

    document.title = (plain(p.title) || "Project") + " — Derek Han";
    if (titleEl) titleEl.innerHTML = p.title || "Project";

    if (metaEl) {
      metaEl.innerHTML = "";
      if (p.date) {
        var d = document.createElement("span");
        d.textContent = p.date;
        metaEl.appendChild(d);
      }
      (p.tags || []).forEach(function (t) {
        var dot = document.createElement("span");
        dot.className = "dot";
        dot.textContent = "•";
        metaEl.appendChild(dot);
        var s = document.createElement("span");
        s.className = "tag";
        s.textContent = t;
        metaEl.appendChild(s);
      });
    }

    if (imgWrap) {
      // Each image is either a path string or { src, caption, alt }.
      var raw = (p.images && p.images.length) ? p.images : (p.thumbnail ? [p.thumbnail] : []);
      var tplImg = document.getElementById("tpl-detail-image");
      if (raw.length === 1) imgWrap.classList.add("project-gallery--single");
      raw.forEach(function (item) {
        if (!tplImg) return;
        var img = (typeof item === "string") ? { src: item } : (item || {});
        var frag = tplImg.content.cloneNode(true);
        var fig = frag.querySelector("[data-lightbox]");
        var el = frag.querySelector("img");
        var cap = frag.querySelector("figcaption");
        if (el) {
          el.setAttribute("src", img.src || "");
          el.setAttribute("alt", plain(img.alt || img.caption || p.title) || "Project image");
        }
        if (fig) {
          fig.setAttribute("data-src", img.src || "");
          if (img.full) fig.setAttribute("data-full", img.full);
          fig.setAttribute("data-caption", plain(img.caption || ""));
        }
        if (cap) {
          if (img.caption) cap.textContent = img.caption;
          else cap.parentNode && cap.parentNode.removeChild(cap);
        }
        imgWrap.appendChild(frag);
      });
      // Arrows only make sense with more than one image.
      $all(".project-gallery-nav").forEach(function (btn) { btn.hidden = raw.length <= 1; });
    }

    if (descEl) {
      var desc = p.description;
      descEl.innerHTML = Array.isArray(desc) ? desc.join("") : (desc || "");
    }

    if (linkWrap && p.links && p.links.length) {
      var tplLink = document.getElementById("tpl-detail-link");
      p.links.forEach(function (l) {
        if (!tplLink) return;
        var frag = tplLink.content.cloneNode(true);
        var a = frag.querySelector("a");
        if (a) { a.setAttribute("href", l.url || "#"); a.textContent = l.label || "Link"; }
        linkWrap.appendChild(frag);
      });
    }
  }

  /* ---------- Blog post page ---------- */
  function renderPostPage() {
    var params = new URLSearchParams(window.location.search);
    var slug = params.get("slug") || params.get("post");
    var titleEl = $("#post-title");
    var dateEl = $("#post-date");
    var leadEl = $("#post-lead");
    var bodyEl = $("#post-body");

    function notFound() {
      document.title = "Post not found — Derek Han";
      if (titleEl) titleEl.textContent = "Post not found";
      if (dateEl) dateEl.textContent = "";
      if (leadEl) leadEl.hidden = true;
      if (bodyEl) bodyEl.innerHTML = '<p class="empty-state">That post could not be found. <a href="blog.html">Back to the blog</a>.</p>';
    }

    if (!slug) { notFound(); return; }

    return loadJSON("data/blog/" + encodeURIComponent(slug) + ".json").then(function (post) {
      var title = post.title || "Post";
      document.title = (plain(title) || "Post") + " — Derek Han";
      if (titleEl) titleEl.innerHTML = title;
      if (dateEl) {
        dateEl.textContent = post.date || "";
        dateEl.hidden = !post.date;
      }
      if (leadEl) {
        if (post.lead) { leadEl.innerHTML = post.lead; leadEl.hidden = false; }
        else { leadEl.hidden = true; }
      }
      var body = post.body;
      if (bodyEl) bodyEl.innerHTML = Array.isArray(body) ? body.join("") : (body || "");
    }).catch(function () { notFound(); });
  }

  /* ---------- Error surface ---------- */
  function showError(msg) {
    var d = document.createElement("div");
    d.className = "content-error";
    d.innerHTML = "<strong>Content could not load.</strong> " + msg +
      " Run a local server (for example, <code>python3 -m http.server 8000</code>) and open the site over http:// rather than double-clicking the file.";
    document.body.appendChild(d);
  }

  /* ---------- Boot ---------- */
  function boot() {
    var page = document.body.getAttribute("data-page");
    if (!page) return;

    loadJSON("data/site.json").then(function (site) {
      applySite(site);

      // Bind shared chrome (brand name / initials) on every page.
      var header = $(".site-header");
      var footer = $(".site-footer");
      if (header) bindScope(header, { site: site });
      if (footer) bindScope(footer, { site: site });

      if (page === "projects" || page === "project") {
        return loadJSON("data/projects.json").then(function (projects) {
          if (page === "projects") renderProjectGrid(projects);
          else renderProjectDetail(projects);
        });
      }

      if (page === "home") {
        return Promise.all([loadJSON("data/home.json"), loadJSON("data/projects.json")]).then(function (r) {
          r[0].site = site;
          bindScope(document.body, r[0]);
          renderFeatured(r[1]);
        });
      }

      if (page === "post") {
        return renderPostPage();
      }

      return loadJSON("data/" + page + ".json").then(function (data) {
        data.site = site;

        // Blog index: derive each post's link from its slug.
        if (page === "blog" && Array.isArray(data.posts)) {
          data.posts.forEach(function (post) {
            if (post && !post.url && post.slug) {
              post.url = "post.html?slug=" + encodeURIComponent(post.slug);
            }
          });
        }

        bindScope(document.body, data);

        if (page === "blog") {
          var empty = document.getElementById("blog-empty");
          var list = document.getElementById("post-list");
          if (empty && list) {
            var hasPosts = list.querySelectorAll("li").length > 0;
            empty.hidden = hasPosts;
            list.hidden = !hasPosts;
          }
        }
      });
    }).catch(function (err) {
      showError(String(err && err.message ? err.message : err));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
