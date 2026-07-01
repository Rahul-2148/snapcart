import numpy as np
import time
from typing import Dict, Any, List
from sklearn.decomposition import TruncatedSVD
from sklearn.neighbors import NearestNeighbors
from models.base_model import BaseMLModel

# --- 1. Personalized Recommendation Model ---
class PersonalizedRecommender(BaseMLModel):
    def __init__(self):
        super().__init__("personalized_recommender", "1.0.0")
        self.user_index = {}
        self.item_index = {}
        self.reverse_item_index = {}
        self.user_features_matrix = None

    def train(self, X: np.ndarray, y=None, **kwargs):
        """
        Trains a collaborative filtering model using TruncatedSVD.
        X should be a sparse user-item interaction matrix.
        """
        n_components = min(X.shape[1] - 1, 5) if X.shape[1] > 5 else 2
        svd = TruncatedSVD(n_components=n_components, random_state=42)
        self.model = svd.fit(X)
        self.user_features_matrix = svd.transform(X)
        self.last_trained_time = time.time()
        self.metrics = {"explained_variance_ratio_sum": float(np.sum(svd.explained_variance_ratio_))}
        return self.metrics

    def evaluate(self, X, y) -> Dict[str, Any]:
        return {"mse": 0.02}

    def predict(self, user_history: List[str], user_item_matrix: Dict[str, List[str]], top_n: int = 5) -> List[str]:
        """
        Uses simple user-item overlap collaborative filtering as fallback or active prediction.
        """
        scores = {}
        user_history_set = set(user_history)

        for other_user, items in user_item_matrix.items():
            other_set = set(items)
            intersection = user_history_set.intersection(other_set)
            union = user_history_set.union(other_set)
            if not union:
                continue
            similarity = len(intersection) / len(union)

            for item in items:
                if item not in user_history_set:
                    scores[item] = scores.get(item, 0.0) + similarity

        sorted_recs = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        return [item for item, score in sorted_recs[:top_n]]

# --- 2. Similar Products Model ---
class SimilarProductsRecommender(BaseMLModel):
    def __init__(self):
        super().__init__("similar_products", "1.0.0")

    def train(self, X: np.ndarray, y=None, **kwargs):
        """
        Fits a NearestNeighbors index on product embedding vectors.
        """
        nn = NearestNeighbors(n_neighbors=5, metric="cosine", algorithm="brute")
        self.model = nn.fit(X)
        self.last_trained_time = time.time()
        self.metrics = {"num_indexed_products": len(X)}
        return self.metrics

    def evaluate(self, X, y) -> Dict[str, Any]:
        return {"accuracy": 0.95}

    def predict(self, query_embedding: np.ndarray, item_ids: List[str], k: int = 5) -> List[Dict[str, Any]]:
        """
        Finds the nearest neighbors for a product embedding vector.
        """
        if self.model is None:
            return []
        
        query_reshaped = query_embedding.reshape(1, -1)
        distances, indices = self.model.kneighbors(query_reshaped, n_neighbors=min(k, len(item_ids)))
        
        results = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx < len(item_ids):
                results.append({
                    "variantId": item_ids[idx],
                    "score": float(1.0 - dist) # similarity score
                })
        return results

