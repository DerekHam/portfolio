#!/bin/bash
# ============================================================================
#  Publish.command — one-click publish for this portfolio
#
#  Double-click this file in Finder (or run ./Publish.command in Terminal) to:
#    1. check the full-resolution image folder for new / changed / deleted images
#    2. rebuild assets/img + assets/hi when anything changed
#    3. rebuild the WebP thumbnails used by the lightweight galleries
#    4. rebuild the resume PDF from resume.html and data/resume.json
#    5. commit everything and push to GitHub (Pages then serves it)
#
#  The image check compares SHA-256 checksums against Scripts/images-manifest.json,
#  which this script keeps up to date. Point FULLRES_DIR at a different originals
#  folder if yours lives elsewhere.
# ============================================================================

set -euo pipefail
cd "$(dirname "$0")"

FULLRES_DIR="${FULLRES_DIR:-$HOME/Desktop/02 College/Portfolio-fullres-images/img}"
MANIFEST="Scripts/images-manifest.json"

step() { printf '\n▸ %s\n' "$1"; }
die() { printf '\n✗ %s\n' "$1" >&2; exit 1; }

pause() {
  if [ -t 0 ]; then
    printf '\nPress any key to close this window…'
    read -r -n 1 -s _ || true
    printf '\n'
  fi
}

trap 'code=$?; if [ "$code" -ne 0 ]; then printf "\n✗ Publish failed (exit %s). See the messages above.\n" "$code" >&2; fi; pause' EXIT

# --- Setup checks -----------------------------------------------------------
step "Checking the setup"
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || die "This folder is not a git repository."
command -v python3 >/dev/null 2>&1 || die "python3 was not found. Install Python 3 or the Xcode command line tools."
python3 -c "import PIL" >/dev/null 2>&1 || die "Pillow is missing. Run:  python3 -m pip install pillow"
[ -d "$FULLRES_DIR" ] || die "Full-resolution image folder not found:\n   $FULLRES_DIR\n   Set FULLRES_DIR to its location and run this again."
echo "  Originals: $FULLRES_DIR"

gitdir=$(git rev-parse --git-dir)
if [ -d "$gitdir/rebase-merge" ] || [ -d "$gitdir/rebase-apply" ] || [ -f "$gitdir/MERGE_HEAD" ]; then
  die "A merge or rebase is in progress. Finish it first, then publish."
fi

branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$branch" = "HEAD" ]; then
  die "You are in a detached HEAD state. Check out a branch (for example: git switch main) and try again."
fi
if [ "$branch" != "main" ]; then
  printf '  ! You are on branch "%s". GitHub Pages publishes from "main".\n' "$branch"
fi
git remote get-url origin >/dev/null 2>&1 || die "No \"origin\" remote is configured, so there is nothing to push to."

# --- Image change detection -------------------------------------------------
# Compares the originals with the recorded checksums. Prints a RESULT= line so
# the shell can tell "unchanged" apart from "changed" without relying on exit
# codes (which stay reserved for real errors).
manifest_tool() {
  python3 - "$@" <<'PY'
import hashlib
import json
import os
import sys

mode, src, manifest_path = sys.argv[1], sys.argv[2], sys.argv[3]
SKIP = {".DS_Store"}
SKIP_EXT = {".pages"}


def digest(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


current = {}
for root, dirs, names in os.walk(src):
    dirs[:] = sorted(d for d in dirs if d != ".git")
    for name in sorted(names):
        if name in SKIP or os.path.splitext(name)[1].lower() in SKIP_EXT:
            continue
        full = os.path.join(root, name)
        current[os.path.relpath(full, src)] = digest(full)

if mode == "write":
    os.makedirs(os.path.dirname(manifest_path) or ".", exist_ok=True)
    payload = {
        "_comment": "SHA-256 of each full-resolution original. Written by Publish.command; "
                    "used to detect when assets/img and assets/hi need rebuilding.",
        "files": current,
    }
    with open(manifest_path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2, sort_keys=True)
        fh.write("\n")
    print("  Recorded checksums for %d originals in %s" % (len(current), manifest_path))
    sys.exit(0)

try:
    with open(manifest_path, encoding="utf-8") as fh:
        previous = json.load(fh).get("files")
except (FileNotFoundError, ValueError, AttributeError):
    previous = None

if previous is not None and previous == current:
    print("  No image changes since the last publish.")
    print("RESULT=unchanged")
    sys.exit(0)

if previous is None:
    print("  No usable checksum file yet, so a full rebuild is needed.")
else:
    added = sorted(set(current) - set(previous))
    changed = sorted(k for k in set(current) & set(previous) if current[k] != previous[k])
    removed = sorted(set(previous) - set(current))
    for label, items in (("new", added), ("changed", changed), ("deleted", removed)):
        for item in items:
            print("  %s: %s" % (label, item))
print("RESULT=changed")
PY
}

step "Looking for image changes"
check_output=$(manifest_tool check "$FULLRES_DIR" "$MANIFEST")
printf '%s\n' "$check_output" | sed '/^RESULT=/d'
case "$(printf '%s\n' "$check_output" | sed -n 's/^RESULT=//p')" in
  unchanged) images_changed=0 ;;
  changed) images_changed=1 ;;
  *) die "Could not compare the originals with $MANIFEST." ;;
