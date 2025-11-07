'use client';

import { useState, useEffect } from 'react';
import { 
  Folder, 
  File, 
  Upload, 
  FolderPlus, 
  ArrowLeft, 
  Trash2, 
  Download,
  Home
} from 'lucide-react';

interface FileItem {
  name: string;
  isDirectory: boolean;
  size: number;
  modified: string;
  path: string;
}

export default function FileManager() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadPercent, setUploadPercent] = useState(0);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Debounced progress update for better performance
  const updateProgress = (percent: number, message?: string) => {
    requestAnimationFrame(() => {
      setUploadPercent(percent);
      if (message) setUploadProgress(message);
    });
  };

  useEffect(() => {
    loadFiles();
  }, [currentPath]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/files?path=${encodeURIComponent(currentPath)}`);
      const data = await response.json();
      if (data.files) {
        setFiles(data.files);
      }
    } catch (error) {
      console.error('Error loading files:', error);
      alert('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, relativePath?: string) => {
    setUploading(true);
    setUploadProgress(`Preparing to upload ${file.name}...`);
    setUploadPercent(5);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    setUploadProgress(`Reading file: ${file.name}...`);
    setUploadPercent(10);
    
    const formData = new FormData();
    const fileKey = 'file-0';
    formData.append(fileKey, file);
    if (relativePath) {
      formData.append('path-0', relativePath);
    }
    formData.append('path', currentPath);

    setUploadProgress(`Uploading ${file.name}...`);
    setUploadPercent(20);

    try {
      // Simulate progress for single file
      let currentProgress = 20;
      const progressInterval = setInterval(() => {
        currentProgress += 8;
        if (currentProgress >= 85) {
          clearInterval(progressInterval);
          setUploadProgress(`Processing ${file.name}...`);
          setUploadPercent(85);
        } else {
          setUploadPercent(currentProgress);
        }
      }, 150);

      const response = await fetch('/api/files', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress('Finalizing upload...');
      setUploadPercent(95);

      const data = await response.json();
      if (data.success) {
        if (data.compressed) {
          setUploadProgress(`File compressed and saved (${data.totalSize})`);
          setUploadPercent(100);
          await new Promise(resolve => setTimeout(resolve, 1500));
        } else {
          setUploadProgress('Upload complete!');
          setUploadPercent(100);
          await new Promise(resolve => setTimeout(resolve, 800));
        }
        loadFiles();
        return true;
      } else {
        alert(data.error || 'Upload failed');
        return false;
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
      return false;
    } finally {
      setUploading(false);
      setUploadProgress('');
      setUploadPercent(0);
    }
  };

  const handleMultipleFilesUpload = async (files: FileList) => {
    setUploading(true);
    setUploadProgress(`Preparing ${files.length} file${files.length > 1 ? 's' : ''}...`);
    setUploadPercent(5);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const formData = new FormData();
    formData.append('path', currentPath);
    
    let fileIndex = 0;
    let totalSize = 0;
    
    setUploadProgress(`Reading ${files.length} file${files.length > 1 ? 's' : ''}...`);
    setUploadPercent(10);
    
    // Process files in chunks to avoid blocking
    const CHUNK_SIZE = 10;
    const totalFiles = files.length;
    
    for (let i = 0; i < totalFiles; i += CHUNK_SIZE) {
      const chunk = Math.min(CHUNK_SIZE, totalFiles - i);
      
      // Process chunk
      for (let j = 0; j < chunk && (i + j) < totalFiles; j++) {
        const file = files[i + j];
        totalSize += file.size;
        const fileKey = `file-${fileIndex}`;
        formData.append(fileKey, file);
        
        // Extract relative path from webkitRelativePath if available
        if ((file as any).webkitRelativePath) {
          formData.append(`path-${fileIndex}`, (file as any).webkitRelativePath);
        } else {
          formData.append(`path-${fileIndex}`, file.name);
        }
        fileIndex++;
      }
      
      // Update progress
      const prepProgress = 10 + Math.floor(((i + chunk) / totalFiles) * 15);
      setUploadPercent(prepProgress);
      setUploadProgress(`Processing file ${Math.min(i + chunk, totalFiles)} of ${totalFiles}...`);
      
      // Yield to browser to keep UI responsive
      await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
    }

    setUploadProgress(`Uploading ${files.length} file${files.length > 1 ? 's' : ''}...`);
    setUploadPercent(30);

    try {
      // Simulate upload progress
      let currentProgress = 30;
      const progressInterval = setInterval(() => {
        currentProgress += 6;
        if (currentProgress >= 85) {
          clearInterval(progressInterval);
          setUploadProgress('Processing uploaded files...');
          setUploadPercent(85);
        } else {
          setUploadPercent(currentProgress);
        }
      }, 200);

      const response = await fetch('/api/files', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress('Saving files...');
      setUploadPercent(95);

      const data = await response.json();
      if (data.success) {
        if (data.compressed) {
          setUploadProgress(`${files.length} files compressed and saved (${data.totalSize})`);
          setUploadPercent(100);
          await new Promise(resolve => setTimeout(resolve, 1500));
        } else {
          setUploadProgress('Upload complete!');
          setUploadPercent(100);
          await new Promise(resolve => setTimeout(resolve, 800));
        }
        loadFiles();
        alert(data.message || 'Files uploaded successfully!');
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Failed to upload files');
    } finally {
      setUploading(false);
      setUploadProgress('');
      setUploadPercent(0);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (files.length === 1) {
        handleFileUpload(files[0]);
      } else {
        handleMultipleFilesUpload(files);
      }
    }
  };

  const handleFolderInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleMultipleFilesUpload(files);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      alert('Please enter a folder name');
      return;
    }

    try {
      const response = await fetch('/api/folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderName: newFolderName,
          currentPath,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setNewFolderName('');
        setShowNewFolderInput(false);
        loadFiles();
        alert(`Folder "${newFolderName}" created successfully!`);
      } else {
        alert(data.error || 'Failed to create folder');
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      alert('Failed to create folder');
    }
  };

  const handleDelete = async (filePath: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    try {
      const response = await fetch('/api/files', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath }),
      });

      const data = await response.json();
      if (data.success) {
        loadFiles();
        alert(`"${name}" deleted successfully!`);
      } else {
        alert(data.error || 'Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete');
    }
  };

  const handleDownload = (filePath: string, name: string) => {
    const link = document.createElement('a');
    link.href = `/api/download?path=${encodeURIComponent(filePath)}`;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const navigateToFolder = (folderPath: string) => {
    setCurrentPath(folderPath);
  };

  const navigateBack = () => {
    const pathParts = currentPath.split('/').filter(Boolean);
    pathParts.pop();
    setCurrentPath(pathParts.join('/'));
  };

  const navigateHome = () => {
    setCurrentPath('');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.items) {
      const items = Array.from(e.dataTransfer.items);
      const entries: any[] = [];
      
      for (const item of items) {
        const entry = item.webkitGetAsEntry?.();
        if (entry) {
          entries.push(entry);
        }
      }

      if (entries.length > 0) {
        await processDroppedEntries(entries);
      }
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleMultipleFilesUpload(e.dataTransfer.files);
    }
  };

  const processDroppedEntries = async (entries: any[]) => {
    setUploading(true);
    setUploadProgress('Analyzing dropped items...');
    setUploadPercent(5);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const files: { file: File; path: string }[] = [];
    
    setUploadProgress('Reading folder structure...');
    setUploadPercent(10);
    
    const readEntry = async (entry: any, basePath = ''): Promise<void> => {
      if (entry.isFile) {
        return new Promise((resolve) => {
          entry.file((file: File) => {
            const relativePath = basePath ? `${basePath}/${file.name}` : file.name;
            files.push({ file, path: relativePath });
            resolve();
          });
        });
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        return new Promise((resolve) => {
          dirReader.readEntries(async (entries: any[]) => {
            const newBasePath = basePath ? `${basePath}/${entry.name}` : entry.name;
            
            // Process directory entries in batches to avoid blocking
            const BATCH_SIZE = 5;
            for (let i = 0; i < entries.length; i += BATCH_SIZE) {
              const batch = entries.slice(i, i + BATCH_SIZE);
              await Promise.all(batch.map(e => readEntry(e, newBasePath)));
              
              // Yield to browser
              if (entries.length > 20) {
                await new Promise(r => requestAnimationFrame(() => r(undefined)));
              }
            }
            resolve();
          });
        });
      }
    };

    for (const entry of entries) {
      await readEntry(entry);
    }

    if (files.length > 0) {
      setUploadProgress(`Found ${files.length} file${files.length > 1 ? 's' : ''}. Preparing upload...`);
      setUploadPercent(20);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const formData = new FormData();
      formData.append('path', currentPath);
      
      setUploadProgress('Packaging files...');
      setUploadPercent(25);
      
      // Process files in chunks
      const CHUNK_SIZE = 15;
      const totalFiles = files.length;
      
      for (let i = 0; i < totalFiles; i += CHUNK_SIZE) {
        const chunk = Math.min(CHUNK_SIZE, totalFiles - i);
        
        for (let j = 0; j < chunk && (i + j) < totalFiles; j++) {
          const item = files[i + j];
          const fileKey = `file-${i + j}`;
          formData.append(fileKey, item.file);
          formData.append(`path-${i + j}`, item.path);
        }
        
        // Update progress
        const packageProgress = 25 + Math.floor(((i + chunk) / totalFiles) * 10);
        setUploadPercent(packageProgress);
        
        // Show progress every chunk
        if (totalFiles > 50 && (i + chunk) % 50 === 0) {
          setUploadProgress(`Packaging ${i + chunk} of ${totalFiles} files...`);
        }
        
        // Yield to browser
        await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
      }

      setUploadProgress(`Uploading ${files.length} file${files.length > 1 ? 's' : ''}...`);
      setUploadPercent(40);

      try {
        // Simulate upload progress
        let currentProgress = 40;
        const progressInterval = setInterval(() => {
          currentProgress += 5;
          if (currentProgress >= 85) {
            clearInterval(progressInterval);
            setUploadProgress('Processing uploaded files...');
            setUploadPercent(85);
          } else {
            setUploadPercent(currentProgress);
          }
        }, 250);

        const response = await fetch('/api/files', {
          method: 'POST',
          body: formData,
        });

        clearInterval(progressInterval);
        setUploadProgress('Finalizing upload...');
        setUploadPercent(95);

        const data = await response.json();
        if (data.success) {
          if (data.compressed) {
            setUploadProgress(`Files compressed and saved (${data.totalSize})`);
            setUploadPercent(100);
            await new Promise(resolve => setTimeout(resolve, 1500));
          } else {
            setUploadProgress('Upload complete!');
            setUploadPercent(100);
            await new Promise(resolve => setTimeout(resolve, 800));
          }
          loadFiles();
          alert(data.message || 'Files uploaded successfully!');
        } else {
          alert(data.error || 'Upload failed');
        }
      } catch (error) {
        console.error('Error uploading files:', error);
        alert('Failed to upload files');
      } finally {
        setUploading(false);
        setUploadProgress('');
        setUploadPercent(0);
      }
    } else {
      setUploading(false);
      setUploadProgress('');
      setUploadPercent(0);
    }
  };

  const pathSegments = currentPath.split('/').filter(Boolean);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <h1 className="text-3xl font-bold mb-2">File Manager</h1>
            <p className="text-blue-100">Upload, organize, and manage your files</p>
          </div>

          {/* Upload Progress Indicator */}
          {uploading && (
            <div className="bg-blue-50 border-b border-blue-200 p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span className="text-blue-700 font-medium">{uploadProgress}</span>
                  </div>
                  <span className="text-blue-600 font-semibold">{uploadPercent}%</span>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-blue-200 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out animate-pulse"
                    style={{ width: `${uploadPercent}%` }}
                  ></div>
                </div>
                <p className="text-xs text-blue-600 text-right">Page is responsive - you can navigate away if needed</p>
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className="border-b bg-gray-50 p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <button
                onClick={navigateHome}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                title="Home"
                disabled={uploading}
              >
                <Home size={18} />
                <span className="hidden sm:inline">Home</span>
              </button>
              
              {currentPath && (
                <button
                  onClick={navigateBack}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={uploading}
                >
                  <ArrowLeft size={18} />
                  <span className="hidden sm:inline">Back</span>
                </button>
              )}

              <label className={`flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                <Upload size={18} />
                <span className="hidden sm:inline">Upload File</span>
                <input
                  type="file"
                  onChange={handleFileInputChange}
                  className="hidden"
                  disabled={uploading}
                />
              </label>

              <label className={`flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                <Folder size={18} />
                <span className="hidden sm:inline">Upload Folder</span>
                <input
                  type="file"
                  onChange={handleFolderInputChange}
                  className="hidden"
                  {...({ webkitdirectory: '', directory: '' } as any)}
                  multiple
                  disabled={uploading}
                />
              </label>

              <button
                onClick={() => setShowNewFolderInput(!showNewFolderInput)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={uploading}
              >
                <FolderPlus size={18} />
                <span className="hidden sm:inline">New Folder</span>
              </button>
            </div>

            {/* New Folder Input */}
            {showNewFolderInput && (
              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
                />
                <button
                  onClick={handleCreateFolder}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowNewFolderInput(false);
                    setNewFolderName('');
                  }}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Breadcrumb */}
          <div className="bg-white border-b p-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Home size={16} className="text-gray-400" />
              <button 
                onClick={navigateHome}
                className="hover:text-blue-600 font-medium"
              >
                uploads
              </button>
              {pathSegments.map((segment, index) => (
                <span key={index} className="flex items-center gap-2">
                  <span className="text-gray-400">/</span>
                  <button
                    onClick={() => navigateToFolder(pathSegments.slice(0, index + 1).join('/'))}
                    className="hover:text-blue-600 font-medium"
                  >
                    {segment}
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative ${dragActive && !uploading ? 'bg-blue-50' : ''}`}
          >
            {dragActive && !uploading && (
              <div className="absolute inset-0 bg-blue-100 bg-opacity-90 flex items-center justify-center z-10 border-4 border-dashed border-blue-400 m-4 rounded-lg">
                <div className="text-center">
                  <Upload size={48} className="mx-auto text-blue-600 mb-2" />
                  <p className="text-xl font-semibold text-blue-600">Drop file here to upload</p>
                </div>
              </div>
            )}

            {uploading && (
              <div className="absolute inset-0 bg-gray-100 bg-opacity-80 flex items-center justify-center z-20 m-4 rounded-lg">
                <div className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md w-full mx-4">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-xl font-semibold text-gray-800 mb-2">{uploadProgress}</p>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-2">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${uploadPercent}%` }}
                    ></div>
                  </div>
                  <p className="text-2xl font-bold text-blue-600 mb-1">{uploadPercent}%</p>
                  <p className="text-sm text-gray-500">Please wait...</p>
                </div>
              </div>
            )}

            {/* File List */}
            <div className="p-6">
              {loading ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4">Loading files...</p>
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Folder size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">This folder is empty</p>
                  <p className="text-sm mt-2">Upload files or create a new folder to get started</p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors group"
                    >
                      <div 
                        className="flex items-center gap-4 flex-1 cursor-pointer"
                        onClick={() => file.isDirectory && navigateToFolder(file.path)}
                      >
                        {file.isDirectory ? (
                          <Folder size={32} className="text-blue-500 flex-shrink-0" />
                        ) : (
                          <File size={32} className="text-gray-500 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{file.name}</p>
                          <p className="text-sm text-gray-500">
                            {file.isDirectory ? 'Folder' : formatFileSize(file.size)} • {formatDate(file.modified)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {!file.isDirectory && (
                          <button
                            onClick={() => handleDownload(file.path, file.name)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Download"
                          >
                            <Download size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(file.path, file.name)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

