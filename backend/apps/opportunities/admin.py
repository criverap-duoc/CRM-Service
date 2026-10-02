from django.contrib import admin
from .models import Opportunity


@admin.register(Opportunity)
class OpportunityAdmin(admin.ModelAdmin):
    list_display = (
        "name", "contact", "company", "amount", "stage",
        "probability", "expected_close_date", "assigned_to", "is_overdue",
    )
    list_filter = ("stage", "assigned_to", "company")
    search_fields = ("name", "contact__first_name", "contact__last_name")
    readonly_fields = ("created_at", "updated_at", "closed_at", "weighted_amount")
    ordering = ("-created_at",)
    date_hierarchy = "expected_close_date"

    @admin.display(boolean=True, description="Vencida")
    def is_overdue(self, obj):
        return obj.is_overdue

