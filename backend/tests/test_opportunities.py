## backend\tests\test_opportunities.py
"""Tests de la app opportunities (Fase 3.5): CRUD, reglas de negocio del
save() (probabilidad auto y closed_at), permisos por rol, endpoints
especiales (pipeline, forecast, my-summary) y filtros."""
from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth.models import Group, User
from django.utils import timezone
from rest_framework.test import APIClient

from apps.companies.models import Company
from apps.contacts.models import Contact
from apps.opportunities.models import Opportunity

OPPS_URL = "/api/v1/opportunities/"
TOKEN_URL = "/api/v1/auth/token/"


# ---------------------------------------------------------------------------
# Fixtures reutilizables
# ---------------------------------------------------------------------------
@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def agent_user(db):
    return User.objects.create_user(
        username="agent", password="pass1234", email="agent@test.com"
    )


@pytest.fixture
def other_user(db):
    """Agente ajeno: sus oportunidades no deben ser visibles para `agent_user`."""
    return User.objects.create_user(
        username="other", password="pass1234", email="other@test.com"
    )


@pytest.fixture
def manager_user(db):
    user = User.objects.create_user(
        username="manager", password="pass1234", email="manager@test.com"
    )
    group, _ = Group.objects.get_or_create(name="managers")
    user.groups.add(group)
    return user


def _login(client, username, password="pass1234"):
    """Autentica `client` contra el endpoint JWT y le inyecta el Bearer token."""
    res = client.post(TOKEN_URL, {"username": username, "password": password}, format="json")
    assert res.status_code == 200
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
    return client


@pytest.fixture
def auth_agent_client(agent_user):
    # Cliente propio (no el `api_client` compartido) para que un mismo test
    # pueda usar manager y agent sin que las credenciales se pisen.
    return _login(APIClient(), "agent")


@pytest.fixture
def auth_manager_client(manager_user):
    return _login(APIClient(), "manager")


@pytest.fixture
def company(db):
    return Company.objects.create(
        name="Acme SpA",
        industry=Company.Industry.TECHNOLOGY,
        size=Company.Size.SMALL,
    )


@pytest.fixture
def contact(db, agent_user, company):
    """Contacto asignado al agente y perteneciente a `company`."""
    return Contact.objects.create(
        first_name="Ana",
        last_name="Pérez",
        email="ana@example.com",
        company=company,
        status=Contact.Status.PROSPECT,
        source=Contact.Source.ORGANIC,
        assigned_to=agent_user,
    )


@pytest.fixture
def opportunity(db, contact, agent_user):
    """Discovery de 1.000.000 sin fecha de cierre (probabilidad auto = 20)."""
    return Opportunity.objects.create(
        name="Deal básico",
        contact=contact,
        amount=Decimal("1000000"),
        assigned_to=agent_user,
    )


@pytest.fixture
def opportunity_open(db, contact, agent_user):
    """Negociación abierta con cierre esperado futuro (probabilidad auto = 75)."""
    return Opportunity.objects.create(
        name="Deal en negociación",
        contact=contact,
        amount=Decimal("600000"),
        stage=Opportunity.Stage.NEGOTIATION,
        expected_close_date=timezone.now().date() + timedelta(days=30),
        assigned_to=agent_user,
    )


@pytest.fixture
def opportunity_won(db, contact, agent_user):
    """Ganada con fecha de cierre esperada ya pasada: no debe contar como vencida."""
    return Opportunity.objects.create(
        name="Deal ganado",
        contact=contact,
        amount=Decimal("100000"),
        stage=Opportunity.Stage.WON,
        expected_close_date=timezone.now().date() - timedelta(days=10),
        assigned_to=agent_user,
    )


@pytest.fixture
def opportunity_lost(db, contact, agent_user):
    """Perdida con motivo (probabilidad auto = 0 y closed_at seteado)."""
    return Opportunity.objects.create(
        name="Deal perdido",
        contact=contact,
        amount=Decimal("50000"),
        stage=Opportunity.Stage.LOST,
        lost_reason="Precio fuera de rango",
        assigned_to=agent_user,
    )


@pytest.mark.django_db
class TestOpportunityAuthentication:
    def test_requires_authentication(self, api_client):
        res = api_client.get(OPPS_URL)
        assert res.status_code == 401


