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

    # Invalidar el cache de /segment/stats/: los clusters y sus stats
    # cambiaron con el reentrenamiento. Con Redis como backend el
    # delete alcanza al worker que sirve la API; con LocMemCache sólo
    # afectaría a la memoria de este proceso.
    from django.core.cache import cache
    cache.delete("segment_stats_v3")
    print("✅ Cache de /segment/stats/ invalidado")