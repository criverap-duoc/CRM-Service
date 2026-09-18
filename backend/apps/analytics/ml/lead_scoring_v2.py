import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import accuracy_score, classification_report, roc_auc_score, confusion_matrix
import joblib
import os
import warnings
warnings.filterwarnings('ignore')

class LeadScoringModelV2:
    def __init__(self, model_dir='apps/analytics/ml/models'):
        self.model_dir = model_dir
        os.makedirs(model_dir, exist_ok=True)
        self.model = None
        self.scaler = None
        self.encoders = {}
        self.feature_columns = None
        
    def load_data(self, filepath='data/processed/leads_training.csv'):
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"No se encontró el archivo: {filepath}")
        df = pd.read_csv(filepath)
        return df
    
    def engineer_features(self, df):
        """Crea nuevas features para mejorar el modelo"""
        df_engineered = df.copy()
        
        # Feature: Tasa de conversión por fuente (media histórica)
        source_conversion = df.groupby('source')['converted'].mean().to_dict()
        df_engineered['source_conversion_rate'] = df['source'].map(source_conversion)
        
        # Feature: Interacciones por día (si existe)
        if 'time_to_first_interaction' in df.columns:
            df_engineered['interaction_intensity'] = df['interactions_7d'] / (df['time_to_first_interaction'] + 0.1)
        
        # Feature: Combinación de sentimiento y tiempo
        df_engineered['sentiment_time'] = df['sentiment_avg'] * (1 / (df['time_to_first_interaction'] + 0.1))
        
        # Feature: Tamaño de empresa normalizado
        df_engineered['company_size_norm'] = df['company_size'] / df['company_size'].max()
        
        return df_engineered
    
    def preprocess(self, df):
        """Prepara los datos para entrenamiento"""
        # Engineer features
        df_engineered = self.engineer_features(df)
        
        # Features a usar
        feature_cols = [
            'source', 'time_to_first_interaction', 
            'interactions_7d', 'response_rate', 
            'sentiment_avg', 'industry', 'company_size',
            'source_conversion_rate', 'interaction_intensity',
            'sentiment_time', 'company_size_norm'
        ]
        
        # Verificar que todas las columnas existen
        available_cols = [col for col in feature_cols if col in df_engineered.columns]
        
        # Codificar variables categóricas
        df_encoded = df_engineered.copy()
        categorical_cols = ['source', 'industry']
        
        for col in categorical_cols:
            if col in df_encoded.columns:
                le = LabelEncoder()
                df_encoded[col] = le.fit_transform(df_encoded[col].astype(str))
                self.encoders[col] = le
        
        self.feature_columns = available_cols
        X = df_encoded[available_cols]
        y = df_encoded['converted']
        
        return X, y
    
    def train(self, optimize=False):
        """Entrena el modelo con GridSearch opcional"""
        df = self.load_data()
        X, y = self.preprocess(df)
        
        # Escalar features
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)
        
        # Dividir datos
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=0.2, random_state=42, stratify=y
        )
        
        if optimize:
            print("🔍 Optimizando hiperparámetros...")
            param_grid = {
                'n_estimators': [100, 200],
                'max_depth': [3, 5, 7],
                'min_samples_split': [5, 10],
                'min_samples_leaf': [2, 4]
            }
            
            grid_search = GridSearchCV(
                RandomForestClassifier(random_state=42, class_weight='balanced'),
                param_grid,
                cv=3,
                scoring='roc_auc',
                n_jobs=-1
            )
            grid_search.fit(X_train, y_train)
            best_params = grid_search.best_params_
            print(f"   Mejores parámetros: {best_params}")
        else:
            best_params = {
                'n_estimators': 200,
                'max_depth': 5,
                'min_samples_split': 10,
                'min_samples_leaf': 4
            }
        
        # Entrenar modelo
        self.model = RandomForestClassifier(
            **best_params,
            random_state=42,
            class_weight='balanced'
        )
        self.model.fit(X_train, y_train)
        
        # Validación cruzada
        cv_scores = cross_val_score(self.model, X_train, y_train, cv=5, scoring='roc_auc')
        print(f"   ROC-AUC promedio (CV): {cv_scores.mean():.2%}")
        
        # Evaluación en test
        y_pred = self.model.predict(X_test)
        y_proba = self.model.predict_proba(X_test)[:, 1]
        
        accuracy = accuracy_score(y_test, y_pred)
        auc = roc_auc_score(y_test, y_proba)
        
        print(f"\n✅ Modelo entrenado")
        print(f"   - Precisión: {accuracy:.2%}")
        print(f"   - AUC-ROC: {auc:.2%}")
        print(f"   - Features: {len(self.feature_columns)}")
        
        # Matriz de confusión
        cm = confusion_matrix(y_test, y_pred)
        print(f"   - Matriz de confusión:")
        print(f"     * Verdaderos Negativos: {cm[0][0]}")
        print(f"     * Falsos Positivos: {cm[0][1]}")
        print(f"     * Falsos Negativos: {cm[1][0]}")
        print(f"     * Verdaderos Positivos: {cm[1][1]}")
        
        # Feature importance
        print(f"\n   - Importancia de features:")
        importance = dict(zip(self.feature_columns, self.model.feature_importances_))
        for feature, imp in sorted(importance.items(), key=lambda x: x[1], reverse=True):
            print(f"     * {feature}: {imp:.2%}")
        
        # Guardar modelo
        joblib.dump(self.model, f'{self.model_dir}/lead_scoring_v2.pkl')
        joblib.dump(self.scaler, f'{self.model_dir}/scaler_v2.pkl')
        joblib.dump(self.encoders, f'{self.model_dir}/encoders_v2.pkl')
        joblib.dump(self.feature_columns, f'{self.model_dir}/feature_columns_v2.pkl')
        
        return self.model
    
    def predict(self, features):
        """Predice lead score para un nuevo lead"""
        if self.model is None:
            self.model = joblib.load(f'{self.model_dir}/lead_scoring_v2.pkl')
            self.scaler = joblib.load(f'{self.model_dir}/scaler_v2.pkl')
            self.encoders = joblib.load(f'{self.model_dir}/encoders_v2.pkl')
            self.feature_columns = joblib.load(f'{self.model_dir}/feature_columns_v2.pkl')
        
        if isinstance(features, dict):
            # Aplicar encoders a variables categóricas
            for col, encoder in self.encoders.items():
                if col in features and isinstance(features[col], str):
                    try:
                        features[col] = encoder.transform([features[col]])[0]
                    except ValueError:
                        # Si el valor no está en el encoder, usar 0
                        features[col] = 0
            
            # Convertir a lista en el orden correcto
            features = [features.get(col, 0) for col in self.feature_columns]
        
        features_scaled = self.scaler.transform([features])
        score = self.model.predict_proba(features_scaled)[0][1]
        
        return round(score * 100, 2)

