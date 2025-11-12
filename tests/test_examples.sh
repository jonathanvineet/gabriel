#!/bin/bash
# Example test script to demonstrate image analysis

echo "=== Image Analyzer Test Examples ==="
echo ""

# Test 1: Basic image description
echo "Test 1: Analyzing app icon..."
python image_analyzer.py ../public/images/app-icon.jpg

echo ""
echo "---"
echo ""

# Test 2: Analyzing loader image
echo "Test 2: Analyzing loader image..."
python image_analyzer.py ../public/images/loader.jpg

echo ""
echo "---"
echo ""

# Test 3: Visual Question Answering
echo "Test 3: Asking a question about the image..."
python image_analyzer.py ../public/images/app-icon.jpg "What is the main object in this image?"

echo ""
echo "=== Tests Complete ==="
