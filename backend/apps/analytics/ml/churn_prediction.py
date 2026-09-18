import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import accuracy_score, roc_auc_score
import joblib
import os
from pathlib import Path

class ChurnPredictionModel:
    def __init__(self, model_dir='apps/analytics/ml/models'):
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(parents=True, exist_ok=True)
        self.model = None
        self.scaler = None
        self.encoders = {}
        self.feature_columns = None
    
    def load_data(self, filepath='data/processed/real_leads.csv'):
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"No se encontró: {filepath}")
        return pd.read_csv(filepath)
    
    def preprocess(self, df):
        """Prepara datos para predicción de churn"""
        df_encoded = df.copy()
        
        # Crear target de churn (1 si churned, 0 si no)
        # Asumimos que 'converted' es 0 para churned
        # Para el modelo, usamos los datos disponibles
        if 'converted' in df_encoded.columns:
            # Churn = 1 si no convirtió y tiene pocas interacciones
            df_encoded['churned'] = ((df_encoded['converted'] == 0) & 
                                     (df_encoded['interactions_7d'] == 0)).astype(int)
        
        # Codificar categóricas
        for col in ['source', 'industry']:
            if col in df_encoded.columns:
                le = LabelEncoder()
                df_encoded[col] = le.fit_transform(df_encoded[col].astype(str))
                self.encoders[col] = le
        
        feature_cols = [
            'source', 'time_to_first_interaction', 
            'interactions_7d', 'response_rate', 'sentiment_avg',
            'industry', 'company_size'
        ]
        
        available = [c for c in feature_cols if c in df_encoded.columns]
        self.feature_columns = available
        
        X = df_encoded[available]
        y = df_encoded['churned'] if 'churned' in df_encoded.columns else None
        
        return X, y
    
    def train(self):
        df = self.load_data()
        X, y = self.preprocess(df)
        
        if y is None or y.nunique() < 2:
            print("⚠️ No hay suficientes clases para entrenar churn")
            return None
        
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)
        
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=0.2, random_state=42, stratify=y
        )
        
        self.model = RandomForestClassifier(
            n_estimators=100, max_depth=5, random_state=42, class_weight='balanced'
        )
        self.model.fit(X_train, y_train)
        
        y_pred = self.model.predict(X_test)
        y_proba = self.model.predict_proba(X_test)[:, 1]
        
        print(f"✅ Churn - Precisión: {accuracy_score(y_test, y_pred):.2%}")
        print(f"✅ Churn - AUC-ROC: {roc_auc_score(y_test, y_proba):.2%}")
        
        joblib.dump(self.model, self.model_dir / 'churn_model.pkl')
        joblib.dump(self.scaler, self.model_dir / 'churn_scaler.pkl')
        joblib.dump(self.encoders, self.model_dir / 'churn_encoders.pkl')
        joblib.dump(self.feature_columns, self.model_dir / 'churn_features.pkl')
        
        return self.model
    
    def predict(self, features):
        if self.model is None:
            try:
                self.model = joblib.load(self.model_dir / 'churn_model.pkl')
                self.scaler = joblib.load(self.model_dir / 'churn_scaler.pkl')
                self.encoders = joblib.load(self.model_dir / 'churn_encoders.pkl')
                self.feature_columns = joblib.load(self.model_dir / 'churn_features.pkl')
            except FileNotFoundError:
                return None
        
        if isinstance(features, dict):
            # Codificar categóricas
            for col, encoder in self.encoders.items():
                if col in features and isinstance(features[col], str):
                    try:
                        features[col] = encoder.transform([features[col]])[0]
                    except ValueError:
                        features[col] = 0
            
            features = [features.get(col, 0) for col in self.feature_columns]
        
        features_scaled = self.scaler.transform([features])
        prob = self.model.predict_proba(features_scaled)[0][1]
        return round(prob * 100, 2)

model_churn = ChurnPredictionModel()