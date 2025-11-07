// Web Worker for processing files without blocking the main thread
let processingQueue = [];
let isProcessing = false;

self.addEventListener('message', async (e) => {
  const { type, files, currentPath, index } = e.data;

  if (type === 'PROCESS_FILES') {
    processingQueue.push({ files, currentPath, index });
    if (!isProcessing) {
      processQueue();
    }
  } else if (type === 'CANCEL') {
    processingQueue = [];
    isProcessing = false;
  }
});

async function processQueue() {
  if (processingQueue.length === 0) {
    isProcessing = false;
    return;
  }

  isProcessing = true;
  const { files, currentPath, index } = processingQueue.shift();

  try {
    const fileList = Array.from(files);
    const totalFiles = fileList.length;

    for (let i = 0; i < totalFiles; i++) {
      const file = fileList[i];
      
      // Send progress update
      self.postMessage({
        type: 'PROGRESS',
        current: i + 1,
        total: totalFiles,
        fileName: file.name,
        fileSize: file.size,
        percent: Math.floor(((i + 1) / totalFiles) * 100)
      });

      // Simulate small delay to allow UI updates
      if (i % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    self.postMessage({
      type: 'BATCH_COMPLETE',
      index
    });
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      error: error.message
    });
  }

  // Process next batch
  processQueue();
}
