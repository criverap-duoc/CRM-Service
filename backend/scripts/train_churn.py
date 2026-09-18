import os
import sys
import django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_service.settings.dev')
django.setup()

from apps.analytics.ml.churn_prediction import ChurnPredictionModel

if __name__ == "__main__":
    print("🚀 Entrenando modelo de Churn...")
    model = ChurnPredictionModel()
    model.train()
    print("✅ Proceso completado")