import numpy as np
import xgboost as xgb

class DemandForecaster:
  def __init__(self):
    # In production, load actual model from a path: e.g. xgb.Booster()
    self.model = None

  def train(self, X_train: np.ndarray, y_train: np.ndarray):
    """
    Trains the XGBoost regressor model for inventory demand forecasting.
    """
    dtrain = xgb.DMatrix(X_train, label=y_train)
    params = {
      'max_depth': 6,
      'eta': 0.1,
      'objective': 'reg:squarederror',
      'eval_metric': 'rmse'
    }
    self.model = xgb.train(params, dtrain, num_boost_round=100)

  def predict(self, features: np.ndarray) -> np.ndarray:
    """
    Predicts stock demand given daily features:
    [day_of_week, holiday_flag, lag_7_sales, temperature, discount_rate]
    """
    if self.model is None:
      # Mock prediction fallback if model isn't pre-trained
      lag_sales = features[:, 2]
      discount = features[:, 4]
      # Return simulated forecast
      return np.round(lag_sales * (1.0 + 0.1 * np.sin(features[:, 0])) - (discount * 2.0))

    dtest = xgb.DMatrix(features)
    return self.model.predict(dtest)
