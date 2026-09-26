from django.db import models
from django.conf import settings
from django.utils import timezone


class Task(models.Model):
    """Tarea asociada a un contacto, asignada a un agente."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pendiente"
        IN_PROGRESS = "in_progress", "En progreso"
        COMPLETED = "completed", "Completada"
        CANCELLED = "cancelled", "Cancelada"

    class Priority(models.TextChoices):
        LOW = "low", "Baja"
        MEDIUM = "medium", "Media"
        HIGH = "high", "Alta"
        URGENT = "urgent", "Urgente"

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")

    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.CASCADE,
        related_name="tasks",
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="tasks_assigned",
    )

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    priority = models.CharField(
        max_length=20, choices=Priority.choices, default=Priority.MEDIUM
    )

    due_date = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="tasks_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["priority"]),
            models.Index(fields=["due_date"]),
            models.Index(fields=["assigned_to"]),
            models.Index(fields=["contact", "status"]),
        ]

    def __str__(self):
        return f"{self.title} [{self.status}]"

    @property
    def is_overdue(self):
        """True si está vencida (due_date pasó y no está completada ni cancelada)."""
        if not self.due_date:
            return False
        if self.status in (self.Status.COMPLETED, self.Status.CANCELLED):
            return False
        return timezone.now() > self.due_date

    def save(self, *args, **kwargs):
        # Auto-setear completed_at cuando pasa a completed
        if self.status == self.Status.COMPLETED and not self.completed_at:
            self.completed_at = timezone.now()
        # Limpiar completed_at si vuelve a un estado no completado
        elif self.status != self.Status.COMPLETED and self.completed_at:
            self.completed_at = None
        super().save(*args, **kwargs)