# CRM Service V2

[![Python](https://img.shields.io/badge/Python-3.12-blue)](https://python.org)
[![Django](https://img.shields.io/badge/Django-6.x-green)](https://djangoproject.com)
[![DRF](https://img.shields.io/badge/DRF-3.15-red)](https://www.django-rest-framework.org)
[![Next.js](https://img.shields.io/badge/Next.js-16.x-black)](https://nextjs.org)
[![Tailwind](https://img.shields.io/badge/Tailwind-4.x-38bdf8)](https://tailwindcss.com)
[![shadcn/ui](https://img.shields.io/badge/shadcn/ui-4.x-000000)](https://ui.shadcn.com)

> Sistema CRM completo con backend Django REST Framework y frontend Next.js 14. Incluye autenticación JWT, gestión de contactos, interacciones e integración con Meta y OpenAI.

---

## Propósito

CRM Service V2 es un sistema CRM completo diseñado para:

- Gestionar contactos y leads con un sistema de roles (Manager/Agent)
- Automatizar la captura de leads desde Meta Lead Ads
- Clasificar leads con IA usando OpenAI
- Proveer un dashboard comercial para visualizar métricas clave

El problema que resuelve: Equipos comerciales pierden oportunidades porque los leads generados en campañas digitales quedan sin seguimiento por horas. Este sistema reduce ese tiempo de 48 horas a menos de 2 horas mediante automatización inteligente.

---

## Stack Tecnológico

Backend:
- Framework: Django + Django REST Framework
- Autenticación: JWT (SimpleJWT) + Roles
- Base de Datos: SQLite (dev) / PostgreSQL (prod)
- Integraciones: Meta Lead Ads, OpenAI
- Documentación: drf-spectacular (OpenAPI/Swagger)

Frontend:
- Framework: Next.js 14 (App Router)
- Estilos: Tailwind CSS + shadcn/ui
- Estado: React Query + Context API
- HTTP: Axios

---

## Endpoints Principales

Autenticación:
- POST /api/v1/auth/token/ - Login
- POST /api/v1/auth/token/refresh/ - Refresh token

Contactos:
- GET /api/v1/contacts/ - Listar (filtros: status, search, source)
- POST /api/v1/contacts/ - Crear
- GET /api/v1/contacts/{id}/ - Detalle
- PATCH /api/v1/contacts/{id}/ - Actualizar
- DELETE /api/v1/contacts/{id}/ - Eliminar (solo managers)
- PATCH /api/v1/contacts/{id}/status/ - Cambiar estado
- PATCH /api/v1/contacts/{id}/assign/ - Reasignar
- GET /api/v1/contacts/mine/ - Mis contactos

Interacciones:
- GET /api/v1/interactions/ - Listar interacciones
- POST /api/v1/interactions/ - Crear interacción
- GET /api/v1/interactions/{id}/ - Detalle interacción

Integraciones:
- POST /api/v1/integrations/meta/webhook/ - Webhook Meta Lead Ads
- POST /api/v1/integrations/ai/summarize/ - Resumir con OpenAI

---

## Quick Start

Opción 1: Desarrollo local

Backend:
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver

Frontend:
cd frontend
pnpm install
pnpm dev

Opción 2: Docker (producción)
docker compose up --build

La aplicación estará disponible en:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/v1
- Swagger UI: http://localhost:8000/api/docs/

---

## Tests

cd backend
pytest tests/ -v

---

## 🗂️ Estructura del Proyecto

| Ruta | Descripción |
|------|-------------|
| `backend/crm_service/settings/base.py` | Configuración base |
| `backend/crm_service/settings/dev.py` | Configuración desarrollo |
| `backend/crm_service/settings/prod.py` | Configuración producción |
| `backend/crm_service/settings/test.py` | Configuración tests |
| `backend/crm_service/urls.py` | Router principal |
| `backend/crm_service/exceptions.py` | Manejo de errores |
| `backend/crm_service/pagination.py` | Paginación |
| `backend/apps/contacts/models.py` | Modelo Contact |
| `backend/apps/contacts/views.py` | Contact ViewSet |
| `backend/apps/contacts/serializers.py` | Serializers de Contact |
| `backend/apps/contacts/filters.py` | Filtros de Contact |
| `backend/apps/contacts/permissions.py` | Permisos de Contact |
| `backend/apps/interactions/models.py` | Modelo Interaction |
| `backend/apps/interactions/views.py` | Interaction ViewSet |
| `backend/apps/interactions/serializers.py` | Serializers de Interaction |
| `backend/apps/integrations/views.py` | Webhooks y endpoints |
| `backend/apps/integrations/clients.py` | MetaClient y OpenAIClient |
| `backend/apps/integrations/serializers.py` | Serializers de integraciones |
| `backend/tests/test_contacts.py` | Tests de Contact |
| `backend/tests/test_interactions.py` | Tests de Interaction |
| `backend/tests/test_integrations.py` | Tests de integraciones |
| `backend/tests/conftest.py` | Fixtures compartidos |
| `backend/.github/workflows/ci.yml` | CI/CD con GitHub Actions |
| `backend/manage.py` | CLI de Django |
| `backend/requirements.txt` | Dependencias Python |
| `backend/pytest.ini` | Configuración de tests |
| `frontend/src/app/dashboard/page.tsx` | Dashboard page |
| `frontend/src/app/login/page.tsx` | Login page |
| `frontend/src/app/contacts/page.tsx` | Lista de contactos |
| `frontend/src/app/contacts/[id]/page.tsx` | Detalle de contacto |
| `frontend/src/app/contacts/new/page.tsx` | Crear contacto |
| `frontend/src/app/layout.tsx` | Root layout |
| `frontend/src/app/page.tsx` | Home redirect |
| `frontend/src/components/ui/` | Componentes shadcn/ui |
| `frontend/src/context/AuthContext.tsx` | Contexto de autenticación |
| `frontend/src/lib/api-client.ts` | Cliente API con interceptores |
| `frontend/src/lib/utils.ts` | Utilidades (shadcn) |
| `frontend/package.json` | Dependencias frontend |
| `frontend/next.config.ts` | Configuración Next.js |
| `docker-compose.yml` | Orquestación Docker |
| `.env.example` | Variables de entorno de ejemplo |
| `.gitignore` | Archivos ignorados |
| `README.md` | Documentación del proyecto |

---

## Decisiones Técnicas Clave

| Decisión | Implementación | Beneficio |
|----------|----------------|-----------|
| Dos serializers por recurso | ContactListSerializer (listas) y ContactSerializer (detalle) | Evita over-fetching en listados grandes |
| Annotate vs @property | interaction_count = Count("interactions") | Una sola query SQL vs N+1 |
| perform_create | Auto-asigna created_by desde request.user | Lógica de negocio en el lugar correcto |
| Validación HMAC-SHA256 | Webhook de Meta con hmac.compare_digest | Previene timing attacks |
| Rate Limiting | WebhookRateThrottle (200 requests/hora) | Protección contra abusos |
| Custom Exception Handler | Envelope {"error": {"code", "message", "details"}} | Frontend recibe formato consistente |
| shadcn/ui | Componentes pre-construidos | Desarrollo rápido y consistente |
| Context API + React Query | Manejo de estado y caché | Mejor experiencia de usuario |

---

## Roadmap

- [x] V1 Backend REST + Autenticación JWT + Roles + Meta/OpenAI
- [x] V2 Frontend Next.js + Dashboard + Lista de Contactos
- [ ] V3 Despliegue en AWS (ECS + RDS)
- [ ] V4 WebSockets para notificaciones en tiempo real

---

## Roles y Permisos

| Rol | Permisos |
|-----|----------|
| Manager | CRUD completo, eliminación, reasignación, ver todos los contactos |
| Agent | CRUD propio, solo lectura de otros, no puede eliminar |
| Admin | Acceso al admin de Django |

---

## Licencia

MIT

---

## Contribuciones

Este es un proyecto de portafolio. Si tienes sugerencias, abre un issue o un PR.

---

Repositorio: https://github.com/criverap-duoc/CRM-Service-V2
