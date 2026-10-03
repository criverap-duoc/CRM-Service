## backend\tests\test_products.py
"""Tests de la app products (Fase 3.5): CRUD, permisos, filtros y M2M con Contact."""
from decimal import Decimal

import pytest
from django.contrib.auth.models import Group, User
from rest_framework.test import APIClient

from apps.contacts.models import Contact
from apps.products.models import Product

PRODUCTS_URL = "/api/v1/products/"
CONTACTS_URL = "/api/v1/contacts/"
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
def product(db, manager_user):
    return Product.objects.create(
        name="CRM Enterprise",
        sku="CRM-ENT-001",
        category=Product.Category.SOFTWARE,
        unit_price=Decimal("1500000"),
        description="Suite completa de CRM",
        created_by=manager_user,
    )


@pytest.fixture
def contact_with_interests(db, agent_user, product):
    """Contacto del agente con dos productos de interés (software + servicio)."""
    support = Product.objects.create(
        name="Soporte Premium",
        sku="SUP-PRE-001",
        category=Product.Category.SERVICE,
        unit_price=Decimal("300000"),
    )
    contact = Contact.objects.create(
        first_name="Ana",
        last_name="Pérez",
        email="ana@example.com",
        status=Contact.Status.LEAD,
        source=Contact.Source.ORGANIC,
        assigned_to=agent_user,
    )
    contact.interests.add(product, support)
    return contact


@pytest.mark.django_db
class TestProductAuthentication:
    def test_requires_authentication(self, api_client):
        res = api_client.get(PRODUCTS_URL)
        assert res.status_code == 401


@pytest.mark.django_db
class TestProductCRUD:
    def test_list_products(self, auth_agent_client, product, contact_with_interests):
        # Tercer producto sin interesados: verifica que el contador distingue 0.
        Product.objects.create(
            name="Licencia Base",
            sku="LIC-BAS-001",
            category=Product.Category.SOFTWARE,
            unit_price=Decimal("500000"),
        )
        res = auth_agent_client.get(PRODUCTS_URL)
        assert res.status_code == 200
        assert res.data["count"] == 3

        by_sku = {p["sku"]: p for p in res.data["results"]}
        assert by_sku["CRM-ENT-001"]["interested_count"] == 1
        assert by_sku["SUP-PRE-001"]["interested_count"] == 1
        assert by_sku["LIC-BAS-001"]["interested_count"] == 0
        # El listado usa el serializer compacto (sin description).
        assert "description" not in by_sku["CRM-ENT-001"]

    def test_create_product(self, auth_manager_client, manager_user):
        payload = {
            "name": "Consultoría BI",
            "sku": "CON-BI-001",
            "category": "service",
            "unit_price": 850000,
            "description": "Consultoría de inteligencia de negocios",
        }
        res = auth_manager_client.post(PRODUCTS_URL, payload, format="json")
        assert res.status_code == 201
        assert res.data["name"] == "Consultoría BI"
        assert res.data["sku"] == "CON-BI-001"
        assert res.data["category"] == "service"
        assert Decimal(res.data["unit_price"]) == Decimal("850000")
        assert res.data["active"] is True
        assert res.data["created_by"] == manager_user.pk
        assert Product.objects.filter(sku="CON-BI-001").exists()

    def test_create_product_duplicate_sku_returns_400(self, auth_manager_client, product):
        payload = {
            "name": "Producto Nuevo",
            "sku": product.sku,
            "category": "software",
            "unit_price": 100000,
        }
        res = auth_manager_client.post(PRODUCTS_URL, payload, format="json")
        assert res.status_code == 400
        assert Product.objects.count() == 1

    def test_create_product_duplicate_name_returns_400(self, auth_manager_client, product):
        payload = {
            "name": product.name,
            "sku": "OTR-SKU-001",
            "category": "software",
            "unit_price": 100000,
        }
        res = auth_manager_client.post(PRODUCTS_URL, payload, format="json")
        assert res.status_code == 400
        assert Product.objects.count() == 1

    def test_retrieve_product(self, auth_agent_client, product, contact_with_interests):
        res = auth_agent_client.get(f"{PRODUCTS_URL}{product.pk}/")
        assert res.status_code == 200
        expected_fields = {
            "id", "name", "sku", "category", "unit_price", "description",
            "active", "interested_count", "created_by", "created_at", "updated_at",
        }
        assert expected_fields.issubset(set(res.data.keys()))
        assert res.data["id"] == product.pk
        assert res.data["sku"] == "CRM-ENT-001"
        assert res.data["description"] == "Suite completa de CRM"
        assert res.data["active"] is True
        assert res.data["interested_count"] == 1
        assert res.data["created_by"] == product.created_by_id

    def test_partial_update(self, auth_manager_client, product):
        res = auth_manager_client.patch(
            f"{PRODUCTS_URL}{product.pk}/", {"unit_price": 990000}, format="json"
        )
        assert res.status_code == 200
        product.refresh_from_db()
        assert product.unit_price == Decimal("990000")
        # El resto de los campos no cambia.
        assert product.name == "CRM Enterprise"
        assert product.sku == "CRM-ENT-001"

    def test_delete_product(self, auth_manager_client, product):
        res = auth_manager_client.delete(f"{PRODUCTS_URL}{product.pk}/")
        assert res.status_code == 204
        assert not Product.objects.filter(pk=product.pk).exists()


