import archiver from 'archiver';
import extract from 'extract-zip';
import fs from 'fs';
import path from 'path';

const COMPRESSION_THRESHOLD = 100 * 1024 * 1024; // 100 MB

export function shouldCompress(size: number): boolean {
  return size > COMPRESSION_THRESHOLD;
}

export async function compressFile(filePath: string): Promise<string> {
  const zipPath = `${filePath}.zip`;
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
  });

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      // Remove original file after compression
      fs.unlinkSync(filePath);
      resolve(zipPath);
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);
    archive.file(filePath, { name: path.basename(filePath) });
    archive.finalize();
  });
}

export async function compressFolder(folderPath: string): Promise<string> {
  const zipPath = `${folderPath}.zip`;
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', {
    zlib: { level: 9 }
  });

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      // Remove original folder after compression
      fs.rmSync(folderPath, { recursive: true, force: true });
      resolve(zipPath);
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);
    archive.directory(folderPath, false);
    archive.finalize();
  });
}

export async function decompressFile(zipPath: string): Promise<string> {
  const extractPath = zipPath.replace('.zip', '');
  const extractDir = path.dirname(zipPath);

  await extract(zipPath, { dir: extractDir });

  // Remove zip file after extraction
  fs.unlinkSync(zipPath);
  
  return extractPath;
}

export function getFolderSize(folderPath: string): number {
  let totalSize = 0;

  function calculateSize(dirPath: string) {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        calculateSize(itemPath);
      } else {
        totalSize += stats.size;
      }
    }
  }

  calculateSize(folderPath);
  return totalSize;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
