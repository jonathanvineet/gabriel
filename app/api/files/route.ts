import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { shouldCompress, compressFile, compressFolder, getFolderSize, formatBytes } from '@/lib/compression';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
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
    
    // Security check: ensure path is within UPLOAD_DIR
    if (!fullPath.startsWith(UPLOAD_DIR)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'Directory not found' }, { status: 404 });
    }

    const items = fs.readdirSync(fullPath);
    const fileList = items.map(item => {
      const itemPath = path.join(fullPath, item);
      const stats = fs.statSync(itemPath);
      
      return {
        name: item,
        isDirectory: stats.isDirectory(),
        size: stats.size,
        modified: stats.mtime,
        path: path.join(dirPath, item).replace(/\\/g, '/')
      };
    });

    return NextResponse.json({ files: fileList, currentPath: dirPath });
  } catch (error) {
    console.error('Error reading directory:', error);
    return NextResponse.json({ error: 'Failed to read directory' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const dirPath = formData.get('path') as string || '';
    const uploadPath = path.join(UPLOAD_DIR, dirPath);
    
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
    
    // Process files in batches to reduce memory usage
    const fileData: Array<{ relativePath: string; filePath: string; size: number }> = [];
    const entries = Array.from(formData.entries());
    const fileEntries = entries.filter(([key]) => key.startsWith('file-'));
    
    // Process files in batches
    const BATCH_SIZE = 20;
    for (let i = 0; i < fileEntries.length; i += BATCH_SIZE) {
      const batch = fileEntries.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async ([key, value]) => {
        const file = value as File;
        const relativePath = formData.get(`path-${key.substring(5)}`) as string || file.name;
        
        // Create subdirectories if needed
        const fileDir = path.dirname(relativePath);
        if (fileDir && fileDir !== '.') {
          const fullDir = path.join(uploadPath, fileDir);
          if (!fs.existsSync(fullDir)) {
            fs.mkdirSync(fullDir, { recursive: true });
          }
        }

        const filePath = path.join(uploadPath, relativePath);
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Use async write for better performance
        await fs.promises.writeFile(filePath, buffer);
        
        const fileSize = buffer.length;
        totalSize += fileSize;
        fileData.push({ relativePath, filePath, size: fileSize });
        uploadedFiles.push(relativePath);
      }));
    }

    if (uploadedFiles.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Check if we need to compress (multiple files or folder structure)
    if (uploadedFiles.length > 1 || uploadedFiles.some(f => f.includes('/'))) {
      // Check if the total size warrants compression
      if (totalSize > COMPRESSION_THRESHOLD) {
        console.log(`Total size ${formatBytes(totalSize)} exceeds threshold. Compressing...`);
        
        // Compress entire folder structure
        try {
          await compressFolder(uploadPath);
          compressedFiles.push('Folder compressed');
        } catch (compressError) {
          console.error('Compression error:', compressError);
          // Continue without compression
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
          // Continue without compression
        }
      }
    }

    const message = compressedFiles.length > 0
      ? `${uploadedFiles.length} file${uploadedFiles.length > 1 ? 's' : ''} uploaded and compressed successfully`
      : uploadedFiles.length === 1
        ? 'File uploaded successfully'
        : `${uploadedFiles.length} files uploaded successfully`;

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
