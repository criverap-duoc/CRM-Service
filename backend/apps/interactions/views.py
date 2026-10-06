## crm_service\apps\interactions\views.py
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters import rest_framework as filters
from drf_spectacular.utils import extend_schema, extend_schema_view

from apps.analytics.cache_utils import invalidate_segment_stats_cache

from .models import Interaction
from .serializers import InteractionSerializer, InteractionListSerializer


class InteractionFilter(filters.FilterSet):
    contact = filters.NumberFilter(field_name="contact__id")
    channel = filters.MultipleChoiceFilter(choices=Interaction.Channel.choices)
    direction = filters.ChoiceFilter(choices=Interaction.Direction.choices)
    occurred_after = filters.DateTimeFilter(field_name="occurred_at", lookup_expr="gte")
    occurred_before = filters.DateTimeFilter(field_name="occurred_at", lookup_expr="lte")

    class Meta:
        model = Interaction
        fields = ["contact", "channel", "direction", "occurred_after", "occurred_before"]


@extend_schema_view(
    list=extend_schema(summary="List interactions", tags=["Interactions"]),
    create=extend_schema(summary="Log an interaction", tags=["Interactions"]),
    retrieve=extend_schema(summary="Get interaction", tags=["Interactions"]),
    update=extend_schema(summary="Update interaction", tags=["Interactions"]),
    partial_update=extend_schema(summary="Partial update interaction", tags=["Interactions"]),
    destroy=extend_schema(summary="Delete interaction", tags=["Interactions"]),
)
class InteractionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filterset_class = InteractionFilter
    search_fields = ["subject", "body", "external_id"]
    ordering_fields = ["occurred_at", "channel"]

    def get_queryset(self):
        return Interaction.objects.select_related("contact", "agent").all()

    def get_serializer_class(self):
        if self.action == "list":
            return InteractionListSerializer
        return InteractionSerializer

    def _invalidate_segment_cache(self):
        """Descartar el cache de /segment/stats/ tras mutar interacciones.

        total_interactions, interactions_7d, sentiment_avg y
        response_rate se calculan desde Interaction, así que loguear,
        editar o borrar una interacción puede mover el segmento de un
        contacto (apps/analytics/ml/features.py).
        """
        invalidate_segment_stats_cache()

    def perform_create(self, serializer):
        if not serializer.validated_data.get("agent"):
            serializer.save(agent=self.request.user)
        else:
            serializer.save()
        self._invalidate_segment_cache()

    def perform_update(self, serializer):
        serializer.save()
        self._invalidate_segment_cache()

    def perform_destroy(self, instance):
        instance.delete()
        self._invalidate_segment_cache()
