import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function resolveUploadsDir(): string {
  const attempts = [process.cwd(), path.join(process.cwd(), '..'), path.join(process.cwd(), '..', '..')];
  for (const base of attempts) {
    const candidate = path.join(base, 'uploads');
    if (fs.existsSync(candidate)) return path.resolve(candidate);
  }
  return path.resolve(process.cwd(), 'uploads');
}

const UPLOAD_DIR = resolveUploadsDir();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filePath = searchParams.get('path') || '';
    const fullPath = path.join(UPLOAD_DIR, filePath);

    // Security check
    const resolvedUploadDir = path.resolve(UPLOAD_DIR);
    const resolvedFullPath = path.resolve(fullPath);
    const relative = path.relative(resolvedUploadDir, resolvedFullPath);
    if (relative.startsWith('..') || path.isAbsolute(relative) && !resolvedFullPath.startsWith(resolvedUploadDir)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      return NextResponse.json({ error: 'Not a file' }, { status: 400 });
    }

    const ext = path.extname(fullPath).toLowerCase();
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'];

    if (imageExts.includes(ext)) {
      // Serve image directly; clients will resize locally for thumbnails.
      const stream = fs.createReadStream(fullPath);
      return new NextResponse(stream as any, {
        headers: {
          'Content-Type': ext === '.png' ? 'image/png' : 'image/jpeg',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }

    // For non-image files return a tiny transparent PNG so client can display
    // a lightweight placeholder quickly (client will overlay an icon).
    const onePixelPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=';
    const buf = Buffer.from(onePixelPngBase64, 'base64');
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(buf.length),
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (err) {
    console.error('thumbnail GET error', err);
    return NextResponse.json({ error: 'Failed to generate thumbnail' }, { status: 500 });
  }
}
