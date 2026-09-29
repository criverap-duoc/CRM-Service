## backend\apps\analytics\ml\lead_scoring_v3.py
"""
Lead Scoring V3 — usa las features enriquecidas de Contact + Company + Tag + Task.
Combina datos sintéticos (synthetic_leads_v3.csv) con datos reales (real_leads.csv).
"""
import os
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, GridSearchCV, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import (
    accuracy_score, roc_auc_score, classification_report, confusion_matrix,
)

from .features import CATEGORICAL_FEATURES, NUMERIC_FEATURES, ALL_FEATURES


class LeadScoringModelV3:
    def __init__(self, model_dir="apps/analytics/ml/models"):
        self.model_dir = model_dir
        os.makedirs(model_dir, exist_ok=True)
        self.model = None
        self.scaler = None
        self.encoders = {}
        self.feature_columns = None

    def load_data(self):
        """Carga sintéticos + reales (si existen) y los combina."""
        dfs = []

        synthetic_path = "data/processed/synthetic_leads_v3.csv"
        if os.path.exists(synthetic_path):
            df_syn = pd.read_csv(synthetic_path)
            print(f"📁 Sintéticos: {len(df_syn)} registros")
            dfs.append(df_syn)
        else:
            raise FileNotFoundError(f"No existe {synthetic_path}. Corre generate_synthetic_v3.py")

        real_path = "data/processed/real_leads.csv"
        if os.path.exists(real_path):
            df_real = pd.read_csv(real_path)
            print(f"📁 Reales: {len(df_real)} registros")
            dfs.append(df_real)

        df = pd.concat(dfs, ignore_index=True)
        print(f"📊 Dataset combinado: {len(df)} registros")
        return df

    def preprocess(self, df):
        """Encoding de categóricas + retorno de X, y."""
        df_encoded = df.copy()

        # Encoding de categóricas
        for col in CATEGORICAL_FEATURES:
            if col in df_encoded.columns:
                le = LabelEncoder()
                df_encoded[col] = le.fit_transform(df_encoded[col].astype(str))
                self.encoders[col] = le

        self.feature_columns = ALL_FEATURES

        X = df_encoded[ALL_FEATURES].fillna(0)
        y = df_encoded["converted"]

        return X, y

    def train(self, optimize=True):
        """Entrena el modelo con GridSearch opcional."""
        df = self.load_data()
        X, y = self.preprocess(df)

        # Escalar
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)

        # Split
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=0.2, random_state=42, stratify=y
        )

        # GridSearch
        if optimize:
            print("\n🔍 Optimizando hiperparámetros...")
            param_grid = {
                "n_estimators": [100, 200],
                "max_depth": [5, 10, 15],
                "min_samples_split": [2, 5],
                "min_samples_leaf": [1, 2],
            }
            grid = GridSearchCV(
                RandomForestClassifier(random_state=42, class_weight="balanced"),
                param_grid,
                cv=3,
                scoring="roc_auc",
                n_jobs=-1,
            )
            grid.fit(X_train, y_train)
            best_params = grid.best_params_
            print(f"   Mejores parámetros: {best_params}")
        else:
            best_params = {
                "n_estimators": 200,
                "max_depth": 10,
                "min_samples_split": 2,
                "min_samples_leaf": 1,
            }

        # Modelo final
        self.model = RandomForestClassifier(
            **best_params, random_state=42, class_weight="balanced"
        )
        self.model.fit(X_train, y_train)

        # Cross-validation
        cv_scores = cross_val_score(
            self.model, X_train, y_train, cv=5, scoring="roc_auc"
        )
        print(f"\n   ROC-AUC promedio (CV): {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

        # Evaluación en test
        y_pred = self.model.predict(X_test)
        y_proba = self.model.predict_proba(X_test)[:, 1]

        print(f"   Precisión: {accuracy_score(y_test, y_pred):.4f}")
        print(f"   ROC-AUC:   {roc_auc_score(y_test, y_proba):.4f}")
        print("\n   Reporte de clasificación:")
        print(classification_report(y_test, y_pred, digits=4))

        cm = confusion_matrix(y_test, y_pred)
        print(f"   Matriz de confusión:\n{cm}")

        # Feature importance
        print("\n   Importancia de features (top 10):")
        importance = sorted(
            zip(self.feature_columns, self.model.feature_importances_),
            key=lambda x: x[1],
            reverse=True,
        )
        for name, imp in importance[:10]:
            print(f"     {name}: {imp:.4f}")

        # Guardar
        joblib.dump(self.model, f"{self.model_dir}/lead_scoring_v3.pkl")
        joblib.dump(self.scaler, f"{self.model_dir}/scaler_v3.pkl")
        joblib.dump(self.encoders, f"{self.model_dir}/encoders_v3.pkl")
        joblib.dump(self.feature_columns, f"{self.model_dir}/feature_columns_v3.pkl")
        print(f"\n✅ Artefactos guardados en {self.model_dir}/")

        return self.model

    def predict(self, features_dict):
        """
        Predice lead score para un contacto (recibe dict de build_features_for_contact).
        Devuelve 0-100.
        """
        if self.model is None:
            self._load_artifacts()

        # Convertir dict a vector en el orden correcto
        from .features import features_to_vector
        vector = features_to_vector(features_dict, self.encoders, self.feature_columns)
        vector_scaled = self.scaler.transform([vector])

        prob = self.model.predict_proba(vector_scaled)[0][1]
        return round(prob * 100, 2)

    def _load_artifacts(self):
        try:
            self.model = joblib.load(f"{self.model_dir}/lead_scoring_v3.pkl")
            self.scaler = joblib.load(f"{self.model_dir}/scaler_v3.pkl")
            self.encoders = joblib.load(f"{self.model_dir}/encoders_v3.pkl")
            self.feature_columns = joblib.load(f"{self.model_dir}/feature_columns_v3.pkl")
        except FileNotFoundError:
            self.model = None


# Instancia global
model_lead_v3 = LeadScoringModelV3()