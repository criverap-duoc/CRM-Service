from rest_framework import serializers
from .models import Company


class CompanyListSerializer(serializers.ModelSerializer):
    """Serializer compacto para listados."""
    contact_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Company
        fields = (
            "id", "name", "industry", "size",
            "country", "contact_count", "created_at",
        )


class CompanySerializer(serializers.ModelSerializer):
    """Serializer completo para detalle y creación."""
    contact_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Company
        fields = (
            "id", "name", "industry", "size", "country",
            "website", "annual_revenue", "notes",
            "contact_count", "created_by",
            "created_at", "updated_at",
        )
        read_only_fields = ("created_by", "created_at", "updated_at")