import os
from dotenv import load_dotenv

# Find project root (2 levels up from services/ml-engine/main.py)
root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
env_local_path = os.path.join(root_dir, ".env.local")
env_path = os.path.join(root_dir, ".env")

if os.path.exists(env_local_path):
    load_dotenv(env_local_path)
elif os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import numpy as np

# Load existing models
from models.forecasting import DemandForecaster as LegacyDemandForecaster
from models.pricing import DynamicPriceOptimizer
from models.segmentation import CustomerSegmenter
from models.recommendation import RecommendationEngine as LegacyRecEngine
from routes.vision_router import router as vision_router

# Load new modular models
from models.recommendation_models import PersonalizedRecommender, SimilarProductsRecommender, ProductRanker, SearchRanker, CouponRecommender
from models.nlp_models import SearchIntentClassifier, SmartAutocompleteModel, ProductEmbedder, ReviewSentimentClassifier, FaqMatcher, VectorSearchEngine
from models.operational_models import InventoryOptimizer, DemandForecaster, EtaPredictor, DeliveryOptimizer

app = FastAPI(
  title="Snapcart ML Operating Engine",
  description="High-performance machine learning inference and training suite.",
  version="2.0"
)

app.include_router(vision_router)

# Instantiate models
forecaster = DemandForecaster()
legacy_forecaster = LegacyDemandForecaster()
optimizer = DynamicPriceOptimizer()
segmenter = CustomerSegmenter()
legacy_recommender = LegacyRecEngine()

personalized_rec = PersonalizedRecommender()
similar_products_rec = SimilarProductsRecommender()
product_ranker = ProductRanker()
search_ranker = SearchRanker()
coupon_rec = CouponRecommender()

intent_classifier = SearchIntentClassifier()
autocomplete_model = SmartAutocompleteModel()
product_embedder = ProductEmbedder()
sentiment_classifier = ReviewSentimentClassifier()
faq_matcher = FaqMatcher()
vector_search_engine = VectorSearchEngine(384)

inventory_optimizer = InventoryOptimizer()
eta_predictor = EtaPredictor()
delivery_optimizer = DeliveryOptimizer()

# Seed autocomplete with common grocery queries for instant utility
autocomplete_model.train([
  "milk", "eggs", "bread", "atta", "mustard oil", "amul butter", "apple", "banana", "onion", "potato",
  "fortune refined oil", "aashirvaad premium atta", "maggi noodles", "lays potato chips", "parle-g biscuits",
  "surf excel wash powder", "tide detergent bar", "dettol handwash", "colgate toothpaste", "lux soap"
])

model_registry: Dict[str, Any] = {
  "personalized_recommender": personalized_rec,
  "similar_products": similar_products_rec,
  "product_ranker": product_ranker,
  "search_ranker": search_ranker,
  "coupon_recommender": coupon_rec,
  "search_intent": intent_classifier,
  "autocomplete": autocomplete_model,
  "product_embedder": product_embedder,
  "review_sentiment": sentiment_classifier,
  "faq_matcher": faq_matcher,
  "vector_search": vector_search_engine,
  "inventory_optimizer": inventory_optimizer,
  "demand_forecaster": forecaster,
  "eta_predictor": eta_predictor,
  "delivery_optimization": delivery_optimizer,
}

# --- Request/Response Models ---
class DemandRequest(BaseModel):
  day_of_week: int
  is_holiday: bool
  lag_7_sales: float
  temperature: float
  discount_rate: float

class PricingRequest(BaseModel):
  base_price: float
  stock: int
  demand_surge: float
  weather_multiplier: float
  competitor_price: Optional[float] = None

class SegmentRequest(BaseModel):
  inactive_days: int
  return_rate: float
  avg_spend: float
  purchase_freq_monthly: float

class RecsRequest(BaseModel):
  userId: str
  userHistory: List[str]
  currentSessionBasket: List[str]

# New NLP Requests
class IntentRequest(BaseModel):
  text: str

class AutocompleteRequest(BaseModel):
  prefix: str
  limit: Optional[int] = 5

class SentimentRequest(BaseModel):
  text: str

class FaqRequest(BaseModel):
  text: str

# New Recs/Ranking Requests
class SimilarRequest(BaseModel):
  query_embedding: List[float]
  item_ids: List[str]
  k: Optional[int] = 5

class ProductRankingRequest(BaseModel):
  products: List[Dict[str, Any]]

class SearchRankingRequest(BaseModel):
  candidates: List[Dict[str, Any]]
  query: str

class CouponRecRequest(BaseModel):
  user_features: Dict[str, Any]
  coupons: List[Dict[str, Any]]

# Operational Requests
class InventoryRequest(BaseModel):
  features: List[List[float]]

class EtaRequest(BaseModel):
  features: List[List[float]]

class DeliveryOptRequest(BaseModel):
  points: List[Dict[str, Any]]

# --- Inference Endpoints ---

@app.post("/predict/intent")
def detect_intent(payload: IntentRequest):
  intent = intent_classifier.predict(payload.text)
  return {"intent": intent}

@app.post("/predict/autocomplete")
def suggest_autocomplete(payload: AutocompleteRequest):
  suggestions = autocomplete_model.predict(payload.prefix, limit=payload.limit)
  return {"suggestions": suggestions}

@app.post("/predict/sentiment")
def analyze_sentiment(payload: SentimentRequest):
  sentiment = sentiment_classifier.predict(payload.text)
  return {"sentiment": sentiment}

