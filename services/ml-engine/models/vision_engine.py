import os
import json
import pickle
import urllib.request
import numpy as np
import cv2
from PIL import Image, ImageFilter

class VisionEngine:
    def __init__(self, data_dir: str = None):
        # Lazy import heavy libraries to prevent memory OOM during FastAPI startup
        import torch
        import torchvision.transforms as T
        from ultralytics import YOLO
        import faiss

        # Limit PyTorch threads to reduce memory usage on 512MB RAM Free tier
        torch.set_num_threads(1)
        torch.set_num_interop_threads(1)
        
        if data_dir is None:
            self.data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
        else:
            self.data_dir = data_dir
        
        os.makedirs(self.data_dir, exist_ok=True)
        
        self.embeddings_path = os.path.join(self.data_dir, "embeddings.pkl")
        self.index_path = os.path.join(self.data_dir, "faiss_store.index")
        self.mapping_path = os.path.join(self.data_dir, "variant_mapping.json")
        
        # Load YOLOv8 nano model for product detection
        self.skip_yolo = os.environ.get("SKIP_YOLO", "true").lower() == "true"
        if not self.skip_yolo:
            print("Loading YOLOv8 model...")
            self.yolo_model = YOLO("yolov8n.pt")
        else:
            print("YOLOv8 is skipped (SKIP_YOLO=true). Center-crop fallback enabled.")
        
        # Load DINOv2 model from PyTorch Hub
        print("Loading DINOv2 model...")
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.dino_model = torch.hub.load("facebookresearch/dinov2", "dinov2_vits14")
        self.dino_model.to(self.device)
        self.dino_model.eval()
        
        # Force garbage collection to free up memory from loading weights
        import gc
        gc.collect()
        
        # DINOv2 VitS14 produces 384 dimensions
        self.dimension = 384
        
        # Image transformation pipeline
        self.transform = T.Compose([
            T.Resize((224, 224)),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        
        # Load local database of embeddings
        self.embeddings_db = {}
        if os.path.exists(self.embeddings_path):
            try:
                with open(self.embeddings_path, "rb") as f:
                    self.embeddings_db = pickle.load(f)
            except Exception as e:
                print(f"Error loading embeddings database: {e}")
                self.embeddings_db = {}
                
        self.variant_mapping = []
        self.index = faiss.IndexFlatIP(self.dimension) # Cosine similarity via normalized vectors
        self.rebuild_index()

    def rebuild_index(self):
        """Reconstructs the FAISS index from the local embeddings database."""
        import faiss
        self.index = faiss.IndexFlatIP(self.dimension)
        self.variant_mapping = []
        
        if not self.embeddings_db:
            # Save empty index / mapping
            if os.path.exists(self.index_path):
                try:
                    os.remove(self.index_path)
                except:
                    pass
            with open(self.mapping_path, "w") as f:
                json.dump([], f)
            return
            
        vectors = []
        for variant_id, embedding in self.embeddings_db.items():
            vectors.append(embedding)
            self.variant_mapping.append(variant_id)
            
        vectors_np = np.vstack(vectors).astype("float32")
        # Normalize vectors for Cosine Similarity (inner product of normalized vectors)
        faiss.normalize_L2(vectors_np)
        
        self.index.add(vectors_np)
        
        # Save index and mapping
        faiss.write_index(self.index, self.index_path)
        with open(self.mapping_path, "w") as f:
            json.dump(self.variant_mapping, f)

    def preprocess_image(self, pil_image: Image.Image) -> Image.Image:
        """Applies Aspect Ratio preserving Center Crop, Resize, and Gaussian Noise reduction."""
        # Preserving aspect ratio and center crop
        w, h = pil_image.size
        crop_size = min(w, h)
        left = (w - crop_size) / 2
        top = (h - crop_size) / 2
        right = (w + crop_size) / 2
        bottom = (h + crop_size) / 2
        
        cropped = pil_image.crop((left, top, right, bottom))
        # Simple Noise Reduction (Gaussian blur filter)
        smoothed = cropped.filter(ImageFilter.GaussianBlur(radius=0.5))
        return smoothed

    def detect_and_crop(self, pil_image: Image.Image) -> Image.Image:
        """Uses YOLOv8 to locate grocery products in the image and crops the best match."""
        if self.skip_yolo:
            return self.preprocess_image(pil_image)
        # Convert PIL to cv2 BGR format
        open_cv_image = np.array(pil_image)
        # Convert RGB to BGR
        if len(open_cv_image.shape) == 3:
            open_cv_image = open_cv_image[:, :, ::-1].copy()
        else:
            # Grayscale fallback
            open_cv_image = cv2.cvtColor(open_cv_image, cv2.COLOR_GRAY2BGR)
            
        results = self.yolo_model(open_cv_image, verbose=False)
        
        # Bounding box selection (highest confidence item)
        best_box = None
        best_conf = 0.0
        
        for r in results:
            boxes = r.boxes
            for box in boxes:
                # YOLO class indices: typical classes for food/bottles/cups/objects
                conf = float(box.conf[0])
                if conf > best_conf:
                    best_conf = conf
                    xyxy = box.xyxy[0].tolist()
                    best_box = [int(x) for x in xyxy]
                    
        # If no product bounding box detected, default to full image center crop
        if best_box is None:
            return self.preprocess_image(pil_image)
            
        # Crop to the detected bounding box
        x1, y1, x2, y2 = best_box
        # Buffer the box slightly
        w, h = pil_image.size
        pad_x = int((x2 - x1) * 0.05)
        pad_y = int((y2 - y1) * 0.05)
        x1 = max(0, x1 - pad_x)
        y1 = max(0, y1 - pad_y)
        x2 = min(w, x2 + pad_x)
        y2 = min(h, y2 + pad_y)
        
        cropped = pil_image.crop((x1, y1, x2, y2))
        return self.preprocess_image(cropped)

    def extract_features(self, pil_image: Image.Image) -> np.ndarray:
        """Generates DINOv2 embedding vector for the image."""
        import torch
        cropped = self.detect_and_crop(pil_image)
        tensor = self.transform(cropped).unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            embedding = self.dino_model(tensor)
            
        embedding_np = embedding.cpu().numpy()[0]
        # Normalize to unit length
        norm = np.linalg.norm(embedding_np)
        if norm > 0:
            embedding_np = embedding_np / norm
        return embedding_np

    def search(self, pil_image: Image.Image, k: int = 5):
        """Searches the nearest unit vectors using Cosine Similarity in FAISS."""
        if not self.embeddings_db or self.index.ntotal == 0:
            return []
            
        query_vector = self.extract_features(pil_image).astype("float32").reshape(1, -1)
        
        # Query FAISS
        distances, indices = self.index.search(query_vector, k)
        
        results = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx != -1 and idx < len(self.variant_mapping):
                results.append({
                    "variantId": self.variant_mapping[idx],
                    "score": float(dist) # In IndexFlatIP, distance is the dot product (cosine similarity)
                })
        return results

    def add_product(self, variant_id: str, image_source):
        """Adds or updates a product variant embedding in the FAISS store.
        image_source can be a PIL Image or an image URL string.
        """
        pil_img = None
        if isinstance(image_source, str):
            # Download image from URL
            try:
                headers = {"User-Agent": "Mozilla/5.0"}
                req = urllib.request.Request(image_source, headers=headers)
                with urllib.request.urlopen(req) as resp:
                    pil_img = Image.open(resp).convert("RGB")
            except Exception as e:
                raise Exception(f"Failed to fetch image from URL: {e}")
        else:
            pil_img = image_source.convert("RGB")
            
        embedding = self.extract_features(pil_img)
        self.embeddings_db[variant_id] = embedding
        
        # Save embeddings DB
        with open(self.embeddings_path, "wb") as f:
            pickle.dump(self.embeddings_db, f)
            
        self.rebuild_index()

    def delete_product(self, variant_id: str):
        """Deletes a product variant embedding from the FAISS store."""
        if variant_id in self.embeddings_db:
            del self.embeddings_db[variant_id]
            with open(self.embeddings_path, "wb") as f:
                pickle.dump(self.embeddings_db, f)
            self.rebuild_index()
            return True
        return False
