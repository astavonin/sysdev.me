#!/bin/bash

set -euo pipefail

# === Configuration ===
SSH_USER="sysdevme"
SSH_HOST="sysdev.me"
SSH_KEY="$HOME/.ssh/id_rsa_sysdev"
REMOTE_DIR="public_html"

# === Build the site ===
if ! command -v pnpm >/dev/null; then
  echo "pnpm not on PATH. Run ./env.sh once to set it up." >&2
  exit 1
fi

# Analytics is opt-in per build, so previews and test runs stay unmeasured.
export PUBLIC_ANALYTICS=on

echo "📦 Building Astro site..."
pnpm install --frozen-lockfile
pnpm build

# One gate, shared with CI, so the two cannot check different sets.
node scripts/assert-publishable.mjs dist tests/fixtures/historical-urls.txt

# === Deploy via rsync ===
# No --delete: the remote keeps whatever it already has. That is how two images
# outlived their removal from the repo, and it also means the previous MkDocs
# output (assets/, search/, the JSON feeds) stays behind after this migration.
# To mirror instead, dry-run first and read the list before trusting it:
#   rsync -avzn --delete -e "ssh -i $SSH_KEY" ./dist/ "$SSH_USER@$SSH_HOST:$REMOTE_DIR/"
echo "🚀 Deploying to $SSH_USER@$SSH_HOST:$REMOTE_DIR..."
rsync -avz -e "ssh -i $SSH_KEY" ./dist/ "$SSH_USER@$SSH_HOST:$REMOTE_DIR/"

echo "✅ Publish complete."
