#!/usr/bin/env python3
"""
Image Analysis using Hugging Face Vision Models
This script analyzes images and describes what's in them using AI models.
"""

import sys
import os
from pathlib import Path

try:
    from transformers import BlipProcessor, BlipForConditionalGeneration
    from PIL import Image
    import torch
except ImportError:
    print("Installing required packages...")
    os.system("pip install transformers pillow torch torchvision")
    from transformers import BlipProcessor, BlipForConditionalGeneration
    from PIL import Image
    import torch


class ImageAnalyzer:
    def __init__(self):
        """Initialize the image analyzer with BLIP model from Hugging Face"""
        print("Loading BLIP model (Salesforce/blip-image-captioning-base)...")
        self.processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
        self.model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")
        
        # Use GPU if available
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model.to(self.device)
        print(f"Model loaded successfully on {self.device}!")
    
    def analyze_image(self, image_path: str, question: str = None) -> str:
        """
        Analyze an image and return a description
        
        Args:
            image_path: Path to the image file
            question: Optional question about the image (for VQA)
        
        Returns:
            Description of what's in the image
        """
        try:
            # Load and process image
            image = Image.open(image_path).convert('RGB')
            
            if question:
                # Visual Question Answering
                inputs = self.processor(image, question, return_tensors="pt").to(self.device)
                out = self.model.generate(**inputs, max_length=100)
            else:
                # Image Captioning
                inputs = self.processor(image, return_tensors="pt").to(self.device)
                out = self.model.generate(**inputs, max_length=100)
            
            # Decode the output
            caption = self.processor.decode(out[0], skip_special_tokens=True)
            return caption
            
        except FileNotFoundError:
            return f"Error: Image file not found at {image_path}"
        except Exception as e:
            return f"Error analyzing image: {str(e)}"


def main():
    """Main function to run the image analyzer"""
    if len(sys.argv) < 2:
        print("Usage: python image_analyzer.py <image_path> [question]")
        print("\nExamples:")
        print("  python image_analyzer.py photo.jpg")
        print("  python image_analyzer.py photo.jpg 'What color is the car?'")
        sys.exit(1)
    
    image_path = sys.argv[1]
    question = sys.argv[2] if len(sys.argv) > 2 else None
    
    # Check if image exists
    if not os.path.exists(image_path):
        print(f"Error: Image file '{image_path}' not found!")
        sys.exit(1)
    
    # Initialize analyzer
    analyzer = ImageAnalyzer()
    
    # Analyze image
    print(f"\nAnalyzing image: {image_path}")
    if question:
        print(f"Question: {question}")
    print("-" * 50)
    
    result = analyzer.analyze_image(image_path, question)
    print(f"\nResult: {result}")
    print("-" * 50)


if __name__ == "__main__":
    main()
