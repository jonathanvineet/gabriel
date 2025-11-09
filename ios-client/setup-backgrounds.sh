#!/bin/zsh

# Script to copy background images to iOS Assets catalog
# This automates the process of adding images to Xcode project

set -e

echo "🎨 iOS Background Image Setup Script"
echo "======================================"

# Define paths
PROJECT_ROOT="/Users/vine/elco/gabriel"
IMAGES_SOURCE="$PROJECT_ROOT/public/images"
ASSETS_DIR="$PROJECT_ROOT/ios-client/GabrielApp/Assets.xcassets"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if source images exist
echo "\n📁 Checking source images..."
if [[ ! -f "$IMAGES_SOURCE/iphone.jpg" ]]; then
    echo "${RED}❌ Error: iphone.jpg not found in $IMAGES_SOURCE${NC}"
    exit 1
fi

if [[ ! -f "$IMAGES_SOURCE/background.jpg" ]]; then
    echo "${RED}❌ Error: background.jpg not found in $IMAGES_SOURCE${NC}"
    exit 1
fi

echo "${GREEN}✅ Source images found${NC}"

# Create Assets catalog if it doesn't exist
if [[ ! -d "$ASSETS_DIR" ]]; then
    echo "\n📦 Creating Assets.xcassets directory..."
    mkdir -p "$ASSETS_DIR"
fi

# Function to create image set
create_image_set() {
    local name=$1
    local source_file=$2
    local imageset_dir="$ASSETS_DIR/${name}.imageset"
    
    echo "\n🖼️  Creating image set: $name"
    
    # Create imageset directory
    mkdir -p "$imageset_dir"
    
    # Copy image file
    cp "$source_file" "$imageset_dir/${name}.jpg"
    echo "${GREEN}✅ Copied image: ${name}.jpg${NC}"
    
    # Create Contents.json
    cat > "$imageset_dir/Contents.json" << EOF
{
  "images" : [
    {
      "filename" : "${name}.jpg",
      "idiom" : "universal",
      "scale" : "1x"
    },
    {
      "idiom" : "universal",
      "scale" : "2x"
    },
    {
      "idiom" : "universal",
      "scale" : "3x"
    }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  },
  "properties" : {
    "compression-type" : "lossy"
  }
}
EOF
    echo "${GREEN}✅ Created Contents.json${NC}"
}

# Create image sets
echo "\n🎨 Adding images to Assets catalog..."
create_image_set "iphone" "$IMAGES_SOURCE/iphone.jpg"
create_image_set "background" "$IMAGES_SOURCE/background.jpg"

# Update or create Assets catalog Contents.json
if [[ ! -f "$ASSETS_DIR/Contents.json" ]]; then
    cat > "$ASSETS_DIR/Contents.json" << EOF
{
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
EOF
    echo "${GREEN}✅ Created Assets catalog Contents.json${NC}"
fi

echo "\n${GREEN}🎉 Success! Background images have been added to the iOS project.${NC}"
echo ""
echo "📋 Next steps:"
echo "1. Open Gabriel.xcodeproj in Xcode"
echo "2. Verify images appear in Assets.xcassets"
echo "3. Build and run the app (⌘+R)"
echo ""
echo "💡 The app will automatically use:"
echo "   - iphone.jpg for iPhone devices"
echo "   - background.jpg for iPad devices"
echo ""
echo "${YELLOW}Note: If images don't appear, clean build folder in Xcode (⌘+Shift+K)${NC}"
