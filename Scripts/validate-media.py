#!/usr/bin/env python3
"""Validate data/media.json and the media references in the page data.

Errors stop Publish.command. Warnings (for example a pending Stream UID or a
missing full-resolution source) are printed but do not block publishing.

Usage:
    python3 Scripts/validate-media.py
"""

import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
MANIFEST = os.path.join(ROOT, "data", "media.json")
DATA_FILES = ["data/projects.json", "data/gallery.json"]

ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")
STREAM_RE = re.compile(r"^[a-f0-9]{32}$", re.IGNORECASE)


def load_json(path):
    with open(os.path.join(ROOT, path), encoding="utf-8") as fh:
        return json.load(fh)


def main():
    errors = []
    warnings = []

    try:
        manifest = load_json("data/media.json")
    except (OSError, ValueError) as exc:
        sys.exit("✗ data/media.json could not be read: %s" % exc)

    if not isinstance(manifest, dict):
        sys.exit("✗ data/media.json must contain an object.")
    if manifest.get("version") != 1:
        errors.append("manifest.version must be 1")
    if not isinstance(manifest.get("images"), list):
        errors.append("manifest.images must be an array")
    if not isinstance(manifest.get("videos"), list):
        errors.append("manifest.videos must be an array")

    all_ids = set()
    full_keys = set()
    thumbnails = set()
    images = manifest.get("images") or []
    videos = manifest.get("videos") or []

    for index, entry in enumerate(images):
        label = "images[%d]" % index
        if not isinstance(entry, dict):
            errors.append(label + " must be an object")
            continue
        mid = entry.get("id")
        if not isinstance(mid, str) or not ID_RE.match(mid):
            errors.append(label + " has an invalid id: %r" % (mid,))
            continue
        label = "image '%s'" % mid
        if mid in all_ids:
            errors.append("duplicate media id " + mid)
        all_ids.add(mid)

        thumb = entry.get("thumbnail")
        if not isinstance(thumb, str) or not thumb.startswith("assets/"):
            errors.append(label + " needs a repository thumbnail path")
        else:
            thumbnails.add(thumb)
            if not os.path.isfile(os.path.join(ROOT, thumb)):
                errors.append(label + " thumbnail is missing: " + thumb)
            if not thumb.lower().endswith(".webp"):
                warnings.append(label + " thumbnail is not WebP: " + thumb)

        full = entry.get("full")
        if not isinstance(full, str) or not full:
            warnings.append(label + " has no R2 key (lightbox will use the local copy)")
        else:
            if full.startswith("/") or ".." in full or "://" in full:
                errors.append(label + " R2 key must be a relative object key: " + full)
            elif full in full_keys:
                errors.append(label + " reuses another R2 key: " + full)
            full_keys.add(full)

        source = entry.get("source")
        if source and not os.path.isfile(os.path.join(ROOT, source)):
            warnings.append(label + " source file is missing: " + source)

        for key in ("width", "height"):
            if key in entry and (not isinstance(entry[key], int) or entry[key] <= 0):
                warnings.append(label + " has an invalid %s" % key)
        if "category" in entry and not isinstance(entry["category"], str):
            errors.append(label + " category must be a string")
        if "description" in entry and not isinstance(entry["description"], str):
            errors.append(label + " description must be a string")

    for index, entry in enumerate(videos):
        label = "videos[%d]" % index
        if not isinstance(entry, dict):
            errors.append(label + " must be an object")
            continue
        mid = entry.get("id")
        if not isinstance(mid, str) or not ID_RE.match(mid):
            errors.append(label + " has an invalid id: %r" % (mid,))
            continue
        label = "video '%s'" % mid
        if mid in all_ids:
            errors.append("duplicate media id " + mid)
        all_ids.add(mid)

        thumb = entry.get("thumbnail")
        if thumb:
            if not isinstance(thumb, str):
                errors.append(label + " thumbnail must be a path")
            else:
                thumbnails.add(thumb)
                if not os.path.isfile(os.path.join(ROOT, thumb)):
                    errors.append(label + " poster is missing: " + thumb)
                if not thumb.lower().endswith(".webp"):
                    warnings.append(label + " poster is not WebP: " + thumb)

        stream_id = entry.get("streamId")
        if stream_id:
            if not isinstance(stream_id, str) or not STREAM_RE.match(stream_id):
                errors.append(label + " has an invalid Cloudflare Stream UID: %r" % (stream_id,))
        else:
            fallback = entry.get("fallback") or {}
            if not fallback.get("provider"):
                errors.append(label + " has no streamId and no fallback provider")
            else:
                warnings.append(label + " is still using its %s fallback (Stream migration pending)" % fallback.get("provider"))

    # References from page data.
    def walk_media(items, file_label, project_label=""):
        for item in items or []:
            if isinstance(item, dict) and item.get("media"):
                mid = item["media"]
                if mid not in all_ids:
                    errors.append("%s %sreferences unknown media id '%s'" % (file_label, (project_label + " " if project_label else ""), mid))

    projects = load_json("data/projects.json")
    for project in projects:
        if project.get("template"):
            continue
        label = "project '%s'" % project.get("id", "?")
        walk_media(project.get("images"), "data/projects.json", label)
        walk_media(project.get("highlights"), "data/projects.json", label)

    gallery = load_json("data/gallery.json")
    walk_media(gallery.get("images"), "data/gallery.json")

    # Report.
    print("Media manifest: %d images, %d videos" % (len(images), len(videos)))
    if warnings:
        print("  %d warning(s):" % len(warnings))
        for warning in warnings[:20]:
            print("  ! " + warning)
        if len(warnings) > 20:
            print("  ! ... and %d more" % (len(warnings) - 20))
    if errors:
        print("  %d error(s):" % len(errors))
        for error in errors:
            print("  ✗ " + error)
        sys.exit(1)
    print("  All media entries and references are valid.")


if __name__ == "__main__":
    main()
