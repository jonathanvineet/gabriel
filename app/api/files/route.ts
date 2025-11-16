import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { shouldCompress, compressFile, compressFolder, getFolderSize, formatBytes } from '@/lib/compression';

// Resolve the uploads directory by searching upward from the current working directory.
function resolveUploadsDir(): string {
  const attempts = [process.cwd(), path.join(process.cwd(), '..'), path.join(process.cwd(), '..', '..')];
  for (const base of attempts) {
    const candidate = path.join(base, 'uploads');
    if (fs.existsSync(candidate)) return path.resolve(candidate);
  }
  // Fallback to a best-effort path relative to this file
  const fallback = path.resolve(process.cwd(), 'uploads');
  return fallback;
}

const UPLOAD_DIR = resolveUploadsDir();
console.log(`[files] using uploads dir: ${UPLOAD_DIR}`);
const COMPRESSION_THRESHOLD = 100 * 1024 * 1024; // 100 MB

// Ensure uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dirPath = searchParams.get('path') || '';
    
    const fullPath = path.join(UPLOAD_DIR, dirPath);

    // Debugging: log incoming request info to help diagnose client issues
    const headersObj: Record<string, string> = {};
    request.headers.forEach((value, key) => { headersObj[key] = value });
    const forwardedFor = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    console.log(`[files.GET] requested path='${dirPath}' | UPLOAD_DIR='${UPLOAD_DIR}' | fullPath='${fullPath}' | forwardedFor='${forwardedFor}' | user-agent='${request.headers.get('user-agent')}'`);
    console.log('[files.GET] request headers:', headersObj);
    try {
      const exists = fs.existsSync(fullPath);
      console.log(`[files.GET] fullPath exists: ${exists}`);
      if (exists) {
        const st = fs.statSync(fullPath);
        console.log(`[files.GET] fullPath isFile:${st.isFile()} isDirectory:${st.isDirectory()} size:${st.size} mtime:${st.mtime}`);
      }
    } catch (e) {
      console.warn('[files.GET] error while checking fullPath:', e);
    }
    
    // Security check: ensure path is within UPLOAD_DIR (use path.relative to avoid edge cases)
    const resolvedUploadDir = path.resolve(UPLOAD_DIR);
    const resolvedFullPath = path.resolve(fullPath);
    const relative = path.relative(resolvedUploadDir, resolvedFullPath);
    console.log(`[files.GET] resolvedUploadDir='${resolvedUploadDir}' resolvedFullPath='${resolvedFullPath}' relative='${relative}'`);
    if (relative.startsWith('..') || path.isAbsolute(relative) && !resolvedFullPath.startsWith(resolvedUploadDir)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    if (!fs.existsSync(fullPath)) {
      // Path doesn't exist — return an empty listing instead of 404 so clients can treat
      // a missing folder as "no files". Also log for debugging.
      console.log(`[files.GET] path not found: '${fullPath}' — returning empty files list`);
      return NextResponse.json({ files: [], currentPath: dirPath, count: 0 });
    }

    // Check if it's a file or directory
    const stats = await fs.promises.stat(fullPath);
    
    // If it's a file, serve it directly with optimizations
    if (stats.isFile()) {
      const ext = path.extname(fullPath).toLowerCase();
      
      // Set appropriate content type
      const contentTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.pdf': 'application/pdf',
        '.txt': 'text/plain',
        '.json': 'application/json',
      };
      
      const contentType = contentTypes[ext] || 'application/octet-stream';
      
      // Use streaming for large files (>1MB)
      if (stats.size > 1024 * 1024) {
        const stream = fs.createReadStream(fullPath);
        return new NextResponse(stream as any, {
          headers: {
            'Content-Type': contentType,
            'Content-Length': stats.size.toString(),
            'Cache-Control': 'public, max-age=31536000, immutable',
            'ETag': `"${stats.mtimeMs}-${stats.size}"`,
          },
        });
      }
      
      // For small files, read into buffer
      const fileBuffer = await fs.promises.readFile(fullPath);
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Length': fileBuffer.length.toString(),
          'Cache-Control': 'public, max-age=31536000, immutable',
          'ETag': `"${stats.mtimeMs}-${stats.size}"`,
        },
      });
    }

    // If it's a directory, list contents
    // Read directory entries and include Dirent info to diagnose missing files
    const dirents = await fs.promises.readdir(fullPath, { withFileTypes: true });
    const items = dirents.map(d => d.name);
    // Debug: log raw dir entries and type info when debugging whiteboards
    console.log(`[files.GET] raw dir entries for '${fullPath}':`);
    dirents.forEach(d => console.log(`  - ${d.name} (isDirectory=${d.isDirectory()} isFile=${d.isFile()})`));
    
    // Process files in parallel batches for speed
    const BATCH_SIZE = 50;
    const fileList = [];
    
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (item) => {
          try {
            const itemPath = path.join(fullPath, item);
            let stats;
            try {
              stats = await fs.promises.stat(itemPath);
            } catch (statErr) {
              console.warn(`[files.GET] stat failed for '${itemPath}':`, statErr && statErr.message ? statErr.message : statErr);
              throw statErr;
            }

            // Skip zero-byte files which may be transient or invalid; log for
            // diagnostics so operators can repair or retry uploads if needed.
            if (stats.size === 0) {
              console.warn(`[files.GET] skipping zero-size file '${itemPath}'`);
              return null;
            }

            return {
              name: item,
              isDirectory: stats.isDirectory(),
              size: stats.size,
              modified: stats.mtime,
              path: path.join(dirPath, item).replace(/\\/g, '/')
            };
          } catch (err) {
            // Skip files that can't be accessed
            console.warn(`Cannot access ${item}:`, err && err.message ? err.message : err);
            return null;
          }
        })
      );
      
      fileList.push(...batchResults.filter(Boolean));
    }

    return NextResponse.json({ 
      files: fileList, 
      currentPath: dirPath,
      count: fileList.length 
    });
  } catch (error) {
    console.error('Error reading directory:', error);
    return NextResponse.json({ error: 'Failed to read directory' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // For Next.js, we need to use formData() which already handles multipart parsing
    const formData = await request.formData();
    const dirPath = (formData.get('path') as string) || '';
    const uploadPath = path.join(UPLOAD_DIR, dirPath);
    console.log(`[files.POST] upload requested path='${dirPath}' -> uploadPath='${uploadPath}'`);
    
    // Security check
    if (!uploadPath.startsWith(UPLOAD_DIR)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    const uploadedFiles: string[] = [];
    const compressedFiles: string[] = [];
    let totalSize = 0;
    
    // Process files from formData
    const fileData: Array<{ relativePath: string; filePath: string; size: number }> = [];
    const entries = Array.from(formData.entries());
    const fileEntries = entries.filter(([key]) => key.startsWith('file-'));
    
    // Process files sequentially to avoid memory issues
    for (const [key, value] of fileEntries) {
      const file = value as File;
      const fieldIndex = key.replace('file-', '');
      const pathKey = `path-${fieldIndex}`;
      const relativePath = (formData.get(pathKey) as string) || file.name;
      
      // Create subdirectories if needed
      const fileDir = path.dirname(relativePath);
      if (fileDir && fileDir !== '.') {
        const fullDir = path.join(uploadPath, fileDir);
        if (!fs.existsSync(fullDir)) {
          fs.mkdirSync(fullDir, { recursive: true });
        }
      }

      const finalPath = path.join(uploadPath, relativePath);

      // Stream file to disk to avoid loading entire file in memory.
      // Write to a temporary file first and then rename to finalPath to
      // ensure the file appears atomically and to avoid exposing
      // partially-written or empty files to readers.
      const tmpPath = `${finalPath}.tmp`;
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await fs.promises.writeFile(tmpPath, buffer);
      await fs.promises.rename(tmpPath, finalPath);
      
      const fileSize = buffer.length;
      totalSize += fileSize;
      fileData.push({ relativePath, filePath: finalPath, size: fileSize });
      uploadedFiles.push(relativePath);
    }

    if (uploadedFiles.length === 0) {
      console.log('[files.POST] no files provided in upload');
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Check if we need to compress (multiple files or folder structure)
    if (uploadedFiles.length > 1 || uploadedFiles.some(f => f.includes('/'))) {
      // Check if the total size warrants compression
      if (totalSize > COMPRESSION_THRESHOLD) {
        console.log(`Total size ${formatBytes(totalSize)} exceeds threshold. Compressing...`);
        
        try {
          await compressFolder(uploadPath);
          compressedFiles.push('Folder compressed');
        } catch (compressError) {
          console.error('Compression error:', compressError);
        }
      }
    } else {
      // Single file - check if it needs compression
      const fileInfo = fileData[0];
      if (shouldCompress(fileInfo.size)) {
        console.log(`File ${fileInfo.relativePath} (${formatBytes(fileInfo.size)}) exceeds threshold. Compressing...`);
        
        try {
          await compressFile(fileInfo.filePath);
          compressedFiles.push(fileInfo.relativePath);
        } catch (compressError) {
          console.error('Compression error:', compressError);
        }
      }
    }

    const message = compressedFiles.length > 0
      ? `${uploadedFiles.length} file${uploadedFiles.length > 1 ? 's' : ''} uploaded and compressed successfully`
      : uploadedFiles.length === 1
        ? 'File uploaded successfully'
        : `${uploadedFiles.length} files uploaded successfully`;

    console.log(`[files.POST] uploadedFiles=${JSON.stringify(uploadedFiles)} totalSize=${totalSize} compressed=${JSON.stringify(compressedFiles)}`);
    return NextResponse.json({ 
      success: true, 
      message,
      filesUploaded: uploadedFiles.length,
      compressed: compressedFiles.length > 0,
      totalSize: formatBytes(totalSize)
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { filePath } = await request.json();
    
    console.log(`[files.DELETE] requested filePath='${filePath}'`);
    const fullPath = path.join(UPLOAD_DIR, filePath);
    
    // Security check
    if (!fullPath.startsWith(UPLOAD_DIR)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const stats = fs.statSync(fullPath);
    
    if (stats.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(fullPath);
    }

    return NextResponse.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
