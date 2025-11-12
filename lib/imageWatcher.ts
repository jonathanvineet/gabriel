import fs from 'fs';
import path from 'path';
import { getIndexer } from './imageIndexer';

let watcher: fs.FSWatcher | null = null;

/**
 * Start watching the uploads directory for changes
 */
export function startImageWatcher(uploadsPath: string = './uploads') {
  if (watcher) {
    console.log('Image watcher already running');
    return;
  }

  const absolutePath = path.resolve(uploadsPath);
  const indexer = getIndexer();

  console.log(`Starting image watcher on: ${absolutePath}`);

  watcher = fs.watch(absolutePath, { recursive: true }, async (eventType, filename) => {
    if (!filename) return;

    const ext = path.extname(filename).toLowerCase();
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];

    // Only process image files
    if (!imageExtensions.includes(ext)) {
      return;
    }

    const fullPath = path.join(absolutePath, filename);

    if (eventType === 'rename') {
      // File was added or deleted
      if (fs.existsSync(fullPath)) {
        console.log(`Image added: ${filename}`);
        // Trigger a rescan (optimized - only scans new/changed files)
        indexer.scanAndIndex().catch(console.error);
      } else {
        console.log(`Image deleted: ${filename}`);
        // Remove from index
        await indexer.removeFromIndex(filename);
      }
    } else if (eventType === 'change') {
      console.log(`Image modified: ${filename}`);
      // Trigger a rescan (will update hash and re-analyze if changed)
      indexer.scanAndIndex().catch(console.error);
    }
  });

  console.log('Image watcher started successfully');
}

/**
 * Stop the image watcher
 */
export function stopImageWatcher() {
  if (watcher) {
    watcher.close();
    watcher = null;
    console.log('Image watcher stopped');
  }
}

/**
 * Initialize watcher on server start
 */
export function initializeWatcher() {
  // Start watcher
  startImageWatcher();

  // Trigger initial scan if index is empty or old
  const indexer = getIndexer();
  indexer.getStats().then(stats => {
    const lastScan = new Date(stats.lastScan).getTime();
    const hoursSinceLastScan = (Date.now() - lastScan) / (1000 * 60 * 60);

    if (stats.totalImages === 0 || hoursSinceLastScan > 24) {
      console.log('Triggering initial image scan...');
      indexer.scanAndIndex().catch(console.error);
    }
  });
}
