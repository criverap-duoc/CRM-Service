import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_service.settings.dev')
django.setup()

from apps.analytics.ml.lead_scoring_v2 import LeadScoringModelV2

if __name__ == "__main__":
    print("🚀 Entrenando modelo de Lead Scoring V2...")
    print("-" * 40)
    
    model = LeadScoringModelV2()
    try:
        model.train(optimize=True)
        print("-" * 40)
        print("✅ Modelo V2 guardado correctamente")
    except FileNotFoundError as e:
        print(f"❌ Error: {e}")
        print("   Ejecuta primero: python data/generate_leads.py")