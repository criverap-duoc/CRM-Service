## crm_service\tests\test_auth_demo.py
import pytest
from django.contrib.auth.models import Group, User
from django.test import override_settings
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def demo_user(db):
    user = User.objects.create_user(
        username="demo",
        password="demo",
        email="demo@crm-service.com",
    )
    managers, _ = Group.objects.get_or_create(name="managers")
    user.groups.add(managers)
    return user


@pytest.mark.django_db
class TestDemoLogin:
    @override_settings(ALLOW_DEMO_LOGIN=True)
    def test_demo_login_returns_tokens(self, api_client, demo_user):
        res = api_client.post("/api/v1/auth/demo/", format="json")
        assert res.status_code == 200
        assert "access" in res.data
        assert "refresh" in res.data

    @override_settings(ALLOW_DEMO_LOGIN=True)
    def test_demo_token_can_list_contacts(self, api_client, demo_user):
        res = api_client.post("/api/v1/auth/demo/", format="json")
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
        contacts = api_client.get("/api/v1/contacts/")
        assert contacts.status_code == 200

    @override_settings(ALLOW_DEMO_LOGIN=True)
    def test_demo_login_without_demo_user_returns_503(self, api_client):
        res = api_client.post("/api/v1/auth/demo/", format="json")
        assert res.status_code == 503
        assert res.data["error"]["code"] == "demo_unavailable"

    @override_settings(ALLOW_DEMO_LOGIN=False)
    def test_demo_login_disabled_when_flag_off(self, api_client, demo_user):
        res = api_client.post("/api/v1/auth/demo/", format="json")
        assert res.status_code == 404
