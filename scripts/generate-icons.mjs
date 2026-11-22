import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const source = path.resolve('assets/icon.svg');
const root = path.resolve('android/app/src/main/res');
const sizes = { 'mdpi':48, 'hdpi':72, 'xhdpi':96, 'xxhdpi':144, 'xxxhdpi':192 };
for (const [density,size] of Object.entries(sizes)) {
  const dir = path.join(root, 'mipmap-'+density);
  fs.mkdirSync(dir,{recursive:true});
  await sharp(source).resize(size,size).png().toFile(path.join(dir,'ic_launcher.png'));
  await sharp(source).resize(size,size).png().toFile(path.join(dir,'ic_launcher_round.png'));
  const fgSize = size * 2;
  await sharp(source).resize(fgSize,fgSize,{fit:'contain'}).png().toFile(path.join(dir,'ic_launcher_foreground.png'));
}
const anydpi = path.join(root,'mipmap-anydpi-v26');
fs.mkdirSync(anydpi,{recursive:true});
const adaptive = '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/ic_launcher_background"/><foreground android:drawable="@mipmap/ic_launcher_foreground"/></adaptive-icon>';
fs.writeFileSync(path.join(anydpi,'ic_launcher.xml'),adaptive);
fs.writeFileSync(path.join(anydpi,'ic_launcher_round.xml'),adaptive);
const values = path.join(root,'values'); fs.mkdirSync(values,{recursive:true});
fs.writeFileSync(path.join(values,'ic_launcher_background.xml'),'<resources><color name="ic_launcher_background">#090713</color></resources>');
console.log('Generated premium NEET Countdown launcher icons.');
