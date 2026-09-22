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

1. Upload everything **inside** `dist/` into `public_html` (or the subdomain's
   folder). Upload the contents, not the `dist` folder itself.
2. Add a `.htaccess` next to `index.html`. This is required: the site uses
   client-side routing, so without it every URL except the homepage — a shared
   post, `/register`, `/admin` — returns 404 on refresh.

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

3. On the API side, `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` must list
   this site's exact origin, scheme included.

## Notes

- `public/illustrations/` holds the site's own artwork only. Nothing personal
  belongs there: everything in `public/` is served to anyone who asks.
- Members' documents and photos are never handled by this app directly; they
  are fetched through authenticated API endpoints.
