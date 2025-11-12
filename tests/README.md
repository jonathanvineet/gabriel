# Image Analyzer - AI-Powered Photo Description

This tool uses Hugging Face's BLIP (Bootstrapping Language-Image Pre-training) model to analyze images and describe what's in them.

## Features

- **Image Captioning**: Automatically generates descriptions of what's in a photo
- **Visual Question Answering**: Ask specific questions about an image
- **GPU Acceleration**: Uses CUDA if available for faster processing
- **Easy to Use**: Simple command-line interface

## Installation

1. Install the required packages:
```bash
pip install -r requirements.txt
```

Or the script will auto-install them on first run.

## Usage

### Basic Image Description
```bash
python image_analyzer.py path/to/your/image.jpg
```

Example:
```bash
python image_analyzer.py ../public/images/app-icon.jpg
```

### Ask Questions About an Image
```bash
python image_analyzer.py path/to/image.jpg "What is in this image?"
```

Examples:
```bash
python image_analyzer.py photo.jpg "What color is the car?"
python image_analyzer.py photo.jpg "How many people are in the image?"
python image_analyzer.py photo.jpg "What is the person doing?"
```

## How It Works

The script uses the **BLIP model** from Salesforce/Hugging Face:
- Model: `Salesforce/blip-image-captioning-base`
- Capabilities: Image captioning and visual question answering
- Runs on CPU or GPU (automatically detects)

## Example Output

```bash
$ python image_analyzer.py photo.jpg

Loading BLIP model (Salesforce/blip-image-captioning-base)...
Model loaded successfully on cpu!

Analyzing image: photo.jpg
--------------------------------------------------

Result: a man standing next to a red car on a street

--------------------------------------------------
```

## Supported Image Formats

- JPG/JPEG
- PNG
- WEBP
- BMP
- GIF (first frame)

## Notes

- First run will download the model (~1GB)
- Model is cached locally for future use
- GPU recommended for faster processing
- Works offline after initial model download
