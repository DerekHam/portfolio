#!/usr/bin/env python3
"""Screenshot embedded pages so project PDFs can show them.

An embedded page (for example an interactive starmap) cannot be captured by the
browser-side PDF exporter: html2canvas cannot read inside a cross-origin iframe.
This script opens each `embed` URL in headless Chrome and saves a screenshot to
`assets/previews/<slug>.png`. `assets/js/export.js` looks for exactly that file
and falls back to the project thumbnail (then to a placeholder) when it is
missing.

Run it manually after adding/changing an embed, or let Publish.command do it.
"""

from __future__ import annotations

import glob
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "assets" / "previews"
DATA_GLOB = str(ROOT / "data" / "**" / "*.json")


def find_chrome() -> str | None:
    candidates = []
    env = os.environ.get("CHROME")
    if env:
        candidates.append(env)
    candidates.extend(
        [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Chromium.app/Contents/MacOS/Chromium",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        ]
    )
    for name in (
        "google-chrome",
        "google-chrome-stable",
        "chromium",
        "chromium-browser",
        "chrome",
        "msedge",
    ):
        found = shutil.which(name)
        if found:
            candidates.append(found)
    for path in candidates:
        if path and Path(path).is_file():
            return path
    return None


def slug_for(url: str) -> str:
    """Must match embedPreviewPath() in assets/js/export.js."""
    value = url.strip().lower()
    value = re.sub(r"^https?://", "", value)
    value = re.sub(r"^www\.", "", value)
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return (value[:100] or "embed")


def normalise_url(url: str) -> str:
    parts = urlsplit(url.strip())
    return urlunsplit((parts.scheme, parts.netloc, parts.path, parts.query, ""))


def collect_embeds() -> list[str]:
    found: dict[str, None] = {}
    for path in sorted(glob.glob(DATA_GLOB, recursive=True)):
        try:
            with open(path, encoding="utf-8") as fh:
                data = json.load(fh)
        except (OSError, ValueError):
            continue

        def walk(node):
            if isinstance(node, dict):
                embed = node.get("embed")
                if isinstance(embed, str) and embed.strip():
                    # An explicit preview means the author already supplied one.
                    if not (node.get("preview") or node.get("poster")):
                        found.setdefault(normalise_url(embed), None)
                for value in node.values():
                    walk(value)
            elif isinstance(node, list):
                for value in node:
                    walk(value)

        walk(data)
    return list(found)


def screenshot(chrome: str, url: str, out: Path, tmpdir: Path) -> bool:
    tmp_png = tmpdir / (slug_for(url) + ".png")
    cmd = [
        chrome,
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--force-device-scale-factor=1",
        "--window-size=1280,800",
        "--run-all-compositor-stages-before-draw",
        "--virtual-time-budget=30000",
        f"--user-data-dir={tmpdir / 'chrome-profile'}",
        f"--screenshot={tmp_png}",
        url,
    ]
    try:
        subprocess.run(
            cmd,
            check=False,
            timeout=75,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except subprocess.TimeoutExpired:
        print(f"  ! Timed out: {url}", file=sys.stderr)
        return False

    if not tmp_png.exists() or tmp_png.stat().st_size < 1000:
        print(f"  ! No screenshot produced: {url}", file=sys.stderr)
        return False

    # Some heavy pages (WebGL maps, etc.) only show a near-blank loading screen
    # in headless Chrome. Do not replace a good existing preview with that.
    if not looks_rendered(tmp_png):
        print(f"  ! Screenshot still looks like a loading/blank page: {url}", file=sys.stderr)
        return False

    out.parent.mkdir(parents=True, exist_ok=True)
    os.replace(tmp_png, out)
    return True


def looks_rendered(path: Path) -> bool:
    """Reject near-uniform captures (typically a loading screen)."""
    try:
        from PIL import Image, ImageStat
    except ImportError:
        return True
    try:
        with Image.open(path) as image:
            stats = ImageStat.Stat(image.convert("L"))
            return stats.stddev[0] >= 6.0
    except Exception:
        return True


def main() -> int:
    urls = collect_embeds()
    if not urls:
        print("  No embedded pages need previews.")
        return 0

    chrome = find_chrome()
    if not chrome:
        print(
            "  Chrome/Chromium was not found. Set CHROME=/path/to/chrome to build embed previews.",
            file=sys.stderr,
        )
        return 0

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    built = 0
    with tempfile.TemporaryDirectory(prefix="embed-previews-") as tmp:
        tmpdir = Path(tmp)
        for url in urls:
            out = OUT_DIR / (slug_for(url) + ".png")
            if screenshot(chrome, url, out, tmpdir):
                built += 1
                print(f"  Wrote {out.relative_to(ROOT)}")

    print(f"  {built}/{len(urls)} embed preview(s) updated.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
