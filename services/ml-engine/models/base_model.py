import os
import joblib
import json
import time
from typing import Dict, Any, Optional

class BaseMLModel:
    def __init__(self, model_name: str, version: str = "1.0.0"):
        self.model_name = model_name
        self.version = version
        self.metrics: Dict[str, Any] = {}
        self.last_trained_time: float = 0.0
        self.model: Any = None
        self.data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "models")
        os.makedirs(self.data_dir, exist_ok=True)

    def train(self, X, y=None, **kwargs):
        """Trains the core model and updates metrics/timestamps."""
        raise NotImplementedError("Subclasses must implement train()")

    def evaluate(self, X, y) -> Dict[str, Any]:
        """Evaluates the model and returns performance metrics."""
        raise NotImplementedError("Subclasses must implement evaluate()")

    def predict(self, X, **kwargs):
        """Infers predictions for given input features."""
        raise NotImplementedError("Subclasses must implement predict()")

    def retrain(self, X, y=None, **kwargs):
        """Retrains the model and saves the updated state."""
        print(f"[ML Suite] Retraining model: {self.model_name}...")
        res = self.train(X, y, **kwargs)
        self.save()
        return res

    def save(self):
        """Serializes model artifacts and metadata for versioning."""
        model_path = os.path.join(self.data_dir, f"{self.model_name}_v{self.version}.pkl")
        meta_path = os.path.join(self.data_dir, f"{self.model_name}_v{self.version}_meta.json")
        
        if self.model is not None:
            joblib.dump(self.model, model_path)
            
        metadata = {
            "model_name": self.model_name,
            "version": self.version,
            "metrics": self.metrics,
            "last_trained_time": self.last_trained_time
        }
        with open(meta_path, "w") as f:
            json.dump(metadata, f, indent=2)
        print(f"[ML Suite] Saved model artifact to {model_path}")

    def load(self) -> bool:
        """Loads serialized model and metadata."""
        model_path = os.path.join(self.data_dir, f"{self.model_name}_v{self.version}.pkl")
        meta_path = os.path.join(self.data_dir, f"{self.model_name}_v{self.version}_meta.json")
        
        loaded = False
        if os.path.exists(model_path):
            try:
                self.model = joblib.load(model_path)
                loaded = True
            except Exception as e:
                print(f"[ML Suite] Failed to load model pkl for {self.model_name}: {e}")
                
        if os.path.exists(meta_path):
            try:
                with open(meta_path, "r") as f:
                    metadata = json.load(f)
                    self.version = metadata.get("version", self.version)
                    self.metrics = metadata.get("metrics", {})
                    self.last_trained_time = metadata.get("last_trained_time", 0.0)
            except Exception as e:
                print(f"[ML Suite] Failed to load metadata for {self.model_name}: {e}")
                
        if loaded:
            print(f"[ML Suite] Loaded model {self.model_name} version {self.version}")
        return loaded

    def monitor(self) -> Dict[str, Any]:
        """Returns health indicators and evaluation logs."""
        return {
            "model_name": self.model_name,
            "version": self.version,
            "metrics": self.metrics,
            "last_trained_time": self.last_trained_time,
            "status": "healthy" if self.model is not None else "untrained"
        }
