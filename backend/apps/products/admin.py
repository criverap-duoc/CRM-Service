from django.contrib import admin
from .models import Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "sku", "category", "unit_price", "active", "created_at")
    list_filter = ("category", "active")
    search_fields = ("name", "sku", "description")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("name",)
