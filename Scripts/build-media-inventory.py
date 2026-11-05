#!/usr/bin/env python3
"""Regenerate the Cloudflare migration inventory from data/media.json.

Outputs:
    MEDIA-MIGRATION.md       human-readable checklist
    Scripts/media-inventory.csv  one row per object, for upload scripts

No files are uploaded and no Cloudflare settings are changed.
"""

import csv
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def main():
    with open(os.path.join(ROOT, "data", "media.json"), encoding="utf-8") as fh:
        manifest = json.load(fh)

    images = manifest.get("images", [])
    videos = manifest.get("videos", [])

    rows = []
    for entry in images:
        source = entry.get("source", "")
        hi = source.replace("assets/img/", "assets/hi/", 1) if source.startswith("assets/img/") else ""
        rows.append({
            "kind": "image",
            "id": entry.get("id", ""),
            "category": entry.get("category", ""),
            "github_thumbnail": entry.get("thumbnail", ""),
            "r2_key": entry.get("full", ""),
            "source": hi,
            "stream_uid": "",
            "fallback": "",
            "status": "pending R2 upload",
        })
    for entry in videos:
        fallback = entry.get("fallback") or {}
        rows.append({
            "kind": "video",
            "id": entry.get("id", ""),
            "category": entry.get("category", ""),
            "github_thumbnail": entry.get("thumbnail", ""),
            "r2_key": "",
            "source": entry.get("posterSource", ""),
            "stream_uid": entry.get("streamId", ""),
            "fallback": fallback.get("url") or fallback.get("provider", ""),
            "status": "pending Stream upload" if not entry.get("streamId") else "Stream configured",
        })

    csv_path = os.path.join(ROOT, "Scripts", "media-inventory.csv")
    with open(csv_path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(rows[0].keys()) if rows else ["kind", "id"])
        writer.writeheader()
        writer.writerows(rows)

    pending_images = sum(1 for row in rows if row["kind"] == "image" and row["r2_key"])
    pending_videos = sum(1 for row in rows if row["kind"] == "video" and row["status"] == "pending Stream upload")
    with open(os.path.join(ROOT, "MEDIA-MIGRATION.md"), "w", encoding="utf-8") as fh:
        fh.write("# Media migration inventory\n\n")
        fh.write("Generated from `data/media.json` by `python3 Scripts/build-media-inventory.py`.\n\n")
        fh.write("**Nothing here has been uploaded to Cloudflare.** This file is a checklist only.\n\n")
        fh.write("| Count | Kind | Status |\n|---:|---|---|\n")
        fh.write("| %d | Images with an R2 object key | pending R2 upload |\n" % pending_images)
        fh.write("| %d | Videos | %s |\n" % (len(videos), "pending Stream migration" if pending_videos else "configured"))
        fh.write("| %d | WebP thumbnails/posters | already committed to GitHub |\n\n" % (len(images) + len(videos)))

        fh.write("## Configuration values to fill in\n\n")
        fh.write("| Value | File | Current state |\n|---|---|---|\n")
        fh.write("| R2 media base URL | `assets/js/media-config.js` (`MEDIA_BASE_URL`) | see file |\n")
        fh.write("| Stream customer code | `assets/js/media-config.js` (`STREAM_CUSTOMER_CODE`) | empty until Stream is set up |\n")
        fh.write("| Cloudflare account ID / API token | not in the repository | provide them only to your upload tool |\n\n")
        fh.write("Never commit API tokens. The frontend only needs the public base URL and customer code.\n\n")

        fh.write("## R2 image objects\n\n")
        fh.write("The manifest key is what the website uses; the local preview is the source file. Run `python3 Scripts/prepare-r2-previews.py` to create 2560px WebP files in a staging folder using the exact keys below, then upload that folder to the R2 bucket root. No upload happens automatically.\n\n")
        fh.write("| ID | Category | R2 object key | Local preview | GitHub thumbnail |\n|---|---|---|---|---|\n")
        for entry in images:
            source = entry.get("source", "")
            hi = source.replace("assets/img/", "assets/hi/", 1) if source.startswith("assets/img/") else "—"
            fh.write("| `%s` | %s | `%s` | `%s` | `%s` |\n" % (
                entry.get("id", ""), entry.get("category", ""), entry.get("full", ""), hi, entry.get("thumbnail", "")))

        fh.write("\n## Cloudflare Stream videos\n\n")
        fh.write("Upload each video to Stream, then paste its UID into `data/media.json` (`streamId`) and set `STREAM_CUSTOMER_CODE` in `assets/js/media-config.js`. Until then the site uses the fallback player.\n\n")
        fh.write("| ID | Title | Stream UID | Fallback | Poster |\n|---|---|---|---|---|\n")
        for entry in videos:
            fallback = entry.get("fallback") or {}
            fh.write("| `%s` | %s | `%s` | %s | `%s` |\n" % (
                entry.get("id", ""), entry.get("title", ""),
                entry.get("streamId") or "—",
                fallback.get("url") or fallback.get("provider", "—"),
                entry.get("thumbnail", "")))

        fh.write("\n## Manual steps\n\n")
        fh.write("1. Create the R2 bucket and connect `media.derekhan.link` (or change `MEDIA_BASE_URL`).\n")
        fh.write("2. Run `python3 Scripts/prepare-r2-previews.py` to stage 2560px WebP previews using the keys above.\n")
        fh.write("3. Upload the staging folder to the R2 bucket root (`rclone copy`/Wrangler/dashboard).\n")
        fh.write("4. Make the bucket publicly readable; do not expose write credentials in this repository.\n")
        fh.write("5. Upload the four videos to Cloudflare Stream.\n")
        fh.write("6. Add the Stream UIDs to `data/media.json`, fill in `STREAM_CUSTOMER_CODE`, and run `python3 Scripts/validate-media.py`.\n")
        fh.write("7. Test one lightbox image and one video over HTTPS, then set `LOCAL_FULL_FALLBACK: false` if you want to remove the old local tier.\n")
        fh.write("8. Optional cleanup (after R2 is verified): remove `assets/hi` from the repository to shrink it. This restructuring deliberately did **not** delete any existing media.\n\n")
        fh.write("The full-resolution originals stay outside the repository and are never deleted by these scripts.\n")

    print("Wrote MEDIA-MIGRATION.md and Scripts/media-inventory.csv (%d rows)" % len(rows))


if __name__ == "__main__":
    main()