@app.post("/predict/faq")
def retrieve_faq(payload: FaqRequest):
  res = faq_matcher.predict(payload.text)
  return res

@app.post("/predict/recommend/similar")
def get_similar_products(payload: SimilarRequest):
  recs = similar_products_rec.predict(np.array(payload.query_embedding), payload.item_ids, k=payload.k)
  return {"recommendations": recs}

@app.post("/predict/product/ranking")
def rank_products(payload: ProductRankingRequest):
  ranked = product_ranker.predict(payload.products)
  return {"ranked_products": ranked}

@app.post("/predict/search/ranking")
def rank_search_results(payload: SearchRankingRequest):
  ranked = search_ranker.predict(payload.candidates, payload.query)
  return {"ranked_results": ranked}

@app.post("/predict/coupon")
def recommend_coupons(payload: CouponRecRequest):
  recs = coupon_rec.predict(payload.user_features, payload.coupons)
  return {"recommended_coupons": recs}

@app.post("/predict/inventory")
def predict_inventory(payload: InventoryRequest):
  feats = np.array(payload.features)
  preds = inventory_optimizer.predict(feats)
  return {"safety_stock": preds.tolist()}

@app.post("/predict/eta")
def predict_eta(payload: EtaRequest):
  feats = np.array(payload.features)
  eta = eta_predictor.predict(feats)
  return {"predicted_eta": eta}

@app.post("/predict/delivery/optimization")
def optimize_delivery(payload: DeliveryOptRequest):
  optimized = delivery_optimizer.predict(payload.points)
  return {"optimized_route": optimized}

# Legacy Endpoints Compatibility
@app.post("/predict/demand")
def predict_demand(payload: DemandRequest):
  features = np.array([[
    payload.day_of_week,
    float(payload.is_holiday),
    payload.lag_7_sales,
    payload.temperature,
    payload.discount_rate
  ]])
  pred = forecaster.predict(features)
  return {"predicted_demand": float(pred[0])}

@app.post("/predict/pricing")
def calculate_dynamic_price(payload: PricingRequest):
  price = optimizer.calculate_price(
    base_price=payload.base_price,
    stock=payload.stock,
    demand_surge=payload.demand_surge,
    weather_multiplier=payload.weather_multiplier,
    competitor_price=payload.competitor_price
  )
  return {"dynamic_price": price}

@app.post("/predict/segment")
def analyze_customer(payload: SegmentRequest):
  churn_risk = segmenter.predict_churn_risk(payload.inactive_days, payload.return_rate)
  clv = segmenter.predict_clv(payload.avg_spend, payload.purchase_freq_monthly)
  return {
    "churn_risk": churn_risk,
    "predicted_clv": clv,
    "customer_segment": "premium" if clv > 500 else ("medium" if clv > 150 else "budget")
  }

# Mock user-item recommendations matrix data
USER_ITEM_MATRIX = {
  "user1": ["v1", "v2", "v3"],
  "user2": ["v2", "v4"],
  "user3": ["v1", "v3", "v5"]
}

ITEM_AFFINITIES = {
  "v1": {"v2": 0.8, "v3": 0.6},
  "v2": {"v1": 0.8, "v4": 0.5},
  "v3": {"v1": 0.6, "v5": 0.7}
}

@app.post("/recommend")
def get_recommendations(payload: RecsRequest):
  # Legacy recommender logic
  collaborative = legacy_recommender.get_collaborative_recs(payload.userHistory, USER_ITEM_MATRIX)
  session = legacy_recommender.get_session_recs(payload.currentSessionBasket, ITEM_AFFINITIES)
  return {
    "collaborative_recommendations": collaborative,
    "session_recommendations": session
  }

# --- Training & Monitoring ---

@app.post("/train/{model_name}")
def train_model(model_name: str, payload: Dict[str, Any]):
  if model_name not in model_registry:
    raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found.")
  
  model = model_registry[model_name]
  try:
    # Convert payload dictionary to numpy arrays if appropriate
    X = np.array(payload.get("X", []))
    y = np.array(payload.get("y", [])) if "y" in payload else None
    
    # NLP models take raw text lists
    if model_name in ["search_intent", "autocomplete", "review_sentiment", "faq_matcher"]:
      X = payload.get("X", [])
      y = payload.get("y")
      
    metrics = model.retrain(X, y)
    return {"success": True, "model_name": model_name, "metrics": metrics}
  except Exception as e:
    raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")

@app.get("/monitor/{model_name}")
def monitor_model(model_name: str):
  if model_name not in model_registry:
    raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found.")
  return model_registry[model_name].monitor()

@app.get("/monitor/all")
def monitor_all():
  states = {}
  for name, model in model_registry.items():
    states[name] = model.monitor()
  return {"models": states}

@app.get("/health")
def health_check():
  return {
    "status": "healthy",
    "engine": "Snapcart ML Engine 2.0",
    "models_loaded": len(model_registry)
  }

if __name__ == "__main__":
  import uvicorn
  host = os.getenv("ML_ENGINE_HOST", os.getenv("HOST", "127.0.0.1"))
  port = int(os.getenv("ML_ENGINE_PORT", os.getenv("PORT", "8000")))
  reload_val = os.getenv("ML_ENGINE_RELOAD", "True").lower() == "true"
  uvicorn.run("main:app", host=host, port=port, reload=reload_val)