@pytest.mark.django_db
class TestOpportunityCRUD:
    def test_create_opportunity(self, auth_agent_client, contact, agent_user):
        res = auth_agent_client.post(
            OPPS_URL,
            {"name": "Deal nuevo", "contact_id": contact.pk, "amount": "750000"},
            format="json",
        )
        assert res.status_code == 201, res.data
        assert res.data["name"] == "Deal nuevo"
        assert res.data["contact"]["id"] == contact.pk
        assert res.data["stage"] == Opportunity.Stage.DISCOVERY
        assert Decimal(res.data["amount"]) == Decimal("750000")
        # Probabilidad auto por stage (discovery → 20) y ponderado coherente.
        assert res.data["probability"] == 20
        assert res.data["weighted_amount"] == pytest.approx(150000.0)

        opp = Opportunity.objects.get(pk=res.data["id"])
        assert opp.created_by == agent_user
        assert opp.assigned_to is None

    def test_create_inherits_company_from_contact(self, auth_agent_client, contact, company):
        assert contact.company_id == company.pk
        res = auth_agent_client.post(
            OPPS_URL,
            {"name": "Deal sin company", "contact_id": contact.pk, "amount": "500000"},
            format="json",
        )
        assert res.status_code == 201, res.data
        # No se envió company_id: se hereda del contacto en save().
        assert res.data["company"]["id"] == company.pk
        assert Opportunity.objects.get(pk=res.data["id"]).company_id == company.pk

    def test_list_opportunities(self, auth_agent_client, opportunity, opportunity_open):
        res = auth_agent_client.get(OPPS_URL)
        assert res.status_code == 200
        assert res.data["count"] == 2

        by_name = {o["name"]: o for o in res.data["results"]}
        # weighted_amount = amount * probability / 100 (property del modelo).
        assert by_name["Deal básico"]["probability"] == 20
        assert by_name["Deal básico"]["weighted_amount"] == pytest.approx(200000.0)
        assert by_name["Deal en negociación"]["probability"] == 75
        assert by_name["Deal en negociación"]["weighted_amount"] == pytest.approx(450000.0)
        # El listado trae los briefs anidados de contacto/empresa.
        assert by_name["Deal básico"]["contact"]["full_name"] == "Ana Pérez"
        assert by_name["Deal básico"]["company"]["name"] == "Acme SpA"


@pytest.mark.django_db
class TestOpportunityBusinessRules:
    def test_probability_auto_set_by_stage(self, auth_agent_client, contact):
        res = auth_agent_client.post(
            OPPS_URL,
            {
                "name": "Propuesta grande",
                "contact_id": contact.pk,
                "amount": "2000000",
                "stage": Opportunity.Stage.PROPOSAL,
            },
            format="json",
        )
        assert res.status_code == 201, res.data
        assert res.data["probability"] == 50

    def test_won_sets_probability_100_and_closed_at(self, auth_agent_client, opportunity):
        assert opportunity.closed_at is None
        res = auth_agent_client.patch(
            f"{OPPS_URL}{opportunity.pk}/", {"stage": "won"}, format="json"
        )
        assert res.status_code == 200, res.data
        assert res.data["probability"] == 100
        assert res.data["closed_at"] is not None

        opportunity.refresh_from_db()
        assert opportunity.probability == 100
        assert opportunity.closed_at is not None
        assert opportunity.is_closed is True

    def test_lost_sets_probability_0_and_closed_at(self, auth_agent_client, opportunity):
        res = auth_agent_client.patch(
            f"{OPPS_URL}{opportunity.pk}/",
            {"stage": "lost", "lost_reason": "Precio fuera de rango"},
            format="json",
        )
        assert res.status_code == 200, res.data
        assert res.data["probability"] == 0
        assert res.data["closed_at"] is not None

        opportunity.refresh_from_db()
        assert opportunity.probability == 0
        assert opportunity.closed_at is not None
        assert opportunity.is_closed is True

    def test_reopening_clears_closed_at(self, auth_agent_client, opportunity_won):
        assert opportunity_won.closed_at is not None
        res = auth_agent_client.patch(
            f"{OPPS_URL}{opportunity_won.pk}/", {"stage": "discovery"}, format="json"
        )
        assert res.status_code == 200, res.data
        assert res.data["closed_at"] is None

        opportunity_won.refresh_from_db()
        assert opportunity_won.closed_at is None
        assert opportunity_won.is_closed is False
        # save() solo sugiere probabilidad cuando vale 0, así que la que dejó
        # "won" (100) se conserva al reabrir; cerramos el comportamiento actual.
        assert opportunity_won.probability == 100

    def test_lost_requires_reason(self, auth_agent_client, opportunity):
        res = auth_agent_client.patch(
            f"{OPPS_URL}{opportunity.pk}/", {"stage": "lost"}, format="json"
        )
        assert res.status_code == 400
        assert "lost_reason" in res.data["error"]["details"]

        opportunity.refresh_from_db()
        assert opportunity.stage == Opportunity.Stage.DISCOVERY
        assert opportunity.closed_at is None

