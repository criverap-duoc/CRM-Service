import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import accuracy_score, classification_report, roc_auc_score
import joblib
import os
from pathlib import Path

class LeadScoringModel:
    def __init__(self, model_dir='apps/analytics/ml/models'):
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(parents=True, exist_ok=True)
        self.model = None
        self.scaler = None
        self.encoders = {}
        self.feature_columns = None
        
    def load_data(self, filepath='data/processed/leads_training.csv'):
        """Carga los datos de entrenamiento"""
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"No se encontró el archivo: {filepath}")
        df = pd.read_csv(filepath)
        return df
    
    def preprocess(self, df):
        """Prepara los datos para entrenamiento"""
        # Features
        feature_cols = [
            'source', 'time_to_first_interaction', 
            'interactions_7d', 'response_rate', 
            'sentiment_avg', 'industry', 'company_size'
        ]
        
        # Codificar variables categóricas
        df_encoded = df.copy()
        categorical_cols = ['source', 'industry']
        
        for col in categorical_cols:
            le = LabelEncoder()
            df_encoded[col] = le.fit_transform(df_encoded[col].astype(str))
            self.encoders[col] = le
        
        self.feature_columns = feature_cols
        X = df_encoded[feature_cols]
        y = df_encoded['converted']
        
        return X, y
    
    def train(self):
        """Entrena el modelo Random Forest"""
        df = self.load_data()
        X, y = self.preprocess(df)
        
        # Escalar features
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)
        
        # Dividir datos
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Entrenar modelo
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=5,
            min_samples_split=10,
            random_state=42,
            class_weight='balanced'
        )
        self.model.fit(X_train, y_train)
        
        # Evaluación
        y_pred = self.model.predict(X_test)
        y_proba = self.model.predict_proba(X_test)[:, 1]
        accuracy = accuracy_score(y_test, y_pred)
        auc = roc_auc_score(y_test, y_proba)
        
        print(f"✅ Modelo entrenado")
        print(f"   - Precisión: {accuracy:.2%}")
        print(f"   - AUC-ROC: {auc:.2%}")
        print(f"   - Features: {len(self.feature_columns)}")
        
        # Feature importance
        importance = dict(zip(self.feature_columns, self.model.feature_importances_))
        print("   - Importancia de features:")
        for feature, imp in sorted(importance.items(), key=lambda x: x[1], reverse=True):
            print(f"     * {feature}: {imp:.2%}")
        
        # Guardar modelo
        joblib.dump(self.model, self.model_dir / 'lead_scoring.pkl')
        joblib.dump(self.scaler, self.model_dir / 'scaler.pkl')
        joblib.dump(self.encoders, self.model_dir / 'encoders.pkl')
        joblib.dump(self.feature_columns, self.model_dir / 'feature_columns.pkl')
        
        return self.model
    
    def predict(self, features):
        """Predice lead score para un nuevo lead"""
        # Cargar modelo si no está en memoria
        if self.model is None:
            self.model = joblib.load(self.model_dir / 'lead_scoring.pkl')
            self.scaler = joblib.load(self.model_dir / 'scaler.pkl')
            self.encoders = joblib.load(self.model_dir / 'encoders.pkl')
            self.feature_columns = joblib.load(self.model_dir / 'feature_columns.pkl')
        
        # Asegurar que features es un array 2D
        if isinstance(features, dict):
            features = [features[col] for col in self.feature_columns]
        
        # Escalar y predecir
        features_scaled = self.scaler.transform([features])
        score = self.model.predict_proba(features_scaled)[0][1]
        
        return round(score * 100, 2)

# Instancia global
model = LeadScoringModel()

def get_lead_score(source, time_to_first, interactions_7d, response_rate, sentiment_avg, industry, company_size):
    """Función de conveniencia para obtener score de un lead"""
    try:
        features = {
            'source': source,
            'time_to_first_interaction': time_to_first,
            'interactions_7d': interactions_7d,
            'response_rate': response_rate,
            'sentiment_avg': sentiment_avg,
            'industry': industry,
            'company_size': company_size
        }
        return model.predict(features)
    except Exception as e:
        print(f"❌ Error al calcular score: {e}")
        return 50.0  # Valor por defecto

def train_model():
    """Entrena el modelo desde cero"""
    model.train()