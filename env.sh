#!/bin/bash
#
# One-time setup. Node ships corepack, which provisions the exact pnpm version
# pinned in package.json ("packageManager"), so nothing is installed globally.
#
#   ./env.sh && pnpm dev
#
set -euo pipefail

if ! command -v node >/dev/null; then
  echo "node not found. Install Node 22.12+ first." >&2
  exit 1
fi

# Compare the full version, not just the major: engines.node requires 22.12+,
# and a bare major check let 22.0-22.11 through to fail later and less legibly.
if ! node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=12)?0:1)'; then
  echo "node $(node -v) is too old; this project needs 22.12+." >&2
  exit 1
fi

if ! command -v corepack >/dev/null; then
  echo "corepack not found; install it or enable it for this Node build." >&2
  exit 1
fi

# Put the pnpm shim somewhere on PATH without touching the Node install.
BIN_DIR="$HOME/.local/bin"
mkdir -p "$BIN_DIR"
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack enable --install-directory "$BIN_DIR" pnpm

case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *) echo "note: add $BIN_DIR to PATH to use pnpm directly" >&2 ;;
esac

export PATH="$BIN_DIR:$PATH"
pnpm install --frozen-lockfile
pnpm exec playwright install --with-deps chromium

echo "✅ Ready. pnpm $(pnpm -v), node $(node -v)"
