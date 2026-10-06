# CRM Service

[![Backend Tests](https://github.com/criverap-duoc/CRM-Service/actions/workflows/backend-tests.yml/badge.svg)](https://github.com/criverap-duoc/CRM-Service/actions/workflows/backend-tests.yml)
[![Frontend Checks](https://github.com/criverap-duoc/CRM-Service/actions/workflows/frontend-checks.yml/badge.svg)](https://github.com/criverap-duoc/CRM-Service/actions/workflows/frontend-checks.yml)
[![Docker Build](https://github.com/criverap-duoc/CRM-Service/actions/workflows/docker-build.yml/badge.svg)](https://github.com/criverap-duoc/CRM-Service/actions/workflows/docker-build.yml)

[![Python](https://img.shields.io/badge/Python-3.14-blue)](https://python.org)
[![Django](https://img.shields.io/badge/Django-6.x-green)](https://djangoproject.com)
[![DRF](https://img.shields.io/badge/DRF-3.15-red)](https://www.django-rest-framework.org)
[![Next.js](https://img.shields.io/badge/Next.js-16.x-black)](https://nextjs.org)
[![Tailwind](https://img.shields.io/badge/Tailwind-4.x-38bdf8)](https://tailwindcss.com)
[![shadcn/ui](https://img.shields.io/badge/shadcn/ui-latest-000000)](https://ui.shadcn.com)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.9.0-orange)](https://scikit-learn.org)
[![Django Channels](https://img.shields.io/badge/Channels-4.x-092E20)](https://channels.readthedocs.io)

> Sistema CRM completo con Django REST Framework, Next.js 16, WebSockets en tiempo real y Machine Learning aplicado. Desplegado en producción con Vercel + Render + Neon + Upstash.

## Recorrido visual

![Login, Dashboard, Contactos, Empresas, Oportunidades, Tareas](docs/gifs/CRM-Service1.gif)

![Analítica, Productos, Tags, Notificaciones, Manual de Usuario](docs/gifs/CRM-Service2.gif)

---

## Demo en vivo

| Recurso | URL |
|---------|-----|
| **Frontend** | https://crm-service-rust.vercel.app |
| **Backend API** | https://crm-service-backend-3h0e.onrender.com/api/v1 |
| **Swagger UI** | https://crm-service-backend-3h0e.onrender.com/api/docs/ |
| **Admin Django** | https://crm-service-backend-3h0e.onrender.com/admin/ |

**Credenciales de demo:**
- Botón **"Entrar como demo"** en la pantalla de login (un click).
- O login manual con `demo` / `demo`.

> **Nota:** el backend corre en el plan Free de Render, que se suspende tras 15 minutos de inactividad. La primera visita después de un período inactivo tarda ~30 segundos en responder (cold start). Las siguientes son instantáneas.

---

## Propósito

CRM Service es un sistema CRM inteligente diseñado para:

- Gestionar contactos, empresas, tags, tareas, productos y oportunidades con roles (Manager/Agent)
- Automatizar la captura de leads desde Meta Lead Ads
- Predecir probabilidad de conversión con Machine Learning (Lead Scoring)
- Predecir riesgo de abandono de clientes (Churn Prediction)
- Segmentar clientes automáticamente con K-Means
- Analizar sentimiento de interacciones con clientes
- Gestionar un pipeline comercial con forecast ponderado por probabilidad
- Emitir notificaciones en tiempo real vía WebSockets
- Proveer dashboards comercial y analítico para visualizar métricas clave

El problema que resuelve: equipos comerciales pierden oportunidades porque los leads generados en campañas digitales quedan sin seguimiento por horas. Este sistema reduce ese tiempo a menos de 2 horas mediante automatización inteligente, priorización por ML y notificaciones en tiempo real.

---

## Stack Tecnológico

Backend:
- Django 6.x + Django REST Framework
- Django Channels 4.x + Daphne + channels-redis (WebSockets)
- Autenticación: JWT (SimpleJWT) + Roles (Manager/Agent vía grupos)
- Base de Datos: PostgreSQL 17 (producción), SQLite (desarrollo)
- Cache: Redis (segment stats + channel layer)
- Integraciones: Meta Lead Ads, OpenAI
- Machine Learning: scikit-learn (Random Forest, K-Means, GridSearchCV)
- Documentación: drf-spectacular (OpenAPI 3.1 / Swagger)
- Tests: pytest + pytest-django (114 tests)

Frontend:
- Next.js 16 (App Router, Turbopack)
- TypeScript + Tailwind CSS 4.x + shadcn/ui
- Estado: React Context API + Custom Hooks
- WebSockets: cliente nativo con reconexión automática y backoff exponencial
- Notificaciones: sonner (toasts)
- Gráficos: Recharts
- Gestor de paquetes: pnpm

Infraestructura:
- Docker Compose con 4 servicios (PostgreSQL + Redis + backend + frontend)
- CI/CD con GitHub Actions (3 workflows)
- Deploy: Vercel (frontend) + Render (backend) + Neon (PostgreSQL) + Upstash (Redis)

Ciencia de Datos:
- Modelos: Random Forest (Lead Scoring, Churn), K-Means (Segmentación)
- Features: 32 features derivadas de las 6 entidades del dominio
- Datasets: 2.000 leads sintéticos correlacionados sin leakage + datos reales
- Pipeline: entrenamiento → serialización (.pkl) → inferencia vía API
- Fallback: reglas de negocio si los modelos no están disponibles

---

## Arquitectura del dominio

6 entidades relacionadas:

| Entidad | Propósito | Impacto en ML |
|---------|-----------|---------------|
| **Contact** | Personas con estado (lead/prospect/customer/churned) | Entidad central |
| **Company** | Empresas con health score agregado (0-100) | industry, size, revenue |
| **Tag** | Etiquetas con color (M2M con Contact) | has_vip_tag, has_risk_tag |
| **Task** | Tareas operativas con vencimiento | overdue_tasks, completion_rate |
| **Product** | Catálogo (M2M con Contact como intereses) | avg_interest_price |
| **Opportunity** | Pipeline comercial con 5 stages | pipeline_value, has_won_deal |

---

## Machine Learning

**3 modelos entrenados:**

| Modelo | Algoritmo | Target | ROC-AUC test |
|--------|-----------|--------|--------------|
| Lead Scoring | Random Forest (200 árboles) | converted | 0.94 |
| Churn Prediction | Random Forest (200 árboles) | churned | 0.99 |
| Segmentación | K-Means (3 clusters) | — | — |

**Clusters de segmentación:**

| Cluster | Label | Descripción |
|---------|-------|-------------|
| 0 | 📉 Lead frío o en riesgo | Baja actividad, sentimiento bajo, churn alto |
| 1 | ⚡ Prospect activo | Buena conversación, en progreso |
| 2 | 🏆 Cliente consolidado | Alta conversión, churn cercano a cero |

**Pipeline de ML:**

- `python scripts/generate_synthetic_v3.py` — 2000 leads sintéticos con correlaciones realistas
- `python scripts/export_real_data.py` — exporta features de contactos reales
- `python scripts/train_model_v3.py` — entrena lead scoring
- `python scripts/train_churn_v3.py` — entrena churn
- `python scripts/train_segmentation_v3.py` — entrena segmentación

**Endpoints de ML:**

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /api/v3/lead-score/{contact_id}/ | Lead score (0-100) con prioridad |
| GET | /api/v3/churn/{contact_id}/ | Probabilidad de churn con risk_level |
| GET | /api/v3/segment/{contact_id}/ | Segmento asignado |
| GET | /api/v3/segment/stats/ | Distribución global (cacheado 15 min) |
| POST | /api/v3/sentiment/{interaction_id}/ | Análisis de sentimiento |
| GET | /api/v3/sentiment/stats/ | Estadísticas agregadas |

---

## Notificaciones en tiempo real

El sistema emite notificaciones vía WebSocket cuando ocurren eventos críticos:

| Evento | Tipo | Destinatario |
|--------|------|--------------|
| Lead reasignado | lead_assigned | Nuevo agente |
| Webhook de Meta procesado | webhook_received | Todos los managers |
| Tarea vencida | task_overdue | Agente asignado |

Arquitectura: JWT por query string, grupos por usuario (`user_{id}`), notificaciones persistidas en DB, cliente con reconexión automática.

---

## Consideraciones sobre los datos

Los modelos se entrenan sobre una combinación de **2000 leads sintéticos** (correlaciones realistas sin leakage determinista) y **contactos reales** generados por `populate_data.py`.

**Sobre el leakage:** la primera iteración de los sintéticos tenía `has_won_deal` con correlación +0.86 con `converted`, lo cual inflaba el ROC-AUC a 0.99. Se corrigió el generador para que las correlaciones sean realistas (0.25-0.35), y el ROC-AUC bajó a 0.94. **Ese es el número honesto.**

**Trabajo futuro:** reentrenamiento periódico con datos reales de uso continuo.

---

## Quick Start (local)

Clonar el repositorio:

git clone https://github.com/criverap-duoc/CRM-Service.git
cd CRM-Service

**Con Docker Compose (recomendado):**

cd CRM-Service
cp .env.docker.example .env.docker
docker compose --env-file .env.docker up -d --build

Esperar ~2 minutos. El backend corre migraciones automáticamente. Después:

docker compose exec backend python scripts/populate_data.py 30

La app estará disponible en:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/v1
- Swagger UI: http://localhost:8000/api/docs/
- Admin Django: http://localhost:8000/admin/

**Sin Docker (desarrollo):**

Backend:
cd backend
python -m venv .venv
source .venv/bin/activate    (Windows: .venv\Scripts\activate)
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python scripts/populate_data.py 30
python manage.py runserver

Frontend:
cd frontend
pnpm install
pnpm dev

---

## Tests y Cobertura

cd backend
python -m pytest -q

**114 tests pasando.** Distribuidos entre:
- `test_contacts.py`: CRUD, permisos, filtros, actions
- `test_interactions.py`: CRUD, filtros
- `test_products.py`: CRUD, permisos, M2M con Contact
- `test_opportunities.py`: reglas de negocio, pipeline, forecast
- `test_notifications.py`: modelo, endpoints, helper send_notification
- `test_auth_demo.py`: endpoint demo
- `test_throttling.py`: fail-open del rate limiting
- `apps/analytics/tests.py`: lead score, churn, segmento, sentiment

---

## Deploy en producción

El proyecto está desplegado en:

| Componente | Plataforma | Notas |
|------------|-----------|-------|
| Frontend | Vercel | Deploy automático desde GitHub |
| Backend | Render (Free) | Docker runtime, cold start ~30s tras inactividad |
| PostgreSQL | Neon (Free) | Serverless, escala a cero |
| Redis | Upstash (Free) | Cache + channel layer de WebSockets |

**Variables de entorno necesarias en Render:**

- `DJANGO_SETTINGS_MODULE=crm_service.settings.prod`
- `SECRET_KEY` (string larga y aleatoria)
- `ALLOWED_HOSTS=crm-service-backend-3h0e.onrender.com`
- `DATABASE_URL` (de Neon, con `?sslmode=require`)
- `REDIS_URL` (de Upstash, con `rediss://`)
- `CSRF_TRUSTED_ORIGINS=https://crm-service.vercel.app`
- `CORS_ALLOWED_ORIGINS=https://crm-service.vercel.app`

**Variables de entorno necesarias en Vercel:**

- `NEXT_PUBLIC_API_URL=https://crm-service-backend-3h0e.onrender.com/api/v1`

---

## Decisiones técnicas clave

| Decisión | Implementación | Beneficio |
|----------|----------------|-----------|
| Dos serializers por recurso | List + Detail separados | Evita over-fetching |
| Annotate vs @property | Count con distinct | Una query SQL vs N+1 |
| Permisos por grupos | `user.groups.filter(name="managers")` | Coherente con Django auth |
| Features unificadas en ML | `build_features_for_contact()` centralizado | Consistencia train/inferencia |
| Bulk features para stats | `build_features_for_contacts()` | 7 queries vs 813 |
| Cache en Redis | Segment stats + invalidación por mutación | Sobrevive reinicios |
| WebSocket JWT | Query string (WebSockets no envían headers) | Autenticación estándar |
| `socket_timeout=30` en Redis | Fix del bug de redis-py 8.x | Evita desconexiones |
| Fail-open del throttling | `FailOpenRateThrottle` | Redis caído no rompe la API |
| Docker multistage frontend | Next.js standalone | Imagen 302 MB vs 500 MB |
| `.gitattributes` con LF | Scripts .sh siempre LF | Evita CRLF en Docker |

---

## Estructura del Proyecto

| Ruta | Descripción |
|------|-------------|
| backend/apps/analytics/ | Módulo de ciencia de datos y ML |
| backend/apps/analytics/ml/features.py | Construcción de features (single + bulk) |
| backend/apps/analytics/ml/*_v3.py | Modelos ML V3 |
| backend/apps/analytics/cache_utils.py | Helper de invalidación de cache |
| backend/apps/companies/ | Empresas con health score |
| backend/apps/contacts/ | Contactos |
| backend/apps/interactions/ | Interacciones |
| backend/apps/integrations/ | Meta webhook + OpenAI |
| backend/apps/notifications/ | Notificaciones + WebSocket consumer |
| backend/apps/opportunities/ | Pipeline comercial |
| backend/apps/products/ | Catálogo de productos |
| backend/apps/tags/ | Etiquetas |
| backend/apps/tasks/ | Tareas |
| backend/crm_service/settings/ | Config por entorno (base/dev/docker/prod/test) |
| backend/tests/ | Tests integrados con pytest |
| .clinerules/ | Reglas para agentes de IA |
| .github/workflows/ | GitHub Actions (3 workflows) |
| frontend/src/app/ | Páginas (11 rutas) |
| frontend/src/components/ | Componentes + NotificationBell + TopNavbar |
| frontend/src/context/ | AuthContext + NotificationsContext |
| frontend/src/hooks/ | useWebSocket |
| frontend/src/lib/ | api-client + analytics-client |

---

## Roadmap

- [x] v1.0.0 - Backend REST + Autenticación JWT + Meta/OpenAI
- [x] v2.0.0 - Frontend Next.js + Dashboard + Lista de Contactos
- [x] v3.0.0 - Data-Enhanced (Lead Scoring inicial)
- [x] v3.4.0 - Analytics avanzados (Churn, Segmentación, Exportación)
- [x] v4.0.0 - Ecosistema completo + WebSockets + 114 tests
- [x] v4.1.0 - Docker Compose + CI/CD + Deploy en producción
- [ ] v4.2.0 - Integración de Opportunity y Product en el frontend
- [ ] v4.3.0 - Reentrenamiento con datos reales de producción

---

## Roles y Permisos

| Rol | Permisos |
|-----|----------|
| Manager | CRUD completo, eliminar contactos, reasignar agentes, gestionar empresas y tags, ver dashboard de agentes |
| Agent | Ver y editar solo sus contactos asignados y sus oportunidades, crear interacciones y tareas |

---

## Licencia

MIT

---

Repositorio: https://github.com/criverap-duoc/CRM-Service
Versiones: v1.0.0, v2.0.0, v3.0.0, v3.4.0, v4.0.0, v4.1.0