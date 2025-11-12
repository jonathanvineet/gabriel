import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import crypto from 'crypto';
import { exec } from 'child_process';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const execAsync = promisify(exec);

// Supported image extensions
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.heic', '.heif'];

interface ImageMetadata {
  path: string;
  filename: string;
  description: string;
  hash: string;
  size: number;
  lastModified: number;
  indexed: number;
}

interface ImageIndex {
  images: Record<string, ImageMetadata>;
  lastScan: number;
}

export class ImageIndexer {
  private indexPath: string;
  private uploadsPath: string;
  private index: ImageIndex;

  constructor(uploadsPath: string = './uploads', indexPath: string = './data/image-index.json') {
    this.uploadsPath = path.resolve(uploadsPath);
    this.indexPath = path.resolve(indexPath);
    this.index = { images: {}, lastScan: 0 };
  }

  /**
   * Load existing index from disk
   */
  async loadIndex(): Promise<void> {
    try {
      const data = await readFile(this.indexPath, 'utf-8');
      this.index = JSON.parse(data);
    } catch {
      // Index doesn't exist yet, start fresh
      this.index = { images: {}, lastScan: 0 };
    }
  }

  /**
   * Save index to disk
   */
  async saveIndex(): Promise<void> {
    const dir = path.dirname(this.indexPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await writeFile(this.indexPath, JSON.stringify(this.index, null, 2));
  }

  /**
   * Calculate file hash for change detection
   */
  private async calculateHash(filePath: string): Promise<string> {
    const buffer = await readFile(filePath);
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  /**
   * Check if file is an image
   */
  private isImage(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return IMAGE_EXTENSIONS.includes(ext);
  }

  /**
   * Recursively scan directory for images
   */
  private async scanDirectory(dir: string): Promise<string[]> {
    const images: string[] = [];
    
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          const subImages = await this.scanDirectory(fullPath);
          images.push(...subImages);
        } else if (entry.isFile() && this.isImage(entry.name)) {
          images.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dir}:`, error);
    }
    
    return images;
  }

  // Process pool to limit concurrent Python processes
  private activeProcesses = 0;
  private readonly MAX_CONCURRENT_PROCESSES = 2; // Only 2 AI processes at once to prevent memory issues
  
  /**
   * Wait for available process slot
   */
  private async waitForProcessSlot(): Promise<void> {
    while (this.activeProcesses >= this.MAX_CONCURRENT_PROCESSES) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  /**
   * Analyze image using AI with OCR (OPTIMIZED with process pooling)
   */
  private async analyzeImage(imagePath: string): Promise<string> {
    // Wait for available process slot
    await this.waitForProcessSlot();
    this.activeProcesses++;
    
    try {
      const filename = path.basename(imagePath);
      console.log(`🔍 [${this.activeProcesses}/${this.MAX_CONCURRENT_PROCESSES}] Analyzing: ${filename}`);
      
      const { stdout: basicOutput } = await execAsync(
        `python3 tests/image_analyzer.py "${imagePath}" 2>&1`,
        { 
          timeout: 90000, // 90 seconds
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          killSignal: 'SIGKILL' // Force kill if timeout
        }
      );
      
      const basicMatch = basicOutput.match(/Result: (.+)/);
      if (basicMatch && basicMatch[1]) {
        const description = basicMatch[1].trim();
        
        // Try to add OCR if it's likely to have text (screenshots, documents)
        const filenameLower = filename.toLowerCase();
        const likelyHasText = filenameLower.includes('screenshot') || 
                             filenameLower.includes('whatsapp') ||
                             ['.png'].includes(path.extname(imagePath).toLowerCase());
        
        if (likelyHasText) {
          try {
            const { stdout: ocrOutput } = await execAsync(
              `python3 tests/image_analyzer_with_ocr.py "${imagePath}" 2>&1`,
              { 
                timeout: 90000,
                maxBuffer: 10 * 1024 * 1024,
                killSignal: 'SIGKILL'
              }
            );
            
            const ocrMatch = ocrOutput.match(/Result: (.+)/);
            if (ocrMatch && ocrMatch[1]) {
              return ocrMatch[1].trim();
            }
          } catch (ocrError) {
            console.log(`⚠️  OCR failed for ${filename}, using basic description`);
          }
        }
        
        return description;
      }
      
      // Last fallback: use filename
      console.log(`⚠️  No result found for ${filename}, using filename`);
      return path.basename(imagePath, path.extname(imagePath));
    } catch (error: any) {
      if (error.killed) {
        console.error(`⏱️  Timeout analyzing ${path.basename(imagePath)} - using filename`);
      } else {
        console.error(`❌ Error analyzing ${path.basename(imagePath)}:`, error.message);
      }
      return path.basename(imagePath, path.extname(imagePath));
    } finally {
      this.activeProcesses--;
    }
  }

  /**
   * Index a single image
   */
  private async indexImage(imagePath: string): Promise<ImageMetadata> {
    const stats = await stat(imagePath);
    const hash = await this.calculateHash(imagePath);
    const relativePath = path.relative(this.uploadsPath, imagePath);
    
    // Check if already indexed and unchanged
    const existing = this.index.images[relativePath];
    if (existing && existing.hash === hash) {
      return existing;
    }
    
    // Analyze image with AI
    console.log(`Analyzing: ${relativePath}`);
    const description = await this.analyzeImage(imagePath);
    
    const metadata: ImageMetadata = {
      path: relativePath,
      filename: path.basename(imagePath),
      description,
      hash,
      size: stats.size,
      lastModified: stats.mtimeMs,
      indexed: Date.now()
    };
    
    return metadata;
  }

  /**
   * Full scan and index of all images (OPTIMIZED for large collections)
   */
  async scanAndIndex(): Promise<void> {
    console.log('🔍 Starting optimized image scan...');
    await this.loadIndex();
    
    // Get all image files
    const imageFiles = await this.scanDirectory(this.uploadsPath);
    console.log(`📸 Found ${imageFiles.length} images`);
    
    // Track which files still exist
    const existingPaths = new Set<string>();
    
    // Separate new/changed images from unchanged ones
    const filesToProcess: string[] = [];
    let skippedCount = 0;
    
    for (const imagePath of imageFiles) {
      const relativePath = path.relative(this.uploadsPath, imagePath);
      existingPaths.add(relativePath);
      
      try {
        const stats = await stat(imagePath);
        const existing = this.index.images[relativePath];
        
        // Skip if already indexed and unchanged
        if (existing && existing.lastModified === stats.mtimeMs) {
          skippedCount++;
          continue;
        }
        
        filesToProcess.push(imagePath);
      } catch (error) {
        console.error(`Error checking ${relativePath}:`, error);
      }
    }
    
    console.log(`✅ Skipping ${skippedCount} unchanged images`);
    console.log(`🔄 Processing ${filesToProcess.length} new/changed images`);
    
    // Process images in parallel batches (OPTIMIZED for stability!)
    const BATCH_SIZE = 2; // Process 2 images at a time (prevents memory overload)
    const batches = [];
    
    for (let i = 0; i < filesToProcess.length; i += BATCH_SIZE) {
      batches.push(filesToProcess.slice(i, i + BATCH_SIZE));
    }
    
    let processed = 0;
    for (const batch of batches) {
      // Process batch in parallel
      await Promise.all(
        batch.map(async (imagePath) => {
          const relativePath = path.relative(this.uploadsPath, imagePath);
          try {
            const metadata = await this.indexImage(imagePath);
            this.index.images[relativePath] = metadata;
            processed++;
            
            if (processed % 10 === 0) {
              console.log(`📊 Progress: ${processed}/${filesToProcess.length} images processed`);
            }
          } catch (error) {
            console.error(`❌ Error indexing ${relativePath}:`, error);
          }
        })
      );
      
      // Save index after each batch (prevents data loss)
      await this.saveIndex();
    }
    
    // Remove deleted files from index
    const indexedPaths = Object.keys(this.index.images);
    let removedCount = 0;
    for (const indexedPath of indexedPaths) {
      if (!existingPaths.has(indexedPath)) {
        console.log(`🗑️  Removing deleted file: ${indexedPath}`);
        delete this.index.images[indexedPath];
        removedCount++;
      }
    }
    
    this.index.lastScan = Date.now();
    await this.saveIndex();
    
    console.log('✅ Image scan complete!');
    console.log(`📊 Summary: ${processed} processed, ${skippedCount} skipped, ${removedCount} removed`);
    console.log(`📚 Total indexed: ${Object.keys(this.index.images).length} images`);
  }

  /**
   * Search images by query
   */
  async search(query: string): Promise<ImageMetadata[]> {
    await this.loadIndex();
    
    const lowerQuery = query.toLowerCase();
    const results: ImageMetadata[] = [];
    
    for (const metadata of Object.values(this.index.images)) {
      // Search in filename and description
      const searchText = `${metadata.filename} ${metadata.description}`.toLowerCase();
      
      if (searchText.includes(lowerQuery)) {
        results.push(metadata);
      }
    }
    
    // Sort by relevance (exact matches first, then partial)
    results.sort((a, b) => {
      const aExact = a.description.toLowerCase().includes(lowerQuery) ? 1 : 0;
      const bExact = b.description.toLowerCase().includes(lowerQuery) ? 1 : 0;
      return bExact - aExact;
    });
    
    return results;
  }

  /**
   * Get all indexed images
   */
  async getAllImages(): Promise<ImageMetadata[]> {
    await this.loadIndex();
    return Object.values(this.index.images);
  }

  /**
   * Remove image from index
   */
  async removeFromIndex(relativePath: string): Promise<void> {
    await this.loadIndex();
    delete this.index.images[relativePath];
    await this.saveIndex();
  }

  /**
   * Get index stats
   */
  async getStats() {
    await this.loadIndex();
    return {
      totalImages: Object.keys(this.index.images).length,
      lastScan: new Date(this.index.lastScan).toISOString(),
      indexSize: JSON.stringify(this.index).length
    };
  }
}

// Singleton instance
let indexer: ImageIndexer | null = null;

export function getIndexer(): ImageIndexer {
  if (!indexer) {
    indexer = new ImageIndexer();
  }
  return indexer;
}
