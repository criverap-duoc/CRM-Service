import csv
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from drf_spectacular.utils import extend_schema
from django.db.models import Avg, Count, Q
from django.utils import timezone
from datetime import timedelta
from django.apps import apps
from django.http import HttpResponse


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

class ExportContactsCSVView(APIView):
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary="Exportar contactos a CSV",
        description="Exporta todos los contactos a un archivo CSV",
        tags=["Analytics"],
    )
    def get(self, request):
        Contact = apps.get_model('contacts', 'Contact')
        Interaction = apps.get_model('interactions', 'Interaction')
        SentimentAnalysis = apps.get_model('analytics', 'SentimentAnalysis')
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="contactos.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'ID', 'Nombre', 'Email', 'Teléfono', 'Empresa', 
            'Estado', 'Fuente', 'Asignado a', 'Interacciones', 
            'Sentimiento Promedio', 'Creado', 'Actualizado'
        ])
        
        contacts = Contact.objects.select_related('assigned_to').all()
        
        for contact in contacts:
            # Calcular sentimiento promedio
            sentiments = SentimentAnalysis.objects.filter(interaction__contact=contact)
            if sentiments.exists():
                values = []
                for s in sentiments:
                    if s.label == 'positive':
                        values.append(5.0)
                    elif s.label == 'negative':
                        values.append(1.0)
                    else:
                        values.append(3.0)
                sentiment_avg = round(sum(values) / len(values), 2)
            else:
                sentiment_avg = '-'
            
            writer.writerow([
                contact.id,
                contact.full_name,
                contact.email,
                contact.phone or '-',
                contact.company or '-',
                contact.status,
                contact.source,
                contact.assigned_to.username if contact.assigned_to else '-',
                Interaction.objects.filter(contact=contact).count(),
                sentiment_avg,
                contact.created_at.strftime('%Y-%m-%d'),
                contact.updated_at.strftime('%Y-%m-%d'),
            ])
        
        return response


class ExportInteractionsCSVView(APIView):
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary="Exportar interacciones a CSV",
        description="Exporta todas las interacciones a un archivo CSV",
        tags=["Analytics"],
    )
    def get(self, request):
        Interaction = apps.get_model('interactions', 'Interaction')
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="interacciones.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'ID', 'Contacto', 'Email Contacto', 'Agente', 
            'Canal', 'Dirección', 'Asunto', 'Ocurrió', 'Creado'
        ])
        
        interactions = Interaction.objects.select_related('contact', 'agent').all()
        
        for interaction in interactions:
            writer.writerow([
                interaction.id,
                interaction.contact.full_name,
                interaction.contact.email,
                interaction.agent.username if interaction.agent else 'Bot',
                interaction.channel,
                interaction.direction,
                interaction.subject or '-',
                interaction.occurred_at.strftime('%Y-%m-%d %H:%M'),
                interaction.created_at.strftime('%Y-%m-%d %H:%M'),
            ])
        
        return response

class ChurnPredictionView(APIView):
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary="Predecir churn de un contacto",
        description="Calcula la probabilidad de que un contacto se vaya (churn)",
        tags=["Analytics"],
    )
    def get(self, request, contact_id):
        Contact = apps.get_model('contacts', 'Contact')
        Interaction = apps.get_model('interactions', 'Interaction')
        SentimentAnalysis = apps.get_model('analytics', 'SentimentAnalysis')
        
        try:
            contact = Contact.objects.get(pk=contact_id)
        except Contact.DoesNotExist:
            return Response({"error": "Contacto no encontrado"}, status=404)
        
        # Calcular features
        interactions = Interaction.objects.filter(contact=contact).order_by('occurred_at')
        
        first = interactions.first()
        time_to_first = (first.occurred_at - contact.created_at).total_seconds() / 86400 if first else 30
        time_to_first = max(0, min(time_to_first, 30))
        
        week_ago = timezone.now() - timedelta(days=7)
        interactions_7d = interactions.filter(occurred_at__gte=week_ago).count()
        
        outbound = interactions.filter(direction='outbound').count()
        inbound = interactions.filter(direction='inbound').count()
        response_rate = min(1.0, inbound / outbound) if outbound > 0 else 0.5
        
        sentiments = SentimentAnalysis.objects.filter(interaction__contact=contact)
        if sentiments.exists():
            values = [5.0 if s.label == 'positive' else 1.0 if s.label == 'negative' else 3.0 for s in sentiments]
            sentiment_avg = sum(values) / len(values)
        else:
            sentiment_avg = 3.0
        
        from .ml.churn_prediction import model_churn
        churn_prob = model_churn.predict({
            'source': contact.source,
            'time_to_first_interaction': time_to_first,
            'interactions_7d': interactions_7d,
            'response_rate': response_rate,
            'sentiment_avg': sentiment_avg,
            'industry': 'tech',
            'company_size': 5,
        })
        
        # Si no hay modelo, calcular con reglas
        if churn_prob is None:
            churn_prob = 50  # Base
            
            # Clientes activos tienen bajo churn
            if contact.status == 'customer':
                churn_prob = 20 if interactions_7d > 0 else 40
            # Prospects tienen churn medio
            elif contact.status == 'prospect':
                churn_prob = 40 if interactions_7d > 0 else 60
            # Leads tienen churn alto
            elif contact.status == 'lead':
                churn_prob = 60 if interactions_7d > 0 else 80
            # Churned ya se fue
            elif contact.status == 'churned':
                churn_prob = 95
            
            # Ajustar por sentimiento
            if sentiment_avg >= 4:
                churn_prob -= 10
            elif sentiment_avg < 2.5:
                churn_prob += 10
            
            # Ajustar por interacciones
            if total_interactions > 5:
                churn_prob -= 10
            elif total_interactions == 0:
                churn_prob += 15
            
            churn_prob = max(0, min(100, churn_prob))


