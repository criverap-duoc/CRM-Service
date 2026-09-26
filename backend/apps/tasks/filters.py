import django_filters
from django.utils import timezone
from .models import Task


class TaskFilter(django_filters.FilterSet):
    status = django_filters.MultipleChoiceFilter(choices=Task.Status.choices)
    priority = django_filters.MultipleChoiceFilter(choices=Task.Priority.choices)
    assigned_to = django_filters.NumberFilter(field_name="assigned_to__id")
    contact = django_filters.NumberFilter(field_name="contact__id")
    due_before = django_filters.DateTimeFilter(field_name="due_date", lookup_expr="lte")
    due_after = django_filters.DateTimeFilter(field_name="due_date", lookup_expr="gte")
    overdue = django_filters.BooleanFilter(method="filter_overdue")

    class Meta:
        model = Task
        fields = ["status", "priority", "assigned_to", "contact", "due_before", "due_after", "overdue"]

    def filter_overdue(self, queryset, name, value):
        """Filtra tareas vencidas (due_date < now, no completadas ni canceladas)."""
        if value is True:
            now = timezone.now()
            return queryset.filter(
                due_date__lt=now
            ).exclude(
                status__in=[Task.Status.COMPLETED, Task.Status.CANCELLED]
            )
        return queryset