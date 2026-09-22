# Binh Dinh Gia — website and dashboard

React + TypeScript frontend for the Binh Dinh Gia club platform: the public
site, online registration, the community feed, and the staff dashboard for the
national administrator, club presidents and branch managers.

Trilingual — Arabic (RTL), English and Vietnamese. The API lives in its own
repository.

## Running it locally

```bash
npm install
npm run dev
```

It expects the Django API on `http://localhost:8000`; Vite proxies `/api` and
`/media` there, so no configuration is needed while developing.

## Building for the server

The API usually sits on its own subdomain in production, so its address is
baked in at build time. Create `.env.production`:

```ini
VITE_API_BASE_URL=https://api.your-domain.dz/api
```

Then:

```bash
npm run build
```

`dist/` holds the finished site — plain static files.

## Deploying to cPanel shared hosting

`public/.htaccess` ships with the build. It is required: the site uses
client-side routing, so without it every URL except the homepage — a shared
post, `/register`, `/admin` — returns 404 the moment the page is refreshed.

### From the server, with Git

Node has to be available. cPanel → **Setup Node.js App** creates the
environment and shows the `source .../activate` line for it.

```bash
git clone https://github.com/Ilyes4CODE/frontend_binh.git ~/binh-site
cd ~/binh-site
echo 'VITE_API_BASE_URL=https://api.your-domain.dz/api' > .env.production
./deploy.sh
```

`deploy.sh` builds and copies the result into `~/public_html`, leaving
`.well-known` and `cgi-bin` alone — the first one renews the TLS certificate.
Pass a path to publish somewhere else. Afterwards a release is:

```bash
cd ~/binh-site && git pull && ./deploy.sh
```

`node_modules` is around 270 MB across 22,000 files. That counts against a
shared account's inode quota, so if the account is tight, `rm -rf node_modules`
after a release — `deploy.sh` reinstalls it next time.

### Without Node on the server

Build on your own machine and upload the contents of `dist/` — the contents,
not the folder. Turn on **Show Hidden Files** in File Manager first, or
`.htaccess` is silently left behind.

### Either way

On the API side, `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` must list
this site's exact origin, scheme included, and `DJANGO_ALLOWED_HOSTS` must
name its host.

## Notes

- `public/illustrations/` holds the site's own artwork only. Nothing personal
  belongs there: everything in `public/` is served to anyone who asks.
- Members' documents and photos are never handled by this app directly; they
  are fetched through authenticated API endpoints.
