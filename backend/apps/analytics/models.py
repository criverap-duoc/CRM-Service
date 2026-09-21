## backend\apps\analytics\models.py
from django.db import models

class SentimentAnalysis(models.Model):
    """Almacena análisis de sentimiento para interacciones"""
    interaction = models.OneToOneField(
        'interactions.Interaction',  # Usar string para evitar import circular
        on_delete=models.CASCADE,
        related_name='sentiment_analysis'
    )
    label = models.CharField(
        max_length=10,
        choices=[
            ('positive', 'Positivo'),
            ('neutral', 'Neutral'),
            ('negative', 'Negativo'),
        ],
        default='neutral'
    )
    score = models.FloatField(default=0.5, help_text="0-1, donde 1 es muy positivo")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['label']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"Sentiment for {self.interaction}: {self.label} ({self.score})"