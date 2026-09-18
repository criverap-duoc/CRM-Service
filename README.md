# CRM Service

[![Python](https://img.shields.io/badge/Python-3.12-blue)](https://python.org)
[![Django](https://img.shields.io/badge/Django-5.x-green)](https://djangoproject.com)
[![DRF](https://img.shields.io/badge/DRF-3.15-red)](https://www.django-rest-framework.org)
[![Next.js](https://img.shields.io/badge/Next.js-16.x-black)](https://nextjs.org)
[![Tailwind](https://img.shields.io/badge/Tailwind-4.x-38bdf8)](https://tailwindcss.com)
[![shadcn/ui](https://img.shields.io/badge/shadcn/ui-latest-000000)](https://ui.shadcn.com)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.5-orange)](https://scikit-learn.org)

> Sistema CRM completo con Django REST Framework, Next.js 16, y capacidades de ciencia de datos. Incluye autenticación JWT, gestión de contactos, lead scoring con Machine Learning, predicción de churn, segmentación de clientes y análisis de sentimiento.

---

## Propósito

CRM Service es un sistema CRM inteligente diseñado para:

- Gestionar contactos y leads con un sistema de roles (Manager/Agent)
- Automatizar la captura de leads desde Meta Lead Ads
- Predecir probabilidad de conversión usando Machine Learning (Lead Scoring)
- Predecir riesgo de abandono de clientes (Churn Prediction)
- Segmentar clientes automáticamente con K-Means
- Analizar sentimiento de interacciones con clientes
- Proveer un dashboard comercial y analítico para visualizar métricas clave

El problema que resuelve: Equipos comerciales pierden oportunidades porque los leads generados en campañas digitales quedan sin seguimiento por horas. Este sistema reduce ese tiempo de 48 horas a menos de 2 horas mediante automatización inteligente y priorización por ML.

---

## Stack Tecnológico

Backend:
- Framework: Django 5.x + Django REST Framework
- Autenticación: JWT (SimpleJWT) + Roles (Manager/Agent)
- Base de Datos: SQLite (dev) / PostgreSQL (prod planificado)
- Integraciones: Meta Lead Ads, OpenAI
- Machine Learning: scikit-learn (Random Forest, K-Means, GridSearch)
- Procesamiento de Datos: pandas, numpy, joblib
- Documentación: drf-spectacular (OpenAPI/Swagger)
- Filtros: django-filter
- Tests: pytest + pytest-django

Frontend:
- Framework: Next.js 16 (App Router)
- Lenguaje: TypeScript
- Estilos: Tailwind CSS 4.x + shadcn/ui
- Estado: React Context API (AuthContext)
- HTTP: Axios con interceptores
- Gráficos: Recharts
- Iconos: Lucide React
- Gestor de paquetes: pnpm

Ciencia de Datos:
- Modelos: Random Forest (Lead Scoring, Churn), K-Means (Segmentación)
- Pipeline: entrenamiento → serialización (.pkl) → inferencia vía API
- Datasets: 2000 leads sintéticos + 55 leads reales para validación
- Fallback: reglas de negocio cuando el modelo no puede codificar la entrada

---

## Endpoints Principales

### V1 - Autenticación y Contactos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /api/v1/auth/token/ | Login |
| POST | /api/v1/auth/token/refresh/ | Refresh token |
| POST | /api/v1/auth/token/verify/ | Verificar token |
| GET | /api/v1/contacts/ | Listar contactos |
| POST | /api/v1/contacts/ | Crear contacto |
| GET | /api/v1/contacts/{id}/ | Detalle de contacto |
| PATCH | /api/v1/contacts/{id}/ | Actualizar contacto |
| DELETE | /api/v1/contacts/{id}/ | Eliminar (solo managers) |
| PATCH | /api/v1/contacts/{id}/status/ | Cambiar estado |
| PATCH | /api/v1/contacts/{id}/assign/ | Reasignar (solo managers) |

### V2 - Interacciones e Integraciones

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /api/v1/interactions/ | Listar interacciones |
| POST | /api/v1/interactions/ | Crear interacción |
| POST | /api/v1/integrations/meta/webhook/ | Webhook Meta Lead Ads |
| POST | /api/v1/integrations/ai/summarize/ | Resumir con OpenAI |

### V3 - Data-Enhanced (Machine Learning)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /api/v3/lead-score/{contact_id}/ | Lead score (0-100) con prioridad |
| POST | /api/v3/sentiment/{interaction_id}/ | Analizar sentimiento de interacción |
| GET | /api/v3/sentiment/stats/ | Estadísticas de sentimiento |

### V3.4 - Analytics Avanzados

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /api/v3/churn/{contact_id}/ | Predicción de churn (0-100) |
| GET | /api/v3/segment/{contact_id}/ | Segmentación de cliente (K-Means) |
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
- API V3: http://localhost:8000/api/v3
- Swagger UI: http://localhost:8000/api/docs/
- Admin Django: http://localhost:8000/admin/

Credenciales de desarrollo:
- Usuario: admin / admin123

Para poblar datos de prueba:
cd backend
python scripts/populate_data.py

---

## Tests y Cobertura

cd backend
pytest tests/ -v
pytest tests/ --cov=apps --cov-report=term-missing

Cobertura actual: 90% en V1. Pendiente: cobertura para módulo analytics (V4).

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
| Lead Scoring | Random Forest + reglas de negocio (fallback) | Robustez ante entradas no codificables |
| Churn Prediction | Random Forest con features de interacción | Anticipa abandono de clientes |
| Segmentación | K-Means (3 clusters) sobre features RFM | Agrupación automática de clientes |
| Análisis de Sentimiento | OpenAI + modo simulado por palabras clave | Clasificación sin depender de API externa en dev |
| Serialización de modelos | joblib (.pkl) cargados en memoria al iniciar | Inferencia sin reentrenar en cada request |
| Versionado de API | Prefijo /api/v3/ + cliente separado en frontend | Coexistencia con V1 sin romper contratos |
| CORS | django-cors-headers con allow-all en dev | Comunicación frontend-backend en desarrollo |

---

## Pipeline de Machine Learning

Los modelos viven en backend/apps/analytics/ml/models/ como archivos .pkl serializados con joblib.

Flujo:
1. Scripts de entrenamiento en backend/scripts/ (train_model.py, train_churn.py, train_segmentation.py)
2. Datos de entrada en backend/data/processed/ (leads_training.csv, real_leads.csv)
3. Entrenamiento → validación → serialización del modelo + scaler + encoders
4. Inferencia vía endpoints /api/v3/ con carga del modelo al iniciar el servidor

Modelos actuales:
- lead_scoring.pkl / lead_scoring_v2.pkl — Random Forest para lead scoring
- churn_model.pkl — Random Forest para predicción de churn
- segmentation_model.pkl — K-Means (3 clusters)
- scaler.pkl, encoders.pkl, feature_columns.pkl — Preprocesamiento

---

## Estructura del Proyecto

| Ruta | Descripción |
|------|-------------|
| backend/apps/analytics/ | Módulo de ciencia de datos y ML |
| backend/apps/analytics/ml/ | Modelos de Machine Learning |
| backend/apps/analytics/ml/models/ | Modelos serializados (.pkl) |
| backend/apps/contacts/ | Gestión de contactos |
| backend/apps/interactions/ | Gestión de interacciones |
| backend/apps/integrations/ | Integraciones con Meta y OpenAI |
| backend/crm_service/settings/ | Configuración por entorno |
| backend/data/processed/ | Datasets procesados |
| backend/scripts/ | Scripts de entrenamiento y población |
| frontend/src/app/ | Páginas de Next.js |
| frontend/src/components/ui/ | Componentes shadcn/ui |
| frontend/src/lib/ | Clientes HTTP (api-client, analytics-client) |

---

## Variables de Entorno

Backend (.env en backend/):
- SECRET_KEY — Clave secreta de Django
- DEBUG — True en desarrollo
- ALLOWED_HOSTS — Hosts permitidos
- META_ACCESS_TOKEN — Token de acceso Meta Lead Ads
- META_APP_SECRET — Secreto para validación HMAC del webhook
- OPENAI_API_KEY — Clave de OpenAI (opcional, modo simulado si falta)
- DATABASE_URL — URL de base de datos (PostgreSQL en prod)

Frontend (.env.local en frontend/):
- NEXT_PUBLIC_API_URL — URL del backend (usar http://127.0.0.1:8000/api/v1)

---

## Roadmap

- [x] v1.0.0 - Backend REST + Autenticación JWT + Meta/OpenAI
- [x] v2.0.0 - Frontend Next.js + Dashboard + Lista de Contactos
- [x] v3.0.0 - Data-Enhanced (Lead Scoring inicial)
- [x] v3.1.0 - Dashboard Analítico con gráficos
- [x] v3.2.0 - Integración de Lead Score y Sentimiento en Frontend
- [x] v3.3.0 - Lead Scoring dinámico y correcciones
- [x] v3.4.0 - Analytics avanzados (Churn, Segmentación, Exportación, Filtros)
- [ ] v4.0.0 - Despliegue en AWS + WebSockets + Notificaciones en tiempo real

---

## Roles y Permisos

| Rol | Permisos |
|-----|----------|
| Manager | CRUD completo, eliminar contactos, reasignar a agentes, ver dashboard de agentes |
| Agent | Ver y editar solo sus contactos asignados, crear interacciones |

---

## Licencia

MIT

---

Repositorio: https://github.com/criverap-duoc/CRM-Service
Versiones: v1.0.0, v2.0.0, v3.0.0, v3.1.0, v3.2.0, v3.3.0, v3.4.0