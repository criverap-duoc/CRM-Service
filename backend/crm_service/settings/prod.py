from .base import *
from decouple import config
import dj_database_url
import os

DEBUG = False

# Base de datos: preferir DATABASE_URL (estándar en PaaS como Render,
# Railway, Heroku). Fallback a variables individuales para desarrollo
# local o entornos custom.
DATABASE_URL = config("DATABASE_URL", default="")

if DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
else:
    # Fallback a variables individuales (compatibilidad)
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": config("DB_NAME"),
            "USER": config("DB_USER"),
            "PASSWORD": config("DB_PASSWORD"),
            "HOST": config("DB_HOST", default="localhost"),
            "PORT": config("DB_PORT", default="5432"),
        }
    }

# Seguridad adicional en producción
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Hosts permitidos y CSRF/CORS para frontend en Vercel
ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "*").split(",")

# CSRF: necesario para que Django acepte requests desde el frontend
# en Vercel (dominio distinto al del backend en Render).
CSRF_TRUSTED_ORIGINS = [
    origin for origin in os.environ.get("CSRF_TRUSTED_ORIGINS", "").split(",")
    if origin
]

# CORS: permitir el dominio del frontend en Vercel
CORS_ALLOWED_ORIGINS = [
    origin for origin in os.environ.get("CORS_ALLOWED_ORIGINS", "").split(",")
    if origin
]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False

# Logs a consola (Docker/Render capturan stdout/stderr y los
# persisten externamente). No usar FileHandler porque el directorio
# logs/ no existe en el contenedor.
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}

# Channel layer con Redis (Upstash o similar).
# Upstash usa rediss:// (TLS). Django Channels acepta la URL completa.
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [config("REDIS_URL", default="redis://127.0.0.1:6379/0")],
        },
    },
}