@pytest.mark.django_db
class TestOpportunityPermissions:
    def test_agent_sees_only_own_opportunities(
        self, auth_agent_client, other_user, opportunity, contact
    ):
        # Visible aunque no esté asignada: su contacto sí es del agente.
        Opportunity.objects.create(
            name="De contacto del agente",
            contact=contact,
            amount=Decimal("300000"),
            assigned_to=None,
        )
        # Invisible: ni asignada al agente ni de un contacto suyo.
        other_contact = Contact.objects.create(
            first_name="Beto",
            last_name="Soto",
            email="beto@example.com",
            assigned_to=other_user,
        )
        Opportunity.objects.create(
            name="Ajena",
            contact=other_contact,
            amount=Decimal("900000"),
            assigned_to=other_user,
        )

        res = auth_agent_client.get(OPPS_URL)
        assert res.status_code == 200
        assert res.data["count"] == 2
        names = {o["name"] for o in res.data["results"]}
        assert names == {"Deal básico", "De contacto del agente"}

    def test_manager_sees_all_opportunities(
        self, auth_manager_client, other_user, opportunity, opportunity_won, opportunity_lost
    ):
        other_contact = Contact.objects.create(
            first_name="Carla",
            last_name="Rojas",
            email="carla@example.com",
            assigned_to=other_user,
        )
        Opportunity.objects.create(
            name="Ajena",
            contact=other_contact,
            amount=Decimal("900000"),
            assigned_to=other_user,
        )

        res = auth_manager_client.get(OPPS_URL)
        assert res.status_code == 200
        assert res.data["count"] == 4
        names = {o["name"] for o in res.data["results"]}
        assert names == {"Deal básico", "Deal ganado", "Deal perdido", "Ajena"}

    def test_agent_cannot_delete_opportunity_of_other(
        self, auth_agent_client, other_user
    ):
        other_contact = Contact.objects.create(
            first_name="Diego",
            last_name="Vera",
            email="diego@example.com",
            assigned_to=other_user,
        )
        other_opp = Opportunity.objects.create(
            name="Ajena",
            contact=other_contact,
            amount=Decimal("900000"),
            assigned_to=other_user,
        )

        res = auth_agent_client.delete(f"{OPPS_URL}{other_opp.pk}/")
        # El scoping de get_queryset la oculta → DRF responde 404 (no 403);
        # se acepta 403 por si la denegación se mueve a has_object_permission.
        assert res.status_code in (403, 404), res.data
        assert Opportunity.objects.filter(pk=other_opp.pk).exists()


