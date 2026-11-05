# Derek Han — Engineering Portfolio

A plain HTML/CSS/JS portfolio. The **text lives in `data/*.json`** and is loaded into
the HTML and styled by CSS. No build step.

**Media is hybrid:** small WebP thumbnails/posters live in this repository (GitHub
Pages), high-resolution lightbox images live in Cloudflare R2, and videos play from
Cloudflare Stream. Everything is described by `data/media.json`; see
[Media architecture](#media-architecture-r2--cloudflare-stream).

## Local preview

JSON is loaded with `fetch()`, so the site must be served over http — do **not**
double-click the HTML files. From this folder:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Publishing (one click)

Double-click **`Publish.command`** in Finder (or run `./Publish.command`). It:

1. compares the full-resolution originals against `Scripts/images-manifest.json` and
   rebuilds `assets/img` + `assets/hi` only when images were added, edited or deleted;
2. rebuilds the small WebP thumbnails in `assets/thumbnails/` from those display copies;
3. checks that every file in `data/` still parses as valid JSON and that every media
   reference resolves;
4. rebuilds the downloadable resume PDF from `resume.html` and `data/resume.json`;
5. updates `MEDIA-MIGRATION.md` and `Scripts/media-inventory.csv`;
6. commits everything and pushes to GitHub, where Pages then publishes it.

The originals folder defaults to `~/Desktop/02 College/Portfolio-fullres-images/img`;
set `FULLRES_DIR` to use a different one. It needs Python 3 with Pillow
(`python3 -m pip install pillow`), which the image script already requires.

If macOS refuses to open the file the first time, right-click it → **Open**, or run
`chmod +x Publish.command` once in Terminal.

## Where to edit your content

Everything you normally change is in the `data/` folder. Edit the JSON, refresh the page.

| File | Controls |
|---|---|
| `data/site.json` | Your name, brand initials, public site URL (used in PDF exports), email/LinkedIn/GitHub links |
| `data/home.json` | Home hero text, hero banner image, and the About paragraphs |
| `data/projects.json` | All projects (cards, filters, and project pages) |
| `data/experience.json` | Internships/work and extracurriculars/leadership |
| `data/resume.json` | Resume page content and PDF path; rebuild the PDF with `Scripts/build-resume-pdf.py` (page is hidden/unlisted) |
| `data/awards-skills.json` | Awards and the skill groups |
| `data/blog.json` | Blog posts list |
| `data/contact.json` | Contact rows |
| `data/gallery.json` | Photos &amp; artwork shown in the gallery |
| `data/media.json` | Media manifest: stable IDs, captions, dimensions, WebP thumbnails, R2 keys, Stream UIDs |
| `assets/js/media-config.js` | Public R2 base URL and Cloudflare Stream customer code (no secrets) |

Notes:
- Files may contain `_comment` keys for guidance — they are ignored.
- A few fields allow simple HTML: `about` in `home.json`, `skills` in `resume.json`, and
  `title` and `description` in `projects.json`. For example, a project title can be
  `"Stagecraft: <i>Smash The Wall</i>"` and the italics will show. HTML is only allowed
  in those fields; everywhere else is shown as plain text (and stripped from page titles
  and image alt text automatically).
- A project `description` can be a single HTML string **or an array of HTML blocks**
  (one per line, which is much easier to read and edit). The blocks are joined together
  when rendered, so both forms work.
- Prefer plain quotes and commas. Every file must stay valid JSON (no trailing commas).

## How the HTML and data connect

Each page starts with `<body data-page="contact">`, which tells `render.js` to load
`data/contact.json` (plus `data/site.json` everywhere). The HTML holds the structure
and classes; small attributes pull in the text:

| Attribute | Meaning |
|---|---|
| `data-bind="path.to.text"` | Fill the element's text from the JSON path |
| `data-bind="..." data-html` | Fill with HTML instead of text |
| `data-attrs="href:url,src:image"` | Fill attributes from JSON paths |
| `data-list="path.to.array"` | Repeat the inner `<template>` once per array item |
| `data-bind="."` | In a list of plain strings, the item itself |

Example (from `contact.html`):

```html
<ul class="contact-list" data-list="rows">
  <template>
    <li>
      <span class="label" data-bind="label"></span>
      <span><a data-bind="value" data-attrs="href:href"></a></span>
    </li>
  </template>
</ul>
```

You control styling by editing the HTML template markup and `assets/css/style.css`.

## Adding a project

Open `data/projects.json`. The **last entry in the array is a ready-made template** —
copy that whole `{ ... }` block, give it a unique numeric `id`, delete the
`"template": true` line, and fill in the fields. (Any entry with `"template": true` is
ignored everywhere: no card on Projects or Home, and no `project.html?id=...` page.)

The Projects page grid and its filter buttons update automatically from each project's
`tags`. Set `"featured": true` to also show it on the Home page.

### Ordering projects

Projects always appear in **ascending `id` order** — that is your importance ranking,
most important first (for example `00`, `01`, `02`). Both the Home page and the Projects
page follow this order. To reorder, just change the `id` values; the comparison is
numeric-aware, so `2` sorts before `10`.

### Project images (gallery with captions)

A project's `images` array is shown as a **horizontal slider** on its page (so it does not
push the description down), and every image can open in a lightbox (click to enlarge,
arrow keys / Esc). Each entry is a **media ID from `data/media.json`** (recommended), a
legacy image path, or a video object:

