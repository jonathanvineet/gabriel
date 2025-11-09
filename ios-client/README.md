# Gabriel iOS Client - Device-Optimized Edition

This folder contains a native SwiftUI iOS client for Gabriel that is optimized for both iPhone (iOS 26+) and iPad (iOS 15+) with device-specific backgrounds and responsive layouts.

## 🎨 Device-Specific Features

### iPhone (iOS 26+)
- **Background**: Uses `iphone.jpg` 
- **Orientations**: Portrait (primary), Landscape (supported)
- **Optimized for**: Single-hand usage, portrait-first design

### iPad (iOS 15+)
- **Background**: Uses `background.jpg`
- **Orientations**: All orientations (Portrait, Landscape, Split View)
- **Optimized for**: Landscape mode, multitasking, larger displays

## 🚀 Quick Start

### 1. Setup Background Images
Run the automated setup script:
```bash
cd /Users/vine/elco/gabriel/ios-client
./setup-backgrounds.sh
```

This will copy `iphone.jpg` and `background.jpg` from `public/images/` to the Assets catalog.

### 2. Configure Server Connection
Set the `SERVER_BASE_URL` in `FileManagerClient.swift` to your server's base URL:
```swift
let SERVER_BASE_URL = "http://192.168.1.100:3000"  // Your server IP
```

### 3. Build and Run
1. Open `Gabriel.xcodeproj` in Xcode
2. Select your target device (iPhone or iPad simulator)
3. Press ⌘+R to build and run

## 📱 What's New

### Device Detection
The app automatically detects device type and loads appropriate backgrounds:
- iPhone → `iphone.jpg`
- iPad → `background.jpg`

### Performance Optimizations
- Hardware-accelerated rendering
- Efficient image caching
- No flickering on scroll
- Smooth orientation transitions
- Proper viewport handling

### Responsive Layout
- Adaptive grid layouts
- Device-specific spacing
- Orientation-aware UI
- Safe area handling

## 📖 Documentation

- **SETUP_BACKGROUNDS.md**: Detailed image setup instructions
- **DeviceOptimization.swift**: Helper utilities for responsive layouts
- **ContentView.swift**: Main UI with device-specific background handling

## 🔧 Configuration
- Set the `SERVER_BASE_URL` in `FileManagerClient.swift` to your server's base URL (including port). For example:
  let SERVER_BASE_URL = "http://192.168.1.100:3000"

Notes
- CORS: the repository's `next.config.ts` has been updated to allow CORS for `/api` during development so the mobile app can talk to it. In production, restrict origins.
- The example uses URLSession multipart form-data uploads. It demonstrates progress and basic error handling.
- On-device file/folder uploads (preserving folder structure) require picking files with directory info; iOS's UIDocumentPicker can provide file URLs. See the example usage in `ContentView.swift`.

Security & Production
- This example is for development and demo use. Add authentication, TLS, and server-side rate limiting before exposing any real data.

Files
- `FileManagerClient.swift` — network client and upload/download helpers
- `Models.swift` — data models used by the client
- `ContentView.swift` — sample SwiftUI view demonstrating listing, uploading and downloading
