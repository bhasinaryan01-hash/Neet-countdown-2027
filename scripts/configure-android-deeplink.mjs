import { readFile, writeFile } from 'node:fs/promises';

const manifestPath = 'android/app/src/main/AndroidManifest.xml';
let manifest = await readFile(manifestPath, 'utf8');

if (!manifest.includes('com.bhasinaryan.neetcountdown')) {
  const activityPattern = /(<activity\\b[^>]*android:name="\\.MainActivity"[\\s\\S]*?>)([\\s\\S]*?)(<\\/activity>)/;
  if (!activityPattern.test(manifest)) {
    throw new Error('Could not find the MainActivity entry in AndroidManifest.xml');
  }
  manifest = manifest.replace(activityPattern, (match, open, body, close) => {
    const filter = `
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="com.bhasinaryan.neetcountdown" android:host="auth" android:path="/callback" />
            </intent-filter>`;
    return open + body + filter + close;
  });
  await writeFile(manifestPath, manifest);
}
console.log('Android OAuth deep link configured.');
