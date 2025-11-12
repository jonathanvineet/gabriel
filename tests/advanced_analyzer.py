#!/usr/bin/env python3
"""
Advanced Image Analysis with Multiple Model Options
Supports BLIP, CLIP, and other vision models
"""

import sys
import os
import argparse
from pathlib import Path

try:
    from transformers import (
        BlipProcessor, BlipForConditionalGeneration,
        CLIPProcessor, CLIPModel
    )
    from PIL import Image
    import torch
except ImportError:
    print("Installing required packages...")
    os.system("pip install transformers pillow torch torchvision")
    from transformers import (
        BlipProcessor, BlipForConditionalGeneration,
        CLIPProcessor, CLIPModel
    )
    from PIL import Image
    import torch


class AdvancedImageAnalyzer:
    def __init__(self, model_type="blip"):
        """
        Initialize the image analyzer
        
        Args:
            model_type: Type of model to use ('blip', 'clip')
        """
        self.model_type = model_type
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        if model_type == "blip":
            print("Loading BLIP model...")
            self.processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-large")
            self.model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-large")
        elif model_type == "clip":
            print("Loading CLIP model...")
            self.processor = CLIPProcessor.from_pretrained("openai/clip-vit-large-patch14")
            self.model = CLIPModel.from_pretrained("openai/clip-vit-large-patch14")
        else:
            raise ValueError(f"Unknown model type: {model_type}")
        
        self.model.to(self.device)
        print(f"Model loaded successfully on {self.device}!")
    
    def analyze_with_blip(self, image_path: str, question: str = None) -> str:
        """Analyze image using BLIP model"""
        image = Image.open(image_path).convert('RGB')
        
        if question:
            inputs = self.processor(image, question, return_tensors="pt").to(self.device)
        else:
            inputs = self.processor(image, return_tensors="pt").to(self.device)
        
        out = self.model.generate(**inputs, max_length=150, num_beams=5)
        caption = self.processor.decode(out[0], skip_special_tokens=True)
        return caption
    
    def analyze_with_clip(self, image_path: str, labels: list) -> dict:
        """
        Analyze image using CLIP model with provided labels
        
        Args:
            image_path: Path to image
            labels: List of possible labels/descriptions
        
        Returns:
            Dictionary with labels and their probabilities
        """
        image = Image.open(image_path).convert('RGB')
        
        # Prepare inputs
        inputs = self.processor(
            text=labels,
            images=image,
            return_tensors="pt",
            padding=True
        ).to(self.device)
        
        # Get predictions
        outputs = self.model(**inputs)
        logits_per_image = outputs.logits_per_image
        probs = logits_per_image.softmax(dim=1)
        
        # Create results dictionary
        results = {}
        for label, prob in zip(labels, probs[0]):
            results[label] = float(prob)
        
        # Sort by probability
        results = dict(sorted(results.items(), key=lambda x: x[1], reverse=True))
        return results
    
    def analyze(self, image_path: str, **kwargs):
        """Main analysis method"""
        try:
            if self.model_type == "blip":
                question = kwargs.get('question')
                return self.analyze_with_blip(image_path, question)
            elif self.model_type == "clip":
                labels = kwargs.get('labels', [
                    "a photo of a person",
                    "a photo of an animal",
                    "a photo of a vehicle",
                    "a photo of food",
                    "a photo of nature",
                    "a photo of a building",
                    "a photo of an object",
                    "a photo of text or document",
                    "an icon or logo",
                    "an illustration or artwork"
                ])
                return self.analyze_with_clip(image_path, labels)
        except Exception as e:
            return f"Error: {str(e)}"


def main():
    parser = argparse.ArgumentParser(description="Advanced Image Analysis Tool")
    parser.add_argument("image", help="Path to the image file")
    parser.add_argument("--model", choices=["blip", "clip"], default="blip",
                       help="Model to use (default: blip)")
    parser.add_argument("--question", help="Question about the image (BLIP only)")
    parser.add_argument("--labels", nargs="+", help="Labels for classification (CLIP only)")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.image):
        print(f"Error: Image file '{args.image}' not found!")
        sys.exit(1)
    
    # Initialize analyzer
    analyzer = AdvancedImageAnalyzer(model_type=args.model)
    
    # Analyze image
    print(f"\nAnalyzing: {args.image}")
    print("-" * 60)
    
    if args.model == "blip":
        result = analyzer.analyze(args.image, question=args.question)
        print(f"\nDescription: {result}")
    elif args.model == "clip":
        results = analyzer.analyze(args.image, labels=args.labels)
        print("\nClassification Results:")
        for label, prob in results.items():
            print(f"  {label}: {prob*100:.2f}%")
    
    print("-" * 60)


if __name__ == "__main__":
    main()