@pytest.mark.django_db
class TestProductPermissions:
    def test_agent_cannot_create_product(self, auth_agent_client):
        payload = {
            "name": "No Permitido",
            "sku": "NOP-001",
            "category": "software",
            "unit_price": 10000,
        }
        res = auth_agent_client.post(PRODUCTS_URL, payload, format="json")
        assert res.status_code == 403
        assert not Product.objects.filter(sku="NOP-001").exists()

    def test_agent_cannot_update_product(self, auth_agent_client, product):
        res = auth_agent_client.patch(
            f"{PRODUCTS_URL}{product.pk}/", {"unit_price": 1}, format="json"
        )
        assert res.status_code == 403
        product.refresh_from_db()
        assert product.unit_price == Decimal("1500000")

    def test_agent_cannot_delete_product(self, auth_agent_client, product):
        res = auth_agent_client.delete(f"{PRODUCTS_URL}{product.pk}/")
        assert res.status_code == 403
        assert Product.objects.filter(pk=product.pk).exists()

    def test_agent_can_read_products(self, auth_agent_client, product):
        res_list = auth_agent_client.get(PRODUCTS_URL)
        assert res_list.status_code == 200
        assert res_list.data["count"] == 1

        res_detail = auth_agent_client.get(f"{PRODUCTS_URL}{product.pk}/")
        assert res_detail.status_code == 200
        assert res_detail.data["id"] == product.pk
        assert res_detail.data["sku"] == product.sku


@pytest.mark.django_db
class TestProductFiltering:
    def test_filter_by_category(self, auth_agent_client, product, contact_with_interests):
        res_software = auth_agent_client.get(f"{PRODUCTS_URL}?category=software")
        assert res_software.status_code == 200
        assert res_software.data["count"] == 1
        assert res_software.data["results"][0]["sku"] == "CRM-ENT-001"

        res_service = auth_agent_client.get(f"{PRODUCTS_URL}?category=service")
        assert res_service.status_code == 200
        assert res_service.data["count"] == 1
        assert res_service.data["results"][0]["sku"] == "SUP-PRE-001"

    def test_filter_by_active(self, auth_agent_client, product):
        Product.objects.create(
            name="Descontinuado",
            sku="DES-001",
            category=Product.Category.OTHER,
            unit_price=Decimal("10000"),
            active=False,
        )
        res_active = auth_agent_client.get(f"{PRODUCTS_URL}?active=true")
        assert res_active.status_code == 200
        assert res_active.data["count"] == 1
        assert res_active.data["results"][0]["name"] == "CRM Enterprise"

        res_inactive = auth_agent_client.get(f"{PRODUCTS_URL}?active=false")
        assert res_inactive.status_code == 200
        assert res_inactive.data["count"] == 1
        assert res_inactive.data["results"][0]["name"] == "Descontinuado"


@pytest.mark.django_db
class TestContactProductInterests:
    def test_contact_interests_serialization(
        self, auth_agent_client, contact_with_interests, product
    ):
        res = auth_agent_client.get(f"{CONTACTS_URL}{contact_with_interests.pk}/")
        assert res.status_code == 200

        interests = res.data["interests"]
        assert len(interests) == 2
        by_sku = {i["sku"]: i for i in interests}
        assert set(by_sku) == {"CRM-ENT-001", "SUP-PRE-001"}

        crm = by_sku["CRM-ENT-001"]
        assert crm["id"] == product.pk
        assert crm["name"] == "CRM Enterprise"
        assert crm["category"] == "software"
        assert Decimal(crm["unit_price"]) == Decimal("1500000")
        assert by_sku["SUP-PRE-001"]["category"] == "service"

    def test_assign_interests_via_patch(self, auth_agent_client, agent_user, product):
        contact = Contact.objects.create(
            first_name="Luis",
            last_name="Soto",
            email="luis@example.com",
            assigned_to=agent_user,
        )
        assert contact.interests.count() == 0

        res = auth_agent_client.patch(
            f"{CONTACTS_URL}{contact.pk}/",
            {"interest_ids": [product.pk]},
            format="json",
        )
        assert res.status_code == 200

        contact.refresh_from_db()
        assert list(contact.interests.values_list("pk", flat=True)) == [product.pk]
        assert [i["id"] for i in res.data["interests"]] == [product.pk]


