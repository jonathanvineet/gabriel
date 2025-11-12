# Image Analyzer - Usage Examples

## Quick Start

### 1. Install Dependencies
```bash
cd tests
pip install -r requirements.txt
```

## Basic Image Analyzer

### Simple Description
```bash
python image_analyzer.py ../public/images/app-icon.jpg
```

Output:
```
Loading BLIP model...
Model loaded successfully on cpu!

Analyzing image: ../public/images/app-icon.jpg
--------------------------------------------------

Result: a golden angel with wings on a black background

--------------------------------------------------
```

### Ask Questions
```bash
python image_analyzer.py photo.jpg "What color is the main object?"
python image_analyzer.py photo.jpg "How many people are visible?"
python image_analyzer.py photo.jpg "What is the person wearing?"
```

## Advanced Analyzer

### BLIP Model (Detailed Descriptions)
```bash
# Basic description
python advanced_analyzer.py ../public/images/loader.jpg --model blip

# With question
python advanced_analyzer.py photo.jpg --model blip --question "What is happening in this image?"
```

### CLIP Model (Classification)
```bash
# Default categories
python advanced_analyzer.py photo.jpg --model clip

# Custom categories
python advanced_analyzer.py photo.jpg --model clip --labels "a car" "a person" "a building" "nature"
```

Output example:
```
Classification Results:
  a golden angel icon: 87.34%
  an illustration or artwork: 8.21%
  an icon or logo: 3.45%
  a photo of an object: 1.00%
```

## Real-World Examples

### Analyze App Assets
```bash
# Check what's in your app icon
python image_analyzer.py ../public/images/app-icon.jpg

# Analyze loader screens
python image_analyzer.py ../public/images/loader.jpg
python image_analyzer.py ../public/images/loader-ipad.jpg
```

### Batch Analysis
```bash
# Analyze all images in a folder
for img in ../public/images/*.jpg; do
    echo "Analyzing: $img"
    python image_analyzer.py "$img"
    echo "---"
done
```

### Visual Question Answering
```bash
# Ask specific questions
python image_analyzer.py photo.jpg "Is this taken indoors or outdoors?"
python image_analyzer.py photo.jpg "What time of day is it?"
python image_analyzer.py photo.jpg "What is the mood of this image?"
```

### Content Moderation
```bash
# Check image content
python advanced_analyzer.py photo.jpg --model clip \
  --labels "safe content" "inappropriate content" "violence" "adult content"
```

### Object Detection
```bash
# Identify specific objects
python advanced_analyzer.py photo.jpg --model clip \
  --labels "a dog" "a cat" "a bird" "a car" "a bicycle" "a person"
```

## Tips

1. **First Run**: The first time you run the script, it will download the model (~1-2GB). This is cached for future use.

2. **GPU Acceleration**: If you have a CUDA-compatible GPU, the script will automatically use it for faster processing.

3. **Image Formats**: Supports JPG, PNG, WEBP, BMP, and GIF (first frame).

4. **Model Selection**:
   - Use **BLIP** for detailed natural language descriptions
   - Use **CLIP** for classification and matching against specific labels

5. **Question Tips** (BLIP):
   - Be specific: "What color is the car?" vs "What's in the image?"
   - Ask one thing at a time
   - Use simple, clear language

6. **Label Tips** (CLIP):
   - Provide 3-10 labels for best results
   - Use descriptive phrases: "a photo of X" works better than just "X"
   - More specific labels give more accurate results

## Troubleshooting

### Out of Memory
If you get memory errors, try:
```bash
# Use smaller model
python image_analyzer.py photo.jpg  # Uses base model
```

### Slow Processing
- First run downloads the model (one-time)
- CPU processing is slower than GPU
- Larger images take longer

### Installation Issues
```bash
# Install with specific versions
pip install torch==2.0.0 torchvision==0.15.0
pip install transformers==4.30.0 pillow==10.0.0
```

## Model Information

### BLIP (Bootstrapping Language-Image Pre-training)
- **Purpose**: Image captioning and VQA
- **Size**: ~500MB (base), ~1.5GB (large)
- **Best for**: Natural language descriptions

### CLIP (Contrastive Language-Image Pre-training)
- **Purpose**: Image-text matching
- **Size**: ~1GB
- **Best for**: Classification, content matching

## API Usage (Python)

```python
from image_analyzer import ImageAnalyzer

# Initialize
analyzer = ImageAnalyzer()

# Analyze image
result = analyzer.analyze_image("photo.jpg")
print(result)

# Ask question
result = analyzer.analyze_image("photo.jpg", "What color is the car?")
print(result)
```

## Integration Examples

### Use in Your App
```python
import sys
sys.path.append('tests')
from image_analyzer import ImageAnalyzer

analyzer = ImageAnalyzer()
description = analyzer.analyze_image('user_upload.jpg')
```

### REST API Wrapper
```python
from flask import Flask, request
from image_analyzer import ImageAnalyzer

app = Flask(__name__)
analyzer = ImageAnalyzer()

@app.route('/analyze', methods=['POST'])
def analyze():
    file = request.files['image']
    file.save('temp.jpg')
    result = analyzer.analyze_image('temp.jpg')
    return {'description': result}
```
