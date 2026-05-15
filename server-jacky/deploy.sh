#!/usr/bin/env bash
# Deploy server-jacky to the BSC VPS (134.199.155.47).
# Run from server-jacky/ on the dev machine. Idempotent — safe to re-run.

set -euo pipefail

VPS=${JACKY_VPS:-134.199.155.47}
KEY=${JACKY_SSH_KEY:-$HOME/.ssh/sircashalot}
REMOTE=root@${VPS}
REMOTE_DIR=/opt/jacky

echo "▶ Building locally..."
npm run build

echo "▶ Bundling deploy tarball..."
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
tar --exclude=node_modules --exclude=src --exclude=.env \
    -czf "$TMP/jacky-deploy.tar.gz" \
    dist package.json package-lock.json jacky-bsc.service

echo "▶ Uploading..."
ssh -i "$KEY" "$REMOTE" "mkdir -p ${REMOTE_DIR}"
scp -i "$KEY" "$TMP/jacky-deploy.tar.gz" "${REMOTE}:${REMOTE_DIR}/"

echo "▶ Installing on VPS..."
ssh -i "$KEY" "$REMOTE" "
  cd ${REMOTE_DIR}
  tar -xzf jacky-deploy.tar.gz
  rm -f jacky-deploy.tar.gz
  npm install --omit=dev --no-audit --no-fund 2>&1 | tail -3
  # Refresh systemd unit in case it changed
  cp ${REMOTE_DIR}/jacky-bsc.service /etc/systemd/system/jacky-bsc.service
  systemctl daemon-reload
  systemctl restart jacky-bsc.service
  sleep 4
  systemctl is-active jacky-bsc.service
"

echo "▶ Tail of Jacky log:"
ssh -i "$KEY" "$REMOTE" "tail -15 /var/log/jacky-bsc.log"
echo ""
echo "✅ Deploy complete. Jacky 🎪 is live on ${VPS}."
