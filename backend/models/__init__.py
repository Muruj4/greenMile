import os
import pandas as pd
import joblib
from datetime import datetime
from typing import Dict, List, Any, Tuple

class GreenMileRecommendationEngine:
    def __init__(self):
        base_dir = os.path.dirname(__file__)
        models_dir = os.path.join(base_dir, "trained_models")

        regression_model_path = os.path.join(models_dir, "regression_model.pkl")
        classification_model_path = os.path.join(models_dir, "classification_model.pkl")
        encoders_path = os.path.join(models_dir, "label_encoders.pkl")
        thresholds_path = os.path.join(models_dir, "category_thresholds.pkl")

        self.regression_model = joblib.load(regression_model_path)
        self.classification_model = joblib.load(classification_model_path)
        self.label_encoders = joblib.load(encoders_path)
        self.thresholds = joblib.load(thresholds_path)