# Coding Standards

## Python / Django
- Use rom apps.X.models import Y for cross-app imports
- Always add elated_name to FK and M2M fields
- Use select_related / prefetch_related when accessing related objects
- Custom exception handler envelope: {""error"": {""code"", ""message"", ""details""}}

## Frontend / TypeScript
- Path alias @/ for imports from src/
- Type all API payloads; avoid ny
- Client components: 'use client' at top
- shadcn/ui components only from @/components/ui/
- Icons: lucide-react. Charts: echarts

## API Client Pattern
- api-client.ts: V1 endpoints (contacts, companies, tags, tasks)
- analytics-client.ts: V3 endpoints (lead-score, churn, segment)
- Both use separate axios instances with JWT interceptors

## Naming
- Python: snake_case functions/vars, PascalCase classes
- TypeScript: camelCase functions/vars, PascalCase components/types
- Files: kebab-case for pages, snake_case for Python modules