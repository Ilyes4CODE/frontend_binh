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

# Vite needs a Node this project was never going to build on otherwise, and the
# failure it gives without this check is an unrelated syntax error deep in a
# dependency.
major=$(node -p 'process.versions.node.split(".")[0]')
if [ "$major" -lt 20 ]; then
    echo "Node $(node -v) is too old; Vite needs 20 or newer."
    echo "cPanel > Setup Node.js App > change the version, then re-activate."
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

# Rolldown, the Rust bundler inside Vite, asks rayon for one worker thread per
# CPU core. A shared host advertises the machine's full core count but caps the
# account's processes far below it, so the spawn fails with EAGAIN and rolldown
# panics with "The global thread pool has not been initialized" — which reads
# like a bug in the bundler rather than a quota. Two threads build this project
# in well under a second and stay inside any sane limit.
export RAYON_NUM_THREADS="${RAYON_NUM_THREADS:-2}"

echo "==> building with node $(node -v) for $(cat .env.production)"
npm ci --no-audit --no-fund
npm run build

echo "==> publishing to $TARGET"
# Three things in the document root are not ours. .well-known holds the ACME
# challenge that renews the TLS certificate, cPanel expects cgi-bin to stay,
# and node-build is where the Node.js app registration keeps its own .htaccess
# — that app exists only so the server has a Node to build with. Everything
# else is replaced by this build.
KEEP=('.well-known' 'cgi-bin' 'node-build')

if command -v rsync >/dev/null 2>&1; then
    excludes=()
    for name in "${KEEP[@]}"; do excludes+=(--exclude "$name"); done
    rsync -a --delete "${excludes[@]}" dist/ "$TARGET/"
else
    keep_test=()
    for name in "${KEEP[@]}"; do keep_test+=(! -name "$name"); done
    find "$TARGET" -mindepth 1 -maxdepth 1 "${keep_test[@]}" -exec rm -rf {} +
    # `dist/.` rather than `dist/*`, so .htaccess comes across too. Without it
    # every URL but the homepage 404s on refresh.
    cp -r dist/. "$TARGET/"
fi

echo
echo "done. $(find "$TARGET" -type f | wc -l) files in $TARGET"
