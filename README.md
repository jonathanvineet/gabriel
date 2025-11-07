# File Manager Application

A modern Next.js file manager application that allows you to upload, organize, and manage files and folders locally.

## Features

### 📁 File & Folder Operations
- **Upload Files**: Click "Upload File" button or drag & drop individual files
- **Upload Folders**: Click "Upload Folder" button to upload entire directories with their structure preserved
- **Create Folders**: Create new folders with custom names
- **Navigate Folders**: Browse through your directory structure with breadcrumb navigation
- **Download Files**: Download any file with a single click
- **Delete Files/Folders**: Remove files or entire folders (including all contents)
- **Automatic Compression**: Files/folders larger than 100MB are automatically compressed to save space
- **Progress Tracking**: Real-time upload progress bar with percentage

### 🎨 User Interface
- Modern, responsive design with Tailwind CSS
- Drag & drop support for both files and folders
- Visual feedback with icons and hover effects
- File size and modification date display
- Loading states and error handling
- Real-time progress bar during uploads
- Upload percentage indicator

### 💾 Local Storage
- All files stored in the `/uploads` directory
- Maintains folder structure when uploading directories
- Secure path validation to prevent directory traversal
- Smart compression for large files (>100MB) to save disk space
- Automatic decompression when downloading compressed files

## Getting Started

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Make it Public (Optional)
Use ngrok to expose your local server:
```bash
ngrok http 3000
```

## API Endpoints

- `GET /api/files?path=<path>` - List files in a directory
- `POST /api/files` - Upload file(s) with optional folder structure and automatic compression
- `DELETE /api/files` - Delete a file or folder
- `POST /api/folder` - Create a new folder
- `GET /api/download?path=<path>` - Download a file
- `GET /api/progress?id=<uploadId>` - Get upload progress status
- `POST /api/progress` - Update upload progress

## Tech Stack

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Node.js File System** - Server-side file operations
- **Archiver** - File compression (ZIP format)
- **Unzipper** - File decompression

## Security

- Path validation to prevent directory traversal attacks
- Uploads restricted to the designated uploads directory
- All files stored locally on the server
