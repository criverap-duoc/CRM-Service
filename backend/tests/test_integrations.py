## crm_service\tests\test_integrations.py
import pytest
from django.utils import timezone
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from apps.contacts.models import Contact
from apps.interactions.models import Interaction


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(username="agent_ai", password="pass1234")


@pytest.fixture
def auth_client(api_client, user):
    res = api_client.post(
        "/api/v1/auth/token/",
        {"username": "agent_ai", "password": "pass1234"},
        format="json",
    )
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
    return api_client


@pytest.fixture
def contact(db, user):
    return Contact.objects.create(
        first_name="Ana",
        last_name="Rivas",
        email="ana.rivas@example.com",
        assigned_to=user,
    )


@pytest.mark.django_db
class TestSummarizeContact:
    def test_summarize_contact_sin_interacciones(self, auth_client, contact):
        """Sin interacciones no hay nada que resumir (no se llama a OpenAI)."""
        res = auth_client.post(
            "/api/v1/integrations/ai/summarize-contact/",
            {"contact_id": contact.pk},
            format="json",
        )
        assert res.status_code == 200
        assert res.data["contact_id"] == contact.pk
        assert res.data["contact_name"] == "Ana Rivas"
        assert res.data["summary"] == "Sin interacciones registradas todavía."

    def test_summarize_contact_modo_simulado(self, auth_client, contact, settings):
        """Sin OPENAI_API_KEY el resumen se genera en modo simulado (sin red)."""
        settings.OPENAI_API_KEY = ""
        Interaction.objects.create(
            contact=contact,
            channel=Interaction.Channel.EMAIL,
            direction=Interaction.Direction.INBOUND,
            subject="Consulta de precios",
            body="Quiero saber el precio del plan anual.",
            occurred_at=timezone.now(),
        )
        res = auth_client.post(
            "/api/v1/integrations/ai/summarize-contact/",
            {"contact_id": contact.pk},
            format="json",
        )
        assert res.status_code == 200
        assert "Resumen simulado" in res.data["summary"]

    def test_summarize_contact_404(self, auth_client):
        res = auth_client.post(
            "/api/v1/integrations/ai/summarize-contact/",
            {"contact_id": 99999},
            format="json",
        )
        assert res.status_code == 404
        assert res.data["error"]["code"] == "not_found"

    def test_summarize_contact_requires_auth(self, api_client, contact):
        res = api_client.post(
            "/api/v1/integrations/ai/summarize-contact/",
            {"contact_id": contact.pk},
            format="json",
        )
        assert res.status_code == 401
