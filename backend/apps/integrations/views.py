import hmac
import hashlib
import logging
from django.utils import timezone
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from drf_spectacular.utils import extend_schema

from crm_service.throttling import FailOpenAnonRateThrottle
from apps.contacts.models import Contact
from apps.interactions.models import Interaction
from .clients import MetaClient, OpenAIClient
from .serializers import (
    MetaLeadWebhookSerializer,
    SummarizeContactResponseSerializer,
    SummarizeContactSerializer,
    SummarizeInteractionSerializer,
    SummarizeResponseSerializer,
)

logger = logging.getLogger(__name__)


class WebhookRateThrottle(FailOpenAnonRateThrottle):
    """Rate limit del webhook de Meta, fail open si Redis no responde."""

    scope = "webhook"


def verify_meta_signature(request) -> bool:
    """
    Verifica la firma HMAC-SHA256 del webhook de Meta.

    Meta envía el header X-Hub-Signature-256: sha256=<firma>
    Calculamos nuestra propia firma con el APP_SECRET y comparamos.
    Usamos hmac.compare_digest para evitar timing attacks.
    """
    app_secret = settings.META_APP_SECRET

    # Si no hay secret configurado, saltamos la validación (solo en dev)
    if not app_secret:
        logger.warning("META_APP_SECRET no configurado — saltando validación de firma.")
        return True

    signature_header = request.headers.get("X-Hub-Signature-256", "")
    if not signature_header.startswith("sha256="):
        logger.warning("Webhook sin header X-Hub-Signature-256.")
        return False

    expected_signature = signature_header[len("sha256="):]

    # Calcular la firma con el body crudo
    body = request.body
    computed = hmac.new(
        app_secret.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(computed, expected_signature)


class MetaWebhookView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [WebhookRateThrottle]

    @extend_schema(
        summary="Meta Lead Ads webhook",
        request=MetaLeadWebhookSerializer,
        responses={200: {"type": "object", "properties": {"received": {"type": "boolean"}}}},
        tags=["Integrations"],
    )
    def post(self, request):
        # Validar firma de Meta
        if not verify_meta_signature(request):
            logger.warning("Webhook con firma inválida rechazado.")
            return Response(
                {"error": {"code": "forbidden", "message": "Firma inválida."}},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = MetaLeadWebhookSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        email = payload["email"]
        contact, created = Contact.objects.get_or_create(
            email=email,
            defaults={
                "first_name": payload.get("first_name", ""),
                "last_name": payload.get("last_name", ""),
                "phone": payload.get("phone", ""),
                "source": Contact.Source.META_ADS,
                "status": Contact.Status.LEAD,
            },
        )

        Interaction.objects.create(
            contact=contact,
            channel=Interaction.Channel.OTHER,
            direction=Interaction.Direction.INBOUND,
            subject="Meta Lead Ad submission",
            external_id=payload.get("lead_id", ""),
            metadata=payload,
            occurred_at=timezone.now(),
        )

        # Notificar a todos los managers sobre el nuevo lead
        from django.contrib.auth.models import User
        from apps.notifications.services import send_notification

        managers = User.objects.filter(groups__name="managers", is_active=True)
        for manager in managers:
            send_notification(
                user=manager,
                notification_type="webhook_received",
                title=f"Nuevo lead desde Meta: {contact.full_name}",
                message=f"Llegó un lead nuevo por Meta Ads: {contact.full_name} ({contact.email}).",
                payload={
                    "contact_id": contact.id,
                    "source": "meta_ads",
                },
            )

        logger.info("Meta webhook: contact %s (%s)", contact.pk, "created" if created else "exists")
        return Response({"received": True}, status=status.HTTP_200_OK)


class SummarizeInteractionView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="AI summary of an interaction",
        request=SummarizeInteractionSerializer,
        responses={200: SummarizeResponseSerializer},
        tags=["Integrations"],
    )
    def post(self, request):
        serializer = SummarizeInteractionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        interaction_id = serializer.validated_data["interaction_id"]

        try:
            interaction = Interaction.objects.get(pk=interaction_id)
        except Interaction.DoesNotExist:
            return Response(
                {"error": {"code": "not_found", "message": f"Interaction {interaction_id} not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        client = OpenAIClient()
        try:
            summary = client.summarize_interaction(interaction.body or interaction.subject)
        except Exception as exc:
            logger.error("OpenAI summarize failed: %s", exc)
            return Response(
                {"error": {"code": "integration_error", "message": "Could not reach OpenAI."}},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({"interaction_id": interaction.pk, "summary": summary})


class SummarizeContactView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="AI summary of a contact",
        request=SummarizeContactSerializer,
        responses={200: SummarizeContactResponseSerializer},
        tags=["Integrations"],
    )
    def post(self, request):
        serializer = SummarizeContactSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        contact_id = serializer.validated_data["contact_id"]

        try:
            contact = Contact.objects.get(pk=contact_id)
        except Contact.DoesNotExist:
            return Response(
                {"error": {"code": "not_found", "message": f"Contact {contact_id} not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Recolectar las últimas interacciones (más recientes primero)
        interactions = list(
            Interaction.objects.filter(contact=contact).order_by("-occurred_at")[:10]
        )

        client = OpenAIClient()
        try:
            summary = client.summarize_contact(contact, interactions)
        except Exception as exc:
            logger.error("OpenAI summarize_contact failed: %s", exc)
            return Response(
                {"error": {"code": "integration_error", "message": "Could not reach OpenAI."}},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({
            "contact_id": contact.pk,
            "contact_name": contact.full_name,
            "summary": summary,
        })
