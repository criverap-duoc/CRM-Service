from django.db import models
from django.conf import settings


class Company(models.Model):
    """Empresa o cuenta a la que pueden pertenecer uno o más contactos."""

    class Size(models.TextChoices):
        STARTUP = "startup", "Startup (1-10)"
        SMALL = "small", "Pequeña (11-50)"
        MEDIUM = "medium", "Mediana (51-200)"
        LARGE = "large", "Grande (201-1000)"
        ENTERPRISE = "enterprise", "Corporación (1000+)"

    class Industry(models.TextChoices):
        TECHNOLOGY = "technology", "Tecnología"
        RETAIL = "retail", "Retail"
        FINANCE = "finance", "Finanzas"
        HEALTH = "health", "Salud"
        EDUCATION = "education", "Educación"
        MANUFACTURING = "manufacturing", "Manufactura"
        SERVICES = "services", "Servicios"
        OTHER = "other", "Otra"

    name = models.CharField(max_length=200, unique=True)
    industry = models.CharField(
        max_length=20, choices=Industry.choices, default=Industry.OTHER
    )
    size = models.CharField(
        max_length=20, choices=Size.choices, default=Size.SMALL
    )
    country = models.CharField(max_length=100, blank=True, default="")
    website = models.URLField(blank=True, default="")
    annual_revenue = models.BigIntegerField(
        null=True, blank=True,
        help_text="Ingresos anuales estimados en CLP"
    )
    notes = models.TextField(blank=True, default="")

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="companies_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Company"
        verbose_name_plural = "Companies"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["industry"]),
            models.Index(fields=["size"]),
        ]

    def __str__(self):
        return self.name