# منصة الساعات التطوعية بثانوية حمد الجبر العلمية للموهوبين

Arabic-first school leaderboard with English interface, class rankings and password-protected editing. Student names remain their original Arabic spelling. All seven class rosters and the supplied hour submissions are imported into `data/students.json`; students without a matched submission have `recorded: false`.

The site contains separate HTML pages in `public/`: `index.html`, `class.html` and `admin.html`. The server is a dependency-free Cloudflare Worker. Student updates persist in its `BUCKET` R2 binding, rather than browser storage. Concurrent saves are rejected with a conflict response instead of silently overwriting another edit.

## Local development

Use Node.js 22 or newer. No package installation is required. Create an ignored `.dev.vars` file containing these keys, with your own values:

```text
ADMIN_PASSWORD=<admin password>
SESSION_SECRET=<at least 32 random characters>
```

Run `npm run dev`. Local data persists in ignored `.local/bucket/`. Run `npm test` for authentication, validation, rate-limit and persistence tests. Run `npm run build` to produce `dist/server/index.js` and the deployment manifest.

## Hosting and secrets

Configure `ADMIN_PASSWORD` and `SESSION_SECRET` as secret runtime variables on the Worker host. Never place their values in HTML, JavaScript, GitHub repository files or `.openai/hosting.json`. The admin password is checked only by the server, and the browser receives a signed HttpOnly session cookie. Login is limited to five attempts per IP in fifteen minutes. Session cookies expire after eight hours.

The hosting platform supplies the R2 bucket as `BUCKET`. Deploy `dist/` as a Worker-backed Site. The Site's audience is controlled by the hosting platform; a private Site requires its owner to sign in before visiting. Do not change its audience as part of a source update.

## GitHub Pages

GitHub Pages serves static files and cannot securely validate a password or save shared hour totals. It can host the files in `public/` as a frontend when connected to an independently hosted backend. Set `window.ATHAR_CONFIG.apiBaseUrl` in `public/config.js` to that backend's HTTPS origin, and set the backend runtime `PUBLIC_ORIGIN` to the exact Pages origin to allow public read requests. The backend must be accessible to the intended visitors; an owner-private Site cannot act as an anonymous public API.

Administration must open `admin.html` on the backend's own origin. Cross-origin editing is deliberately disabled. Keep the normal same-origin deployment for a complete site without additional configuration.

## Data maintenance

Normal hour edits happen through the admin page. Imported seed data is used only until the first saved snapshot is created. Changing the seed in Git does not overwrite previously saved hours. The public API returns all imported student names and totals; choose the Site's audience accordingly. The original source documents are not served by the Worker.

## GitHub Pages publication

The `Publish school website` Actions workflow builds `public/` with `scripts/build-pages.mjs` and publishes only the frontend and an initial record snapshot. It attempts live reads from the backend; if that private backend is unavailable, a visible notice identifies the dated snapshot. Editing opens the protected backend. Enabling anonymous live reads requires making that backend public.
