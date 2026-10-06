"""El throttling no debe tumbar la API cuando el cache (Redis) falla.

Contexto: `check_throttles()` corre ANTES que la vista, así que un Redis
caído convertía cualquier endpoint en un 500. Ver crm_service/throttling.py.

Cada test comprueba además que el cache se haya consultado de verdad
(`broken.gets == 1`): sin esa aserción el test podría pasar sin
ejercitar la degradación (AnonRateThrottle no consulta el cache si el
usuario está autenticado).
"""
from types import SimpleNamespace

import pytest
from django.contrib.auth.models import AnonymousUser, User
from django.test import override_settings
from rest_framework.test import APIRequestFactory

from crm_service.throttling import (
    FailOpenAnonRateThrottle,
    FailOpenScopedRateThrottle,
    FailOpenUserRateThrottle,
)


class BrokenCache:
    """Simula Redis caído (toda lectura revienta) y cuenta los intentos."""

    def __init__(self):
        self.gets = 0

    def get(self, *args, **kwargs):
        self.gets += 1
        raise ConnectionError("Error -2 connecting to redis:6379")

    def set(self, *args, **kwargs):
        raise ConnectionError("Error -2 connecting to redis:6379")


def make_throttle(cls, monkeypatch):
    """Throttle con cache roto; devuelve ambos para poder auditar el uso."""
    throttle = cls()
    broken = BrokenCache()
    monkeypatch.setattr(throttle, "cache", broken)
    return throttle, broken


@pytest.fixture
def factory():
    return APIRequestFactory()


def test_anon_throttle_fails_open(factory, monkeypatch):
    """Anónimo + Redis caído: la request pasa en vez de devolver 500."""
    request = factory.get("/api/v3/segment/stats/", REMOTE_ADDR="172.18.0.1")
    request.user = AnonymousUser()
    throttle, broken = make_throttle(FailOpenAnonRateThrottle, monkeypatch)

    assert throttle.allow_request(request, None) is True
    assert broken.gets == 1, "el throttle tuvo que consultar el cache"


def test_user_throttle_fails_open(factory, monkeypatch):
    request = factory.get("/api/v3/segment/stats/")
    request.user = User(pk=1)
    throttle, broken = make_throttle(FailOpenUserRateThrottle, monkeypatch)

    assert throttle.allow_request(request, None) is True
    assert broken.gets == 1, "el throttle tuvo que consultar el cache"


def test_scoped_throttle_fails_open(factory, monkeypatch):
    request = factory.get("/api/v1/integrations/meta/webhook/", REMOTE_ADDR="172.18.0.1")
    request.user = AnonymousUser()
    view = SimpleNamespace(throttle_scope="webhook")
    throttle, broken = make_throttle(FailOpenScopedRateThrottle, monkeypatch)

    assert throttle.allow_request(request, view) is True
    assert broken.gets == 1, "el throttle tuvo que consultar el cache"


@override_settings(THROTTLE_FAIL_OPEN=False)
def test_estricto_propaga_el_error_si_se_desactiva(factory, monkeypatch):
    """Con THROTTLE_FAIL_OPEN = False vuelve el fail closed (HTTP 500)."""
    request = factory.get("/api/v3/segment/stats/", REMOTE_ADDR="172.18.0.1")
    request.user = AnonymousUser()
    throttle, broken = make_throttle(FailOpenAnonRateThrottle, monkeypatch)

    with pytest.raises(ConnectionError):
        throttle.allow_request(request, None)
    assert broken.gets == 1
