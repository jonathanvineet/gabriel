const fs = require('fs');
const path = require('path');

function resolveUploadsDir() {
  const attempts = [process.cwd(), path.join(process.cwd(), '..'), path.join(process.cwd(), '..', '..')];
  for (const base of attempts) {
    const candidate = path.join(base, 'uploads');
    if (fs.existsSync(candidate)) return path.resolve(candidate);
  }
  return path.resolve(process.cwd(), 'uploads');
}

const UPLOAD_DIR = resolveUploadsDir();
const thumbDir = path.join(UPLOAD_DIR, '.thumbs');
if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('sharp is not installed. Run `npm install sharp` before running this script.');
  process.exit(1);
}

function walk(dir, filelist = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full, filelist);
    } else {
      filelist.push(full);
    }
  });
  return filelist;
}

const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'];
const files = walk(UPLOAD_DIR).filter(f => imageExts.includes(path.extname(f).toLowerCase()));
console.log(`Found ${files.length} image files`);

(async () => {
  for (const f of files) {
    const rel = path.relative(UPLOAD_DIR, f);
    const safeName = encodeURIComponent(rel).replace(/%2F/g, '__');
    const thumbPath = path.join(thumbDir, `${safeName}-128x128.jpg`);
    if (fs.existsSync(thumbPath)) continue;
    try {
      const buf = await sharp(f).resize(128, 128, { fit: 'inside' }).jpeg({ quality: 80 }).toBuffer();
      fs.writeFileSync(thumbPath + '.tmp', buf);
      fs.renameSync(thumbPath + '.tmp', thumbPath);
      console.log('Generated', thumbPath);
    } catch (err) {
      console.error('Failed to generate thumbnail for', f, err);
    }
  }
})();
