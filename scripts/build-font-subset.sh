#!/usr/bin/env bash
#
# Rebuilds the embedded font subset.
#
# The vendored IosevkaTerm-Regular.ascii.woff2 has a trimmed cmap but still
# carries all 2809 of Iosevka's glyph outlines, so embedding it spends ~64 KB of
# every visitor's download on glyphs that can never be drawn. This keeps the
# same 95 printable ASCII codepoints, the same advance widths, and the `zero`
# feature the stylesheet asks for, at about 5 KB.
#
# Only needed when the typeface itself changes. Requires Python's fonttools:
#
#   python3 -m venv .venv && .venv/bin/pip install 'fonttools[woff]' brotli
#   .venv/bin/pyftsubset ... (or just put pyftsubset on PATH and run this)
#
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
src="$root/assets/fonts/iosevka-term/WOFF2/IosevkaTerm-Regular.ascii.woff2"
out="$root/assets/generated/iosevka-term-regular.ascii.subset.woff2"

if ! command -v pyftsubset >/dev/null 2>&1; then
  echo "pyftsubset not found. Install with: pip install 'fonttools[woff]' brotli" >&2
  exit 1
fi

# U+0020..U+007E is exactly what the source face maps, so the subset can never
# be missing a glyph the renderer asks for, whatever the stats text contains.
pyftsubset "$src" \
  --unicodes="U+0020-007E" \
  --output-file="$out" \
  --flavor=woff2 \
  --layout-features=zero \
  --no-hinting \
  --desubroutinize \
  --drop-tables+=GPOS,gasp

printf 'Wrote %s (%s bytes, from %s bytes)\n' \
  "${out#"$root/"}" "$(wc -c <"$out" | tr -d ' ')" "$(wc -c <"$src" | tr -d ' ')"
