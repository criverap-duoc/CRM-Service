from .base import *

DEBUG = True

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# Email backend para desarrollo (imprime en consola)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
DEFAULT_FROM_EMAIL = 'noreply@crm-service.com'

# Rate limiting relajado para desarrollo (el navbar nuevo dispara
# múltiples fetches por página, y Strict Mode de Next.js duplica
# las llamadas; con 1000/día el límite se agota en minutos)
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    "DEFAULT_THROTTLE_RATES": {
        "anon": "10000/day",
        "user": "100000/day",
        "webhook": "10000/hour",
    },
}
