import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
import os

def generate_leads(n=2000):
    """Genera datos sintéticos de leads para entrenamiento"""
    np.random.seed(42)
    random.seed(42)
    
    sources = ['meta_ads', 'organic', 'referral', 'manual']
    statuses = ['lead', 'prospect', 'customer', 'churned']
    channels = ['email', 'phone', 'whatsapp', 'chat']
    industries = ['tech', 'healthcare', 'finance', 'retail', 'education', 'other']
    
    data = []
    start_date = datetime.now() - timedelta(days=365)
    
    for i in range(n):
        source = random.choice(sources)
        status = random.choices(
            statuses,
            weights=[0.4, 0.3, 0.2, 0.1]
        )[0]
        
        # Tiempo hasta primera interacción (días)
        time_to_first = np.random.exponential(scale=2)
        time_to_first = min(time_to_first, 30)  # Cap en 30 días
        
        # Número de interacciones en primeros 7 días
        interactions_7d = np.random.poisson(lam=1.5)
        
        # Tiempo hasta conversión (días) - solo si es customer
        time_to_conversion = np.random.exponential(scale=10) if status == 'customer' else None
        time_to_conversion = min(time_to_conversion, 180) if time_to_conversion else None
        
        # Tasa de respuesta (0-1)
        response_rate = np.random.beta(a=2, b=5)
        
        # Sentimiento promedio (1-5)
        sentiment_avg = np.random.normal(loc=3.5, scale=1.0)
        sentiment_avg = max(1, min(5, sentiment_avg))
        
        # Industria
        industry = random.choice(industries)
        
        # Tamaño de empresa (1-10, donde 10 es grande)
        company_size = np.random.exponential(scale=3) + 1
        company_size = min(int(company_size), 10)
        
        lead = {
            'lead_id': i + 1,
            'source': source,
            'status': status,
            'time_to_first_interaction': time_to_first,
            'interactions_7d': interactions_7d,
            'time_to_conversion': time_to_conversion,
            'response_rate': response_rate,
            'sentiment_avg': round(sentiment_avg, 2),
            'industry': industry,
            'company_size': company_size,
            'converted': 1 if status == 'customer' else 0,
        }
        data.append(lead)
    
    df = pd.DataFrame(data)
    os.makedirs('data/processed', exist_ok=True)
    df.to_csv('data/processed/leads_training.csv', index=False)
    print(f"✅ Generados {n} leads sintéticos en data/processed/leads_training.csv")
    
    # Mostrar estadísticas básicas
    print(f"📊 Distribución de conversión: {df['converted'].mean():.2%}")
    print(f"📊 Distribución de fuentes: {df['source'].value_counts().to_dict()}")
    
    return df

if __name__ == "__main__":
    generate_leads(2000)