from django.db import models
from django.conf import settings


class Product(models.Model):
    """Producto o servicio del catálogo."""

    class Category(models.TextChoices):
        SOFTWARE = "software", "Software"
        HARDWARE = "hardware", "Hardware"
        SERVICE = "service", "Servicio"
        TRAINING = "training", "Capacitación"
        OTHER = "other", "Otro"

    name = models.CharField(max_length=200, unique=True)
    sku = models.CharField(max_length=50, unique=True)
    category = models.CharField(
        max_length=20, choices=Category.choices, default=Category.SOFTWARE
    )
    unit_price = models.DecimalField(
        max_digits=12, decimal_places=0,
        help_text="Precio unitario en CLP"
    )
    description = models.TextField(blank=True, default="")
    active = models.BooleanField(default=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="products_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Product"
        verbose_name_plural = "Products"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["category"]),
            models.Index(fields=["active"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.sku})"
