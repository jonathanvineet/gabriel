#!/usr/bin/env python3
"""
Enhanced Image Analysis with OCR (Text Extraction)
Analyzes images and extracts text from them
"""

import sys
import os
from pathlib import Path

try:
    from transformers import BlipProcessor, BlipForConditionalGeneration, TrOCRProcessor, VisionEncoderDecoderModel
    from PIL import Image
    import torch
    import pytesseract
except ImportError:
    print("Installing required packages...")
    os.system("pip install transformers pillow torch torchvision pytesseract")
    from transformers import BlipProcessor, BlipForConditionalGeneration
    from PIL import Image
    import torch
    try:
        import pytesseract
    except:
        print("Note: pytesseract requires tesseract-ocr to be installed on your system")
        print("Install with: brew install tesseract (Mac) or apt-get install tesseract-ocr (Linux)")


class EnhancedImageAnalyzer:
    def __init__(self):
        """Initialize the image analyzer with BLIP model and OCR"""
        print("Loading BLIP model...")
        self.processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
        self.model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")
        
        # Use GPU if available
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model.to(self.device)
        print(f"Model loaded on {self.device}!")
    
    def extract_text_ocr(self, image_path: str) -> str:
        """Extract text from image using OCR"""
        try:
            image = Image.open(image_path)
            text = pytesseract.image_to_string(image)
            # Clean up the text
            text = ' '.join(text.split())  # Remove extra whitespace
            return text.strip()
        except Exception as e:
            print(f"OCR error: {e}")
            return ""
    
    def analyze_image(self, image_path: str) -> dict:
        """
        Analyze an image and return description + extracted text
        
        Returns:
            dict with 'description' and 'text' keys
        """
        try:
            # Load and process image
            image = Image.open(image_path).convert('RGB')
            
            # Get AI description
            inputs = self.processor(image, return_tensors="pt").to(self.device)
            out = self.model.generate(**inputs, max_length=100)
            description = self.processor.decode(out[0], skip_special_tokens=True)
            
            # Extract text with OCR
            extracted_text = self.extract_text_ocr(image_path)
            
            # Combine description and text
            combined = description
            if extracted_text:
                combined = f"{description}. Text in image: {extracted_text}"
            
            return {
                'description': description,
                'text': extracted_text,
                'combined': combined
            }
            
        except FileNotFoundError:
            return {
                'description': f"Error: Image file not found at {image_path}",
                'text': '',
                'combined': f"Error: Image file not found at {image_path}"
            }
        except Exception as e:
            return {
                'description': f"Error analyzing image: {str(e)}",
                'text': '',
                'combined': f"Error analyzing image: {str(e)}"
            }


def main():
    """Main function to run the enhanced image analyzer"""
    if len(sys.argv) < 2:
        print("Usage: python image_analyzer_with_ocr.py <image_path>")
        print("\nExample:")
        print("  python image_analyzer_with_ocr.py photo.jpg")
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    # Check if image exists
    if not os.path.exists(image_path):
        print(f"Error: Image file '{image_path}' not found!")
        sys.exit(1)
    
    # Initialize analyzer
    analyzer = EnhancedImageAnalyzer()
    
    # Analyze image
    print(f"\nAnalyzing image: {image_path}")
    print("-" * 50)
    
    result = analyzer.analyze_image(image_path)
    
    print(f"\nDescription: {result['description']}")
    if result['text']:
        print(f"\nExtracted Text: {result['text']}")
    print(f"\nResult: {result['combined']}")
    print("-" * 50)


if __name__ == "__main__":
    main()
