import os
import sys
import django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_service.settings.dev')
django.setup()

from apps.analytics.ml.segmentation import LeadSegmentationModel

if __name__ == "__main__":
    print("🚀 Entrenando modelo de Segmentación...")
    model = LeadSegmentationModel()
    model.train()
    print("✅ Proceso completado")