from .base import *
import os

DEBUG = False

ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "*").split(",")

# Base de datos PostgreSQL
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("DB_NAME", "crm_service"),
        "USER": os.environ.get("DB_USER", "crm_user"),
        "PASSWORD": os.environ.get("DB_PASSWORD", "crm_password"),
        "HOST": os.environ.get("DB_HOST", "db"),
        "PORT": os.environ.get("DB_PORT", "5432"),
    }
}

# Redis como channel layer
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [(
                os.environ.get("REDIS_HOST", "redis"),
                int(os.environ.get("REDIS_PORT", "6379")),
            )],
        },
    },
}

# CORS: el frontend corre en otro contenedor
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False

# Estáticos (para collectstatic)
STATIC_ROOT = BASE_DIR / "staticfiles"

# CSRF trusted origins
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Demo login: habilitado en Docker local para que el botón
# 'Entrar como demo' funcione. En producción NO se define esta
# variable, por lo que el endpoint devuelve 404.
ALLOW_DEMO_LOGIN = True

# Logging a consola (Docker no persiste logs a archivo por defecto)
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
