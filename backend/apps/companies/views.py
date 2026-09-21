from django.db.models import Count
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.contacts.models import Contact
from apps.interactions.models import Interaction
from apps.analytics.models import SentimentAnalysis

from .models import Company
from .serializers import CompanyListSerializer, CompanySerializer
from .permissions import CompanyPermission


class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    permission_classes = [CompanyPermission]

    def get_queryset(self):
        qs = Company.objects.annotate(
            contact_count=Count("contacts", distinct=True)
        )
        industry = self.request.query_params.get("industry")
        size = self.request.query_params.get("size")
        search = self.request.query_params.get("search")
        if industry:
            qs = qs.filter(industry=industry)
        if size:
            qs = qs.filter(size=size)
        if search:
            qs = qs.filter(name__icontains=search)
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return CompanyListSerializer
        return CompanySerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["get"], url_path="health")
    def health(self, request, pk=None):
        """Health score de la cuenta (0-100) basado en contactos e interacciones."""
        company = self.get_object()
        contacts = Contact.objects.filter(company=company)

        total_contacts = contacts.count()
        if total_contacts == 0:
            return Response({
                "company_id": company.id,
                "company_name": company.name,
                "health_score": 0,
                "breakdown": {
                    "contact_count": 0,
                    "interaction_volume": 0,
                    "sentiment_balance": 50,
                    "volume_score": 0,
                },
                "note": "Sin contactos asociados",
            })

        interactions = Interaction.objects.filter(contact__in=contacts)
        interaction_volume = interactions.count()

        sentiments = SentimentAnalysis.objects.filter(interaction__in=interactions)
        total_sent = sentiments.count()
        if total_sent:
            pos = sentiments.filter(label="positive").count()
            neg = sentiments.filter(label="negative").count()
            sentiment_balance = int(((pos - neg) / total_sent) * 50 + 50)
        else:
            sentiment_balance = 50

        volume_score = min(interaction_volume * 2, 100)

        health_score = int(
            volume_score * 0.4 +
            sentiment_balance * 0.4 +
            min(total_contacts * 5, 100) * 0.2
        )

        return Response({
            "company_id": company.id,
            "company_name": company.name,
            "health_score": health_score,
            "breakdown": {
                "contact_count": total_contacts,
                "interaction_volume": interaction_volume,
                "sentiment_balance": sentiment_balance,
                "volume_score": volume_score,
            },
        })