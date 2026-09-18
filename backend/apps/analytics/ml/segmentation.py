import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler, LabelEncoder
import joblib
import os
from pathlib import Path

class LeadSegmentationModel:
    def __init__(self, model_dir='apps/analytics/ml/models'):
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(parents=True, exist_ok=True)
        self.model = None
        self.scaler = None
        self.encoders = {}
        self.feature_columns = None
        self.n_clusters = 3
    
    def load_data(self, filepath='data/processed/real_leads.csv'):
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"No se encontró: {filepath}")
        return pd.read_csv(filepath)
    
    def preprocess(self, df):
        df_encoded = df.copy()
        
        for col in ['source', 'industry']:
            if col in df_encoded.columns:
                le = LabelEncoder()
                df_encoded[col] = le.fit_transform(df_encoded[col].astype(str))
                self.encoders[col] = le
        
        feature_cols = [
            'source', 'time_to_first_interaction', 
            'interactions_7d', 'response_rate', 'sentiment_avg'
        ]
        
        available = [c for c in feature_cols if c in df_encoded.columns]
        self.feature_columns = available
        
        return df_encoded[available]
    
    def train(self):
        df = self.load_data()
        X = self.preprocess(df)
        
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)
        
        self.model = KMeans(n_clusters=self.n_clusters, random_state=42, n_init=10)
        self.model.fit(X_scaled)
        
        # Analizar clusters
        df['cluster'] = self.model.labels_
        print(f"✅ Modelo de segmentación entrenado")
        print(f"   - Clusters: {self.n_clusters}")
        
        for i in range(self.n_clusters):
            cluster_data = df[df['cluster'] == i]
            print(f"   - Cluster {i}: {len(cluster_data)} leads")
        
        joblib.dump(self.model, self.model_dir / 'segmentation_model.pkl')
        joblib.dump(self.scaler, self.model_dir / 'segmentation_scaler.pkl')
        joblib.dump(self.encoders, self.model_dir / 'segmentation_encoders.pkl')
        joblib.dump(self.feature_columns, self.model_dir / 'segmentation_features.pkl')
        
        return self.model
    
    def predict(self, features):
        if self.model is None:
            try:
                self.model = joblib.load(self.model_dir / 'segmentation_model.pkl')
                self.scaler = joblib.load(self.model_dir / 'segmentation_scaler.pkl')
                self.encoders = joblib.load(self.model_dir / 'segmentation_encoders.pkl')
                self.feature_columns = joblib.load(self.model_dir / 'segmentation_features.pkl')
            except FileNotFoundError:
                return None
        
        if isinstance(features, dict):
            for col, encoder in self.encoders.items():
                if col in features and isinstance(features[col], str):
                    try:
                        features[col] = encoder.transform([features[col]])[0]
                    except ValueError:
                        features[col] = 0
            
            features = [features.get(col, 0) for col in self.feature_columns]
        
        features_scaled = self.scaler.transform([features])
        cluster = self.model.predict(features_scaled)[0]
        
        # Describir cluster basado en los datos
        descriptions = {}
        for i in range(self.n_clusters):
            cluster_data = df[df['cluster'] == i]
            avg_interactions = cluster_data['interactions_7d'].mean()
            avg_sentiment = cluster_data['sentiment_avg'].mean()
            
            if avg_interactions >= 2 and avg_sentiment >= 3.5:
                descriptions[i] = "🔥 Alto potencial - Contactar ahora"
            elif avg_interactions >= 1 and avg_sentiment >= 3:
                descriptions[i] = "⚡ Potencial medio - Seguimiento regular"
            else:
                descriptions[i] = "📉 Bajo potencial - Nutrir con contenido"
        
        return {
            'cluster': int(cluster),
            'label': descriptions.get(cluster, 'Sin clasificar')
        }

model_segmentation = LeadSegmentationModel()