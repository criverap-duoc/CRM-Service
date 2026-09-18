# CRM Service

[![Python](https://img.shields.io/badge/Python-3.12-blue)](https://python.org)
[![Django](https://img.shields.io/badge/Django-6.x-green)](https://djangoproject.com)
[![DRF](https://img.shields.io/badge/DRF-3.15-red)](https://www.django-rest-framework.org)
[![Next.js](https://img.shields.io/badge/Next.js-16.x-black)](https://nextjs.org)
[![Tailwind](https://img.shields.io/badge/Tailwind-4.x-38bdf8)](https://tailwindcss.com)
[![shadcn/ui](https://img.shields.io/badge/shadcn/ui-4.x-000000)](https://ui.shadcn.com)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.5-orange)](https://scikit-learn.org)

> Sistema CRM completo con Django REST Framework, Next.js 14, y capacidades de ciencia de datos. Incluye autenticación JWT, gestión de contactos, lead scoring con Machine Learning y análisis de sentimiento.

---

## Propósito

CRM Service es un sistema CRM inteligente diseñado para:

- Gestionar contactos y leads con un sistema de roles (Manager/Agent)
- Automatizar la captura de leads desde Meta Lead Ads
- Predecir probabilidad de conversión usando Machine Learning (Lead Scoring)
- Analizar sentimiento de interacciones con clientes
- Proveer un dashboard comercial para visualizar métricas clave

El problema que resuelve: Equipos comerciales pierden oportunidades porque los leads generados en campañas digitales quedan sin seguimiento por horas. Este sistema reduce ese tiempo de 48 horas a menos de 2 horas mediante automatización inteligente.

---

## Stack Tecnológico

Backend:
- Framework: Django + Django REST Framework
- Autenticación: JWT (SimpleJWT) + Roles
- Base de Datos: SQLite (dev) / PostgreSQL (prod)
- Integraciones: Meta Lead Ads, OpenAI
- Machine Learning: scikit-learn (Random Forest, GridSearch)
- Procesamiento de Datos: pandas, numpy
- Documentación: drf-spectacular (OpenAPI/Swagger)

Frontend:
- Framework: Next.js 14 (App Router)
- Estilos: Tailwind CSS + shadcn/ui
- Estado: React Query + Context API
- HTTP: Axios

---

## Endpoints Principales

### V1 - Autenticación y Contactos
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /api/v1/auth/token/ | Login |
| POST | /api/v1/auth/token/refresh/ | Refresh token |
| GET | /api/v1/contacts/ | Listar contactos |
| POST | /api/v1/contacts/ | Crear contacto |
| GET | /api/v1/contacts/{id}/ | Detalle de contacto |
| PATCH | /api/v1/contacts/{id}/ | Actualizar contacto |
| DELETE | /api/v1/contacts/{id}/ | Eliminar (solo managers) |
| PATCH | /api/v1/contacts/{id}/status/ | Cambiar estado |
| PATCH | /api/v1/contacts/{id}/assign/ | Reasignar (solo managers) |

### V2 - Interacciones y Dashboard
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /api/v1/interactions/ | Listar interacciones |
| POST | /api/v1/interactions/ | Crear interacción |
| POST | /api/v1/integrations/meta/webhook/ | Webhook Meta Lead Ads |
| POST | /api/v1/integrations/ai/summarize/ | Resumir con OpenAI |

### V3 - Data-Enhanced (Machine Learning)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /api/v3/lead-score/{contact_id}/ | Obtener lead score (0-100) |
| POST | /api/v3/sentiment/{interaction_id}/ | Analizar sentimiento de interacción |
| GET | /api/v3/sentiment/stats/?contact_id={id} | Estadísticas de sentimiento |

### V3.4 - Analytics Avanzados
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /api/v3/churn/{contact_id}/ | Predicción de churn |
| GET | /api/v3/segment/{contact_id}/ | Segmentación de lead |
| GET | /api/v3/export/contacts/ | Exportar contactos a CSV |
| GET | /api/v3/export/interactions/ | Exportar interacciones a CSV |
| GET | /api/v3/agents/dashboard/ | Dashboard de agentes |

---

## Quick Start

Clonar el repositorio:
git clone https://github.com/criverap-duoc/CRM-Service.git
cd CRM-Service

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

La aplicación estará disponible en:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/v1
- Swagger UI: http://localhost:8000/api/docs/

---

## Tests y Cobertura

cd backend
pytest tests/ -v
pytest tests/ --cov=apps --cov-report=term-missing

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
| Lead Scoring | Random Forest con GridSearch | Predicción de conversión de leads |
| Análisis de Sentimiento | OpenAI + modo simulado | Clasificación de interacciones |

---

## Estructura del Proyecto

| Ruta | Descripción |
|------|-------------|
| backend/apps/analytics/ | Módulo de ciencia de datos y ML |
| backend/apps/analytics/ml/ | Modelos de Machine Learning |
| backend/apps/contacts/ | Gestión de contactos |
| backend/apps/interactions/ | Gestión de interacciones |
| backend/apps/integrations/ | Integraciones con Meta y OpenAI |
| backend/crm_service/settings/ | Configuración por entorno |
| backend/data/processed/ | Datasets procesados |
| frontend/src/app/ | Páginas de Next.js |
| frontend/src/components/ui/ | Componentes shadcn/ui |

---

## Roadmap

- [x] v1.0.0 - Backend REST + Autenticación JWT + Meta/OpenAI
- [x] v2.0.0 - Frontend Next.js + Dashboard + Lista de Contactos
- [x] v3.0.0 - Data-Enhanced (Lead Scoring, Sentimiento, Analítica)
- [ ] v4.0.0 - Despliegue en AWS + WebSockets

---

## Licencia

MIT

---

Repositorio: https://github.com/criverap-duoc/CRM-Service
Versiones: v1.0.0, v2.0.0, v3.0.0
