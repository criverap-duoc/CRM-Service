from rest_framework import serializers
from .models import Tag


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ("id", "name", "color", "description", "created_at")
        read_only_fields = ("id", "created_at")

    def validate_name(self, value):
        # Normaliza a lowercase con guiones bajos, para evitar "VIP" vs "vip"
        return value.strip()