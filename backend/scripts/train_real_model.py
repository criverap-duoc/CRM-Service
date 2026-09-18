"""
Entrena el modelo con datos reales de la base de datos.
"""
import os
import sys
import django
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import accuracy_score, roc_auc_score
import joblib

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_service.settings.dev')
django.setup()


def train_real_model():
    """Entrena el modelo con datos reales"""
    print("🚀 Entrenando modelo con datos reales...")
    
    # Cargar datos
    df = pd.read_csv('data/processed/real_leads.csv')
    print(f"📊 {len(df)} registros cargados")
    
    # Si hay muy pocos datos, no entrenar
    if len(df) < 10:
        print("⚠️  Pocos datos. Usando reglas de negocio.")
        return
    
    # Codificar variables categóricas
    encoders = {}
    for col in ['source', 'industry']:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col].astype(str))
        encoders[col] = le
    
    # Features
    feature_cols = [
        'source', 'time_to_first_interaction', 
        'interactions_7d', 'response_rate', 'sentiment_avg',
        'industry', 'company_size'
    ]
    
    X = df[feature_cols]
    y = df['converted']
    
    # Si solo hay una clase, no se puede entrenar
    if y.nunique() < 2:
        print("⚠️  Solo hay una clase. Usando reglas de negocio.")
        return
    
    # Escalar
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Dividir
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Entrenar
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=5,
        random_state=42,
        class_weight='balanced'
    )
    model.fit(X_train, y_train)
    
    # Evaluar
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]
    
    print(f"✅ Precisión: {accuracy_score(y_test, y_pred):.2%}")
    print(f"✅ AUC-ROC: {roc_auc_score(y_test, y_proba):.2%}")
    
    # Guardar
    model_dir = 'apps/analytics/ml/models'
    os.makedirs(model_dir, exist_ok=True)
    joblib.dump(model, f'{model_dir}/real_model.pkl')
    joblib.dump(scaler, f'{model_dir}/real_scaler.pkl')
    joblib.dump(encoders, f'{model_dir}/real_encoders.pkl')
    joblib.dump(feature_cols, f'{model_dir}/real_features.pkl')
    
    print("✅ Modelo guardado en apps/analytics/ml/models/")


if __name__ == "__main__":
    train_real_model()
