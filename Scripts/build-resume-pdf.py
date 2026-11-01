#!/usr/bin/env python3
"""Rebuild assets/files/Derek_Han_Resume.pdf from the live resume page.

The resume page reads data/resume.json, so running this after editing the JSON
keeps the downloadable PDF in sync with the website. Publish.command calls this
automatically before committing.
"""

from __future__ import annotations

import http.server
import os
import shutil
import subprocess
import sys
import tempfile
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "files" / "Derek_Han_Resume.pdf"


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):  # noqa: A003 - match the stdlib signature
        pass


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


def main() -> int:
    chrome = find_chrome()
    if not chrome:
        print(
            "  Chrome/Chromium was not found. Set CHROME=/path/to/chrome to build the resume PDF.",
            file=sys.stderr,
        )
        return 1

    OUT.parent.mkdir(parents=True, exist_ok=True)

    def handler(*args, **kwargs):
        return QuietHandler(*args, directory=str(ROOT), **kwargs)

    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    server.daemon_threads = True
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    tmpdir = Path(tempfile.mkdtemp(prefix="resume-pdf-"))
    tmp_pdf = tmpdir / "resume.pdf"
    try:
        url = f"http://127.0.0.1:{port}/resume.html"
        cmd = [
            chrome,
            "--headless=new",
            "--disable-gpu",
            "--no-pdf-header-footer",
            "--run-all-compositor-stages-before-draw",
            "--virtual-time-budget=6000",
            f"--user-data-dir={tmpdir / 'chrome-profile'}",
            f"--print-to-pdf={tmp_pdf}",
            url,
        ]
        subprocess.run(
            cmd,
            check=True,
            timeout=90,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        if not tmp_pdf.exists() or tmp_pdf.stat().st_size < 1000:
            print("  PDF generation failed: the output file is missing or too small.", file=sys.stderr)
            return 1

        shutil.copyfile(tmp_pdf, OUT)
        print(f"  Wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size:,} bytes)")

        try:
            from pypdf import PdfReader

            pages = len(PdfReader(str(OUT)).pages)
            print(f"  Pages: {pages}")
            if pages != 1:
                print("  ! Warning: the resume is not one page.", file=sys.stderr)
        except Exception:
            pass
        return 0
    except subprocess.TimeoutExpired:
        print("  PDF generation timed out.", file=sys.stderr)
        return 1
    except subprocess.CalledProcessError as exc:
        print(f"  Chrome failed with exit code {exc.returncode}.", file=sys.stderr)
        return 1
    finally:
        server.shutdown()
        server.server_close()
        shutil.rmtree(tmpdir, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main())
