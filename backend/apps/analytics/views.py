from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from drf_spectacular.utils import extend_schema

from .ml.lead_scoring import get_lead_score
from apps.contacts.models import Contact
from apps.interactions.models import Interaction
from django.db.models import Count, Avg, Q
from django.utils import timezone
from datetime import timedelta
from .models import SentimentAnalysis
from apps.integrations.clients import OpenAIClient
from django.apps import apps

class LeadScoreView(APIView):
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary="Obtener lead score",
        description="Calcula probabilidad de conversión para un contacto (0-100)",
        tags=["Analytics"],
    )
    def get(self, request, contact_id):
        try:
            contact = Contact.objects.get(pk=contact_id)
        except Contact.DoesNotExist:
            return Response(
                {"error": "Contacto no encontrado"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Extraer datos para el modelo
        source = contact.source
        
        # Calcular tiempo hasta primera interacción
        first_interaction = Interaction.objects.filter(contact=contact).order_by('occurred_at').first()
        if first_interaction:
            time_to_first = (first_interaction.occurred_at - contact.created_at).total_seconds() / 86400
            time_to_first = min(time_to_first, 30)
        else:
            time_to_first = 30  # Sin interacciones, se asume 30 días
        
        # Interacciones en últimos 7 días
        week_ago = timezone.now() - timedelta(days=7)
        interactions_7d = Interaction.objects.filter(
            contact=contact, 
            occurred_at__gte=week_ago
        ).count()
        
        # Tasa de respuesta (simulada para demo)
        total_interactions = Interaction.objects.filter(contact=contact).count()
        if total_interactions > 0:
            response_rate = min(1.0, interactions_7d / max(1, total_interactions))
        else:
            response_rate = 0.1
        
        # Sentimiento promedio (simulado)
        sentiment_avg = 3.5
        
        # Industria y tamaño (valores por defecto)
        industry = 'tech'
        company_size = 5
        
        # Calcular score
        score = get_lead_score(
            source=source,
            time_to_first=time_to_first,
            interactions_7d=interactions_7d,
            response_rate=response_rate,
            sentiment_avg=sentiment_avg,
            industry=industry,
            company_size=company_size
        )
        
        return Response({
            "contact_id": contact.id,
            "contact_name": contact.full_name,
            "lead_score": score,
            "label": self._get_label(score),
            "metrics": {
                "time_to_first_interaction_days": round(time_to_first, 1),
                "interactions_7d": interactions_7d,
                "response_rate": round(response_rate, 2),
                "total_interactions": total_interactions,
                "source": source
            }
        })
    
    def _get_label(self, score):
        if score >= 80:
            return "🔥 Alta prioridad - Contactar ahora"
        elif score >= 60:
            return "⚡ Media prioridad - Seguimiento pronto"
        elif score >= 40:
            return "📊 Prioridad normal - Monitorear"
        else:
            return "📉 Baja prioridad - Nutrir"

class SentimentAnalysisView(APIView):
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary="Analizar sentimiento de una interacción",
        description="Analiza el sentimiento de una interacción usando OpenAI",
        tags=["Analytics"],
    )
    def post(self, request, interaction_id):
        Interaction = apps.get_model('interactions', 'Interaction')
        
        try:
            interaction = Interaction.objects.get(pk=interaction_id)
        except Interaction.DoesNotExist:
            return Response(
                {"error": "Interacción no encontrada"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificar si ya tiene análisis
        if hasattr(interaction, 'sentiment_analysis'):
            analysis = interaction.sentiment_analysis
            return Response({
                "interaction_id": interaction.id,
                "label": analysis.label,
                "score": analysis.score,
                "analyzed_at": analysis.created_at,
                "cached": True
            })
        
        # Analizar sentimiento
        from apps.integrations.clients import OpenAIClient
        client = OpenAIClient()
        text = f"{interaction.subject or ''} {interaction.body or ''}".strip()
        
        if not text:
            return Response(
                {"error": "La interacción no tiene texto para analizar"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            result = client.analyze_sentiment(text)
        except Exception as e:
            return Response(
                {"error": f"Error al analizar sentimiento: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY
            )
        
        # Guardar análisis
        SentimentAnalysis = apps.get_model('analytics', 'SentimentAnalysis')
        analysis = SentimentAnalysis.objects.create(
            interaction=interaction,
            label=result['label'],
            score=result['score']
        )
        
        return Response({
            "interaction_id": interaction.id,
            "label": analysis.label,
            "score": analysis.score,
            "analyzed_at": analysis.created_at,
            "cached": False
        })


class SentimentStatsView(APIView):
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary="Estadísticas de sentimiento",
        description="Obtiene estadísticas agregadas de sentimiento por contacto",
        tags=["Analytics"],
    )
    def get(self, request):
        SentimentAnalysis = apps.get_model('analytics', 'SentimentAnalysis')
        
        contact_id = request.query_params.get('contact_id')
        
        queryset = SentimentAnalysis.objects.all()
        
        if contact_id:
            queryset = queryset.filter(interaction__contact_id=contact_id)
        
        stats = queryset.aggregate(
            avg_score=Avg('score'),
            positive_count=Count('id', filter=Q(label='positive')),
            neutral_count=Count('id', filter=Q(label='neutral')),
            negative_count=Count('id', filter=Q(label='negative')),
        )
        
        total = stats['positive_count'] + stats['neutral_count'] + stats['negative_count']
        
        return Response({
            "avg_score": round(stats['avg_score'] or 0.5, 2),
            "distribution": {
                "positive": stats['positive_count'],
                "neutral": stats['neutral_count'],
                "negative": stats['negative_count'],
                "total": total
            },
            "contact_id": contact_id if contact_id else "all"
        })