import numpy as np
from sklearn.cluster import KMeans

class CustomerSegmenter:
  def __init__(self, n_clusters: int = 3):
    self.kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init="auto")

  def fit_predict(self, user_features: np.ndarray) -> np.ndarray:
    """
    Groups customers based on [frequency_days, avg_spend, return_rate].
    Returns cluster labels.
    """
    return self.kmeans.fit_predict(user_features)

  def predict_churn_risk(self, inactive_days: int, return_rate: float) -> float:
    """
    Simple logistic model regression proxy to evaluate customer churn risk.
    """
    # Score calculation mapping
    score = (inactive_days * 0.05) + (return_rate * 2.0)
    probability = 1.0 / (1.0 + np.exp(-score))
    return float(round(probability, 3))

  def predict_clv(self, avg_order_value: float, purchase_freq_monthly: float, lifespan_months: int = 12) -> float:
    """
    Predicts Customer Lifetime Value (CLV).
    """
    margin = 0.15 # Assuming standard 15% quick-commerce margins
    return float(round(avg_order_value * purchase_freq_monthly * lifespan_months * margin, 2))
