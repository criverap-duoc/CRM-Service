import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_service.settings.dev')
django.setup()

from apps.analytics.ml.lead_scoring import LeadScoringModel

if __name__ == "__main__":
    print("🚀 Entrenando modelo de Lead Scoring...")
    print("-" * 40)
    
    model = LeadScoringModel()
    try:
        model.train()
        print("-" * 40)
        print("✅ Modelo guardado correctamente")
    except FileNotFoundError as e:
        print(f"❌ Error: {e}")
        print("   Ejecuta primero: python data/generate_leads.py")