from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from drf_spectacular.utils import extend_schema
from django.db.models import Avg, Count, Q
from django.utils import timezone
from datetime import timedelta
from django.apps import apps


class LeadScoreView(APIView):
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary="Obtener lead score",
        description="Calcula probabilidad de conversión para un contacto (0-100)",
        tags=["Analytics"],
    )
    def get(self, request, contact_id):
        Contact = apps.get_model('contacts', 'Contact')
        Interaction = apps.get_model('interactions', 'Interaction')
        SentimentAnalysis = apps.get_model('analytics', 'SentimentAnalysis')
        
        try:
            contact = Contact.objects.get(pk=contact_id)
        except Contact.DoesNotExist:
            return Response(
                {"error": "Contacto no encontrado"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Obtener todas las interacciones del contacto
        all_interactions = Interaction.objects.filter(contact=contact).order_by('occurred_at')
        total_interactions = all_interactions.count()
        
        # 1. Tiempo hasta primera interacción
        first_interaction = all_interactions.first()
        if first_interaction:
            time_to_first = (first_interaction.occurred_at - contact.created_at).total_seconds() / 86400
            time_to_first = max(0, min(time_to_first, 30))
        else:
            time_to_first = 30
        
        # 2. Interacciones en últimos 7 días
        week_ago = timezone.now() - timedelta(days=7)
        interactions_7d = all_interactions.filter(occurred_at__gte=week_ago).count()
        
        # 3. Tasa de respuesta
        outbound = all_interactions.filter(direction='outbound').count()
        inbound = all_interactions.filter(direction='inbound').count()
        if outbound > 0:
            response_rate = min(1.0, inbound / outbound)
        else:
            response_rate = 0.5 if inbound > 0 else 0.1
        
        # 4. Sentimiento promedio REAL
        sentiment_qs = SentimentAnalysis.objects.filter(interaction__contact=contact)
        if sentiment_qs.exists():
            sentiment_values = []
            for s in sentiment_qs:
                if s.label == 'positive':
                    sentiment_values.append(5.0)
                elif s.label == 'negative':
                    sentiment_values.append(1.0)
                else:
                    sentiment_values.append(3.0)
            sentiment_avg = sum(sentiment_values) / len(sentiment_values)
        else:
            sentiment_avg = 3.0
        
        # 5. Industria y tamaño
        industry = 'tech'
        company_size = 5
        
        # Calcular score con reglas de negocio
        score = self._calculate_rule_based_score(
            contact, time_to_first, interactions_7d, response_rate, sentiment_avg
        )
        
        return Response({
            "contact_id": contact.id,
            "contact_name": contact.full_name,
            "lead_score": score,
            "label": self._get_label(score),
            "metrics": {
                "time_to_first_interaction_days": round(time_to_first, 1),
                "interactions_7d": interactions_7d,
                "total_interactions": total_interactions,
                "response_rate": round(response_rate, 2),
                "sentiment_avg": round(sentiment_avg, 2),
                "source": contact.source,
                "status": contact.status,
                "industry": industry,
                "company_size": company_size,
            }
        })
    
    def _calculate_rule_based_score(self, contact, time_to_first, interactions_7d, response_rate, sentiment_avg):
        """Calcula score basado en reglas de negocio"""
        score = 50  # Base
        
        # Tiempo de respuesta (menos es mejor)
        if time_to_first < 1:
            score += 15
        elif time_to_first < 3:
            score += 10
        elif time_to_first < 7:
            score += 5
        elif time_to_first > 15:
            score -= 10
        
        # Interacciones recientes
        if interactions_7d >= 5:
            score += 15
        elif interactions_7d >= 3:
            score += 10
        elif interactions_7d >= 1:
            score += 5
        else:
            score -= 5
        
        # Tasa de respuesta
        score += int(response_rate * 15)
        
        # Sentimiento
        if sentiment_avg >= 4:
            score += 15
        elif sentiment_avg >= 3.5:
            score += 8
        elif sentiment_avg >= 3:
            score += 3
        elif sentiment_avg < 2.5:
            score -= 10
        
        # Fuente
        if contact.source == 'referral':
            score += 10
        elif contact.source == 'organic':
            score += 5
        elif contact.source == 'meta_ads':
            score += 3
        
        # Estado
        if contact.status == 'customer':
            score += 20
        elif contact.status == 'prospect':
            score += 10
        elif contact.status == 'churned':
            score -= 20
        
        # Limitar entre 0 y 100
        return max(0, min(100, score))
    
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
        SentimentAnalysis = apps.get_model('analytics', 'SentimentAnalysis')
        
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