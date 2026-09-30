# CRM Service

[![Python](https://img.shields.io/badge/Python-3.12-blue)](https://python.org)
[![Django](https://img.shields.io/badge/Django-5.x-green)](https://djangoproject.com)
[![DRF](https://img.shields.io/badge/DRF-3.15-red)](https://www.django-rest-framework.org)
[![Next.js](https://img.shields.io/badge/Next.js-16.x-black)](https://nextjs.org)
[![Tailwind](https://img.shields.io/badge/Tailwind-4.x-38bdf8)](https://tailwindcss.com)
[![shadcn/ui](https://img.shields.io/badge/shadcn/ui-latest-000000)](https://ui.shadcn.com)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.5-orange)](https://scikit-learn.org)
[![pytest](https://img.shields.io/badge/tests-pytest-blueviolet)](https://pytest.org)

> Sistema CRM completo con Django REST Framework, Next.js 16 y capacidades de ciencia de datos. Incluye autenticación JWT, gestión de contactos, empresas, tags y tareas, integración con Meta Lead Ads y OpenAI, lead scoring con Machine Learning, predicción de churn, segmentación de clientes y análisis de sentimiento.

---

## Propósito

CRM Service es un sistema CRM inteligente diseñado para:

- Gestionar contactos, empresas, tags y tareas con un sistema de roles (Manager/Agent)
- Automatizar la captura de leads desde Meta Lead Ads
- Predecir probabilidad de conversión usando Machine Learning (Lead Scoring)
- Predecir riesgo de abandono de clientes (Churn Prediction)
- Segmentar clientes automáticamente con K-Means
- Analizar sentimiento de interacciones con clientes
- Proveer dashboards comercial y analítico para visualizar métricas clave

El problema que resuelve: Equipos comerciales pierden oportunidades porque los leads generados en campañas digitales quedan sin seguimiento por horas. Este sistema reduce ese tiempo de 48 horas a menos de 2 horas mediante automatización inteligente y priorización por ML.

---

## Stack Tecnológico

Backend:
- Framework: Django 5.x + Django REST Framework
- Autenticación: JWT (SimpleJWT) + Roles (Manager/Agent vía grupos de Django)
- Base de Datos: SQLite (dev) / PostgreSQL (prod planificado)
- Integraciones: Meta Lead Ads, OpenAI
- Machine Learning: scikit-learn (Random Forest, K-Means, GridSearchCV)
- Procesamiento de Datos: pandas, numpy, joblib
- Documentación: drf-spectacular (OpenAPI/Swagger)
- Filtros: django-filter
- Tests: pytest + pytest-django

Frontend:
- Framework: Next.js 16 (App Router, Turbopack)
- Lenguaje: TypeScript
- Estilos: Tailwind CSS 4.x + shadcn/ui
- Estado: React Context API (AuthContext)
- HTTP: Axios con interceptores
- Gráficos: Recharts
- Iconos: Lucide React
- Gestor de paquetes: pnpm

Ciencia de Datos:
- Modelos: Random Forest (Lead Scoring, Churn), K-Means (Segmentación)
- Features: 20 features derivadas de Contact, Company, Tag, Task e Interaction
- Datasets: 2000 leads sintéticos rebalanceados + 60 leads reales para validación
- Pipeline: entrenamiento → serialización (.pkl) → inferencia vía API
- Fallback: reglas de negocio si los modelos no están disponibles

---

## V4 - Ecosistema de entidades

La V4 expande el modelo de dominio del CRM con tres entidades nuevas que enriquecen la analítica y el Machine Learning.

| Entidad | Propósito | Impacto en ML |
|---------|-----------|---------------|
| **Company** | Agrupa contactos por empresa con industria, tamaño e ingresos | Features categóricas y numéricas para lead scoring y churn |
| **Tag** | Etiquetas libres con color para categorizar contactos (M2M) | Señales de prioridad (VIP, Caliente, En riesgo) |
| **Task** | Tareas operativas asociadas a contactos y agentes | Features de productividad (overdue tasks, completion rate) |

**Endpoints nuevos de V4:**

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET/POST | /api/v1/companies/ | Listar y crear empresas (filtros: industria, tamaño, búsqueda) |
| GET | /api/v1/companies/{id}/health/ | Health score agregado de la cuenta (0-100) |
| GET/POST | /api/v1/tags/ | Listar y crear tags |
| GET/POST | /api/v1/tasks/ | Listar y crear tareas (filtros: status, priority, overdue) |
| GET | /api/v1/tasks/overdue/ | Tareas vencidas (due_date < now, no completadas) |
| GET | /api/v1/tasks/my-summary/ | Resumen de tareas del usuario autenticado |

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
| GET | /api/v3/lead-score/{contact_id}/ | Lead score (0-100) con etiqueta de prioridad |
| GET | /api/v3/churn/{contact_id}/ | Predicción de churn (0-100) con nivel de riesgo |
| GET | /api/v3/segment/{contact_id}/ | Segmento asignado (K-Means) con stats del cluster |
| GET | /api/v3/segment/stats/ | Distribución global de segmentos |
| POST | /api/v3/sentiment/{interaction_id}/ | Analizar sentimiento de interacción |
| GET | /api/v3/sentiment/stats/ | Estadísticas agregadas de sentimiento |
| GET | /api/v3/export/contacts/ | Exportar contactos a CSV |
| GET | /api/v3/export/interactions/ | Exportar interacciones a CSV |
| GET | /api/v3/agents/dashboard/ | Métricas por agente |

---

## Pipeline de Machine Learning

El sistema entrena tres modelos independientes sobre un dataset unificado de features.

**Features (20 en total):**

- Contacto: source, status
- Interacción: time_to_first_interaction, interactions_7d, interaction_frequency, days_since_last_interaction, response_rate, total_interactions
- Sentimiento: sentiment_avg
- Empresa: company_industry, company_size, company_revenue
- Tags: tag_count, has_vip_tag, has_hot_tag, has_cold_tag, has_risk_tag
- Tareas: total_tasks, completed_tasks, overdue_tasks, task_completion_rate

**Modelos entrenados:**

| Modelo | Algoritmo | Target | ROC-AUC test |
|--------|-----------|--------|--------------|
| Lead Scoring | Random Forest (200 árboles) | converted | 0.92 |
| Churn Prediction | Random Forest (200 árboles) | churned | 0.97 |
| Segmentación | K-Means (3 clusters) | — | — |

**Pipeline de ejecución:**

- `python scripts/generate_synthetic_v3.py` — genera 2000 leads sintéticos con distribuciones solapadas
- `python scripts/export_real_data.py` — exporta features de los contactos reales
- `python scripts/train_model_v3.py` — entrena lead scoring
- `python scripts/train_churn_v3.py` — entrena churn
- `python scripts/train_segmentation_v3.py` — entrena segmentación

**Módulos clave:**

- `apps/analytics/ml/features.py` — construcción unificada de features (usado por entrenamiento e inferencia)
- `apps/analytics/ml/lead_scoring_v3.py` — clase del modelo de lead scoring
- `apps/analytics/ml/churn_prediction_v3.py` — clase del modelo de churn
- `apps/analytics/ml/segmentation_v3.py` — clase del modelo de segmentación

---

## Consideraciones sobre los datos

Los modelos se entrenan sobre una combinación de **2000 leads sintéticos** (generados con reglas que simulan correlaciones reales) y **60 leads reales** generados por el script `populate_data.py`.

**Importante:** las métricas reportadas (ROC-AUC 0.92-0.97) están influidas por la naturaleza controlada de los datos sintéticos. Si bien las distribuciones se diseñaron con solapamiento intencional para evitar leakage trivial, un entorno de producción con datos reales probablemente mostraría métricas más modestas.

El propósito de la combinación sintético-real es:

1. Dar al modelo volumen suficiente para aprender patrones generales.
2. Validar contra datos reales que el pipeline funciona end-to-end.
3. Establecer una base sólida que mejorará naturalmente con más datos reales.

**Trabajo futuro:** recolectar más datos reales de uso continuo y reentrenar periódicamente. La arquitectura del pipeline lo permite sin cambios estructurales.

---

## Quick Start

Clonar el repositorio:

git clone https://github.com/criverap-duoc/CRM-Service.git
cd CRM-Service

Backend:

cd backend
python -m venv .venv
source .venv/bin/activate    (Windows: .venv\Scripts\activate)
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

Credenciales de desarrollo: admin / admin123

Para poblar datos de prueba:

cd backend
python scripts/populate_data.py

Para entrenar los modelos de ML:

python scripts/generate_synthetic_v3.py
python scripts/export_real_data.py
python scripts/train_model_v3.py
python scripts/train_churn_v3.py
python scripts/train_segmentation_v3.py

---

## Tests y Cobertura

Backend:

cd backend
pytest -v
pytest --cov=apps --cov-report=term-missing

Cobertura actual:

- Tests de contactos e interacciones (V1).
- Tests de analytics: 17 tests cubriendo lead score, churn, segmento, sentiment stats y segment stats (V4).
- Pendiente: tests de empresas, tags y tareas.

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
| Permisos por grupos | request.user.groups.filter(name="managers") | Coherente con Django auth, sin campo custom |
| FK nullable en Contact.company | SET_NULL + blank=True | No rompe datos existentes, permite migración suave |
| Auto-completado de Task | Override de save() setea completed_at | Consistencia sin importar el cliente (API, admin, script) |
| is_overdue como property | Cálculo en vivo con timezone.now() | Sin cron ni proceso batch |
| Features unificadas en ML | build_features_for_contact() centralizado | Consistencia garantizada entre train e inferencia |
| Modelos ML versionados | _v3.pkl en lugar de sobrescribir | Reversión sencilla, comparación de métricas |
| Fallback a reglas de negocio | try/except en endpoints de analytics | Sistema funciona sin .pkl |
| Datos sintéticos rebalanceados | Distribuciones solapadas con std grandes | Evita leakage, ROC-AUC realista |
| Versionado de API | Prefijo /api/v3/ + cliente separado en frontend | Coexistencia con V1 sin romper contratos |

---

## Estructura del Proyecto

| Ruta | Descripción |
|------|-------------|
| backend/apps/analytics/ | Módulo de ciencia de datos y ML |
| backend/apps/analytics/ml/features.py | Construcción unificada de features |
| backend/apps/analytics/ml/*_v3.py | Modelos ML V3 |
| backend/apps/analytics/ml/models/ | Modelos serializados (.pkl) |
| backend/apps/companies/ | Gestión de empresas con health score |
| backend/apps/contacts/ | Gestión de contactos |
| backend/apps/interactions/ | Gestión de interacciones |
| backend/apps/integrations/ | Integraciones con Meta y OpenAI |
| backend/apps/tags/ | Gestión de tags con color |
| backend/apps/tasks/ | Gestión de tareas con vencimiento |
| backend/crm_service/settings/ | Configuración por entorno (base/dev/prod/test) |
| backend/data/processed/ | Datasets procesados (sintéticos + reales) |
| backend/scripts/ | Scripts de entrenamiento y población |
| frontend/src/app/ | Páginas de Next.js (companies, contacts, tags, tasks, analytics) |
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
- [x] v4.0.0-alpha.1 - Entidad Company con health score y FK en Contact
- [x] v4.0.0-alpha.2 - Ecosistema completo (Company + Tag + Task) + ML V3
- [ ] v4.0.0 - Opportunity, Product y forecast de ingresos
- [ ] v4.1.0 - WebSockets y notificaciones en tiempo real
- [ ] v4.2.0 - Despliegue en AWS (ECS + RDS + S3)
- [ ] v5.0.0 - Reentrenamiento con datos reales de producción

---

## Roles y Permisos

| Rol | Permisos |
|-----|----------|
| Manager | CRUD completo en todas las entidades, eliminar contactos, reasignar agentes, gestionar empresas y tags, ver dashboard de agentes |
| Agent | Ver y editar solo sus contactos asignados, crear interacciones y tareas, ver todas las empresas y tags (lectura) |

---

## Licencia

MIT

---

Repositorio: https://github.com/criverap-duoc/CRM-Service
Versiones: v1.0.0, v2.0.0, v3.0.0, v3.1.0, v3.2.0, v3.3.0, v3.4.0, v4.0.0-alpha.1, v4.0.0-alpha.2