#!/bin/zsh
# Starts GyaanStack Apply at http://localhost:3000 (local only). Ctrl+C stops it.
cd "${GYAANSTACK_APP_DIR:-$HOME/gyaanstack-apply}" && HOSTNAME=127.0.0.1 PORT=3000 exec node .next/standalone/server.js
