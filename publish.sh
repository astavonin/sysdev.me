#!/bin/bash

set -euo pipefail

# === Configuration ===
SSH_USER="sysdevme"
SSH_HOST="sysdev.me"
SSH_KEY="$HOME/.ssh/id_rsa_sysdev"
REMOTE_DIR="public_html"

# --dry-run lists what would change, including deletions, and transfers nothing.
DRY_RUN=""
if [ "${1:-}" = "--dry-run" ]; then
  DRY_RUN="--dry-run"
  echo "ℹ️  dry run: nothing will be uploaded or deleted"
fi

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
# --delete mirrors the build: the host serves exactly what dist/ contains and
# nothing else. Every path the old MkDocs site published is now generated here
# (including the two JSON feeds), so a remaining file is stale by definition.
#
# What this cannot restore: a file that was only ever on the server and never
# in a commit. Run the preview first if you are unsure what is up there:
#   ./publish.sh --dry-run
echo "🚀 Deploying to $SSH_USER@$SSH_HOST:$REMOTE_DIR..."
rsync -avz --delete $DRY_RUN -e "ssh -i $SSH_KEY" \
  ./dist/ "$SSH_USER@$SSH_HOST:$REMOTE_DIR/"

if [ -n "$DRY_RUN" ]; then
  echo "✅ Dry run complete; nothing changed."
else
  echo "✅ Publish complete."
fi