# Instancia global
model_v2 = LeadScoringModelV2()

def get_lead_score_v2(source, time_to_first, interactions_7d, response_rate, sentiment_avg, industry, company_size):
    """
    Función de conveniencia para obtener score usando reglas de negocio.
    Usa el modelo ML solo si está disponible y funciona correctamente.
    """
    try:
        # Intentar usar el modelo ML
        if model_v2.model is None:
            model_v2.model = joblib.load(f'{model_v2.model_dir}/lead_scoring_v2.pkl')
            model_v2.scaler = joblib.load(f'{model_v2.model_dir}/scaler_v2.pkl')
            model_v2.encoders = joblib.load(f'{model_v2.model_dir}/encoders_v2.pkl')
            model_v2.feature_columns = joblib.load(f'{model_v2.model_dir}/feature_columns_v2.pkl')
        
        # Mapeo manual de variables categóricas a números
        source_map = {'manual': 0, 'meta_ads': 1, 'organic': 2, 'referral': 3, 'other': 4}
        industry_map = {'tech': 0, 'healthcare': 1, 'finance': 2, 'retail': 3, 'education': 4, 'other': 5}
        
        encoded_source = source_map.get(source, 0)
        encoded_industry = industry_map.get(industry, 0)
        
        # Construir features
        features_dict = {
            'source': encoded_source,
            'time_to_first_interaction': time_to_first,
            'interactions_7d': interactions_7d,
            'response_rate': response_rate,
            'sentiment_avg': sentiment_avg,
            'industry': encoded_industry,
            'company_size': company_size,
            'source_conversion_rate': 0.2,
            'interaction_intensity': interactions_7d / (time_to_first + 0.1),
            'sentiment_time': sentiment_avg * (1 / (time_to_first + 0.1)),
            'company_size_norm': company_size / 10
        }
        
        features = [features_dict.get(col, 0) for col in model_v2.feature_columns]
        features_scaled = model_v2.scaler.transform([features])
        score = model_v2.model.predict_proba(features_scaled)[0][1]
        
        return round(score * 100, 2)
    except Exception as e:
        # Fallback: reglas de negocio
        return _rule_based_score(time_to_first, interactions_7d, response_rate, sentiment_avg, source)


def _rule_based_score(time_to_first, interactions_7d, response_rate, sentiment_avg, source):
    """Calcula score basado en reglas de negocio"""
    score = 50
    
    if time_to_first < 1: score += 15
    elif time_to_first < 3: score += 10
    elif time_to_first < 7: score += 5
    elif time_to_first > 15: score -= 10
    
    if interactions_7d >= 5: score += 15
    elif interactions_7d >= 3: score += 10
    elif interactions_7d >= 1: score += 5
    else: score -= 5
    
    score += int(response_rate * 15)
    
    if sentiment_avg >= 4: score += 15
    elif sentiment_avg >= 3.5: score += 8
    elif sentiment_avg >= 3: score += 3
    elif sentiment_avg < 2.5: score -= 10
    
    if source == 'referral': score += 10
    elif source == 'organic': score += 5
    elif source == 'meta_ads': score += 3
    
    return max(0, min(100, score))