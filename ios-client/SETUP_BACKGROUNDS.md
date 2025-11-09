# iOS App Background Setup Instructions

## Adding Background Images to Your iOS App

To make the background images work in your iOS app, follow these steps:

### Step 1: Open the Project in Xcode
1. Navigate to `/Users/vine/elco/gabriel/ios-client/`
2. Double-click `Gabriel.xcodeproj` to open it in Xcode

### Step 2: Add Images to Assets Catalog

#### Option A: Using Finder (Recommended)
1. In Xcode, open `Assets.xcassets` in the left sidebar
2. Open Finder and navigate to `/Users/vine/elco/gabriel/public/images/`
3. Drag and drop these files into the Assets.xcassets window in Xcode:
   - `iphone.jpg` (for iPhone devices)
   - `background.jpg` (for iPad devices)

#### Option B: Using Xcode Import
1. In Xcode, select `Assets.xcassets` in the left sidebar
2. Right-click in the assets list and select "Import..."
3. Navigate to `/Users/vine/elco/gabriel/public/images/`
4. Select both `iphone.jpg` and `background.jpg`
5. Click "Open"

### Step 3: Verify Image Names
Make sure the images are named exactly as follows in the Assets catalog:
- `iphone` (for iPhone background - will use iphone.jpg)
- `background` (for iPad background - will use background.jpg)

### Step 4: Set Image Properties (Important for Performance)
For each image in Assets.xcassets:
1. Select the image set
2. In the Attributes Inspector (right panel):
   - **Devices**: Set to "Universal" or specific (iPhone/iPad)
   - **Render As**: Default
   - **Resizing**: Preserve Vector Data (unchecked)
   - **Compression**: Lossy (for better performance)

### Step 5: Build and Run
1. Select your target device (iPhone or iPad simulator)
2. Press ⌘+R or click the Play button to build and run

## Device-Specific Behavior

### iPhone (iOS 26+)
- Uses `iphone.jpg` as background
- Optimized for portrait and landscape orientations
- Background adapts to all iPhone screen sizes

### iPad (iOS 15+)
- Uses `background.jpg` as background
- Optimized for landscape mode (horizontal)
- Background adapts to all iPad screen sizes

## Image Optimization Tips

For best performance:
- **iPhone background**: Recommended size 1170x2532 (iPhone 14 Pro resolution)
- **iPad background**: Recommended size 2388x1668 (iPad Pro 11" landscape)
- **Format**: JPG with 80-90% quality
- **File size**: Keep under 1-2MB each

## Troubleshooting

### Images not showing?
1. Check that image names in Assets match exactly: `iphone` and `background`
2. Clean build folder: Product → Clean Build Folder (⌘+Shift+K)
3. Rebuild the project

### Background looks stretched?
- The app uses `.aspectRatio(contentMode: .fill)` to properly scale images
- Images will fill the screen while maintaining aspect ratio
- Cropping may occur on edges for different device sizes

### Performance issues?
- Compress images using ImageOptim or similar tool
- Consider using WebP format and converting in code
- Reduce image resolution if needed

## iOS Version Compatibility

The app is built with:
- **Minimum iOS**: 15.0 (for iPad support)
- **Target iOS**: 26.0 (for iPhone with latest features)
- All features are backward compatible to iOS 15

## Code Changes Summary

The following changes were made to support device-specific backgrounds:

1. **ContentView.swift**:
   - Added `DeviceBackgroundView` component
   - Automatic device detection (iPhone vs iPad)
   - Dynamic background selection based on device type
   - Full viewport coverage with proper aspect ratio handling

2. **Performance Optimizations**:
   - Hardware-accelerated rendering
   - Efficient image loading
   - Responsive to device orientation changes
   - Memory-efficient background handling

## Testing Checklist

- [ ] Test on iPhone simulator (various models)
- [ ] Test on iPad simulator (various models)
- [ ] Test orientation changes (portrait/landscape)
- [ ] Verify background doesn't flicker on scroll
- [ ] Check memory usage with Instruments
- [ ] Test on real devices (if available)

---

**Note**: After adding the images, the app will automatically select the appropriate background based on the device type. No code changes are needed for basic usage.
