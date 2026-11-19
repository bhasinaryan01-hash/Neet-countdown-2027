# NEET Countdown (Android)

A mobile-first NEET countdown and study tracker with Supabase accounts, cloud-synced student progress, and a shared Study Lounge. Core app features are designed for mobile use.

## Supabase setup
Add these GitHub Actions repository secrets before building:
- `VITE_SUPABASE_URL`: the root Supabase Project URL, such as `https://your-project-ref.supabase.co` (do not append `/rest/v1` or `/auth/v1`).
- `VITE_SUPABASE_ANON_KEY`: the project's publishable/anon key. Never use a service-role key in the app.

## Build an installable APK using GitHub (phone-friendly)
1. Create/open a GitHub repository and upload the contents of this folder (not the ZIP itself).
2. Ensure the default branch is `main` or `master`.
3. Open the repository's **Actions** tab.
4. Select **Build NEET Countdown APK** → **Run workflow** (or wait for the automatic build after pushing).
5. Open the completed workflow run → **Artifacts** → download `NEET-Countdown-APK`.
6. Extract the artifact ZIP and install `app-debug.apk` on your Android phone. Allow installation from your browser/file manager if Android asks.

## Local development
- `npm install`
- `npm run build`
- `npx cap add android` (once)
- `npx cap sync android`
- Open `android/` in Android Studio and build the debug APK.

## Notifications
The app requests Android notification permission and schedules a daily reminder at the time you choose. Android may ask you to allow notifications and exact alarms depending on device/version. Battery restrictions can affect delivery. The reminder is local to the phone; no account or server is needed.

## Data
Dates, syllabus entries, question targets and mock targets are saved locally on the device. Clearing app storage or uninstalling the app can erase this data, so export/backup is not yet included.
