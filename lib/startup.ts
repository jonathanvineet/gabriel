/**
 * Server startup initialization
 * This runs automatically when Next.js server starts
 */

import { initializeWatcher } from './imageWatcher';

let initialized = false;

export function initializeServer() {
  if (initialized) {
    return;
  }

  console.log('🚀 Initializing Micheal server...');
  
  try {
    // Start image watcher and indexer
    initializeWatcher();
    console.log('✅ Image search system initialized');
  } catch (error) {
    console.error('❌ Error initializing image search:', error);
  }

  initialized = true;
  console.log('✅ Server initialization complete');
}

// Auto-initialize in development
if (process.env.NODE_ENV === 'development') {
  initializeServer();
}
