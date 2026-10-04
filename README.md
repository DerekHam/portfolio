# Derek Han — Engineering Portfolio

A plain HTML/CSS/JS portfolio. The **text lives in `data/*.json`** and is loaded into
the HTML and styled by CSS. No build step.

## Local preview

JSON is loaded with `fetch()`, so the site must be served over http — do **not**
double-click the HTML files. From this folder:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Where to edit your content

Everything you normally change is in the `data/` folder. Edit the JSON, refresh the page.

| File | Controls |
|---|---|
| `data/site.json` | Your name, brand initials, email/LinkedIn/GitHub links |
| `data/home.json` | Home hero text, hero banner image, and the About paragraphs |
| `data/projects.json` | All projects (cards, filters, and project pages) |
| `data/experience.json` | Internships/work and extracurriculars/leadership |
| `data/resume.json` | Resume page content and the PDF path |
| `data/awards-skills.json` | Awards and the skill groups |
| `data/blog.json` | Blog posts list |
| `data/contact.json` | Contact rows |
| `data/gallery.json` | Photos &amp; artwork shown in the gallery |

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

Open `data/projects.json` and copy one `{ ... }` object in the array. The Projects page
grid and its filter buttons update automatically from each project's `tags`. Set
`"featured": true` to also show it on the Home page.

### Ordering projects

Projects always appear in **ascending `id` order** — that is your importance ranking,
most important first (for example `00`, `01`, `02`). Both the Home page and the Projects
page follow this order. To reorder, just change the `id` values; the comparison is
numeric-aware, so `2` sorts before `10`.

### Project images (gallery with captions)

A project's `images` array is shown as a **horizontal slider** on its page (so it does not
push the description down), and every image can open in a lightbox (click to enlarge,
arrow keys / Esc). Each entry is either a plain path or an object with an optional caption:

```json
"images": [
  "assets/img/my-project/overview.jpg",
  { "src": "assets/img/my-project/diagram.png", "caption": "Cross-section of the test section" },
  { "src": "assets/img/my-project/result.png", "caption": "Lift vs. angle of attack" }
]
```

- Use plain strings when you do not need a caption.
- `caption` is optional; `alt` is optional too (falls back to the caption or the project title).
- One image renders full-width; two or more become a slider (swipe/scroll, or use the arrows).
- The `thumbnail` is used for the card and as the fallback image when `images` is empty.

## Adding photos / artwork to the gallery

Open `data/gallery.json` and add entries to the `images` array:

```json
{ "src": "assets/img/my-photo.jpg", "alt": "Short description", "caption": "Shown under the enlarged image" }
```

`src` can be a local path (put files in `assets/img/`) or a full URL. Clicking a
thumbnail opens it in a lightbox; left/right arrows and Esc work too. The gallery is
linked discreetly in the footer of every page (and from the Home page).

## Adding a blog post

Add an entry to `data/blog.json`:

```json
{ "date": "2026-01-15", "title": "My Post", "url": "blog/my-post.html", "summary": "One line." }
```

Then create the linked page (for example `blog/my-post.html`). While `posts` is empty,
the page shows the placeholder message.

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
resume.html            Resume / CV
awards-skills.html     Awards & skills
blog.html              Blog
gallery.html           Photos & artwork (lightbox)
contact.html           Contact links
data/                  YOUR CONTENT (edit these)
assets/css/style.css   All styling + theme variables (light/dark)
assets/js/main.js      Site behavior (theme, nav, scroll reveal)
assets/js/render.js    Loads data/*.json and fills the HTML
assets/img/            Images
assets/files/          Resume PDF
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
