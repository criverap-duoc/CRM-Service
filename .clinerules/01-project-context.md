# Project Context: CRM-Service V4

## Stack
- Backend: Django 5.x + DRF, SQLite (dev), JWT auth
- Frontend: Next.js 16 App Router, TypeScript, Tailwind 4, shadcn/ui, pnpm
- ML: scikit-learn, pandas, joblib. Models live in apps/analytics/ml/
- Testing: pytest + pytest-django

## Key Architecture Decisions
- Permissions via Django groups (""managers""), NOT a custom role field
- Serializers: separate List/Detail to prevent over-fetching
- ML features unified via apps/analytics/ml/features.py build_features_for_contact()
- ML models versioned: _v3.pkl files, never overwrite old ones
- API versioning: /api/v1/ for CRUD, /api/v3/ for analytics/ML

## Local Paths
- Backend: backend/
- Frontend: frontend/
- ML models: backend/apps/analytics/ml/models/
- Training scripts: backend/scripts/
- Datasets: backend/data/processed/

## Commands
- Backend: python manage.py runserver
- Frontend: pnpm dev (from frontend/)
- Tests: pytest (from backend/)
- Populate: python scripts/populate_data.py