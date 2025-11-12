#!/bin/bash

echo "========================================="
echo "  Image Search System Setup"
echo "========================================="
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"
echo ""

# Install Python dependencies
echo "📦 Installing Python dependencies..."
cd tests
pip3 install -r requirements.txt
cd ..

echo ""
echo "✅ Python dependencies installed"
echo ""

# Create data directory
echo "📁 Creating data directory..."
mkdir -p data

echo "✅ Data directory created"
echo ""

# Test image analyzer
echo "🧪 Testing image analyzer..."
if [ -f "public/images/app-icon.jpg" ]; then
    echo "Testing with app-icon.jpg..."
    python3 tests/image_analyzer.py public/images/app-icon.jpg
    echo ""
fi

echo "========================================="
echo "  Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Start your Next.js server: npm run dev"
echo "2. Navigate to Cloud Storage in your app"
echo "3. Click 'Scan Images' to index your photos"
echo "4. Start searching!"
echo ""
echo "For more info, see IMAGE_SEARCH_README.md"
echo ""
