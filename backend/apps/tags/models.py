from django.db import models
from django.conf import settings


class Tag(models.Model):
    """Etiqueta reutilizable para categorizar contactos."""

    name = models.CharField(max_length=50, unique=True)
    color = models.CharField(
        max_length=7,
        default="#6366f1",
        help_text="Color en formato hex (#RRGGBB)",
    )
    description = models.CharField(max_length=200, blank=True, default="")

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="tags_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Tag"
        verbose_name_plural = "Tags"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["name"]),
        ]

    def __str__(self):
        return self.name