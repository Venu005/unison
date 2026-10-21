#!/usr/bin/env bash
# Builds Unison.dmg and publishes it as a GitHub Release (Plan 12). Runs on the owner's Mac, because the
# "MacDroid Self-Signed" identity (scripts/make-signing-cert.sh) only exists in that login keychain.
#   scripts/make-release.sh --dry-run   build, package, sign and print the SHA-256; publish nothing
#   scripts/make-release.sh             the same, then `gh release create v<version>` on Venu005/unison
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="Venu005/unison"
IDENTITY="MacDroid Self-Signed"
DRY_RUN=false
[ "${1:-}" = "--dry-run" ] && DRY_RUN=true

if ! security find-certificate -c "$IDENTITY" >/dev/null 2>&1; then
  echo "No \"$IDENTITY\" identity in the login keychain. Run scripts/make-signing-cert.sh (or import the backed-up .p12) first." >&2
  exit 1
fi
if ! $DRY_RUN && [ -n "$(git -C "$ROOT" status --porcelain)" ]; then
  echo "The working tree has uncommitted changes; commit them before publishing a release." >&2
  exit 1
fi

VERSION="$(sed -n 's/.*CFBundleShortVersionString: "\(.*\)".*/\1/p' "$ROOT/mac/project.yml")"
[ -n "$VERSION" ] || { echo "Couldn't read CFBundleShortVersionString from mac/project.yml" >&2; exit 1; }
OUT="$ROOT/mac/build/release"
DMG="$OUT/Unison.dmg"

mkdir -p "$OUT"
echo "Building Unison ${VERSION}…"
cd "$ROOT/mac"
xcodegen generate >/dev/null
xcodebuild -project MacDroid.xcodeproj -scheme MacDroid -configuration Release -derivedDataPath build build >"$ROOT/mac/build/release-build.log" 2>&1 \
  || { echo "Release build failed; see mac/build/release-build.log" >&2; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
STAGE="$WORK/Unison"
mkdir -p "$STAGE"
ditto "$ROOT/mac/build/Build/Products/Release/Unison.app" "$STAGE/Unison.app"
ln -s /Applications "$STAGE/Applications"
rm -f "$DMG"
hdiutil create -volname Unison -srcfolder "$STAGE" -fs HFS+ -format UDZO -quiet "$DMG"
codesign --sign "$IDENTITY" --timestamp=none "$DMG"
SHA="$(shasum -a 256 "$DMG" | cut -d' ' -f1)"
echo "Wrote $DMG"
echo "SHA-256: $SHA"

$DRY_RUN && { echo "Dry run: nothing published."; exit 0; }

NOTES="Unison $VERSION for Mac.

Install: https://venu005.github.io/unison/#install
Android: coming soon to Google Play.

SHA-256: $SHA"
gh release create "v$VERSION" "$DMG" --repo "$REPO" --title "Unison $VERSION" --notes "$NOTES"