esac

# --- Rebuild the image tiers ------------------------------------------------
if [ "$images_changed" -eq 1 ] || [ ! -d assets/img ] || [ ! -d assets/hi ]; then
  step "Rebuilding assets/img and assets/hi"
  python3 Scripts/regenerate-images.py "$FULLRES_DIR"
  manifest_tool write "$FULLRES_DIR" "$MANIFEST"
else
  echo "  Skipping the rebuild: the images are already up to date."
fi

# --- Rebuild the GitHub-hosted WebP thumbnails ------------------------------
step "Rebuilding WebP thumbnails"
python3 Scripts/build-thumbnails.py

# --- Content sanity check ---------------------------------------------------
step "Validating the content files"
python3 - <<'PY'
import glob
import json
import sys

paths = sorted(glob.glob("data/**/*.json", recursive=True))
bad = []
for path in paths:
    try:
        with open(path, encoding="utf-8") as fh:
            json.load(fh)
    except Exception as exc:  # noqa: BLE001 - report any parse problem
        bad.append((path, exc))
if bad:
    for path, exc in bad:
        print("  ✗ %s: %s" % (path, exc))
    sys.exit(1)
print("  All %d data files are valid JSON." % len(paths))
PY

# --- Media manifest + references -------------------------------------------
step "Validating the media manifest"
python3 Scripts/validate-media.py

# --- Migration inventory ----------------------------------------------------
step "Updating the media migration inventory"
if python3 Scripts/build-media-inventory.py; then
  echo "  Inventory is up to date."
else
  printf '  ! Could not update the media inventory; publishing continues.\n'
fi

# --- Rebuild embed previews -------------------------------------------------
# Embedded pages cannot be captured by the browser-side PDF exporter, so take
# screenshots of them for the project PDFs.
step "Rebuilding embed previews"
if python3 Scripts/build-embed-previews.py; then
  echo "  Embed previews are up to date."
else
  printf '  ! Could not rebuild embed previews; existing previews will be used.\n'
fi

# --- Rebuild the resume PDF -------------------------------------------------
step "Rebuilding the resume PDF"
if python3 Scripts/build-resume-pdf.py; then
  echo "  Resume PDF is up to date."
else
  printf '  ! Could not rebuild the resume PDF; the existing file will be used.\n'
fi

# --- Commit and push --------------------------------------------------------
step "Publishing to GitHub"
git add -A

image_files=$(git diff --cached --name-only -- assets/img assets/hi | wc -l | tr -d ' ')
all_files=$(git diff --cached --name-only | wc -l | tr -d ' ')
# The checksum file changes whenever images do, so it does not count as content.
content_files=$(git diff --cached --name-only |
  awk '!/^assets\/img\// && !/^assets\/hi\// && $0 != "Scripts/images-manifest.json"' |
  wc -l | tr -d ' ')

if [ "$all_files" -eq 0 ]; then
  echo "  No file changes to commit."
else
  if [ "$image_files" -gt 0 ] && [ "$content_files" -gt 0 ]; then
    subject="Publish: update images and site content"
  elif [ "$image_files" -gt 0 ]; then
    subject="Publish: update images"
  else
    subject="Publish: update site content"
  fi
  if [ "$image_files" -gt 0 ]; then
    git commit -q -m "$subject" -m "$image_files image file(s) regenerated from the full-resolution originals"
  else
    git commit -q -m "$subject"
  fi
  echo "  Committed: $subject"
fi

if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
  ahead=$(git rev-list --count '@{u}..HEAD')
  has_upstream=1
else
  ahead=1
  has_upstream=0
fi

if [ "$ahead" -eq 0 ]; then
  echo "  GitHub already has the latest commit; nothing to push."
else
  if [ "$has_upstream" -eq 1 ]; then
    git push
  else
    git push -u origin "$branch"
  fi
fi

# --- Report ----------------------------------------------------------------
step "Done"
if [ -f CNAME ]; then
  site="https://$(tr -d '[:space:]' < CNAME)"
else
  remote=$(git remote get-url origin 2>/dev/null || true)
  slug=$(printf '%s' "$remote" | sed -E 's#.*[:/]([^/]+)/([^/]+?)(\.git)?$#\1/\2#')
  user=$(printf '%s' "$slug" | cut -d/ -f1 | tr '[:upper:]' '[:lower:]')
  repo=$(printf '%s' "$slug" | cut -d/ -f2)
  if [ "$repo" = "$user.github.io" ]; then
    site="https://$user.github.io"
  else
    site="https://$user.github.io/$repo"
  fi
fi
echo "  Site: $site"
echo "  GitHub Pages usually updates within a minute (hard-refresh if needed)."
