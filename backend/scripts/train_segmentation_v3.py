import os
import sys
import django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "crm_service.settings.dev")
django.setup()

from apps.analytics.ml.segmentation_v3 import SegmentationModelV3

if __name__ == "__main__":
    print("🚀 Entrenando Segmentación V3...")
    print("=" * 60)
    model = SegmentationModelV3()
    model.train()