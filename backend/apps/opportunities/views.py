from datetime import date
from decimal import Decimal

from django.db.models import Count, Q, Sum, F, FloatField, ExpressionWrapper
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Opportunity
from .serializers import OpportunityListSerializer, OpportunitySerializer
from .filters import OpportunityFilter
from .permissions import OpportunityPermission


class OpportunityViewSet(viewsets.ModelViewSet):
    filterset_class = OpportunityFilter
    permission_classes = [OpportunityPermission]
    search_fields = ["name", "contact__first_name", "contact__last_name"]
    ordering_fields = ["created_at", "expected_close_date", "amount", "probability", "stage"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        qs = Opportunity.objects.select_related("contact", "company", "assigned_to", "created_by")

        if user.is_superuser or user.groups.filter(name="managers").exists():
            return qs.all()

        return qs.filter(
            Q(assigned_to=user) | Q(contact__assigned_to=user)
        ).distinct()

    def get_serializer_class(self):
        if self.action == "list":
            return OpportunityListSerializer
        return OpportunitySerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=["get"], url_path="pipeline")
    def pipeline(self, request):
        """Resumen por stage: count, suma y suma ponderada."""
        qs = self.get_queryset()
        result = []
        for stage_value, stage_label in Opportunity.Stage.choices:
            stage_qs = qs.filter(stage=stage_value)
            count = stage_qs.count()
            total = stage_qs.aggregate(s=Sum("amount"))["s"] or Decimal(0)
            weighted = sum(o.weighted_amount for o in stage_qs)
            result.append({
                "stage": stage_value,
                "label": stage_label,
                "count": count,
                "total_amount": float(total),
                "weighted_amount": round(weighted, 2),
            })
        return Response({"stages": result, "total_count": qs.count()})

    @action(detail=False, methods=["get"], url_path="forecast")
    def forecast(self, request):
        """Forecast por mes de cierre esperado (solo oportunidades abiertas)."""
        qs = self.get_queryset().exclude(
            stage__in=[Opportunity.Stage.WON, Opportunity.Stage.LOST]
        ).filter(expected_close_date__isnull=False)

        # Agrupar por año-mes
        months = {}
        for op in qs:
            key = op.expected_close_date.strftime("%Y-%m")
            if key not in months:
                months[key] = {
                    "month": key,
                    "count": 0,
                    "total_amount": 0.0,
                    "weighted_amount": 0.0,
                }
            months[key]["count"] += 1
            months[key]["total_amount"] += float(op.amount)
            months[key]["weighted_amount"] += op.weighted_amount

        forecast_list = sorted(months.values(), key=lambda x: x["month"])
        for row in forecast_list:
            row["total_amount"] = round(row["total_amount"], 2)
            row["weighted_amount"] = round(row["weighted_amount"], 2)

        return Response({"forecast": forecast_list})

    @action(detail=False, methods=["get"], url_path="my-summary")
    def my_summary(self, request):
        """Resumen del usuario autenticado."""
        user = request.user
        qs = Opportunity.objects.filter(assigned_to=user)

        counts = qs.aggregate(
            discovery=Count("id", filter=Q(stage=Opportunity.Stage.DISCOVERY)),
            proposal=Count("id", filter=Q(stage=Opportunity.Stage.PROPOSAL)),
            negotiation=Count("id", filter=Q(stage=Opportunity.Stage.NEGOTIATION)),
            won=Count("id", filter=Q(stage=Opportunity.Stage.WON)),
            lost=Count("id", filter=Q(stage=Opportunity.Stage.LOST)),
        )

        open_qs = qs.exclude(stage__in=[Opportunity.Stage.WON, Opportunity.Stage.LOST])
        pipeline_total = open_qs.aggregate(s=Sum("amount"))["s"] or Decimal(0)
        pipeline_weighted = sum(o.weighted_amount for o in open_qs)

        today = timezone.now().date()
        overdue_count = open_qs.filter(
            expected_close_date__lt=today
        ).count()

        return Response({
            "total": qs.count(),
            "by_stage": counts,
            "pipeline_total": float(pipeline_total),
            "pipeline_weighted": round(pipeline_weighted, 2),
            "overdue": overdue_count,
        })

