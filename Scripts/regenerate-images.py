#!/usr/bin/env python3
"""Regenerate the website's image tiers from the full-resolution originals.

It deletes and rebuilds two folders in the project:

    assets/img/   the DISPLAY copies  (max 1000px)  used by cards, sliders, gallery
    assets/hi/    the LIGHTBOX copies (max 2560px) loaded only when an image is clicked

Both are generated from a source folder of full-resolution originals kept OUTSIDE
this repository, so the repo stays small and every image is easy to re-derive.

Usage:
    python3 Scripts/regenerate-images.py [FULLRES_DIR]

    FULLRES_DIR   folder holding the full-resolution originals, mirroring the
                  assets/img layout. Defaults to the FULLRES_DIR environment
                  variable, or:
                  ~/Desktop/02 College/Portfolio-fullres-images/img

Orientation is baked in and EXIF/GPS metadata is stripped. Requires Pillow:
    pip install pillow
"""

import os
import shutil
import sys

try:
    from PIL import Image, ImageOps
except ImportError:  # pragma: no cover
    sys.exit("Pillow is required. Install it with:  pip install pillow")

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)  # repository root (parent of Scripts/)

DEFAULT_SRC = os.path.expanduser("~/Desktop/02 College/Portfolio-fullres-images/img")

MAX_DISPLAY = 1000
MAX_HI = 2560
QUALITY_DISPLAY = 80
QUALITY_HI = 85
RASTER = (".jpg", ".jpeg", ".png", ".webp", ".gif", ".tif", ".tiff")
SKIP = {".DS_Store"}
SKIP_EXT = {".pages"}

# Hand-authored assets (placeholder.svg, banner.svg, ...) are kept across runs and
# mirrored into both tiers, even if they are missing from the full-resolution source.
KEEP_EXT = {".svg"}


def resize(im, max_side):
    w, h = im.size
    scale = min(1.0, max_side / max(w, h))
    if scale < 1.0:
        return im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
    return im


def save(im, path, ext, quality):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    icc = im.info.get("icc_profile")
    kw = {"icc_profile": icc} if icc else {}
    if ext in (".jpg", ".jpeg"):
        if im.mode not in ("RGB", "L"):
            im = im.convert("RGB")
        im.save(path, "JPEG", quality=quality, optimize=True, progressive=True, **kw)
    elif ext == ".png":
        im.save(path, "PNG", optimize=True, **kw)
    elif ext == ".webp":
        im.save(path, "WEBP", quality=quality, **kw)
    elif ext == ".gif":
        im.save(path, "GIF", optimize=True)
    else:
        im.save(path, **kw)


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else (os.environ.get("FULLRES_DIR") or DEFAULT_SRC)
    src = os.path.abspath(os.path.expanduser(src))
    if not os.path.isdir(src):
        sys.exit("Full-resolution source folder not found:\n  %s" % src)

    files = []
    for root, dirs, names in os.walk(src):
        dirs[:] = [d for d in dirs if d != ".git"]
        for name in names:
            if name in SKIP or os.path.splitext(name)[1].lower() in SKIP_EXT:
                continue
            files.append(os.path.relpath(os.path.join(root, name), src))
    files.sort()

    raster = [f for f in files if os.path.splitext(f)[1].lower() in RASTER]
    if not raster:
        sys.exit("No images found in %s\nRefusing to wipe the generated assets." % src)

    display_dir = os.path.join(ROOT, "assets", "img")
    hi_dir = os.path.join(ROOT, "assets", "hi")

    # Snapshot hand-authored assets (SVGs) so they survive the wipe.
    kept = {}
    if os.path.isdir(display_dir):
        for root, dirs, names in os.walk(display_dir):
            for name in names:
                if os.path.splitext(name)[1].lower() in KEEP_EXT:
                    p = os.path.join(root, name)
                    kept[os.path.relpath(p, display_dir)] = open(p, "rb").read()

    # Wipe and rebuild both tiers.
    for d in (display_dir, hi_dir):
        if os.path.isdir(d):
            shutil.rmtree(d)
        os.makedirs(d, exist_ok=True)

    display_bytes = 0
    hi_bytes = 0
    for rel in files:
        ext = os.path.splitext(rel)[1].lower()
        display_path = os.path.join(display_dir, rel)

        if ext not in RASTER:
            # Vectors and other assets go into both tiers unchanged.
            for base in (display_dir, hi_dir):
                dst = os.path.join(base, rel)
                os.makedirs(os.path.dirname(dst) or ".", exist_ok=True)
                shutil.copy2(os.path.join(src, rel), dst)
            continue

        im = ImageOps.exif_transpose(Image.open(os.path.join(src, rel)))
        save(resize(im, MAX_DISPLAY), display_path, ext, QUALITY_DISPLAY)
        save(resize(im, MAX_HI), os.path.join(hi_dir, rel), ext, QUALITY_HI)
        display_bytes += os.path.getsize(display_path)
        hi_bytes += os.path.getsize(os.path.join(hi_dir, rel))

    # Restore any kept hand-authored assets that the source did not provide.
    restored = 0
    for rel, data in kept.items():
        for base in (display_dir, hi_dir):
            dst = os.path.join(base, rel)
            if not os.path.exists(dst):
                os.makedirs(os.path.dirname(dst) or ".", exist_ok=True)
                with open(dst, "wb") as fh:
                    fh.write(data)
                restored += 1

    print("Regenerated from %s" % src)
    print("  assets/img : %d files, %.1f MB" % (len(files), display_bytes / 1048576))
    print("  assets/hi  : %d images, %.1f MB" % (len(raster), hi_bytes / 1048576))
    if kept:
        print("  kept SVG assets: %s" % ", ".join(sorted(kept)))


if __name__ == "__main__":
    main()
