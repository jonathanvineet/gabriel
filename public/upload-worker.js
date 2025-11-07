// Web Worker for processing files without blocking the main thread
self.addEventListener('message', async (e) => {
  const { type, files, currentPath } = e.data;

  if (type === 'PREPARE_UPLOAD') {
    const formData = new FormData();
    formData.append('path', currentPath);

    for (let i = 0; i < files.length; i++) {
      const fileData = files[i];
      const fileKey = `file-${i}`;
      
      // Send progress updates
      self.postMessage({
        type: 'PROGRESS',
        current: i + 1,
        total: files.length,
        fileName: fileData.name
      });

      formData.append(fileKey, fileData.file);
      formData.append(`path-${i}`, fileData.path || fileData.name);
      
      // Allow other operations to run
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    self.postMessage({
      type: 'COMPLETE',
      formData
    });
  }
});
