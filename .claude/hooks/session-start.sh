#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo '{"async": true, "asyncTimeout": 300000}'

cd "${CLAUDE_PROJECT_DIR:-/home/user/Study-app}"

# Install server dependencies
echo "[session-start] Installing server dependencies..."
npm install --prefix server

# Install client dependencies
echo "[session-start] Installing client dependencies..."
npm install --prefix client

echo "[session-start] Done."
