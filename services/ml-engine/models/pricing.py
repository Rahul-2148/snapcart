class DynamicPriceOptimizer:
  def __init__(self):
    pass

  def calculate_price(
    self,
    base_price: float,
    stock: int,
    demand_surge: float,          # 1.0 (normal) to 2.5 (extremely high)
    weather_multiplier: float,    # 1.0 (clear) to 1.5 (heavy rain)
    competitor_price: float = None
  ) -> float:
    """
    Computes real-time dynamic pricing based on inventory availability and surge constraints.
    """
    price = base_price

    # 1. Supply adjustments (lower stock triggers price rise)
    if stock < 5:
      price *= 1.2
    elif stock < 15:
      price *= 1.08

    # 2. Apply demand surge & weather modifiers
    surge_multiplier = max(1.0, min(2.5, demand_surge * weather_multiplier))
    price *= surge_multiplier

    # 3. Market matching
    if competitor_price and price > competitor_price * 1.15:
      price = competitor_price * 1.15 # Prevent extreme gouging

    return round(price, 2)
