"""Throttles que no tumban la API cuando el cache (Redis) no responde.

DRF implementa el rate limiting con `django.core.cache`, que en Docker y
en prod es Redis. `SimpleRateThrottle.allow_request()` lee el historial
del contacto con `self.cache.get(...)`, y eso ocurre en
`APIView.initial()` -> `check_throttles()`, es decir ANTES de que la
vista se ejecute. Si Redis no responde, la ConnectionError se propaga y
absolutamente todas las vistas devuelven 500 (no sólo las que cachean su
respuesta).

`FailOpenThrottleMixin` degrada al revés: si el cache no está
disponible, deja pasar la request y deja un warning. Como tampoco hay
cache donde contar el historial, durante la caída el efecto equivale a
"sin rate limiting"; es preferible a un API completamente caído. El
comportamiento estricto (fail closed, 500) sigue disponible con
THROTTLE_FAIL_OPEN = False en el settings activo.
"""
import logging

from django.conf import settings
from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle, UserRateThrottle

logger = logging.getLogger(__name__)


class FailOpenThrottleMixin:
    """Deja pasar la request si el backend de cache del throttling falla."""

    def allow_request(self, request, view):
        try:
            return super().allow_request(request, view)
        except Exception as exc:
            if not getattr(settings, "THROTTLE_FAIL_OPEN", True):
                raise
            logger.warning(
                "%s no pudo leer su historial del cache (%s); "
                "se deja pasar la request sin contar el rate limit.",
                type(self).__name__,
                exc,
            )
            return True


class FailOpenAnonRateThrottle(FailOpenThrottleMixin, AnonRateThrottle):
    """AnonRateThrottle que degrada a "permitir" si el cache falla."""


class FailOpenUserRateThrottle(FailOpenThrottleMixin, UserRateThrottle):
    """UserRateThrottle que degrada a "permitir" si el cache falla."""


class FailOpenScopedRateThrottle(FailOpenThrottleMixin, ScopedRateThrottle):
    """ScopedRateThrottle (ej. webhooks) con la misma degradación."""
