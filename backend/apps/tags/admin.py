from django.contrib import admin
from .models import Tag


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ("name", "color", "description", "created_at")
    search_fields = ("name", "description")
    readonly_fields = ("created_at",)
    ordering = ("name",)