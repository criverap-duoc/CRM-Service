from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q
from django.utils import timezone

from apps.analytics.cache_utils import invalidate_segment_stats_cache

from .models import Task
from .serializers import TaskListSerializer, TaskSerializer
from .filters import TaskFilter
from .permissions import TaskPermission


class TaskViewSet(viewsets.ModelViewSet):
    filterset_class = TaskFilter
    permission_classes = [TaskPermission]
    search_fields = ["title", "description", "contact__first_name", "contact__last_name"]
    ordering_fields = ["created_at", "due_date", "priority", "status"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        base_qs = Task.objects.select_related("contact", "assigned_to", "created_by")

        if user.is_superuser or user.groups.filter(name="managers").exists():
            return base_qs.all()

        # Agent: tareas asignadas a él o de sus contactos
        return base_qs.filter(
            Q(assigned_to=user) | Q(contact__assigned_to=user)
        ).distinct()

    def get_serializer_class(self):
        if self.action == "list":
            return TaskListSerializer
        return TaskSerializer

    def _invalidate_segment_cache(self):
        """Descartar el cache de /segment/stats/ tras mutar tareas.

        total_tasks y overdue_tasks entran en las features de
        segmentación (apps/analytics/ml/features.py).
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

    @action(detail=False, methods=["get"], url_path="overdue")
    def overdue(self, request):
        """Lista de tareas vencidas (due_date < now, no completadas)."""
        now = timezone.now()
        qs = self.get_queryset().filter(
            due_date__lt=now
        ).exclude(
            status__in=[Task.Status.COMPLETED, Task.Status.CANCELLED]
        ).order_by("due_date")

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = TaskListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = TaskListSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="my-summary")
    def my_summary(self, request):
        """Resumen de tareas del usuario autenticado por estado."""
        user = request.user
        qs = Task.objects.filter(assigned_to=user)

        counts = qs.aggregate(
            pending=Count("id", filter=Q(status=Task.Status.PENDING)),
            in_progress=Count("id", filter=Q(status=Task.Status.IN_PROGRESS)),
            completed=Count("id", filter=Q(status=Task.Status.COMPLETED)),
            cancelled=Count("id", filter=Q(status=Task.Status.CANCELLED)),
        )

        now = timezone.now()
        overdue_count = qs.filter(
            due_date__lt=now
        ).exclude(
            status__in=[Task.Status.COMPLETED, Task.Status.CANCELLED]
        ).count()

        return Response({
            "total": qs.count(),
            "by_status": counts,
            "overdue": overdue_count,
        })