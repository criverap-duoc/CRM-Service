#!/bin/bash
set -e

# Timeout para esperar servicios (segundos)
WAIT_TIMEOUT=60

wait_for_service() {
    local name=$1
    local host=$2
    local port=$3
    local elapsed=0

    echo "⏳ Esperando a que $name esté disponible ($host:$port)..."

    while ! python -c "
import socket, sys
try:
    s = socket.create_connection(('$host', $port), timeout=2)
    s.close()
except Exception as e:
    print(f'Error: {e}', file=sys.stderr)
    sys.exit(1)
" 2>/dev/null; do
        if [ $elapsed -ge $WAIT_TIMEOUT ]; then
            echo "❌ $name no está disponible después de ${WAIT_TIMEOUT}s. Abortando."
            echo "   Host: $host"
            echo "   Puerto: $port"
            echo "   Verificar: variables de entorno, firewall, certificados TLS."
            exit 1
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done

    echo "✅ $name disponible"
}

# En PaaS (Render) las conexiones se hacen vía URLs completas
# (DATABASE_URL / REDIS_URL), y no hay un host/puerto TCP simple
# disponible. En ese caso, salteamos las esperas: el propio Django
# fallará con un error claro si la conexión no funciona.
if [ -z "${DATABASE_URL}" ]; then
    wait_for_service "PostgreSQL" "${DB_HOST:-db}" "${DB_PORT:-5432}"
else
    echo "ℹ️  DATABASE_URL definida, salteando espera de PostgreSQL (se conecta en migrate)"
fi

if [ -z "${REDIS_URL}" ]; then
    wait_for_service "Redis" "${REDIS_HOST:-redis}" "${REDIS_PORT:-6379}"
else
    echo "ℹ️  REDIS_URL definida, salteando espera de Redis (se conecta al arrancar Channels)"
fi

echo "🚀 Aplicando migraciones..."
python manage.py migrate --noinput

echo "📦 Recolectando estáticos..."
python manage.py collectstatic --noinput --clear

# Usar $PORT si está definida (Render la inyecta), sino 8000 (Docker local)
echo "🚀 Iniciando Daphne en 0.0.0.0:${PORT:-8000}..."
exec daphne -b 0.0.0.0 -p "${PORT:-8000}" crm_service.asgi:application
