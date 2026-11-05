/* ==========================================================================
   Media component
   --------------------------------------------------------------------------
   One small, dependency-free module shared by the gallery, project pages and
   the PDF exporter.

   It:
     - loads and validates data/media.json;
     - turns a manifest ID (or a legacy path) into a normalised image/video;
     - builds R2 preview URLs from MEDIA_BASE_URL;
     - provides reusable lazy video cards/players (Cloudflare Stream, with a
       YouTube/Instagram fallback until the Stream migration is finished).

   Public API: window.SiteMedia (see the end of this file).
   ========================================================================== */

(function () {
  "use strict";

  var PLACEHOLDER = "assets/img/placeholder.svg";
  var cfg = window.SITE_MEDIA_CONFIG || {};
  var MANIFEST_URL = cfg.MEDIA_MANIFEST || "data/media.json";

  var state = {
    ready: null,
    loaded: false,
    error: null,
    images: Object.create(null),
    videos: Object.create(null),
    imagesBySource: Object.create(null),
    imagesByThumbnail: Object.create(null),
    warnings: []
  };

  function str(value) {
    return value == null ? "" : String(value).trim();
  }

  function num(value) {
    var n = Number(value);
    return isFinite(n) && n > 0 ? n : 0;
  }

  function plain(value) {
    return str(String(value == null ? "" : value)
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, "\"")
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, " "));
  }

  function warn(message, detail) {
    var line = "[media] " + message;
    if (state.warnings.indexOf(line) === -1) state.warnings.push(line);
    if (window.console && console.warn) console.warn(line, detail == null ? "" : detail);
  }

  function has(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function config() {
    return {
      baseUrl: str(cfg.MEDIA_BASE_URL),
      streamCustomerCode: str(cfg.STREAM_CUSTOMER_CODE),
      localFullFallback: cfg.LOCAL_FULL_FALLBACK !== false
    };
  }

  function streamReady() {
    return !!config().streamCustomerCode;
  }

  /* ---------- URL helpers ---------- */
  function r2Url(key) {
    var base = config().baseUrl;
    var clean = str(key).replace(/^\/+/, "");
    if (!base || !clean) return "";
    try {
      return new URL(clean, base.replace(/\/?$/, "/")).href;
    } catch (e) {
      warn("Invalid MEDIA_BASE_URL or R2 key.", { base: base, key: key });
      return "";
    }
  }

  /* The existing assets/hi copy is a safety net until R2 is live. */
  function localFullPath(source) {
    if (!config().localFullFallback) return "";
    var path = str(source);
    var marker = "assets/img/";
    var i = path.indexOf(marker);
    if (i < 0) return "";
    return path.slice(0, i) + "assets/hi/" + path.slice(i + marker.length);
  }

  function streamEmbedUrl(uid) {
    var code = config().streamCustomerCode;
    var id = str(uid);
    if (!code || !id) return "";
    return "https://customer-" + code + ".cloudflarestream.com/" + encodeURIComponent(id) + "/iframe";
  }

  function streamWatchUrl(uid) {
    var code = config().streamCustomerCode;
    var id = str(uid);
    if (!code || !id) return "";
    return "https://customer-" + code + ".cloudflarestream.com/" + encodeURIComponent(id);
  }

  function ratioString(w, h) {
    if (!w || !h) return "";
    var a = w, b = h;
    function gcd(x, y) { return y ? gcd(y, x % y) : x; }
    var g = gcd(a, b) || 1;
    var rw = Math.round(a / g), rh = Math.round(b / g);
    if (rw > 40 || rh > 40) {
      return (a / b).toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
    }
    return rw + ":" + rh;
  }

  function cssAspect(ratio) {
    var value = str(ratio);
    if (!value) return "16 / 9";
    if (value.indexOf(":") > -1) {
      var parts = value.split(":");
      return (Number(parts[0]) || 16) + " / " + (Number(parts[1]) || 9);
    }
    if (value.indexOf("/") > -1) return value.replace(/\s*\/\s*/, " / ");
    var number = Number(value);
    return number > 0 ? String(number) : "16 / 9";
  }

  function isPortrait(ratio) {
    var value = str(ratio);
    if (value.indexOf(":") > -1) {
      var p = value.split(":");
      return (Number(p[0]) || 16) < (Number(p[1]) || 9);
    }
    return Number(value) > 0 && Number(value) < 1;
  }

  /* ---------- Manifest validation ---------- */
  function normalizeImage(raw) {
    if (!raw || typeof raw !== "object") {
      warn("Skipping an image entry that is not an object.", raw);
      return null;
    }
    var id = str(raw.id);
    if (!id) {
      warn("Skipping an image without an id.", raw);
      return null;
    }
    var thumbnail = str(raw.thumbnail);
    var source = str(raw.source);
    var full = str(raw.full);
    if (!source && /^assets\//.test(thumbnail)) source = thumbnail;
    if (!thumbnail) thumbnail = source;
    if (!thumbnail) {
      warn("Skipping image '" + id + "' because it has no thumbnail/source.", raw);
      return null;
    }
    var width = num(raw.width);
    var height = num(raw.height);
    return {
      type: "image",
      manifest: true,
      id: id,
      title: str(raw.title),
      thumbnail: thumbnail,
      source: source,
      full: full,
      fullUrl: r2Url(full),
      fallbackUrl: localFullPath(source || thumbnail),
      alt: plain(raw.alt || raw.caption || raw.title) || "Image",
      caption: raw.caption == null ? "" : String(raw.caption),
      description: raw.description == null ? "" : String(raw.description),
      category: str(raw.category),
      width: width,
      height: height,
      ratio: ratioString(width, height) || str(raw.aspectRatio)
    };
  }

  function normalizeVideo(raw) {
    if (!raw || typeof raw !== "object") {
      warn("Skipping a video entry that is not an object.", raw);
      return null;
    }
    var id = str(raw.id);
    if (!id) {
      warn("Skipping a video without an id.", raw);
      return null;
    }
    var thumbnail = str(raw.thumbnail) || str(raw.posterSource);
    var fallback = raw.fallback && typeof raw.fallback === "object" ? raw.fallback : {};
    var streamId = str(raw.streamId);
    var provider = streamId && streamReady() ? "stream" : str(fallback.provider);
    if (!thumbnail && fallback.provider === "youtube" && fallback.id) {
      thumbnail = "https://img.youtube.com/vi/" + fallback.id + "/hqdefault.jpg";
    }
    var width = num(raw.width);
    var height = num(raw.height);
    var ratio = str(raw.aspectRatio) || ratioString(width, height) || "16:9";
    return {
      type: "video",
      manifest: true,
      id: id,
      title: str(raw.title),
      thumbnail: thumbnail,
      streamId: streamId,
      provider: provider,
      fallback: fallback,
      youtubeId: fallback.provider === "youtube" ? str(fallback.id) : "",
      instagramKind: fallback.provider === "instagram" ? str(fallback.kind || "reel") : "",
      instagramId: fallback.provider === "instagram" ? str(fallback.id) : "",
      fallbackUrl: str(fallback.url),
      category: str(raw.category),
      aspectRatio: ratio,
      width: width,
      height: height,
      alt: plain(raw.alt || raw.caption || raw.title || "Video"),
      caption: raw.caption == null ? "" : String(raw.caption),
      description: raw.description == null ? "" : String(raw.description),
      status: str(raw.status)
    };
  }

  function validate(manifest) {
    if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
      throw new Error("data/manifest is not an object");
    }
    if (manifest.version !== 1) {
      warn("Expected media manifest version 1, got " + manifest.version + ".", manifest.version);
    }
    var seen = Object.create(null);
    var images = Array.isArray(manifest.images) ? manifest.images : [];
    var videos = Array.isArray(manifest.videos) ? manifest.videos : [];

    images.forEach(function (raw) {
      var image = normalizeImage(raw);
      if (!image) return;
      if (seen[image.id]) {
        warn("Duplicate media id '" + image.id + "'; keeping the first image.", raw);
        return;
      }
      seen[image.id] = true;
      state.images[image.id] = image;
      if (image.source) state.imagesBySource[image.source] = image;
      if (image.thumbnail) state.imagesByThumbnail[image.thumbnail] = image;
    });

    videos.forEach(function (raw) {
      var video = normalizeVideo(raw);
      if (!video) return;
      if (seen[video.id]) {
        warn("Duplicate media id '" + video.id + "'; keeping the first entry.", raw);
        return;
      }
      seen[video.id] = true;
      state.videos[video.id] = video;
      if (video.status === "pending-stream-migration") {
        /* Informational only: the legacy player is used until a UID is set. */
      }
    });
  }

  function load() {
    if (state.ready) return state.ready;
    state.ready = fetch(MANIFEST_URL)
      .then(function (res) {
        if (!res.ok) throw new Error(MANIFEST_URL + " (" + res.status + ")");
        return res.json();
      })
      .then(function (manifest) {
        validate(manifest);
        state.loaded = true;
        return state;
      })
      .catch(function (err) {
        state.error = err;
        warn("Media manifest could not be loaded; using legacy paths.", err);
        return state;
      });
    return state.ready;
  }

  /* ---------- Resolution ---------- */
  function withOverrides(base, item) {
    var out = {};
    Object.keys(base).forEach(function (key) { out[key] = base[key]; });
    if (!item || typeof item !== "object") return out;
    ["caption", "alt", "title"].forEach(function (key) {
      if (has(item, key)) out[key] = item[key] == null ? "" : String(item[key]);
    });
    if (has(item, "full") && item.full) {
      var full = str(item.full);
      if (/^https?:\/\//i.test(full) || full.indexOf("assets/") === 0) {
        out.fallbackUrl = full;
      } else {
        out.full = full;
        out.fullUrl = r2Url(full);
      }
    }
    return out;
  }

  function imageOverrideImage(item) {
    if (!item || typeof item !== "object" || !item.src) return null;
    var key = str(item.src);
    return state.imagesBySource[key] || state.imagesByThumbnail[key] || null;
  }

  function missingEntry(id, item) {
    return {
      type: "missing",
      manifest: true,
      id: str(id),
      title: item && item.title ? str(item.title) : "",
      thumbnail: PLACEHOLDER,
      source: PLACEHOLDER,
      full: "",
      fullUrl: "",
      fallbackUrl: "",
      alt: "Media unavailable",
      caption: item && item.caption != null ? String(item.caption) : "",
      category: "",
      width: 0,
      height: 0,
      ratio: ""
    };
  }

  function legacyImage(item) {
    var src = str(item && item.src);
    if (!src) return null;
    var full = str(item.full);
    var fallback = "";
    var fullUrl = "";
    if (full) {
      if (/^https?:\/\//i.test(full) || full.indexOf("assets/") === 0) fallback = full;
      else fullUrl = r2Url(full);
    }
    return {
      type: "image",
      manifest: false,
      id: "",
      title: str(item.title),
      thumbnail: src,
      source: src,
      full: full,
      fullUrl: fullUrl,
      fallbackUrl: fallback || localFullPath(src),
      alt: plain(item.alt || item.caption || item.title) || "Image",
      caption: item.caption == null ? "" : String(item.caption),
      category: "",
      width: num(item.width),
      height: num(item.height),
      ratio: ratioString(num(item.width), num(item.height))
    };
  }

  function youtubeId(value) {
    if (!value) return "";
    var v = str(value);
    var m = v.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([A-Za-z0-9_-]{6,})/i);
    if (m) return m[1];
    if (/^[A-Za-z0-9_-]{6,}$/.test(v)) return v;
    return "";
  }

  function instagramRef(value) {
    if (!value) return null;
    var m = str(value).match(/instagram\.com\/(reels?|p|tv)\/([A-Za-z0-9_-]+)/i);
    if (!m) return null;
    var kind = m[1].toLowerCase();
    if (kind === "reels") kind = "reel";
    return { kind: kind, id: m[2] };
  }

  function legacyVideo(item) {
    var o = item || {};
    var ref = str(o.video || o.youtube || "");
    var ig = instagramRef(o.video || o.instagram);
    var provider = str(o.provider);
    var streamId = str(o.streamId);
    if (streamId) provider = provider || "stream";
    if (!provider) provider = ig ? "instagram" : "youtube";
    var yt = provider === "youtube" ? youtubeId(ref) : "";
    var kind = provider === "instagram" ? (ig ? ig.kind : str(o.kind || "reel")) : "";
    var instaId = provider === "instagram" ? (ig ? ig.id : str(o.video || o.instagram)) : "";
    if (!streamId && !yt && !instaId) return null;

    var poster = str(o.poster);
    if (!poster) {
      var mapped = imageOverrideImage({ src: poster });
      if (mapped) poster = mapped.thumbnail;
    }
    if (!poster && provider === "youtube" && yt) {
      poster = "https://img.youtube.com/vi/" + yt + "/hqdefault.jpg";
    }
    var ratio = str(o.aspectRatio) || (provider === "instagram" ? "9:16" : "16:9");
    return {
      type: "video",
      manifest: false,
      id: "",
      title: str(o.title),
      thumbnail: poster,
      streamId: streamId,
      provider: provider,
      fallback: {},
      youtubeId: yt,
      instagramKind: kind,
      instagramId: instaId,
      fallbackUrl: str(o.url),
      category: "",
      aspectRatio: ratio,
      width: num(o.width),
      height: num(o.height),
      alt: plain(o.alt || o.caption || o.title) || "Video",
      caption: o.caption == null ? "" : String(o.caption),
      status: ""
    };
  }

  function resolveEntry(item) {
    if (item == null) return null;

    if (typeof item === "string") {
      var key = str(item);
      if (!key) return null;
      if (key.indexOf("media:") === 0) key = key.slice(6).trim();
      if (state.images[key]) return withOverrides(state.images[key], null);
      if (state.videos[key]) return withOverrides(state.videos[key], null);
      if (state.imagesBySource[key]) return withOverrides(state.imagesBySource[key], null);
      if (state.imagesByThumbnail[key]) return withOverrides(state.imagesByThumbnail[key], null);
      if (/^(https?:)?\/\//i.test(key) || /^assets\//i.test(key) || key.indexOf("/") > -1) {
        return legacyImage({ src: key });
      }
      warn("Media id '" + key + "' was not found in data/media.json; showing a placeholder.");
      return missingEntry(key, null);
    }

    if (typeof item !== "object") return null;

    if (item.media) {
      var id = str(item.media);
      if (state.images[id]) return withOverrides(state.images[id], item);
      if (state.videos[id]) return withOverrides(state.videos[id], item);
      warn("Media id '" + id + "' was not found in data/media.json; showing a placeholder.");
      return missingEntry(id, item);
    }

    if (item.streamId) {
      var streamVideo = legacyVideo(item);
      if (streamVideo) return streamVideo;
    }

    if (item.video || item.youtube || item.instagram) {
      var video = legacyVideo(item);
      if (video) return video;
    }

    if (item.embed) {
      return {
        type: "embed",
        id: "",
        manifest: false,
        src: str(item.embed),
        title: str(item.title),
        caption: item.caption == null ? "" : String(item.caption),
        alt: plain(item.caption || item.title) || "Embedded content",
        preview: str(item.preview || item.poster)
      };
    }

    if (item.src) {
      var known = state.imagesBySource[str(item.src)] || state.imagesByThumbnail[str(item.src)];
      if (known) return withOverrides(known, item);
      return legacyImage(item);
    }

    return null;
  }

  function getImage(id) {
    return state.images[str(id)] || null;
  }

  function getVideo(id) {
    return state.videos[str(id)] || null;
  }

  function images() {
    return Object.keys(state.images).map(function (id) { return state.images[id]; });
  }

  function videos() {
    return Object.keys(state.videos).map(function (id) { return state.videos[id]; });
  }

  function imageForSource(path) {
    var key = str(path);
    return state.imagesBySource[key] || state.imagesByThumbnail[key] || null;
  }

  function thumbnailForPath(path) {
    var image = imageForSource(path);
    return image ? image.thumbnail : str(path);
  }

  /* ---------- Video player ---------- */
  function embedUrl(video) {
    var v = video || {};
    if (v.provider === "stream" && v.streamId) return streamEmbedUrl(v.streamId);
    if (v.provider === "youtube" && v.youtubeId) {
      return "https://www.youtube.com/embed/" + encodeURIComponent(v.youtubeId) + "?rel=0";
    }
    if (v.provider === "instagram" && v.instagramId) {
      return "https://www.instagram.com/" + encodeURIComponent(v.instagramKind || "reel") +
        "/" + encodeURIComponent(v.instagramId) + "/embed";
    }
    return "";
  }

  function watchUrl(video) {
    var v = video || {};
    if (v.provider === "stream" && v.streamId) return streamWatchUrl(v.streamId);
    if (v.provider === "youtube" && v.youtubeId) return "https://www.youtube.com/watch?v=" + encodeURIComponent(v.youtubeId);
    if (v.provider === "instagram" && v.instagramId) {
      return "https://www.instagram.com/" + (v.instagramKind || "reel") + "/" + v.instagramId + "/";
    }
    return v.fallbackUrl || "";
  }

  function setVideoData(button, video) {
    button.setAttribute("data-media-id", video.id || "");
    button.setAttribute("data-video-provider", video.provider || "");
    button.setAttribute("data-stream-id", video.streamId || "");
    button.setAttribute("data-youtube-id", video.youtubeId || "");
    button.setAttribute("data-instagram-kind", video.instagramKind || "");
    button.setAttribute("data-instagram-id", video.instagramId || "");
    button.setAttribute("data-aspect", video.aspectRatio || "16:9");
    button.setAttribute("data-title", video.title || "");
    button.setAttribute("data-caption", video.caption || "");
  }

  function createVideoButton(ref, options) {
    var opts = options || {};
    var resolved = ref && ref.type ? ref : resolveEntry(ref);
    if (!resolved || resolved.type !== "video") return null;

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = opts.className || "video-embed";
    setVideoData(btn, resolved);
    btn.setAttribute("aria-label", "Play video" + (resolved.title ? ": " + plain(resolved.title) : ""));

    if (!resolved.thumbnail) {
      btn.classList.add("is-posterless");
    } else {
      var img = document.createElement("img");
      img.src = resolved.thumbnail;
      img.alt = plain(resolved.alt || resolved.title || resolved.caption) || "Video poster";
      img.loading = "lazy";
      img.decoding = "async";
      if (resolved.width) img.width = resolved.width;
      if (resolved.height) img.height = resolved.height;
      btn.appendChild(img);
    }

    var play = document.createElement("span");
    play.className = "video-play";
    play.setAttribute("aria-hidden", "true");
    btn.appendChild(play);

    if (opts.gallery) {
      btn.setAttribute("data-lightbox", "");
      btn.setAttribute("data-lightbox-set", opts.set || "");
      if (resolved.caption) {
        var cap = document.createElement("span");
        cap.className = "gallery-cap";
        cap.textContent = resolved.caption;
        btn.appendChild(cap);
      }
    }

    return btn;
  }

  function statusNode() {
    var status = document.createElement("div");
    status.className = "media-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.hidden = true;
    var spinner = document.createElement("span");
    spinner.className = "media-spinner";
    spinner.setAttribute("aria-hidden", "true");
    var text = document.createElement("span");
    text.className = "media-status-text";
    status.appendChild(spinner);
    status.appendChild(text);
    return status;
  }

  function showStatus(status, message, linkUrl, linkLabel) {
    if (!status) return;
    var text = status.querySelector(".media-status-text");
    if (text) text.textContent = message;
    var old = status.querySelector(".media-status-link");
    if (old && old.parentNode) old.parentNode.removeChild(old);
    if (linkUrl) {
      var link = document.createElement("a");
      link.className = "media-status-link";
      link.href = linkUrl;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = linkLabel || "Open video";
      status.appendChild(link);
    }
    var spinner = status.querySelector(".media-spinner");
    if (spinner) spinner.hidden = !!linkUrl;
    status.hidden = false;
  }

  function hideStatus(status) {
    if (status) status.hidden = true;
  }

  function createVideoFrame(ref, options) {
    var opts = options || {};
    var video = ref && ref.type ? ref : resolveEntry(ref);
    if (!video || video.type !== "video") return null;

    var frame = document.createElement("div");
    frame.className = "video-frame" + (opts.lightbox ? " video-frame--lightbox" : "");
    frame.style.aspectRatio = cssAspect(video.aspectRatio);
    if (isPortrait(video.aspectRatio)) frame.classList.add("is-portrait");
    if (video.id) frame.setAttribute("data-media-id", video.id);

    var url = embedUrl(video);
    if (!url) {
      frame.classList.add("video-frame--error");
      var error = statusNode();
      error.classList.add("is-error");
      error.hidden = false;
      var errorSpinner = error.querySelector(".media-spinner");
      if (errorSpinner) errorSpinner.hidden = true;
      var errorText = error.querySelector(".media-status-text");
      if (errorText) errorText.textContent = "This video is not available yet.";
      var fallback = document.createElement("span");
      fallback.className = "media-status-note";
      fallback.textContent = "Add a Cloudflare Stream UID to data/media.json to enable it.";
      error.appendChild(fallback);
      frame.appendChild(error);
      return frame;
    }

    var iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.title = plain(video.title || video.caption) || "Video";
    iframe.loading = "eager";
    iframe.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen";
    iframe.setAttribute("allowfullscreen", "");
    iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    frame.appendChild(iframe);

    var status = statusNode();
    frame.appendChild(status);
    showStatus(status, "Loading video…");

    var loaded = false;
    var timer = null;
    function ready() {
      if (loaded) return;
      loaded = true;
      if (timer) clearTimeout(timer);
      hideStatus(status);
    }
    iframe.addEventListener("load", ready);
    timer = window.setTimeout(function () {
      if (loaded) return;
      showStatus(status, "The video is taking longer than expected.", watchUrl(video), "Open video");
    }, 15000);

    return frame;
  }

  function videoFromElement(el) {
    if (!el) return null;
    var id = str(el.getAttribute("data-media-id"));
    if (id && state.videos[id]) return state.videos[id];

    var provider = str(el.getAttribute("data-video-provider"));
    var streamId = str(el.getAttribute("data-stream-id"));
    var youtube = str(el.getAttribute("data-youtube-id"));
    var igKind = str(el.getAttribute("data-instagram-kind"));
    var igId = str(el.getAttribute("data-instagram-id"));
    var legacy = str(el.getAttribute("data-video"));
    if (!provider && legacy) {
      if (legacy.indexOf("ig:") === 0) {
        var bits = legacy.split(":");
        provider = "instagram";
        igKind = bits[1] || "reel";
        igId = bits[2] || "";
      } else {
        provider = "youtube";
        youtube = legacy;
      }
    }
    var posterImg = el.querySelector("img");
    return legacyVideo({
      provider: provider,
      streamId: streamId,
      video: youtube || (provider === "youtube" ? legacy : ""),
      instagram: igKind && igId ? "https://www.instagram.com/" + igKind + "/" + igId + "/" : "",
      kind: igKind,
      aspectRatio: str(el.getAttribute("data-aspect")),
      title: str(el.getAttribute("data-title")),
      caption: el.hasAttribute("data-caption") ? el.getAttribute("data-caption") : "",
      poster: posterImg ? str(posterImg.getAttribute("src")) : ""
    });
  }

  function activateVideo(button) {
    if (!button || button.getAttribute("data-activating") === "true") return;
    var video = videoFromElement(button);
    if (!video) return;
    button.setAttribute("data-activating", "true");
    var frame = createVideoFrame(video, {});
    if (frame && button.parentNode) button.parentNode.replaceChild(frame, button);
  }

  /* ---------- Public API ---------- */
  window.SiteMedia = {
    load: load,
    getImage: getImage,
    getVideo: getVideo,
    images: images,
    videos: videos,
    imageForSource: imageForSource,
    thumbnailForPath: thumbnailForPath,
    resolveEntry: resolveEntry,
    r2Url: r2Url,
    localFullPath: localFullPath,
    streamEmbedUrl: streamEmbedUrl,
    streamWatchUrl: streamWatchUrl,
    cssAspect: cssAspect,
    isPortrait: isPortrait,
    createVideoButton: createVideoButton,
    createVideoFrame: createVideoFrame,
    videoFromElement: videoFromElement,
    activateVideo: activateVideo,
    embedUrl: embedUrl,
    watchUrl: watchUrl,
    warnings: function () { return state.warnings.slice(); },
    isLoaded: function () { return state.loaded; },
    error: function () { return state.error; }
  };
})();
