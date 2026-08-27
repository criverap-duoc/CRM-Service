# CRM Service API V1

[![Python](https://img.shields.io/badge/Python-3.12-blue)](https://python.org)
[![Django](https://img.shields.io/badge/Django-5.x-green)](https://djangoproject.com)
[![DRF](https://img.shields.io/badge/DRF-3.15-red)](https://www.django-rest-framework.org)
[![Tests](https://img.shields.io/badge/Tests-33%20passed-brightgreen)]()
[![Coverage](https://img.shields.io/badge/Coverage-90%25-success)](https://pytest-cov.readthedocs.io/)
[![CI](https://github.com/criverap-duoc/CRM-Service-V1/actions/workflows/ci.yml/badge.svg)](https://github.com/criverap-duoc/CRM-Service-V1/actions/workflows/ci.yml)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.1.0-blueviolet)](https://www.openapis.org/)

> **Backend REST para sistema interno tipo CRM** — gestión de contactos, interacciones e integración con Meta Lead Ads y OpenAI.

---

## Propósito

CRM Service V1 es la base sólida de un sistema CRM interno diseñado para:

- Automatizar la captura de leads desde Meta Lead Ads mediante webhooks seguros.
- Clasificar leads con IA usando OpenAI para priorizar seguimiento.
- Gestionar contactos e interacciones con un modelo de permisos por roles (Manager/Agent).
- Servir como backend para un dashboard (listo para conectar con Next.js en V2).

El problema que resuelve: Equipos comerciales pierden oportunidades porque los leads generados en campañas digitales quedan sin seguimiento por horas. Este sistema reduce ese tiempo de 48 horas a menos de 2 horas mediante automatización inteligente.

---

## Stack Tecnológico

| Capa | Tecnología | Justificación |
|------|------------|---------------|
| Backend | Django + Django REST Framework | Framework maduro con ORM, admin y autenticación integrada |
| Autenticación | JWT (SimpleJWT) + Roles (Django Groups) | Stateless, escalable para microservicios |
| IA/ML | OpenAI GPT | Clasificación y resumen de interacciones |
| Integración | Meta Lead Ads (webhook con HMAC-SHA256) | Captura automática de leads con validación de seguridad |
| Tests | Pytest + Coverage | 90% de cobertura garantizada |
| Despliegue | Docker + GitHub Actions CI | Estandarización y pipelines automatizados |
| Documentación | drf-spectacular (OpenAPI/Swagger) | Generación automática de API docs |

---

## Endpoints Principales

Autenticación:
- POST /api/v1/auth/token/ - Obtener JWT
- POST /api/v1/auth/token/refresh/ - Renovar access token

Contactos (CRUD + acciones):
- GET /api/v1/contacts/ - Listar (filtros: status, search, source)
- POST /api/v1/contacts/ - Crear (auto-asigna usuario autenticado)
- GET /api/v1/contacts/{id}/ - Detalle completo
- PATCH /api/v1/contacts/{id}/ - Actualizar parcial
- DELETE /api/v1/contacts/{id}/ - Eliminar (solo managers)
- PATCH /api/v1/contacts/{id}/status/ - Cambiar estado (lead/cliente/inactivo)
- PATCH /api/v1/contacts/{id}/assign/ - Reasignar (solo managers)
- GET /api/v1/contacts/mine/ - Mis contactos asignados

Interacciones:
- GET /api/v1/interactions/ - Listar (filtro por contacto)
- POST /api/v1/interactions/ - Registrar interacción
- GET /api/v1/interactions/{id}/ - Detalle

Integraciones:
- POST /api/v1/integrations/meta/webhook/ - Webhook Meta Lead Ads (AllowAny)
- POST /api/v1/integrations/ai/summarize/ - Resumir interacción con OpenAI

Utilidades:
- GET /health/ - Health check
- GET /api/docs/ - Swagger UI interactivo

---

## Quick Start

Opción 1: Docker (recomendado)

git clone https://github.com/criverap-duoc/CRM-Service-V1.git
cd CRM-Service-V1
cp .env.example .env
docker compose up --build

Opción 2: Desarrollo local

python -m venv .venv
source .venv/bin/activate  # o .venv\Scripts\activate en Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver

La API estará en http://localhost:8000/api/docs/ con Swagger UI.

---

## Tests y Cobertura

Ejecutar todos los tests:
pytest tests/ -v

Con cobertura:
pytest tests/ --cov=apps --cov-report=term-missing

Resultado actual: 33 tests pasando, 90% de cobertura.

---

crm_service/
├── crm_service/                 # Configuración del proyecto
│   ├── settings/                # Separados por entorno
│   │   ├── base.py
│   │   ├── dev.py
│   │   ├── prod.py
│   │   └── test.py
│   ├── urls.py                  # Router principal
│   ├── exceptions.py            # Manejo centralizado de errores
│   └── pagination.py            # Paginación estandarizada
├── apps/
│   ├── contacts/                # Modelo Contact + ViewSet + permisos
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── filters.py
│   │   └── permissions.py
│   ├── interactions/            # Modelo Interaction + ViewSet
│   │   ├── models.py
│   │   ├── views.py
│   │   └── serializers.py
│   └── integrations/            # Meta webhook + OpenAI cliente
│       ├── views.py
│       ├── clients.py           # MetaClient y OpenAIClient
│       └── serializers.py
├── tests/                       # 33 tests con fixtures
│   ├── test_contacts.py
│   ├── test_interactions.py
│   ├── test_integrations.py
│   └── conftest.py              # Fixtures compartidos
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions CI
├── manage.py
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── pytest.ini
├── load_fixtures.sh
├── load_fixtures.ps1
└── README.md

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

---

## Roadmap

- [x] V1 Backend REST + Autenticación JWT + Roles + Meta/OpenAI integración
- [ ] V2 Frontend en Next.js con dashboard comercial
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

Repositorio: https://github.com/criverap-duoc/CRM-Service-V1
