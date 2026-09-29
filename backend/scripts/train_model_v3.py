import os
import sys
import django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "crm_service.settings.dev")
django.setup()

from apps.analytics.ml.lead_scoring_v3 import LeadScoringModelV3

if __name__ == "__main__":
    print("🚀 Entrenando Lead Scoring V3...")
    print("=" * 60)
    model = LeadScoringModelV3()
    model.train(optimize=True)