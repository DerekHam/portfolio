#!/usr/bin/env python3
"""Build the WebP thumbnails/posters listed in data/media.json.

The GitHub repository holds only these small thumbnails; the high-resolution
R2 previews are uploaded separately. Existing files are left alone unless the
source is newer (or --force is passed). Nothing is deleted.

Usage:
    python3 Scripts/build-thumbnails.py [--force]
"""

import argparse
import os
import sys

try:
    from PIL import Image, ImageOps
except ImportError:  # pragma: no cover
    sys.exit("Pillow is required. Install it with:  python3 -m pip install pillow")

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
MANIFEST = os.path.join(ROOT, "data", "media.json")

IMAGE_MAX = 720
VIDEO_MAX = 960
IMAGE_QUALITY = 78
VIDEO_QUALITY = 80


def build(source, target, max_side, quality, force=False):
    source = os.path.join(ROOT, source)
    target = os.path.join(ROOT, target)
    if not os.path.isfile(source):
        return "missing-source"
    if not force and os.path.isfile(target):
        if os.path.getmtime(target) >= os.path.getmtime(source):
            return "current"

    os.makedirs(os.path.dirname(target) or ".", exist_ok=True)
    with Image.open(source) as opened:
        im = ImageOps.exif_transpose(opened)
        w, h = im.size
        scale = min(1.0, max_side / max(w, h))
        if scale < 1.0:
            im = im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
        if im.mode not in ("RGB", "RGBA", "L"):
            im = im.convert("RGBA" if "A" in im.getbands() else "RGB")
        icc = im.info.get("icc_profile")
        kw = {"icc_profile": icc} if icc else {}
        im.save(target, "WEBP", quality=quality, method=6, **kw)
    return "built"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="rebuild every thumbnail")
    args = parser.parse_args()

    try:
        import json
        with open(MANIFEST, encoding="utf-8") as fh:
            manifest = json.load(fh)
    except (OSError, ValueError) as exc:
        sys.exit("Could not read %s: %s" % (MANIFEST, exc))

    jobs = []
    for image in manifest.get("images", []):
        jobs.append(("image", image.get("source"), image.get("thumbnail"), IMAGE_MAX, IMAGE_QUALITY))
    for video in manifest.get("videos", []):
        jobs.append(("video", video.get("posterSource") or video.get("source"),
                     video.get("thumbnail"), VIDEO_MAX, VIDEO_QUALITY))

    counts = {"built": 0, "current": 0, "missing-source": 0, "missing-target": 0}
    for kind, source, target, max_side, quality in jobs:
        if not target:
            counts["missing-target"] += 1
            print("  ! %s has no thumbnail path" % kind)
            continue
        result = build(source, target, max_side, quality, force=args.force)
        counts[result] += 1
        if result == "missing-source":
            print("  ! source missing, kept existing thumbnail: %s" % source)
        elif result == "built":
            print("  built %s" % target)

    print(
        "Thumbnails: %d built, %d already current, %d missing source, %d missing target"
        % (counts["built"], counts["current"], counts["missing-source"], counts["missing-target"])
    )


if __name__ == "__main__":
    main()
