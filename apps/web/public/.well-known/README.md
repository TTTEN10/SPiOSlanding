# Apple App Site Association (Universal Links)

## Before production

1. Edit `apple-app-site-association` (no file extension): replace `<REAL_TEAM_ID>.com.safepsy.mobile` with your real Apple Team ID + bundle id (example: `ABCDE12345.com.safepsy.mobile`). Do not commit real IDs if the repo is public.
2. Serve the file at exactly:

   `https://<your-domain>/.well-known/apple-app-site-association`

3. Requirements (Apple is strict):

   - HTTP **200** (not 301/302 to another host or to `/index.html`)
   - **`Content-Type: application/json`** (or `application/pkcs7-mime` for signed AASA; JSON is typical for Vite `public/`)
   - **No `.json` extension** in the URL path

4. Validate:

   - Run: `npm run validate:aasa -- https://your-domain.com` (from `apps/web`)
   - Apple: [App Search / Universal Links validation](https://search.developer.apple.com/appsearch-validation-tool/)

5. Match **Associated Domains** in the Expo app (`app.json` → `applinks:your-domain.com`) to this host.
