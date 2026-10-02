from django.db import models
from django.conf import settings
from django.utils import timezone


class Opportunity(models.Model):
    """Oportunidad comercial (deal) asociada a un contacto."""

    class Stage(models.TextChoices):
        DISCOVERY = "discovery", "Descubrimiento"
        PROPOSAL = "proposal", "Propuesta"
        NEGOTIATION = "negotiation", "Negociación"
        WON = "won", "Ganada"
        LOST = "lost", "Perdida"

    # Probabilidad sugerida por stage (usada solo si el usuario no setea una)
    DEFAULT_PROBABILITY_BY_STAGE = {
        "discovery": 20,
        "proposal": 50,
        "negotiation": 75,
        "won": 100,
        "lost": 0,
    }

    name = models.CharField(max_length=200)

    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.CASCADE,
        related_name="opportunities",
    )
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="opportunities",
    )

    amount = models.DecimalField(
        max_digits=12, decimal_places=0,
        help_text="Valor estimado en CLP"
    )
    stage = models.CharField(
        max_length=20, choices=Stage.choices, default=Stage.DISCOVERY
    )
    probability = models.IntegerField(
        default=0,
        help_text="Probabilidad de cierre (0-100)"
    )

    expected_close_date = models.DateField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    lost_reason = models.TextField(blank=True, default="")

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="opportunities_assigned",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="opportunities_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Opportunity"
        verbose_name_plural = "Opportunities"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["stage"]),
            models.Index(fields=["assigned_to"]),
            models.Index(fields=["expected_close_date"]),
            models.Index(fields=["contact", "stage"]),
        ]

    def __str__(self):
        return f"{self.name} [{self.get_stage_display()}]"

    @property
    def is_closed(self):
        return self.stage in (self.Stage.WON, self.Stage.LOST)

    @property
    def is_overdue(self):
        if not self.expected_close_date:
            return False
        if self.is_closed:
            return False
        return timezone.now().date() > self.expected_close_date

    @property
    def weighted_amount(self):
        """Amount ponderado por probabilidad (para forecast)."""
        if self.probability <= 0:
            return 0
        return float(self.amount) * (self.probability / 100.0)

    def save(self, *args, **kwargs):
        # Heredar company del contacto si no se especifica
        if self.company_id is None and self.contact_id is not None:
            self.company_id = self.contact.company_id

        # Si la probabilidad es 0 (default) y hay stage, sugerir por stage
        if not self.probability and self.stage in self.DEFAULT_PROBABILITY_BY_STAGE:
            self.probability = self.DEFAULT_PROBABILITY_BY_STAGE[self.stage]

        # Auto-set closed_at y forzar probabilidad al cerrar
        if self.stage == self.Stage.WON:
            self.probability = 100
            if not self.closed_at:
                self.closed_at = timezone.now()
            self.lost_reason = ""
        elif self.stage == self.Stage.LOST:
            self.probability = 0
            if not self.closed_at:
                self.closed_at = timezone.now()
        else:
            # Volvió de won/lost a un estado abierto → limpiar closed_at
            if self.closed_at:
                self.closed_at = None

        super().save(*args, **kwargs)
