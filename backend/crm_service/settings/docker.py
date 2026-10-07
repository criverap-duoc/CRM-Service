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
#
# Se usa la sintaxis de dict (no la tupla) porque sólo el dict llega
# intacto a channels_redis.utils.create_pool(), que es el único punto
# donde se puede inyectar health_check_interval:
#   decode_hosts()  -> si la entrada ya es un dict, la copia tal cual;
#                      si es una tupla, la convierte a
#                      {"host": ..., "port": ...} SIN kwargs extra.
#   create_pool()   -> con clave "address" llama
#                      ConnectionPool.from_url(address, **host) y con
#                      cualquier otra clave ConnectionPool(**host).
# Por eso las claves son "host"/"port" (que redis-py acepta) y NO
# "address" con una tupla: from_url() recibe el valor sin normalizar y
# falla con AttributeError: 'tuple' object has no attribute 'decode'.
# El health check hace PING cada 30s sobre las conexiones ociosas del
# pool y evita el "Timeout reading from redis" de la primera operación
# tras un período inactivo.
#
# socket_timeout: redis-py 8.x cambió el default a 5s
# (redis/_defaults.py: DEFAULT_SOCKET_TIMEOUT = 5) y read_response()
# lo aplica a CUALQUIER lectura, incluidas las bloqueantes. Pero
# channels_redis recibe con un BZPOPMIN de 5s en bucle
# (core.py: brpop_timeout = 5 / _brpop_with_clean), así que el cancel
# del cliente y el nil del servidor compiten por el mismo segundo:
# cuando gana el cliente, la excepción sube por receive_single y mata
# al consumer, y daphne cierra el socket (WSDISCONNECT/WSCONNECTING =
# el parpadeo "En vivo" <-> "Desconectado"). 30s da 6x de margen sobre
# el bloqueo de 5s y sigue siendo un límite finito, para que una
# conexión realmente muerta falle en vez de quedarse colgada.
# socket_connect_timeout se fija aparte para no heredarlo.
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [{
                "host": os.environ.get("REDIS_HOST", "redis"),
                "port": int(os.environ.get("REDIS_PORT", "6379")),
                "health_check_interval": 30,
                "socket_timeout": 30,
                "socket_connect_timeout": 5,
            }],
        },
    },
}

# Cache compartida en Redis (el mismo servicio que usa el channel
# layer). Se usa el backend nativo de Django, que habla con redis-py
# directo (no requiere django-redis).
#
# LocMemCache (default) vive en la memoria del proceso: se pierde
# cada vez que el worker se reinicia y no se comparte entre workers,
# lo que anularía el cache de /segment/stats/. Con Redis, el valor
# sobrevive al reinicio del contenedor.
#
# DB 0 (la misma que el channel layer): las claves no colisionan
# porque channels usa el prefijo "asgi:" y el cache ":1:". Usar una
# DB separada no es fiable en proveedores gestionados (Upstash solo
# soporta DB 0), por eso la separación es por prefijo de clave.
# Igual que settings/prod.py, para que dev y prod se comporten igual.
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": (
            f"redis://{os.environ.get('REDIS_HOST', 'redis')}:"
            f"{os.environ.get('REDIS_PORT', '6379')}/0"
        ),
        "OPTIONS": {
            "socket_timeout": 5,
            "socket_connect_timeout": 5,
        },
    }
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