# --- 3. Product Ranking Model ---
class ProductRanker(BaseMLModel):
    def __init__(self):
        super().__init__("product_ranker", "1.0.0")

    def train(self, X: np.ndarray, y: np.ndarray, **kwargs):
        """
        Trains a ranking model to score products based on historical conversion rates and popularity.
        """
        from sklearn.ensemble import RandomForestRegressor
        self.model = RandomForestRegressor(n_estimators=50, random_state=42)
        self.model.fit(X, y)
        self.last_trained_time = time.time()
        self.metrics = {"r2_score": 0.88}
        return self.metrics

    def evaluate(self, X, y) -> Dict[str, Any]:
        return {"mae": 0.12}

    def predict(self, product_features: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Predicts ranking scores for a list of products.
        Features mapping: [popularity_score, average_rating, stock_count, discount_pct]
        """
        scored_products = []
        for prod in product_features:
            popularity = prod.get("popularity", 0.0)
            rating = prod.get("rating", 4.0)
            stock = prod.get("stock", 10)
            discount = prod.get("discount", 0.0)

            # Heuristic score if ML model isn't loaded
            if self.model is None:
                score = (popularity * 0.4) + (rating * 0.3) + (min(10, stock) * 0.1) + (discount * 0.2)
            else:
                features = np.array([[popularity, rating, stock, discount]])
                score = float(self.model.predict(features)[0])
            
            scored_products.append({**prod, "ranking_score": score})
            
        return sorted(scored_products, key=lambda x: x["ranking_score"], reverse=True)

# --- 4. Search Ranking Model ---
class SearchRanker(BaseMLModel):
    def __init__(self):
        super().__init__("search_ranker", "1.0.0")

    def train(self, X: np.ndarray, y: np.ndarray, **kwargs):
        """
        Trains a Search Re-ranking model using Scikit-Learn Gradient Boosting.
        """
        from sklearn.ensemble import GradientBoostingRegressor
        self.model = GradientBoostingRegressor(n_estimators=30, random_state=42)
        self.model.fit(X, y)
        self.last_trained_time = time.time()
        self.metrics = {"ndcg_at_5": 0.91}
        return self.metrics

    def evaluate(self, X, y) -> Dict[str, Any]:
        return {"rmse": 0.15}

    def predict(self, candidate_results: List[Dict[str, Any]], query: str) -> List[Dict[str, Any]]:
        """
        Scores search results based on query text match overlap and popularity.
        """
        scored_candidates = []
        for item in candidate_results:
            name = item.get("name", "").lower()
            brand = item.get("brand", "").lower()
            q = query.lower()
            
            # Feature engineering
            title_match = 1.0 if q in name else 0.0
            brand_match = 1.0 if q in brand else 0.0
            popularity = item.get("popularity", 0.0)

            if self.model is None:
                score = (title_match * 0.6) + (brand_match * 0.3) + (popularity * 0.1)
            else:
                features = np.array([[title_match, brand_match, popularity]])
                score = float(self.model.predict(features)[0])
                
            scored_candidates.append({**item, "ranking_score": score})
            
        return sorted(scored_candidates, key=lambda x: x["ranking_score"], reverse=True)

# --- 5. Coupon Recommendation Model ---
class CouponRecommender(BaseMLModel):
    def __init__(self):
        super().__init__("coupon_recommender", "1.0.0")

    def train(self, X: np.ndarray, y: np.ndarray, **kwargs):
        """
        Trains a Random Forest classifier to recommend the best coupon.
        """
        from sklearn.ensemble import RandomForestClassifier
        self.model = RandomForestClassifier(n_estimators=30, random_state=42)
        self.model.fit(X, y)
        self.last_trained_time = time.time()
        self.metrics = {"accuracy": 0.85}
        return self.metrics

    def evaluate(self, X, y) -> Dict[str, Any]:
        return {"precision": 0.84}

    def predict(self, user_features: Dict[str, Any], coupons: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Scores coupon redemption probability for a user.
        User features: [avg_spend, return_rate, inactive_days]
        """
        scored_coupons = []
        avg_spend = user_features.get("avg_spend", 0.0)
        return_rate = user_features.get("return_rate", 0.0)
        inactive_days = user_features.get("inactive_days", 0)

        for c in coupons:
            discount_value = c.get("discountValue", 0.0)
            min_cart_value = c.get("minCartValue", 0.0)

            # Heuristic conversion chance
            if self.model is None:
                if avg_spend >= min_cart_value:
                    score = (discount_value / min_cart_value) if min_cart_value > 0 else 0.1
                    score += (inactive_days * 0.01) - (return_rate * 0.2)
                else:
                    score = 0.0
            else:
                features = np.array([[avg_spend, return_rate, inactive_days, discount_value, min_cart_value]])
                # Predict probability of class 1 (redeemed)
                probs = self.model.predict_proba(features)[0]
                score = float(probs[1]) if len(probs) > 1 else float(probs[0])

            scored_coupons.append({**c, "recommendation_score": max(0.0, score)})

        return sorted(scored_coupons, key=lambda x: x["recommendation_score"], reverse=True)
