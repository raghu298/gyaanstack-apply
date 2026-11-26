#!/bin/zsh
# Daily GyaanStack Apply auto-apply: inbox check, email applications with your own resume, summary mail to you.
export PATH="$(dirname "$(command -v node 2>/dev/null || echo $HOME/.nvm/versions/node/v24.14.1/bin/node)"):/opt/homebrew/bin:/usr/bin:/bin"
cd "${GYAANSTACK_APP_DIR:-$HOME/gyaanstack-apply}"
mkdir -p node_modules/server-only && echo '{"name":"server-only","main":"index.js"}' > node_modules/server-only/package.json && : > node_modules/server-only/index.js
set -a; source .env; set +a
echo "=== $(date)"
yarn tsx --tsconfig tsconfig.json "${GYAANSTACK_DATA_DIR:-$HOME/gyaanstack-data}/auto-apply.mts"
rm -rf node_modules/server-only
