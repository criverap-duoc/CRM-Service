from rest_framework import serializers
from .models import Product


class ProductListSerializer(serializers.ModelSerializer):
    """Serializer compacto para listados."""
    interested_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Product
        fields = (
            "id", "name", "sku", "category", "unit_price",
            "active", "interested_count",
        )


class ProductSerializer(serializers.ModelSerializer):
    """Serializer completo para detalle y creación."""
    interested_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Product
        fields = (
            "id", "name", "sku", "category", "unit_price",
            "description", "active", "interested_count",
            "created_by", "created_at", "updated_at",
        )
        read_only_fields = ("created_by", "created_at", "updated_at")
