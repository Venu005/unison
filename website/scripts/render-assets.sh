#!/usr/bin/env bash
# Renders the site's icons and link-preview image into website/public (Plan 12).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ICON="$ROOT/design/icon/macdroid-icon-mac.svg"
OUT="$ROOT/website/public"
BIN="$(mktemp -d)/render-icon"
swiftc -O "$ROOT/scripts/render-icon.swift" -o "$BIN"
mkdir -p "$OUT"
"$BIN" "$ROOT/website/og/og-image.svg" "$OUT/og-image.png" 1200 630
"$BIN" "$ICON" "$OUT/icon-192.png" 192
"$BIN" "$ICON" "$OUT/icon-512.png" 512
"$BIN" "$ICON" "$OUT/apple-touch-icon.png" 180
sed '/<!--/d' "$ICON" > "$OUT/favicon.svg"
echo "Rendered $(ls "$OUT" | wc -l | tr -d ' ') files into $OUT"
