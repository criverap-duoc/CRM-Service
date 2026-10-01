# CRM-Service Copilot Instructions

## General
- pnpm, not npm or yarn.
- Backend: Django REST Framework. Frontend: Next.js 16 App Router.

## Python
- select_related and prefetch_related in querysets.
- Always add related_name to model relations.
- Imports: from apps.contacts.models import Contact

## TypeScript / React
- Use @/ path alias.
- Client components: 'use client' at top.
- shadcn/ui from @/components/ui/.
- Icons: lucide-react.
- Avoid any; type all parameters and API responses.

## Styling
- Cards: rounded-2xl. Buttons/inputs: rounded-xl.
- Primary gradient: from-blue-600 to-indigo-600.
- Background: bg-gradient-to-br from-slate-50 via-white to-indigo-50/40.

## Tests
- pytest for backend. @pytest.mark.django_db for DB tests.