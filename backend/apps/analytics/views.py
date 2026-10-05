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
from apps.analytics.ml.features import build_features_for_contact
from apps.analytics.ml.lead_scoring_v3 import model_lead_v3
from apps.analytics.ml.churn_prediction_v3 import model_churn_v3
from apps.analytics.ml.segmentation_v3 import model_segmentation_v3

class LeadScoreView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Obtener lead score",
        description="Calcula probabilidad de conversión para un contacto (0-100) con el modelo V3.",
        tags=["Analytics"],
    )
    def get(self, request, contact_id):
        Contact = apps.get_model("contacts", "Contact")

        try:
            contact = (
                Contact.objects
                .select_related("company")
                .prefetch_related("tags", "tasks", "interactions")
                .get(pk=contact_id)
            )
        except Contact.DoesNotExist:
            return Response(
                {"error": {"code": "not_found", "message": "Contacto no encontrado"}},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Construir features (vía módulo unificado)
        features = build_features_for_contact(contact)

        # Intentar modelo ML; fallback a reglas si no existe
        used_model = "ml_v3"
        try:
            score = model_lead_v3.predict(features)
        except Exception as e:
            score = self._rule_based_score(contact, features)
            used_model = f"rule_based (fallback: {type(e).__name__})"

        return Response({
            "contact_id": contact.id,
            "contact_name": contact.full_name,
            "lead_score": score,
            "label": self._get_label(score),
            "model_used": used_model,
            "features": {
                k: v for k, v in features.items()
                if k in (
                    "total_interactions", "interactions_7d",
                    "interaction_frequency", "days_since_last_interaction",
                    "response_rate", "sentiment_avg",
                    "company_industry", "company_size",
                    "tag_count", "total_tasks", "overdue_tasks",
                    "interest_count", "avg_interest_price",
                    "interest_category_diversity", "has_high_value_interest",
                    "opportunity_count_total", "opportunity_count_open",
                    "pipeline_value_total", "pipeline_value_weighted",
                    "avg_deal_probability", "has_won_deal",
                    "has_lost_deal", "days_since_last_won",
                )
            },
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

    def _rule_based_score(self, contact, features):
        """Fallback si el modelo no está disponible."""
        score = 50
        ttf = features.get("time_to_first_interaction", 30)
        int7d = features.get("interactions_7d", 0)
        rate = features.get("response_rate", 0)
        sent = features.get("sentiment_avg", 3)

        if ttf < 1:
            score += 15
        elif ttf < 3:
            score += 10
        elif ttf < 7:
            score += 5
        elif ttf > 15:
            score -= 10

        if int7d >= 5:
            score += 15
        elif int7d >= 3:
            score += 10
        elif int7d >= 1:
            score += 5
        else:
            score -= 5

        score += int(rate * 15)

        if sent >= 4:
            score += 15
        elif sent >= 3.5:
            score += 8
        elif sent >= 3:
            score += 3
        elif sent < 2.5:
            score -= 10

        if contact.source == "referral":
            score += 10
        elif contact.source == "organic":
            score += 5
        elif contact.source == "meta_ads":
            score += 3

        if contact.status == "customer":
            score += 20
        elif contact.status == "prospect":
            score += 10
        elif contact.status == "churned":
            score -= 20

        return max(0, min(100, score))


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
        description="Calcula la probabilidad de que un contacto se vaya (0-100) con el modelo V3.",
        tags=["Analytics"],
    )
    def get(self, request, contact_id):
        Contact = apps.get_model("contacts", "Contact")

        try:
            contact = (
                Contact.objects
                .select_related("company")
                .prefetch_related("tags", "tasks", "interactions")
                .get(pk=contact_id)
            )
        except Contact.DoesNotExist:
            return Response(
                {"error": {"code": "not_found", "message": "Contacto no encontrado"}},
                status=status.HTTP_404_NOT_FOUND,
            )

        features = build_features_for_contact(contact)

        used_model = "ml_v3"
        try:
            churn_prob = model_churn_v3.predict(features)
            if churn_prob is None:
                raise ValueError("Modelo no disponible")
        except Exception as e:
            churn_prob = self._rule_based_churn(contact, features)
            used_model = f"rule_based (fallback: {type(e).__name__})"

        return Response({
            "contact_id": contact.id,
            "contact_name": contact.full_name,
            "churn_probability": churn_prob,
            "risk_level": self._risk_level(churn_prob),
            "model_used": used_model,
            "key_factors": {
                "days_since_last_interaction": features["days_since_last_interaction"],
                "interaction_frequency": features["interaction_frequency"],
                "sentiment_avg": features["sentiment_avg"],
                "overdue_tasks": features["overdue_tasks"],
                "has_risk_tag": features["has_risk_tag"],
            },
        })

    def _risk_level(self, prob):
        if prob >= 70:
            return "🚨 Alto riesgo"
        elif prob >= 40:
            return "⚠️ Riesgo medio"
        else:
            return "✅ Bajo riesgo"

    def _rule_based_churn(self, contact, features):
        prob = 50
        if contact.status == "customer":
            prob = 20 if features["interactions_7d"] > 0 else 40
        elif contact.status == "prospect":
            prob = 40 if features["interactions_7d"] > 0 else 60
        elif contact.status == "lead":
            prob = 60 if features["interactions_7d"] > 0 else 80
        elif contact.status == "churned":
            prob = 95

        if features["sentiment_avg"] >= 4:
            prob -= 10
        elif features["sentiment_avg"] < 2.5:
            prob += 10

        if features["total_interactions"] > 5:
            prob -= 10
        elif features["total_interactions"] == 0:
            prob += 15

        return max(0, min(100, prob))


class LeadSegmentationView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Segmentar un contacto",
        description="Asigna un segmento al contacto basado en K-Means V3.",
        tags=["Analytics"],
    )
    def get(self, request, contact_id):
        Contact = apps.get_model("contacts", "Contact")

        try:
            contact = (
                Contact.objects
                .select_related("company")
                .prefetch_related("tags", "tasks", "interactions")
                .get(pk=contact_id)
            )
        except Contact.DoesNotExist:
            return Response(
                {"error": {"code": "not_found", "message": "Contacto no encontrado"}},
                status=status.HTTP_404_NOT_FOUND,
            )

        features = build_features_for_contact(contact)

        used_model = "ml_v3"
        segment = None
        try:
            segment = model_segmentation_v3.predict(features)
            if segment is None:
                raise ValueError("Modelo no disponible")
        except Exception as e:
            segment = self._rule_based_segment(contact, features)
            used_model = f"rule_based (fallback: {type(e).__name__})"

        return Response({
            "contact_id": contact.id,
            "contact_name": contact.full_name,
            "segment": segment,
            "model_used": used_model,
        })

    def _rule_based_segment(self, contact, features):
        if contact.status == "customer":
            return {"cluster": 1, "label": "🏆 Cliente consolidado", "stats": None}
        elif contact.status == "prospect" and features["interactions_7d"] > 0:
            return {"cluster": 2, "label": "⚡ Prospect activo", "stats": None}
        else:
            return {"cluster": 0, "label": "📉 Lead frío o en riesgo", "stats": None}

class SegmentStatsView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Estadísticas de segmentos",
        description="Distribución de contactos por cluster (K-Means V3).",
        tags=["Analytics"],
    )
    def get(self, request):
        Contact = apps.get_model("contacts", "Contact")

        contacts = (
            Contact.objects
            .select_related("company")
            .prefetch_related("tags", "tasks", "interactions")
        )

        counts = {0: 0, 1: 0, 2: 0}
        analyzed = 0

        for contact in contacts:
            features = build_features_for_contact(contact)
            try:
                segment = model_segmentation_v3.predict(features)
                if segment is None:
                    continue
                cluster = segment["cluster"]
                if cluster in counts:
                    counts[cluster] += 1
                    analyzed += 1
            except Exception:
                continue

        # Stats del modelo entrenado
        stats = model_segmentation_v3.cluster_stats or {}
        descriptions = model_segmentation_v3.cluster_descriptions or {}

        clusters = []
        for cluster_id in sorted(counts.keys()):
            s = stats.get(cluster_id, {})
            clusters.append({
                "cluster": cluster_id,
                "label": descriptions.get(cluster_id, f"Segmento {cluster_id}"),
                "count": counts[cluster_id],
                "conversion_rate": s.get("conversion_rate", 0),
                "churn_rate": s.get("churn_rate", 0),
                "avg_sentiment": s.get("avg_sentiment", 0),
                "avg_interactions_7d": s.get("avg_interactions_7d", 0),
            })

        return Response({
            "clusters": clusters,
            "total_analyzed": analyzed,
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