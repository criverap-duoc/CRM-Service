## backend\apps\analytics\ml\segmentation_v3.py
"""
Segmentation V3 — K-Means con features enriquecidas.
Los clusters se describen usando las medias de las features clave.
"""
import os
import joblib
import pandas as pd
import numpy as np
from scipy import stats
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler, LabelEncoder

from .features import CATEGORICAL_FEATURES, ALL_FEATURES


class SegmentationModelV3:
    def __init__(self, model_dir="apps/analytics/ml/models", n_clusters=3):
        self.model_dir = model_dir
        os.makedirs(model_dir, exist_ok=True)
        self.n_clusters = n_clusters
        self.model = None
        self.scaler = None
        self.encoders = {}
        self.feature_columns = None
        # Estadísticas de clusters calculadas al entrenar
        self.cluster_stats = None
        self.cluster_descriptions = None

    def load_data(self):
        dfs = []
        synthetic_path = "data/processed/synthetic_leads_v3.csv"
        if os.path.exists(synthetic_path):
            dfs.append(pd.read_csv(synthetic_path))
        real_path = "data/processed/real_leads.csv"
        if os.path.exists(real_path):
            dfs.append(pd.read_csv(real_path))

        if not dfs:
            raise FileNotFoundError("No hay datos para segmentar")

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
        return df_encoded[ALL_FEATURES].fillna(0), df_encoded

    def train(self):
        df = self.load_data()
        X, df_encoded = self.preprocess(df)

        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)

        self.model = KMeans(n_clusters=self.n_clusters, random_state=42, n_init=10)
        self.model.fit(X_scaled)

        df_encoded["cluster"] = self.model.labels_

        # Estadísticas por cluster
        self.cluster_stats = {}
        for i in range(self.n_clusters):
            cluster_df = df_encoded[df_encoded["cluster"] == i]
            stats = {
                "size": int(len(cluster_df)),
                "avg_sentiment": float(cluster_df["sentiment_avg"].mean()),
                "avg_interactions_7d": float(cluster_df["interactions_7d"].mean()),
                "avg_total_interactions": float(cluster_df["total_interactions"].mean()),
                "avg_days_since_last": float(cluster_df["days_since_last_interaction"].mean()),
                "avg_tag_count": float(cluster_df["tag_count"].mean()),
                "avg_overdue_tasks": float(cluster_df["overdue_tasks"].mean()),
                "conversion_rate": float(cluster_df["converted"].mean()),
                "churn_rate": float(cluster_df["churned"].mean()),
            }
            self.cluster_stats[i] = stats

        # Etiquetas descriptivas
        self.cluster_descriptions = self._label_clusters(self.cluster_stats)

        print(f"\n✅ Modelo de segmentación entrenado ({self.n_clusters} clusters)")
        for i in range(self.n_clusters):
            s = self.cluster_stats[i]
            print(f"\n   Cluster {i} — {self.cluster_descriptions[i]} ({s['size']} contactos):")
            print(f"     - Sentimiento promedio:   {s['avg_sentiment']:.2f}")
            print(f"     - Interacciones 7d:       {s['avg_interactions_7d']:.2f}")
            print(f"     - Días sin interacción:   {s['avg_days_since_last']:.1f}")
            print(f"     - Tasa conversión:        {s['conversion_rate']:.2%}")
            print(f"     - Tasa churn:             {s['churn_rate']:.2%}")

        joblib.dump(self.model, f"{self.model_dir}/segmentation_v3.pkl")
        joblib.dump(self.scaler, f"{self.model_dir}/segmentation_scaler_v3.pkl")
        joblib.dump(self.encoders, f"{self.model_dir}/segmentation_encoders_v3.pkl")
        joblib.dump(self.feature_columns, f"{self.model_dir}/segmentation_features_v3.pkl")
        joblib.dump(self.cluster_stats, f"{self.model_dir}/segmentation_stats_v3.pkl")
        joblib.dump(self.cluster_descriptions, f"{self.model_dir}/segmentation_descriptions_v3.pkl")
        print(f"\n✅ Artefactos de segmentación guardados")

        return self.model

    def _label_clusters(self, stats):
        """Asigna una etiqueta descriptiva a cada cluster basándose en sus stats."""
        descriptions = {}
        # Ordenar clusters por conversion_rate para etiquetar con jerarquía
        sorted_clusters = sorted(
            stats.items(),
            key=lambda x: x[1]["conversion_rate"],
            reverse=True,
        )
        labels_priority = [
            "🏆 Cliente consolidado — alta conversión y bajo churn",
            "⚡ Prospect activo — buena conversación, en progreso",
            "📉 Lead frío o en riesgo — requiere reactivación",
        ]

        for idx, (cluster_id, s) in enumerate(sorted_clusters):
            # Casos especiales por encima de la jerarquía general
            if s["churn_rate"] > 0.4:
                descriptions[cluster_id] = "🚨 En riesgo crítico — alta tasa de churn"
            elif s["avg_sentiment"] < 2.5 and s["avg_interactions_7d"] < 0.5:
                descriptions[cluster_id] = "❄️ Lead frío — sin actividad reciente"
            elif idx < len(labels_priority):
                descriptions[cluster_id] = labels_priority[idx]
            else:
                descriptions[cluster_id] = f"📊 Segmento {cluster_id}"

        return descriptions

    def predict(self, features_dict):
        if self.model is None:
            self._load_artifacts()
        if self.model is None:
            return None

        from .features import features_to_vector
        vector = features_to_vector(features_dict, self.encoders, self.feature_columns)
        vector_scaled = self.scaler.transform([vector])
        cluster = int(self.model.predict(vector_scaled)[0])

        return {
            "cluster": cluster,
            "label": self.cluster_descriptions.get(cluster, f"Segmento {cluster}"),
            "stats": self.cluster_stats.get(cluster),
        }

    def _load_artifacts(self):
        try:
            self.model = joblib.load(f"{self.model_dir}/segmentation_v3.pkl")
            self.scaler = joblib.load(f"{self.model_dir}/segmentation_scaler_v3.pkl")
            self.encoders = joblib.load(f"{self.model_dir}/segmentation_encoders_v3.pkl")
            self.feature_columns = joblib.load(f"{self.model_dir}/segmentation_features_v3.pkl")
            self.cluster_stats = joblib.load(f"{self.model_dir}/segmentation_stats_v3.pkl")
            self.cluster_descriptions = joblib.load(f"{self.model_dir}/segmentation_descriptions_v3.pkl")
        except FileNotFoundError:
            self.model = None


model_segmentation_v3 = SegmentationModelV3()