class LeadSegmentationView(APIView):
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary="Segmentar un contacto",
        description="Asigna un segmento al contacto basado en clustering",
        tags=["Analytics"],
    )
    def get(self, request, contact_id):
        Contact = apps.get_model('contacts', 'Contact')
        Interaction = apps.get_model('interactions', 'Interaction')
        
        try:
            contact = Contact.objects.get(pk=contact_id)
        except Contact.DoesNotExist:
            return Response({"error": "Contacto no encontrado"}, status=404)
        
        interactions = Interaction.objects.filter(contact=contact)
        total = interactions.count()
        
        first = interactions.order_by('occurred_at').first()
        time_to_first = (first.occurred_at - contact.created_at).total_seconds() / 86400 if first else 30
        time_to_first = max(0, min(time_to_first, 30))
        
        week_ago = timezone.now() - timedelta(days=7)
        interactions_7d = interactions.filter(occurred_at__gte=week_ago).count()
        
        outbound = interactions.filter(direction='outbound').count()
        inbound = interactions.filter(direction='inbound').count()
        response_rate = min(1.0, inbound / outbound) if outbound > 0 else 0.5
        
        from .ml.segmentation import model_segmentation
        segment = model_segmentation.predict({
            'source': contact.source,
            'time_to_first_interaction': time_to_first,
            'interactions_7d': interactions_7d,
            'response_rate': response_rate,
            'sentiment_avg': 3.5,
        })
        
        if segment is None:
            # Fallback: segmentación por reglas
            if contact.status == 'customer':
                segment = {'cluster': 0, 'label': 'Cliente activo'}
            elif contact.status == 'prospect' and interactions_7d > 0:
                segment = {'cluster': 1, 'label': 'Prospect con actividad'}
            else:
                segment = {'cluster': 2, 'label': 'Lead por nutrir'}
        
        return Response({
            'contact_id': contact.id,
            'contact_name': contact.full_name,
            'segment': segment,
        })

class AgentDashboardView(APIView):
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary="Dashboard de agentes",
        description="Métricas por agente: leads asignados, conversiones, etc.",
        tags=["Analytics"],
    )
    def get(self, request):
        Contact = apps.get_model('contacts', 'Contact')
        Interaction = apps.get_model('interactions', 'Interaction')
        User = apps.get_model('auth', 'User')
        
        agents = User.objects.filter(contacts__isnull=False).distinct()
        
        data = []
        for agent in agents:
            agent_contacts = Contact.objects.filter(assigned_to=agent)
            total = agent_contacts.count()
            customers = agent_contacts.filter(status='customer').count()
            leads = agent_contacts.filter(status='lead').count()
            prospects = agent_contacts.filter(status='prospect').count()
            churned = agent_contacts.filter(status='churned').count()
            
            conversion_rate = (customers / total * 100) if total > 0 else 0
            
            # Interacciones del agente
            interactions_count = Interaction.objects.filter(agent=agent).count()
            
            data.append({
                'agent_id': agent.id,
                'agent_username': agent.username,
                'agent_email': agent.email,
                'total_contacts': total,
                'leads': leads,
                'prospects': prospects,
                'customers': customers,
                'churned': churned,
                'conversion_rate': round(conversion_rate, 1),
                'total_interactions': interactions_count,
            })
        
        # Ordenar por tasa de conversión
        data.sort(key=lambda x: x['conversion_rate'], reverse=True)
        
        return Response({
            'agents': data,
            'total_agents': len(data),
        })