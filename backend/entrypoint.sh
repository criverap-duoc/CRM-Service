#!/bin/bash
set -e

echo "⏳ Esperando a que PostgreSQL esté disponible..."
while ! python -c "
import socket, os, sys
host = os.environ.get('DB_HOST', 'db')
port = int(os.environ.get('DB_PORT', '5432'))
try:
    s = socket.create_connection((host, port), timeout=2)
    s.close()
except Exception:
    sys.exit(1)
" 2>/dev/null; do
  sleep 1
done

echo "✅ PostgreSQL disponible"

echo "⏳ Esperando a que Redis esté disponible..."
while ! python -c "
import socket, os, sys
host = os.environ.get('REDIS_HOST', 'redis')
port = int(os.environ.get('REDIS_PORT', '6379'))
try:
    s = socket.create_connection((host, port), timeout=2)
    s.close()
except Exception:
    sys.exit(1)
" 2>/dev/null; do
  sleep 1
done

echo "✅ Redis disponible"

echo "🚀 Aplicando migraciones..."
python manage.py migrate --noinput

echo "📦 Recolectando estáticos..."
python manage.py collectstatic --noinput --clear

echo "🚀 Iniciando Daphne en 0.0.0.0:8000..."
exec daphne -b 0.0.0.0 -p 8000 crm_service.asgi:application
