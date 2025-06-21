#!/bin/bash

set -e

# === Configuration ===
SSH_USER="sysdevme"
SSH_HOST="sysdev.me"
SSH_KEY="$HOME/.ssh/id_rsa_sysdev"
REMOTE_DIR="public_html"

# === Build the site ===
echo "📦 Building MkDocs site..."
mkdocs build --clean

# === Deploy via rsync ===
echo "🚀 Deploying to $SSH_USER@$SSH_HOST:$REMOTE_DIR..."
rsync -avz -e "ssh -i $SSH_KEY" ./site/ "$SSH_USER@$SSH_HOST:$REMOTE_DIR/"

echo "✅ Publish complete."
