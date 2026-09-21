## backend\scripts\export_real_data.py
"""
Exporta datos reales de la base de datos para entrenar el modelo ML.
"""
import os
import sys
import django
import pandas as pd
from datetime import timedelta

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_service.settings.dev')
django.setup()

from django.utils import timezone
from apps.contacts.models import Contact
from apps.interactions.models import Interaction
from apps.analytics.models import SentimentAnalysis


def export_data():
    """Exporta contactos e interacciones a un CSV para entrenamiento"""
    data = []
    
    for contact in Contact.objects.all():
        # Interacciones del contacto
        interactions = Interaction.objects.filter(contact=contact).order_by('occurred_at')
        total = interactions.count()
        
        # Tiempo hasta primera interacción
        first = interactions.first()
        if first:
            time_to_first = (first.occurred_at - contact.created_at).total_seconds() / 86400
            time_to_first = max(0, min(time_to_first, 30))
        else:
            time_to_first = 30
        
        # Interacciones en últimos 7 días
        week_ago = timezone.now() - timedelta(days=7)
        interactions_7d = interactions.filter(occurred_at__gte=week_ago).count()
        
        # Tasa de respuesta
        outbound = interactions.filter(direction='outbound').count()
        inbound = interactions.filter(direction='inbound').count()
        if outbound > 0:
            response_rate = min(1.0, inbound / outbound)
        else:
            response_rate = 0.5 if inbound > 0 else 0.1
        
        # Sentimiento promedio
        sentiments = SentimentAnalysis.objects.filter(interaction__contact=contact)
        if sentiments.exists():
            values = []
            for s in sentiments:
                if s.label == 'positive':
                    values.append(5.0)
                elif s.label == 'negative':
                    values.append(1.0)
                else:
                    values.append(3.0)
            sentiment_avg = sum(values) / len(values)
        else:
            sentiment_avg = 3.0
        
        # Target: converted (1 si es customer, 0 si no)
        converted = 1 if contact.status == 'customer' else 0
        
        data.append({
            'source': contact.source,
            'time_to_first_interaction': time_to_first,
            'interactions_7d': interactions_7d,
            'response_rate': response_rate,
            'sentiment_avg': sentiment_avg,
            'industry': 'tech',  # Por defecto
            'company_size': 5,   # Por defecto
            'converted': converted,
        })
    
    df = pd.DataFrame(data)
    df.to_csv('data/processed/real_leads.csv', index=False)
    print(f"✅ Exportados {len(df)} registros a data/processed/real_leads.csv")
    print(f"📊 Distribución de conversión: {df['converted'].mean():.2%}")
    return df


if __name__ == "__main__":
    export_data()
