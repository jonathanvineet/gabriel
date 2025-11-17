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
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }

    // Normalize and resolve path to avoid traversal issues
    const fullPath = path.resolve(UPLOAD_DIR, filePath);

    // Security check: ensure resolved path is inside UPLOAD_DIR
    const relative = path.relative(UPLOAD_DIR, fullPath);
    if (relative.startsWith('..') || path.isAbsolute(relative) && !fullPath.startsWith(UPLOAD_DIR)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      return NextResponse.json({ error: 'Cannot download a directory' }, { status: 400 });
    }

    const fileName = path.basename(fullPath);
    const encodedFileName = encodeURIComponent(fileName);
    const ext = path.extname(fileName).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.m4a': 'audio/mp4',
      '.json': 'application/json',
      '.txt': 'text/plain'
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';

    // Stream file to client to avoid loading whole file into memory and to
    // enable faster initial response streaming for large files.
    const stream = fs.createReadStream(fullPath);
    return new NextResponse(stream as any, {
      headers: {
        'Content-Disposition': `inline; filename*=UTF-8''${encodedFileName}`,
        'Content-Type': contentType,
        'Content-Length': stats.size.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
  }
}
