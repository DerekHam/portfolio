#!/usr/bin/env python3
"""Prepare high-resolution WebP previews for Cloudflare R2.

Reads data/media.json, converts each local assets/hi preview (or the display
source when no hi copy exists) to a WebP preview, and writes it to an output
folder using the exact R2 object key from the manifest.

This script does NOT upload anything and does NOT modify the repository. It only
creates a staging folder you can inspect before uploading with rclone, Wrangler,
or the Cloudflare dashboard.

Usage:
    python3 Scripts/prepare-r2-previews.py [OUTPUT_DIR]

Default output:
    ~/Desktop/Portfolio-r2-upload
"""

import os
import sys

try:
    from PIL import Image, ImageOps
except ImportError:  # pragma: no cover
    sys.exit("Pillow is required. Install it with:  python3 -m pip install pillow")

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DEFAULT_OUT = os.path.expanduser("~/Desktop/Portfolio-r2-upload")
MAX_SIDE = 2560
QUALITY = 82


def local_preview(entry):
    source = entry.get("source") or ""
    if source.startswith("assets/img/"):
        hi = source.replace("assets/img/", "assets/hi/", 1)
        if os.path.isfile(os.path.join(ROOT, hi)):
            return hi
    if source and os.path.isfile(os.path.join(ROOT, source)):
        return source
    return ""


def main():
    out_dir = os.path.abspath(os.path.expanduser(sys.argv[1] if len(sys.argv) > 1 else DEFAULT_OUT))
    try:
        import json
        with open(os.path.join(ROOT, "data", "media.json"), encoding="utf-8") as fh:
            manifest = json.load(fh)
    except (OSError, ValueError) as exc:
        sys.exit("Could not read data/media.json: %s" % exc)

    built = skipped = 0
    total = 0
    for entry in manifest.get("images", []):
        key = entry.get("full")
        if not key:
            continue
        source = local_preview(entry)
        if not source:
            print("  ! %s: no local preview/source" % entry.get("id"))
            skipped += 1
            continue

        target = os.path.join(out_dir, key)
        os.makedirs(os.path.dirname(target) or ".", exist_ok=True)
        with Image.open(os.path.join(ROOT, source)) as opened:
            im = ImageOps.exif_transpose(opened)
            w, h = im.size
            scale = min(1.0, MAX_SIDE / max(w, h))
            if scale < 1.0:
                im = im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
            if im.mode not in ("RGB", "RGBA", "L"):
                im = im.convert("RGBA" if "A" in im.getbands() else "RGB")
            icc = im.info.get("icc_profile")
            kw = {"icc_profile": icc} if icc else {}
            im.save(target, "WEBP", quality=QUALITY, method=6, **kw)
        size = os.path.getsize(target)
        total += size
        built += 1

    print("Prepared %d R2 previews in %s (%.1f MB)" % (built, out_dir, total / 1048576))
    if skipped:
        print("Skipped %d entries without a local source." % skipped)
    print("Nothing was uploaded. Review the folder, then upload it to the R2 bucket root.")


if __name__ == "__main__":
    main()
