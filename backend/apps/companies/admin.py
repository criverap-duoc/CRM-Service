from django.contrib import admin
from .models import Company


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ("name", "industry", "size", "country", "created_at")
    list_filter = ("industry", "size", "country")
    search_fields = ("name", "website", "notes")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("name",)