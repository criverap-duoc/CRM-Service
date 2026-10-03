## backend\tests\test_notifications.py
"""Tests de la app notifications (Fase 3.5): modelo, endpoints REST,
helper send_notification() y emisión desde eventos (change_assigned)."""
from unittest.mock import AsyncMock, MagicMock

import pytest
from django.contrib.auth.models import Group, User
from rest_framework.test import APIClient

from apps.contacts.models import Contact
from apps.notifications.models import Notification
from apps.notifications.services import send_notification

NOTIF_URL = "/api/v1/notifications/"
CONTACTS_URL = "/api/v1/contacts/"
TOKEN_URL = "/api/v1/auth/token/"


# ---------------------------------------------------------------------------
# Fixtures reutilizables
# ---------------------------------------------------------------------------
def _make_manager(username, email):
    """Usuario en el grupo 'managers'.

    El action `change_assigned` de ContactViewSet exige IsManager, así que
    ambos usuarios de prueba deben pertenecer al grupo.
    """
    user = User.objects.create_user(username=username, password="pass1234", email=email)
    group, _ = Group.objects.get_or_create(name="managers")
    user.groups.add(group)
    return user


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user_a(db):
    return _make_manager("user_a", "user_a@test.com")


@pytest.fixture
def user_b(db):
    return _make_manager("user_b", "user_b@test.com")


def _login(client, username, password="pass1234"):
    """Autentica `client` contra el endpoint JWT y le inyecta el Bearer token."""
    res = client.post(TOKEN_URL, {"username": username, "password": password}, format="json")
    assert res.status_code == 200
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
    return client


@pytest.fixture
def auth_a_client(user_a):
    # Cliente propio (no el `api_client` compartido) para que un mismo test
    # pueda usar A y B sin que las credenciales se pisen.
    return _login(APIClient(), "user_a")


@pytest.fixture
def auth_b_client(user_b):
    return _login(APIClient(), "user_b")


@pytest.fixture
def notification_a(db, user_a):
    return Notification.objects.create(
        user=user_a,
        type=Notification.Type.SYSTEM,
        title="Notificación de prueba",
        message="Mensaje para A",
        payload={"contact_id": 1},
    )


@pytest.fixture
def notification_b(db, user_b):
    return Notification.objects.create(
        user=user_b,
        type=Notification.Type.SYSTEM,
        title="Notificación de B",
        message="Mensaje para B",
    )


@pytest.fixture
def contact(db, user_a):
    """Contacto asignado a `user_a` (punto de partida de la reasignación)."""
    return Contact.objects.create(
        first_name="Ana",
        last_name="Pérez",
        email="ana@example.com",
        status=Contact.Status.LEAD,
        source=Contact.Source.ORGANIC,
        assigned_to=user_a,
    )


@pytest.fixture
def mock_channel_layer(monkeypatch):
    """Reemplaza get_channel_layer() por un layer mock con group_send awaitable.

    Necesario porque async_to_sync() requiere un awaitable: con un MagicMock
    síncrono, AsyncToSync fallaría al intentar correr la coroutine.
    """
    layer = MagicMock()
    layer.group_send = AsyncMock()
    monkeypatch.setattr("apps.notifications.services.get_channel_layer", lambda: layer)
    return layer


@pytest.mark.django_db
class TestNotificationModel:
    def test_notification_str(self, user_a):
        notification = Notification.objects.create(
            user=user_a,
            type=Notification.Type.LEAD_ASSIGNED,
            title="Lead nuevo",
        )
        assert str(notification) == "[lead_assigned] Lead nuevo → user_a"

    def test_default_read_is_false(self, user_a):
        notification = Notification.objects.create(user=user_a, title="Sin leer")
        assert notification.read is False

        notification.refresh_from_db()
        assert notification.read is False


@pytest.mark.django_db
class TestNotificationAPI:
    def test_requires_authentication(self, api_client):
        res = api_client.get(NOTIF_URL)
        assert res.status_code == 401

    def test_list_returns_only_own_notifications(
        self, auth_a_client, user_a, notification_a, notification_b
    ):
        otra = Notification.objects.create(user=user_a, title="Otra de A")

        res = auth_a_client.get(NOTIF_URL)
        assert res.status_code == 200
        assert res.data["count"] == 2

        ids = {n["id"] for n in res.data["results"]}
        assert ids == {notification_a.pk, otra.pk}
        assert notification_b.pk not in ids
        titles = {n["title"] for n in res.data["results"]}
        assert titles == {"Notificación de prueba", "Otra de A"}

    def test_unread_count_endpoint(
        self, auth_a_client, user_a, notification_a, notification_b
    ):
        # Leída de A y no leída de B: ninguna debe sumar al contador de A.
        Notification.objects.create(user=user_a, title="Ya leída", read=True)
        assert notification_b.read is False

        res = auth_a_client.get(f"{NOTIF_URL}unread-count/")
        assert res.status_code == 200
        assert res.data == {"count": 1}

    def test_mark_as_read(self, auth_a_client, notification_a):
        assert notification_a.read is False

        res = auth_a_client.patch(f"{NOTIF_URL}{notification_a.pk}/read/", {}, format="json")
        assert res.status_code == 200
        assert res.data["read"] is True

        notification_a.refresh_from_db()
        assert notification_a.read is True

    def test_mark_already_read_is_idempotent(self, auth_a_client, notification_a):
        notification_a.read = True
        notification_a.save(update_fields=["read"])

        first = auth_a_client.patch(f"{NOTIF_URL}{notification_a.pk}/read/", {}, format="json")
        second = auth_a_client.patch(f"{NOTIF_URL}{notification_a.pk}/read/", {}, format="json")

        assert first.status_code == 200
        assert second.status_code == 200
        assert first.data["read"] is True
        assert second.data["read"] is True

        notification_a.refresh_from_db()
        assert notification_a.read is True

    def test_mark_all_as_read(self, auth_a_client, user_a, notification_a, notification_b):
        Notification.objects.create(user=user_a, title="Ya leída", read=True)
        assert notification_a.read is False

        res = auth_a_client.post(f"{NOTIF_URL}mark-all-read/", {}, format="json")
        assert res.status_code == 200
        # Solo la no leída de A (la leída no se toca).
        assert res.data == {"updated": 1}

        assert Notification.objects.filter(user=user_a, read=False).count() == 0
        # Las de B quedan intactas.
        notification_b.refresh_from_db()
        assert notification_b.read is False

    def test_delete_notification(self, auth_a_client, notification_a, notification_b):
        res = auth_a_client.delete(f"{NOTIF_URL}{notification_a.pk}/")
        assert res.status_code == 204
        assert not Notification.objects.filter(pk=notification_a.pk).exists()

        # La de otro usuario no está en el queryset → 404 y sigue viva.
        res_ajena = auth_a_client.delete(f"{NOTIF_URL}{notification_b.pk}/")
        assert res_ajena.status_code == 404
        assert Notification.objects.filter(pk=notification_b.pk).exists()

