# Our Travel Diary — Version 2 + Version 3

This is a free, GitHub Pages-ready private travel diary.

## Included
- Actual Bangladesh district boundary map loaded from the open-source `bangladesh-geojson` project.
- 64 districts with English + Bangla names.
- Clickable district polygons.
- Visited districts highlighted automatically.
- Search + hover tooltip + map animation/hover.
- District-specific story, places, timeline and photo gallery.
- Full-screen photo viewer.
- Responsive mobile/desktop layout.
- Add New Trip form.
- Local browser storage for trips and resized photos.
- Export/import diary backup.
- No domain, paid hosting or server required.

## Important limitation of Version 3
GitHub Pages is static hosting. A browser form cannot securely write uploaded photos into the GitHub repository without a server-side service and credentials.

Therefore, this version's Add New Trip system stores entries in the browser's localStorage. It works immediately and costs nothing, but the data is tied to that browser/device.

If you want to add a trip from your phone and see it on your desktop (or share the same diary publicly), connect the form to a free backend such as Supabase or Firebase. Do not put private service keys in client-side code.

## GitHub Pages
1. Create a public repository named `YOURUSERNAME.github.io`.
2. Upload all files in this folder to the repository root.
3. Settings → Pages → Deploy from branch → `main` → `/ (root)` → Save.
4. Open `https://YOURUSERNAME.github.io`.

## GeoJSON attribution
District boundaries are loaded from:
https://github.com/ifahimreza/bangladesh-geojson

The project documents boundary data as CC BY 4.0 and provides its attribution/licensing details. Review that project's current LICENSE-DATA before redistributing the boundary data.

## Adding trips
Open `add-trip.html` on your live site. Fill in the form and save.
Use Export diary to back up your browser data. Import diary can restore it on another browser.

## Offline note
The map boundary is fetched from the internet on first load. If you want a completely self-contained/offline version, download the GeoJSON into `assets/bangladesh.geojson` and change `GEOJSON_URL` in `assets/data.js` to `assets/bangladesh.geojson`.
