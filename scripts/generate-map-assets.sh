#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/public/assets"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$OUT" "$TMP/tiles"

# Wuhan city centre at z10. Five columns × three rows gives enough room for
# responsive cover-cropping without shipping any map runtime to the browser.
xs=(835 836 837 838 839)
ys=(419 420 421)
tiles=()

for y in "${ys[@]}"; do
  for x in "${xs[@]}"; do
    tile="$TMP/tiles/${x}-${y}.png"
    curl --fail --silent --show-error --location --retry 3 \
      --user-agent "ruoli-presence static map generator (github.com/Musdkar/ruoli-presence)" \
      "https://tile.openstreetmap.org/10/${x}/${y}.png" \
      --output "$tile"
    tiles+=("$tile")
  done
done

if command -v magick >/dev/null 2>&1; then
  magick montage "${tiles[@]}" -tile 5x3 -geometry 256x256+0+0 "$TMP/mosaic.png"

  magick "$TMP/mosaic.png" \
    -strip -modulate 54,38,100 \
    -fill '#11151d' -colorize 30% \
    -contrast-stretch 0.5%x0.5% \
    -quality 82 "$OUT/wuhan-map-dark.webp"

  magick "$TMP/mosaic.png" \
    -strip -modulate 104,32,100 \
    -fill '#f0ede7' -colorize 18% \
    -contrast-stretch 0.3%x0.3% \
    -quality 82 "$OUT/wuhan-map-light.webp"
else
  montage "${tiles[@]}" -tile 5x3 -geometry 256x256+0+0 "$TMP/mosaic.png"

  convert "$TMP/mosaic.png" \
    -strip -modulate 54,38,100 \
    -fill '#11151d' -colorize 30% \
    -contrast-stretch 0.5%x0.5% \
    -quality 82 "$OUT/wuhan-map-dark.webp"

  convert "$TMP/mosaic.png" \
    -strip -modulate 104,32,100 \
    -fill '#f0ede7' -colorize 18% \
    -contrast-stretch 0.3%x0.3% \
    -quality 82 "$OUT/wuhan-map-light.webp"
fi

printf 'Generated:\n  %s\n  %s\n' \
  "$OUT/wuhan-map-dark.webp" \
  "$OUT/wuhan-map-light.webp"
