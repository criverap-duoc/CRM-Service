## backend\apps\analytics\ml\churn_prediction_v3.py
"""
Churn Prediction V3 — usa las mismas features enriquecidas que lead scoring.
Target: churned (1 si el contacto se fue).
"""
import os
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import accuracy_score, roc_auc_score, classification_report

from .features import CATEGORICAL_FEATURES, ALL_FEATURES


class ChurnPredictionModelV3:
    def __init__(self, model_dir="apps/analytics/ml/models"):
        self.model_dir = model_dir
        os.makedirs(model_dir, exist_ok=True)
        self.model = None
        self.scaler = None
        self.encoders = {}
        self.feature_columns = None

    def load_data(self):
        dfs = []
        synthetic_path = "data/processed/synthetic_leads_v3.csv"
        if os.path.exists(synthetic_path):
            dfs.append(pd.read_csv(synthetic_path))
        real_path = "data/processed/real_leads.csv"
        if os.path.exists(real_path):
            dfs.append(pd.read_csv(real_path))

        if not dfs:
            raise FileNotFoundError("No hay datos para entrenar churn")

        df = pd.concat(dfs, ignore_index=True)
        print(f"📊 Dataset combinado: {len(df)} registros")
        return df

    def preprocess(self, df):
        df_encoded = df.copy()
        for col in CATEGORICAL_FEATURES:
            if col in df_encoded.columns:
                le = LabelEncoder()
                df_encoded[col] = le.fit_transform(df_encoded[col].astype(str))
                self.encoders[col] = le

        self.feature_columns = ALL_FEATURES
        X = df_encoded[ALL_FEATURES].fillna(0)
        y = df_encoded["churned"]
        return X, y

    def train(self):
        df = self.load_data()
        X, y = self.preprocess(df)

        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)

        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=0.2, random_state=42, stratify=y
        )

        self.model = RandomForestClassifier(
            n_estimators=200,
            max_depth=10,
            random_state=42,
            class_weight="balanced",
        )
        self.model.fit(X_train, y_train)

        cv_scores = cross_val_score(self.model, X_train, y_train, cv=5, scoring="roc_auc")
        print(f"   ROC-AUC promedio (CV): {cv_scores.mean():.4f}")

        y_pred = self.model.predict(X_test)
        y_proba = self.model.predict_proba(X_test)[:, 1]
        print(f"   Precisión: {accuracy_score(y_test, y_pred):.4f}")
        print(f"   ROC-AUC:   {roc_auc_score(y_test, y_proba):.4f}")
        print(classification_report(y_test, y_pred, digits=4))

        print("\n   Importancia de features (top 10):")
        importance = sorted(
            zip(self.feature_columns, self.model.feature_importances_),
            key=lambda x: x[1],
            reverse=True,
        )
        for name, imp in importance[:10]:
            print(f"     {name}: {imp:.4f}")

        joblib.dump(self.model, f"{self.model_dir}/churn_v3.pkl")
        joblib.dump(self.scaler, f"{self.model_dir}/churn_scaler_v3.pkl")
        joblib.dump(self.encoders, f"{self.model_dir}/churn_encoders_v3.pkl")
        joblib.dump(self.feature_columns, f"{self.model_dir}/churn_features_v3.pkl")
        print(f"\n✅ Artefactos de churn guardados")

        return self.model

    def predict(self, features_dict):
        if self.model is None:
            self._load_artifacts()
        if self.model is None:
            return None

        from .features import features_to_vector
        vector = features_to_vector(features_dict, self.encoders, self.feature_columns)
        vector_scaled = self.scaler.transform([vector])
        prob = self.model.predict_proba(vector_scaled)[0][1]
        return round(prob * 100, 2)

    def _load_artifacts(self):
        try:
            self.model = joblib.load(f"{self.model_dir}/churn_v3.pkl")
            self.scaler = joblib.load(f"{self.model_dir}/churn_scaler_v3.pkl")
            self.encoders = joblib.load(f"{self.model_dir}/churn_encoders_v3.pkl")
            self.feature_columns = joblib.load(f"{self.model_dir}/churn_features_v3.pkl")
        except FileNotFoundError:
            self.model = None


model_churn_v3 = ChurnPredictionModelV3()