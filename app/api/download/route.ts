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

    const file = fs.readFileSync(fullPath);
    const fileName = path.basename(fullPath);
    
    // Encode filename to handle special characters (RFC 5987)
    const encodedFileName = encodeURIComponent(fileName);
    
    return new NextResponse(file, {
      headers: {
        'Content-Disposition': `attachment; filename*=UTF-8''${encodedFileName}`,
        // If it's a JSON file, use application/json so clients decode easily.
        'Content-Type': fileName.toLowerCase().endsWith('.json') ? 'application/json' : 'application/octet-stream',
      },
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
  }
}
