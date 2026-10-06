from rest_framework import viewsets

from apps.analytics.cache_utils import invalidate_segment_stats_cache

from .models import Tag
from .serializers import TagSerializer
from .permissions import TagPermission


class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [TagPermission]

    def _invalidate_segment_cache(self):
        """Descartar el cache de /segment/stats/ tras mutar tags.

        tag_count es una de las features de segmentación
        (apps/analytics/ml/features.py).
        """
        invalidate_segment_stats_cache()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
        self._invalidate_segment_cache()

    def perform_update(self, serializer):
        serializer.save()
        self._invalidate_segment_cache()

    def perform_destroy(self, instance):
        instance.delete()
        self._invalidate_segment_cache()