@pytest.mark.django_db
class TestSendNotification:
    def test_send_notification_creates_record(self, user_a):
        # Payload con contact_id fijo para no depender de otras fixtures.
        notification = send_notification(
            user=user_a,
            notification_type="lead_assigned",
            title="Nuevo lead asignado",
            message="Se te asignó un contacto.",
            payload={"contact_id": 5},
        )

        assert Notification.objects.filter(user=user_a).count() == 1
        stored = Notification.objects.get(pk=notification.pk)
        assert stored.user == user_a
        assert stored.type == "lead_assigned"
        assert stored.title == "Nuevo lead asignado"
        assert stored.message == "Se te asignó un contacto."
        assert stored.payload == {"contact_id": 5}
        assert stored.read is False

    def test_send_notification_returns_notification_instance(self, user_a):
        result = send_notification(user_a, "system", "Título", "Mensaje")

        assert isinstance(result, Notification)
        assert result.pk is not None
        assert result.user == user_a
        # Es la misma fila que quedó en DB.
        assert Notification.objects.get(user=user_a).pk == result.pk

    def test_send_notification_emits_to_channel_layer(self, user_a, mock_channel_layer):
        notification = send_notification(
            user=user_a,
            notification_type="lead_assigned",
            title="Título WS",
            message="Mensaje WS",
            payload={"contact_id": 7},
        )

        mock_channel_layer.group_send.assert_awaited_once()
        group_name, message = mock_channel_layer.group_send.await_args.args

        assert group_name == f"user_{user_a.id}"
        assert message["type"] == "notification.message"

        payload = message["payload"]
        assert payload["id"] == notification.pk
        assert payload["type"] == "lead_assigned"
        assert payload["title"] == "Título WS"
        assert payload["message"] == "Mensaje WS"
        assert payload["payload"] == {"contact_id": 7}
        assert payload["read"] is False
        assert payload["created_at"] == notification.created_at.isoformat()

    def test_send_notification_persists_payload_json(self, user_a):
        payload = {
            "contact_id": 42,
            "contact_name": "Ana Pérez",
            "previous_agent": None,
            "nested": {"stage": "discovery", "tags": ["a", "b"]},
        }

        notification = send_notification(user_a, "system", "Título", payload=payload)

        # Se relee desde DB: valida el round-trip del JSONField.
        stored = Notification.objects.get(pk=notification.pk)
        assert stored.payload == payload
        assert stored.payload["nested"]["tags"] == ["a", "b"]
        assert stored.payload["previous_agent"] is None


@pytest.mark.django_db
class TestNotificationIntegration:
    def test_change_assigned_emits_notification(
        self, auth_a_client, user_a, user_b, contact, mailoutbox
    ):
        """El action `assign` de ContactViewSet notifica al nuevo agente."""
        assert contact.assigned_to == user_a

        res = auth_a_client.patch(
            f"{CONTACTS_URL}{contact.pk}/assign/",
            {"assigned_to_id": user_b.pk},
            format="json",
        )
        assert res.status_code == 200, res.data

        contact.refresh_from_db()
        assert contact.assigned_to == user_b

        notification = Notification.objects.get(
            user=user_b, type=Notification.Type.LEAD_ASSIGNED
        )
        assert notification.title == f"Nuevo lead asignado: {contact.full_name}"
        assert notification.read is False
        assert notification.payload == {
            "contact_id": contact.pk,
            "contact_name": contact.full_name,
            "previous_agent": user_a.username,
        }
        # El agente anterior no recibe notificación.
        assert not Notification.objects.filter(user=user_a).exists()

        # Además del WebSocket, se manda email al nuevo agente.
        # Con EMAIL_BACKEND=locmem (settings/test.py) queda en el outbox.
        assert len(mailoutbox) == 1
        assert mailoutbox[0].to == [user_b.email]
        assert contact.full_name in mailoutbox[0].subject

