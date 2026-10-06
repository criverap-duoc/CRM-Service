from django.db.models import Count
from rest_framework import viewsets

from apps.analytics.cache_utils import invalidate_segment_stats_cache

from .models import Product
from .serializers import ProductListSerializer, ProductSerializer
from .filters import ProductFilter
from .permissions import ProductPermission


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    permission_classes = [ProductPermission]
    filterset_class = ProductFilter
    search_fields = ["name", "sku", "description"]
    ordering_fields = ["name", "unit_price", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        return Product.objects.annotate(
            interested_count=Count("interested_contacts", distinct=True)
        )

    def get_serializer_class(self):
        if self.action == "list":
            return ProductListSerializer
        return ProductSerializer

    def _invalidate_segment_cache(self):
        """Descartar el cache de /segment/stats/ tras mutar productos.

        Los intereses de un contacto son productos: unit_price y category
        alimentan avg_interest_price, interest_category_diversity y
        has_high_value_interest (apps/analytics/ml/features.py).
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