@pytest.mark.django_db
class TestOpportunityEndpoints:
    def test_pipeline_endpoint(
        self, auth_agent_client, opportunity, opportunity_open, opportunity_won, opportunity_lost
    ):
        res = auth_agent_client.get(f"{OPPS_URL}pipeline/")
        assert res.status_code == 200
        assert res.data["total_count"] == 4

        stages = res.data["stages"]
        assert [s["stage"] for s in stages] == [
            "discovery", "proposal", "negotiation", "won", "lost",
        ]
        assert all(s["label"] for s in stages)

        by_stage = {s["stage"]: s for s in stages}
        assert by_stage["discovery"]["count"] == 1
        assert by_stage["discovery"]["total_amount"] == pytest.approx(1000000.0)
        assert by_stage["discovery"]["weighted_amount"] == pytest.approx(200000.0)
        # Stage sin oportunidades: count 0 y suma 0 (no None).
        assert by_stage["proposal"]["count"] == 0
        assert by_stage["proposal"]["total_amount"] == pytest.approx(0.0)
        assert by_stage["proposal"]["weighted_amount"] == pytest.approx(0.0)
        assert by_stage["negotiation"]["count"] == 1
        assert by_stage["negotiation"]["weighted_amount"] == pytest.approx(450000.0)
        assert by_stage["won"]["weighted_amount"] == pytest.approx(100000.0)
        assert by_stage["lost"]["weighted_amount"] == pytest.approx(0.0)

    def test_forecast_endpoint(
        self, auth_agent_client, opportunity, opportunity_open, opportunity_won, opportunity_lost
    ):
        res = auth_agent_client.get(f"{OPPS_URL}forecast/")
        assert res.status_code == 200

        forecast = res.data["forecast"]
        # Solo la negociación: está abierta y tiene expected_close_date.
        assert len(forecast) == 1
        row = forecast[0]
        assert row["month"] == opportunity_open.expected_close_date.strftime("%Y-%m")
        assert row["count"] == 1
        assert row["total_amount"] == pytest.approx(600000.0)
        assert row["weighted_amount"] == pytest.approx(450000.0)


    def test_my_summary_endpoint(
        self, auth_agent_client, opportunity, opportunity_open, opportunity_won, opportunity_lost
    ):
        Opportunity.objects.create(
            name="Vencida",
            contact=opportunity.contact,
            amount=Decimal("400000"),
            stage=Opportunity.Stage.PROPOSAL,
            expected_close_date=timezone.now().date() - timedelta(days=5),
            assigned_to=opportunity.assigned_to,
        )

        res = auth_agent_client.get(f"{OPPS_URL}my-summary/")
        assert res.status_code == 200
        assert res.data["total"] == 5
        assert res.data["by_stage"] == {
            "discovery": 1,
            "proposal": 1,
            "negotiation": 1,
            "won": 1,
            "lost": 1,
        }
        # Abiertas: 1.000.000 + 600.000 + 400.000
        assert res.data["pipeline_total"] == pytest.approx(2000000.0)
        # Ponderado: 20% de 1.000.000 + 75% de 600.000 + 50% de 400.000
        assert res.data["pipeline_weighted"] == pytest.approx(850000.0)
        # La ganada tiene fecha pasada pero está cerrada → no cuenta.
        assert res.data["overdue"] == 1


@pytest.mark.django_db
class TestOpportunityFiltering:
    def test_filter_by_stage(
        self, auth_agent_client, opportunity, opportunity_open, opportunity_won
    ):
        res = auth_agent_client.get(f"{OPPS_URL}?stage=discovery")
        assert res.status_code == 200
        assert res.data["count"] == 1
        assert res.data["results"][0]["name"] == opportunity.name

    def test_filter_open_only(
        self, auth_agent_client, opportunity, opportunity_open, opportunity_won, opportunity_lost
    ):
        res = auth_agent_client.get(f"{OPPS_URL}?open_only=true")
        assert res.status_code == 200
        assert res.data["count"] == 2
        names = {o["name"] for o in res.data["results"]}
        assert names == {"Deal básico", "Deal en negociación"}

    def test_filter_overdue(self, auth_agent_client, opportunity, opportunity_won):
        # La ganada tiene fecha pasada, pero cerrada → no es vencida.
        assert opportunity_won.expected_close_date < timezone.now().date()
        overdue = Opportunity.objects.create(
            name="Vencida",
            contact=opportunity.contact,
            amount=Decimal("400000"),
            stage=Opportunity.Stage.PROPOSAL,
            expected_close_date=timezone.now().date() - timedelta(days=5),
            assigned_to=opportunity.assigned_to,
        )

        res = auth_agent_client.get(f"{OPPS_URL}?overdue=true")
        assert res.status_code == 200
        assert res.data["count"] == 1
        assert res.data["results"][0]["id"] == overdue.pk
        assert res.data["results"][0]["is_overdue"] is True


