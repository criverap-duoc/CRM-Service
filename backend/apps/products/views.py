from django.db.models import Count
from rest_framework import viewsets

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

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
