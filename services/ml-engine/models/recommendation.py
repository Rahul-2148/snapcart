import numpy as np

class RecommendationEngine:
  def __init__(self):
    pass

  def get_collaborative_recs(self, user_history: list, user_item_matrix: dict, top_n: int = 5) -> list:
    """
    Finds recommended items using simple user-item overlap collaborative filtering.
    """
    scores = {}
    user_history_set = set(user_history)

    for other_user, items in user_item_matrix.items():
      other_set = set(items)
      # Jaccard similarity score
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

  def get_session_recs(self, current_session: list, item_affinities: dict, top_n: int = 3) -> list:
    """
    Recommends products frequently bought together with the active basket items.
    """
    scores = {}
    for item in current_session:
      associations = item_affinities.get(item, {})
      for assoc_item, strength in associations.items():
        if assoc_item not in current_session:
          scores[assoc_item] = scores.get(assoc_item, 0.0) + strength

    sorted_recs = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return [item for item, score in sorted_recs[:top_n]]
