#!/bin/bash
# Build the site and put it in the document root.
#
#   ./deploy.sh                     -> ~/public_html
#   ./deploy.sh /home/me/sub.domain -> somewhere else
#
# Run it on the server, from the clone. Safe to run repeatedly.
set -euo pipefail

cd "$(dirname "$0")"
TARGET="${1:-$HOME/public_html}"

if ! command -v npm >/dev/null 2>&1; then
    echo "npm is not on PATH."
    echo "On cPanel, activate the Node app's environment first — Setup Node.js"
    echo "App shows the exact 'source .../activate' line to run."
    exit 1
fi

# Not in the repository: it names the API host, which differs per deployment.
if [ ! -f .env.production ]; then
    echo "Missing .env.production. Create it once:"
    echo
    echo "  echo 'VITE_API_BASE_URL=https://api.binhdinhgia.com/api' > .env.production"
    exit 1
fi

if [ ! -d "$TARGET" ]; then
    echo "No such directory: $TARGET"
    exit 1
fi

echo "==> building for $(grep VITE_API_BASE_URL .env.production)"
npm ci --no-audit --no-fund
npm run build

echo "==> publishing to $TARGET"
# .well-known holds the ACME challenge that renews the TLS certificate, and
# cPanel expects cgi-bin to stay. Everything else in the document root is
# replaced by this build.
if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete \
        --exclude '.well-known' --exclude 'cgi-bin' \
        dist/ "$TARGET/"
else
    find "$TARGET" -mindepth 1 -maxdepth 1 \
        ! -name '.well-known' ! -name 'cgi-bin' -exec rm -rf {} +
    # `dist/.` rather than `dist/*`, so .htaccess comes across too. Without it
    # every URL but the homepage 404s on refresh.
    cp -r dist/. "$TARGET/"
fi

echo
echo "done. $(find "$TARGET" -type f | wc -l) files in $TARGET"
