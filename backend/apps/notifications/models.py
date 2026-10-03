from django.db import models
from django.conf import settings


class Notification(models.Model):
    """Notificación persistida para un usuario."""

    class Type(models.TextChoices):
        LEAD_ASSIGNED = "lead_assigned", "Lead asignado"
        WEBHOOK_RECEIVED = "webhook_received", "Webhook recibido"
        TASK_OVERDUE = "task_overdue", "Tarea vencida"
        OPPORTUNITY_WON = "opportunity_won", "Oportunidad ganada"
        SYSTEM = "system", "Sistema"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    type = models.CharField(
        max_length=30, choices=Type.choices, default=Type.SYSTEM
    )
    title = models.CharField(max_length=200)
    message = models.TextField(blank=True, default="")
    payload = models.JSONField(default=dict, blank=True)
    read = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "read"]),
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self):
        return f"[{self.type}] {self.title} → {self.user.username}"
