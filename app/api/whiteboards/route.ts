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
    const whiteboardsDir = path.join(UPLOAD_DIR, 'whiteboards');

    if (!fs.existsSync(whiteboardsDir)) {
      return NextResponse.json({ files: [], currentPath: 'whiteboards', count: 0 });
    }

    const dirents = await fs.promises.readdir(whiteboardsDir, { withFileTypes: true });
    const fileNames = dirents.filter(d => d.isFile() && d.name.toLowerCase().endsWith('.json')).map(d => d.name);

    const files = [];
    for (const name of fileNames) {
      try {
        const fullPath = path.join(whiteboardsDir, name);
        const stats = await fs.promises.stat(fullPath);
        if (stats.size === 0) {
          // skip empty files
          console.warn(`[whiteboards.GET] skipping zero-size file: ${fullPath}`);
          continue;
        }

        files.push({
          name,
          isDirectory: false,
          size: stats.size,
          modified: stats.mtime,
          path: `whiteboards/${name}`,
        });
      } catch (err) {
        console.warn(`[whiteboards.GET] failed to stat ${name}:`, err && err.message ? err.message : err);
      }
    }

    return NextResponse.json({ files, currentPath: 'whiteboards', count: files.length });
  } catch (error) {
    console.error('whiteboards.GET error:', error);
    return NextResponse.json({ error: 'Failed to list whiteboards' }, { status: 500 });
  }
}
