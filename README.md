# Yardage Book — install on Android via GitHub Pages

## 1. Create the repo
1. Go to github.com → **New repository**. Name it anything, e.g. `yardage-book`. Public (required for free GitHub Pages). Don't add a README.
2. On the new repo's page, click **Add file → Upload files**.
3. Upload all 7 files from this package: `index.html`, `app.js`, `manifest.json`, `sw.js`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`.
4. Commit directly to the `main` branch.

## 2. Turn on Pages
1. In the repo, go to **Settings → Pages**.
2. Under "Build and deployment," set **Source: Deploy from a branch**.
3. Branch: `main`, folder: `/ (root)`. Save.
4. Wait ~1 minute, then refresh — GitHub shows your live URL, something like:
   `https://YOUR_USERNAME.github.io/yardage-book/`

## 3. Install it on your phone
1. Open that URL in **Chrome** on your Android phone.
2. Tap the **⋮** menu (top right) → **Add to Home screen** (Chrome may also just prompt "Install app").
3. Confirm. You'll get a real home screen icon that opens full-screen, no browser bar.

That's it — it behaves like an installed app from here on, and works fully offline after the first load (your data is saved on-device via browser storage, nothing is sent anywhere).

## Updating it later
If I send you an updated `app.js` or other file, just upload the replacement file to the same GitHub repo (Add file → Upload files, same filename) — GitHub Pages redeploys automatically in about a minute, and Chrome will pick up the update next time you open the app.

## Notes
- All your shot data lives in the browser's local storage on your phone. Uninstalling the app or clearing site data will erase it — use the in-app "Export backup" button periodically to save a JSON copy you can restore from.
- The core UI works with zero network. First load pulls a few small chart/CSV-parsing libraries from a CDN and caches them, so you'll want one normal load with wifi/data before relying on it fully offline.
