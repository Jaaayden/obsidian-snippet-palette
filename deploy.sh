#!/bin/bash
# Install build artifacts only; existing snippet data is preserved.
set -euo pipefail
if [[ $# -ne 1 || ! -d "$1/.obsidian" ]]; then
  echo 'Usage: ./deploy.sh "/path/to/Obsidian vault"' >&2
  exit 1
fi
cd "$(dirname "$0")"
npm run typecheck
npm test
npm run build
plugin_dir="$1/.obsidian/plugins/snippet-palette"
mkdir -p "$plugin_dir"
cp main.js manifest.json styles.css "$plugin_dir/"
echo 'Installed Snippet Palette. Reload Obsidian to load the new build.'