```json
"images": [
  { "media": "calico-full-view" },
  { "media": "calico-diffuser-1", "caption": "Optional per-page caption override" },
  "assets/img/my-project/legacy-direct-path.jpg"
]
```

- Add the image and its metadata to `data/media.json` first (see
  [Adding media](#adding-media-images-and-videos)), then reference its `id` here.
- `caption` and `alt` in `media.json` are used everywhere; add them on the page entry only
  when that page needs a different caption.
- One image renders full-width; two or more become a slider (swipe/scroll, or use the arrows).
- The `thumbnail` is used for the card and as the fallback image when `images` is empty.
  Project `thumbnail` values point at the WebP files in `assets/thumbnails/`.

**Videos:** a `media.json` video entry can be a Cloudflare Stream video (preferred) or a
legacy YouTube/Instagram fallback. Reference it by ID:

```json
"images": [
  { "media": "video-catamaran-pov" }
]
```

- Videos show a poster with a play button. The poster is the WebP thumbnail in
  `data/media.json`; the player is created only when the visitor clicks.
- Cloudflare Stream is used as soon as the entry has a `streamId` and
  `STREAM_CUSTOMER_CODE` is set. Until then the `fallback` player is used, so the current
  videos keep working during the migration.
- Vertical videos use `"aspectRatio": "9:16"`; landscape videos use `"16:9"`.
- Videos never autoplay on page load.

**Embeds:** an `images` entry can also embed a whole page (for example an interactive map)
with an `embed` value — it renders as a large inline frame (80vh tall) instead of an image:

```json
"images": [
  { "embed": "https://parsecs-starmap.derekhan.link", "caption": "Interactive starmap" }
]
```

The embedded site must allow framing (no `X-Frame-Options: deny`). Optional `title` and
`height` fields are supported. In the Gallery an embed spans the full row.

In the **project PDF export**, an embed is printed as a screenshot of the page
(not a blank frame), because a PDF cannot run an interactive embed. The exporter
looks for `assets/previews/<slug>.png` first, then falls back to the project
`thumbnail`. To use your own image instead, add a `preview` (or `poster`) field:

```json
{ "embed": "https://example.com/map", "preview": "assets/img/my-map-shot.png", "caption": "Interactive map" }
```

`Scripts/build-embed-previews.py` (run by `Publish.command`) takes those
screenshots with headless Chrome. The slug is the embed URL lowercased with
everything except letters and digits turned into `-` (for example
`https://parsecs-starmap.derekhan.link` → `parsecs-starmap-derekhan-link.png`).
It keeps existing screenshots when a page cannot be reached, or when the capture
still looks like a loading screen (common for heavy WebGL pages in headless
Chrome) — the project thumbnail is used in that case.

### Project page sidebar

On wide screens the write-up sits in a column with a **sticky sidebar** on the right carrying:

- **Details** — thumbnail, date, tags, and the link buttons.
- **On this page** — a table of contents built automatically from the write-up's `h2`/`h3`
  headings (hidden if there are fewer than two).
- **Highlights** — a small thumbnail grid of your chosen media (hidden when empty).

Fill the Highlights section with an optional `highlights` array (same shape as `images` —
media IDs, photos, and videos):

```json
"highlights": [
  { "media": "calico-full-view", "caption": "Calico Biggie" },
  { "media": "video-catamaran-lake" }
]
```

Clicking a highlight opens it in the lightbox (photos enlarge; videos play), and it only
cycles through the highlights — not the whole slider.

### Exporting a project as a PDF

Each project page has an **Export PDF** button at the top right. It downloads
that project as one multi-page A4 PDF named `<project title> — Derek Han.pdf`.

The **Projects** page has an **Export all featured** button under the page intro.
It combines every project marked `"featured": true` into a single PDF
(`N Featured Projects — Derek Han.pdf`), each project starting on a new page.
Projects appear in the same id order as the site.

Each project in the export has its title, date, tags and summary, then **all of
its images**, then the write-up and the link list.

- The PDF is generated in the browser, so it always matches the current content;
  there is nothing to rebuild or keep in sync.
- It reuses the site's fonts, accent colors and typography, and is always
  light-mode (dark pages would print poorly).
- Images keep their own aspect ratio — they are not cropped or stretched — and
  are laid out 4 per row (2 for a pair, full width for a single one) so they
  stay compact. Each tile keeps its caption, and videos show their poster with a
  play badge and link to the video.
- **Embedded pages are printed as a screenshot** of the page as it looks on the
  web, with a small “Live page” badge. The tile links to the live embed. See
  [Embeds](#project-images-gallery-with-captions) below for how the screenshot
  is supplied.
- Each project ends with a note saying it was exported from the personal website,
  with clickable links back to the site and to that project’s live page. The
  address comes from `url` in `data/site.json`.
- Links are clickable and underlined.

The PDF engine (`assets/vendor/html2pdf.bundle.min.js`, which bundles html2canvas
and jsPDF) is loaded only when the button is clicked, so normal page loads are
unaffected. The exporter itself lives in `assets/js/export.js`; its layout styles
are the `.pdf-*` rules in `assets/css/style.css`.

### Display vs. lightbox copies (fast pages, sharp zoom)

The site now has three tiers:

- `assets/thumbnails/...` — the **WebP thumbnails/posters committed to GitHub**. Cards,
  sliders, gallery grids, highlights, and video posters use only these. They are lazy
  loaded and carry dimensions/aspect ratios to avoid layout shifts.
- `assets/img/...` — the older 1000px display copies. They remain as a source for the
  thumbnails and as a fallback; they are no longer the primary gallery image.
- `assets/hi/...` — the older 2560px local previews. They remain temporarily as a safety
  net if R2 is unavailable. Once R2 is live, set `LOCAL_FULL_FALLBACK: false` in
  `assets/js/media-config.js` if you want the browser to stop requesting them.

The lightbox now builds its high-resolution URL from `MEDIA_BASE_URL` + the `full` object
key in `data/media.json`. It shows the thumbnail immediately, displays a loading indicator,
swaps in the R2 preview when ready, and falls back to `assets/hi` (then the thumbnail) if
the request fails. High-resolution images are never requested by gallery grids.

Both legacy tiers are still generated from the full-resolution originals with orientation
baked in and EXIF/GPS metadata stripped.

### Regenerating the images and thumbnails

The full-resolution originals live **outside this repository** so it stays small. To rebuild
the display/legacy tiers, run the script — it **deletes `assets/img/` and `assets/hi/`
completely**, then regenerates them from the originals:

```bash
python3 Scripts/regenerate-images.py
python3 Scripts/build-thumbnails.py
```

`Publish.command` runs both for you when needed, and records the originals' checksums in
`Scripts/images-manifest.json` so unchanged images are never rebuilt twice. The scripts are
deterministic: unchanged originals always produce byte-identical output. The thumbnail
script never deletes anything and rebuilds only when a source is newer (or with `--force`).

Requirements: Python 3 and Pillow (`pip install pillow`).

By default it reads from:

```
~/Desktop/02 College/Portfolio-fullres-images/img
```

Point it somewhere else with an argument or the `FULLRES_DIR` environment variable:

```bash
python3 Scripts/regenerate-images.py "/path/to/full-res/images"
FULLRES_DIR="/path/to/full-res/images" python3 Scripts/regenerate-images.py
```

The source folder must **mirror the `assets/img` layout** (same sub-folders and file names).
Photos become JPEG, screenshots stay PNG. Hand-authored vectors such as `placeholder.svg`
and `banner.svg` are **kept across runs and copied into both tiers**, even if they are missing
from the source folder. Add or replace originals there, re-run the script, then commit the
regenerated `assets/img/` and `assets/hi/`. If the source folder is missing or contains no
images, the script stops without deleting anything.

## Media architecture (R2 + Cloudflare Stream)

The repository holds the page markup, JavaScript/CSS, captions, WebP thumbnails, and the
media manifest. Cloudflare R2 holds the high-resolution lightbox previews, and Cloudflare
Stream plays the videos.

### Files

| File | Purpose |
|---|---|
| `data/media.json` | The single source of truth for media IDs, captions, dimensions, thumbnails, R2 object keys, and Stream UIDs |
| `assets/js/media-config.js` | Public R2 base URL and Stream customer code (no secrets) |
| `assets/js/media.js` | Reusable image/lightbox and lazy video components; manifest validation and URL construction |
| `assets/thumbnails/{photography,engineering,projects}/` | GitHub-hosted WebP thumbnails and video posters |
| `assets/img/`, `assets/hi/` | Existing legacy display/preview tiers, kept as sources and fallbacks |
| `MEDIA-MIGRATION.md`, `Scripts/media-inventory.csv` | Generated list of objects still to upload |
| `Scripts/build-thumbnails.py` | Builds WebP thumbnails from the existing display images |
| `Scripts/prepare-r2-previews.py` | Stages 2560px WebP R2 previews outside the repo (no upload) |
| `Scripts/validate-media.py` | Checks the manifest, thumbnails, and page references |
| `Scripts/build-media-inventory.py` | Regenerates the migration inventory |

### Manifest schema

An image entry:

```json
{
  "id": "gallery-rainbow",
  "title": "Hydrogen spectrum",
  "thumbnail": "assets/thumbnails/photography/gallery-rainbow.webp",
  "source": "assets/img/gallery/rainbow.jpeg",
  "full": "photography/gallery-rainbow.webp",
  "alt": "A rainbow-like hydrogen spectrum",
  "caption": "Shown under the enlarged image",
  "category": "Photography",
  "width": 750,
  "height": 1000
}
```

A video entry:

```json
{
  "id": "video-catamaran-pov",
  "title": "Catamaran on Liangma River",
  "thumbnail": "assets/thumbnails/engineering/video-catamaran-pov.webp",
  "posterSource": "assets/img/catamaran/card.png",
  "streamId": "",
  "category": "Engineering",
  "aspectRatio": "16:9",
  "caption": "Catamaran on Liangma River - POV",
  "status": "pending-stream-migration",
  "fallback": {
    "provider": "youtube",
    "id": "l4PK6CLHE0c",
    "url": "https://youtu.be/l4PK6CLHE0c"
  }
}
```

Rules:

- IDs are stable, lowercase, and unique. Reference them from page data as
  `{ "media": "<id>" }`.
- `full` is an **R2 object key**, never a full URL. The site constructs the URL from
  `MEDIA_BASE_URL`, so changing the media domain is one edit.
- `thumbnail` is a repository path and must exist. `source` is optional and only used for
  the local fallback/regeneration.
- `width`/`height` describe the preview ratio and are used to reserve space (less layout
  shift). `caption` and `alt` are optional; `alt` falls back to the caption/title.
- Videos use `streamId` when available. `fallback` keeps the current YouTube/Instagram
  player working until the Stream migration is finished.

### Cloudflare values to fill in

| Value | Where | Notes |
|---|---|---|
| R2 media base URL | `assets/js/media-config.js` → `MEDIA_BASE_URL` | Already set to `https://media.derekhan.link/`; change it if your custom domain differs |
| Stream customer code | `assets/js/media-config.js` → `STREAM_CUSTOMER_CODE` | The part after `customer-` in the player domain |
| Stream video UIDs | `data/media.json` → each video's `streamId` | 32-character UID from the Stream dashboard |
| R2 public access | Cloudflare dashboard | Make objects publicly readable through the custom domain; keep write credentials private |
| R2 CORS | Cloudflare dashboard | Not required for normal `<img>` loading; add `GET` from `https://derekhan.link` only if you later read R2 images in canvas/PDF export |

**Never put API tokens, R2 secret keys, or account IDs in the repository.** Upload tools can
read credentials from environment variables or `~/.config`.

### Adding media (images and videos)

1. **Add the original** to the full-resolution folder outside the repository, mirroring the
   `assets/img` layout, then run `python3 Scripts/regenerate-images.py`.
2. **Add a manifest entry** in `data/media.json` with a new stable `id`, a `thumbnail` path
   under `assets/thumbnails/<category>/<id>.webp`, an R2 `full` key under the same category,
   and `width`/`height`/`alt`/`caption`.
3. **Build the thumbnail** with `python3 Scripts/build-thumbnails.py`. It reads `source` (or
   `posterSource` for videos) and writes the WebP without touching the original.
4. **Stage and upload the preview** with `python3 Scripts/prepare-r2-previews.py`. It writes
   2560px WebP files outside the repository using the exact `full` keys; upload that folder
   to R2. Prefer this preview over the original camera file, and keep originals in R2 under a
   private prefix if you want them for the future.
5. **Reference the ID** from `data/projects.json` (`images`/`highlights`/`thumbnail`) or
   `data/gallery.json` (`images`).
6. **Validate and publish**: `python3 Scripts/validate-media.py`, then `./Publish.command`.

For a video, upload it to Cloudflare Stream first, put its UID in `streamId`, set
`STREAM_CUSTOMER_CODE`, and keep or remove the `fallback` block. The player is only created
after a click; it is responsive, preserves the manifest `aspectRatio`, supports fullscreen,
and does not autoplay.

### Validation, fallbacks, and performance

- `Scripts/validate-media.py` rejects duplicate/invalid IDs, unsafe R2 keys, missing
  thumbnails, bad Stream UIDs, and page references to unknown IDs. `Publish.command` runs it.
- A missing manifest/entry renders a placeholder tile with a short “Media unavailable”
  caption instead of breaking the page.
- If an R2 image fails or times out, the lightbox tries the legacy `assets/hi` copy, then
  keeps the thumbnail and shows a non-blocking error message.
- If Stream is not configured, the manifest `fallback` player is used. If neither is
  available, the video card shows a clear unavailable state.
- Gallery grids load only WebP thumbnails. Full images are requested only after a lightbox
  opens. Video iframes are created only on click. Images are lazy loaded and have dimensions
  or fixed aspect ratios.
- Thumbnails live in GitHub Pages; R2/Stream responses are cached by Cloudflare's CDN. Use
  long-lived `Cache-Control` headers on R2, and a new object key when replacing an image if
  you need to guarantee an immediate refresh.

### Migration status

See [MEDIA-MIGRATION.md](MEDIA-MIGRATION.md) for the full per-object checklist. At the time
of this restructuring:

- **70 image entries** have R2 object keys; their high-resolution previews still need to be
  uploaded. No upload has been performed. Run
  `python3 Scripts/prepare-r2-previews.py` to stage them outside the repository.
- **4 videos** still use their YouTube/Instagram fallback and need Stream UIDs.
- No DNS, domain, or Cloudflare production settings were changed.
- Existing page URLs, captions, page content, `assets/img`, `assets/hi`, and the original
  media were preserved. Nothing was deleted.

The full-resolution originals stay outside the repository and are never deleted by these scripts.
After R2 is verified, the old `assets/hi` fallback tier can be removed manually to shrink the
repository; this restructuring deliberately leaves it in place.

Run `python3 Scripts/build-media-inventory.py` after changing the manifest to refresh both
the Markdown inventory and the CSV.

## Adding photos / artwork to the gallery

Add the image to `data/media.json` (see above), build its thumbnail, then reference its ID in
`data/gallery.json`:

```json
"images": [
  { "media": "gallery-rainbow" },
  { "media": "video-bluebell-train" }
]
```

The old form still works for compatibility:

```json
{ "src": "assets/img/my-photo.jpg", "caption": "Optional override" }
```

Clicking a thumbnail opens the lightbox; left/right arrows and Esc work too. The gallery is
linked discreetly in the footer of every page (and from the Home page).

## Awards, skills & experience

Two files, both plain JSON:

- `data/awards-skills.json`
  - `awards` — one object per honor: `{ "title", "when", "detail" }`.
  - `groups` — the skill chips: `{ "heading", "items": [...] }`.
- `data/experience.json`
  - `work` — research/jobs: `{ "title", "when", "org", "bullets": [...] }`.
  - `extras` — clubs and leadership: `{ "title", "when", "role", "bullets": [...] }`.

**Links:** add an optional `links` array to any award or experience entry — it renders as a
row of small buttons:

```json
"links": [
  { "label": "Project page", "url": "project.html?id=00" },
  { "label": "CAD files", "url": "https://example.com" }
]
```

Add `"download"` to a link to make the browser **download** the file instead of opening it
(the value sets the saved filename). Put the file in `assets/files/`:

```json
"links": [
  {
    "label": "Dev Log (PDF)",
    "url": "assets/files/calico-wind-tunnel-dev-log.pdf",
    "download": "Calico Wind Tunnel Dev Log.pdf"
  }
]
```

**Inline links:** the `title`, `detail`, `org`, `role`, and each `bullets` line accept simple
HTML, so you can also embed a link directly, for example:

```json
"bullets": ["Wrote it up — see the <a href=\"https://example.com\">report</a>."]
```

## Resume PDF

The download button on the home page and the resume page serve
`assets/files/Derek_Han_Resume.pdf`. That PDF is generated from `resume.html`, which reads
`data/resume.json`, so editing the JSON and rebuilding keeps the download in sync.

Rebuild it manually with:

```bash
python3 Scripts/build-resume-pdf.py
```

`Publish.command` runs the same script automatically before committing. The script uses
headless Chrome/Chromium (set `CHROME=/path/to/chrome` if it is not found) and prints the
page with the site's A4 resume print styles. The resume content uses **Candara** with
`Segoe UI` / `Trebuchet MS` fallbacks; the PDF embeds Candara when the font is installed.

## Adding a blog post

Blog posts are JSON-driven, like the rest of the site.

1. **Copy the template** `data/blog/_template.json` to `data/blog/<slug>.json`
   (for example `data/blog/wind-tunnel-notes.json`).
2. **Fill it in** — `title`, `date`, an optional `lead`, and `body` (a list of HTML
   blocks, one per line):

   ```json
   {
     "title": "Wind tunnel notes",
     "date": "2026-01-15",
     "lead": "Optional one-line intro.",
     "body": [
       "<p>First paragraph.</p>",
       "<h2>A heading</h2>",
       "<p>With <strong>bold</strong>, <a href=\"https://example.com\">links</a>, and lists.</p>"
     ]
   }
   ```

3. **Add it to the index** `data/blog.json` with the **same `slug`**:

   ```json
   {
     "date": "2026-01-15",
     "title": "Wind tunnel notes",
     "summary": "One line shown in the list.",
     "slug": "wind-tunnel-notes"
   }
   ```

The post then appears in the list on the Blog page and gets its own page at
`post.html?slug=wind-tunnel-notes`. To link somewhere off-site instead, give the entry a
`url` and omit the `slug`. While `posts` is empty, the page shows the placeholder message.
There's a ready example at `data/blog/welcome.json`.

## Deploy to GitHub Pages

1. Create a GitHub repository.
   - For a clean URL (`https://USERNAME.github.io`), name it `USERNAME.github.io`.
   - Otherwise name it anything (for example `portfolio`) and the site lives at
     `https://USERNAME.github.io/portfolio/`.
2. Push this folder:

   ```bash
   git init
   git add .
   git commit -m "Initial portfolio"
   git branch -M main
   git remote add origin https://github.com/USERNAME/REPO.git
   git push -u origin main
   ```

3. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   choose **main** and **/ (root)**, then save.
4. Wait a minute; your site is live at the URL shown there.

## Custom domain (later)

1. Buy a domain.
2. Add a file named `CNAME` (no extension) containing just your domain, and push it.
3. At your registrar, add DNS records pointing to GitHub Pages, then enable HTTPS in
   **Settings → Pages**.

Update the URLs in `robots.txt` and `sitemap.xml` when you have a final URL.

## File structure

```
index.html             Home / About
projects.html          Filterable project grid
project.html           Single project page (?id=...)
experience.html        Internships + extracurriculars
resume.html            Resume / CV (hidden — no nav link, noindex)
awards-skills.html     Awards & skills
blog.html              Blog
gallery.html           Photos & artwork (lightbox)
contact.html           Contact links
data/                  YOUR CONTENT (edit these)
data/media.json        Central media manifest (IDs, thumbnails, R2 keys, Stream UIDs)
assets/css/style.css   All styling + theme variables (light/dark)
assets/js/media-config.js  Public R2 base URL + Stream customer code
assets/js/media.js     Reusable image/lightbox + lazy video component
assets/js/main.js      Site behavior (theme, nav, scroll reveal, lightbox)
assets/js/render.js    Loads data/*.json and fills the HTML
assets/js/export.js    Project page → PDF export (loaded by project.html)
assets/vendor/         Third-party libraries loaded on demand (html2pdf)
assets/thumbnails/     WebP gallery thumbnails + video posters (GitHub-hosted)
assets/img/            Legacy display images (max 1000px) — generated
assets/hi/             Legacy lightbox fallbacks (max 2560px) — generated
assets/previews/       Screenshots of embedded pages, used in project PDFs
assets/files/          Downloadable files (dev log PDF, resume PDF)
Scripts/regenerate-images.py  Rebuilds assets/img + assets/hi from the full-res originals
Scripts/build-thumbnails.py   Builds WebP thumbnails from data/media.json
Scripts/prepare-r2-previews.py  Stages 2560px WebP previews for R2 (no upload)
Scripts/validate-media.py     Validates the manifest and page references
Scripts/build-media-inventory.py  Regenerates MEDIA-MIGRATION.md + Scripts/media-inventory.csv
Scripts/build-embed-previews.py  Screenshots embedded pages into assets/previews
Scripts/build-resume-pdf.py  Rebuilds assets/files/Derek_Han_Resume.pdf from resume.html
MEDIA-MIGRATION.md     Generated Cloudflare upload checklist (nothing is uploaded automatically)
favicon.svg            Site icon
robots.txt, sitemap.xml  SEO
```

## Changing the look

Colors, fonts, and spacing are CSS variables at the top of `assets/css/style.css`
(`:root` and `[data-theme="dark"]`). Change the accent colors there to re-theme the site.

### Home hero banner

The Home page hero shows a banner image behind the blueprint grid. Set the image path
with `"banner"` in `data/home.json` (for example `"assets/img/mybanner.jpg"`; leave it
empty to show no banner). The grid stays on top, and a translucent tint keeps the text
readable — adjust its strength with the `--hero-tint` variable in `assets/css/style.css`
(lower opacity = more visible banner, higher = easier-to-read text).

### Home page background photo

The Home page also has a full-page background photo (separate from the hero banner). It
lives in `assets/css/style.css` as `.home-bg` (currently `assets/bg/rainbow.jpeg` — the
full-resolution original, kept in `assets/bg/` so the image regeneration script does not
downscale it), with a translucent wash drawn on top of it. Adjust the wash with the
`--home-overlay` (opacity) and `--home-overlay-color` (RGB) variables at the top of that
file:

```css
/* Light theme */
--home-overlay: 0.95;
--home-overlay-color: 238, 240, 242;  /* matches --bg */

/* Dark theme */
--home-overlay: 0.45;
--home-overlay-color: 0, 0, 0;
```

Higher opacity values mute the photo (which keeps foreground text legible); lower values
show more of it. Light mode uses a near-opaque light wash because the photo is dark and
dark text over it is hard to read; dark mode keeps the photo prominent behind light text.
If you lower the light-mode value, re-check the contrast of body text over the photo.

The photo **parallaxes** (asynchronous scrolling): it is anchored to the **bottom of the
banner** and the **bottom of the page**, drifting slower than the content. It's sized to the
photo's full aspect ratio, so the whole image is shown (not cropped) as you scroll through it.
