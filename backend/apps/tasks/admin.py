from django.contrib import admin
from .models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "contact", "assigned_to", "status", "priority", "due_date", "is_overdue")
    list_filter = ("status", "priority", "assigned_to")
    search_fields = ("title", "description", "contact__first_name", "contact__last_name")
    readonly_fields = ("created_at", "updated_at", "completed_at")
    ordering = ("-created_at",)
    date_hierarchy = "due_date"

    @admin.display(boolean=True, description="Vencida")
    def is_overdue(self, obj):
        return obj.is_overdue