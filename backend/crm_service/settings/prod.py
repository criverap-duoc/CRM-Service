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
# Render (y la mayoría de PaaS) terminan TLS en el load balancer y
# reenvían la request por HTTP al contenedor. Sin este header, Django
# cree que la request es HTTP (no HTTPS) y SECURE_SSL_REDIRECT entra
# en loop infinito de 301.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Hosts permitidos y CSRF/CORS para frontend en Vercel
ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "*").split(",")

# Demo login: el endpoint /api/v1/auth/demo/ solo funciona si esta
# variable está en True. Se controla por variable de entorno para
# poder deshabilitarlo en producción sin tocar código.
ALLOW_DEMO_LOGIN = config("ALLOW_DEMO_LOGIN", default=False, cast=bool)

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

# Estáticos: collectstatic los guarda aquí. En Docker/Render la
# carpeta se crea automáticamente.
STATIC_ROOT = BASE_DIR / "staticfiles"

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

# Cache compartida en Redis (Upstash). Sobrevive reinicios del
# worker y funciona con >1 worker. Requerido para que el cache de
# /segment/stats/ sea efectivo en Render Free (que reinicia el
# worker tras spin-down).
#
# Upstash solo soporta DB 0. La separación con el channel layer
# (que también usa DB 0) se hace por prefijo de clave:
# - Django cache: ":1:nombre_clave"
# - Channels: "asgi:nombre_grupo"
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": config("REDIS_URL"),
        "OPTIONS": {
            "socket_timeout": 5,
            "socket_connect_timeout": 5,
        },
    }
}

# Channel layer con Redis (Upstash o similar).
# Upstash usa rediss:// (TLS). Django Channels acepta la URL completa.
# socket_timeout evita el bug de redis-py 8.x que desconectaba la
# conexión y provocaba el parpadeo "En vivo / Desconectado"
# (mismo blindaje que docker.py).
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [{
                "address": config("REDIS_URL", default="redis://127.0.0.1:6379/0"),
                "socket_timeout": 30,
                "socket_connect_timeout": 5,
                "health_check_interval": 30,
            }],
        },
    },
}
