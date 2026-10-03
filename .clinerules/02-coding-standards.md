# Coding Standards

## Python / Django

- Cross-app imports: `from apps.X.models import Y`
  (nunca `from X.models import Y`)
- Siempre agregar `related_name` a FKs y M2M. El nombre debe describir
  la relación inversa, no la directa.
  Ej: `contact = FK(Contact, related_name="opportunities")` — no `related_name="contact_fk"`
- Usar `select_related` (FK) y `prefetch_related` (M2M y reversas)
  cuando se acceda a objetos relacionados en un loop.
- Excepción custom handler: envelope `{"error": {"code", "message", "details"}}`

## Frontend / TypeScript

- Path alias `@/` para imports desde `src/`
- Tipar payloads de API; evitar `any`. Usar `unknown` y narrowing.
- Client components: `'use client'` en la primera línea
- Componentes UI: siempre desde `@/components/ui/` (shadcn)
- Iconos: `lucide-react`. Gráficos: `recharts`.

## API Client Pattern

- `api-client.ts`: endpoints V1 (contacts, companies, tags, tasks, products, opportunities)
- `analytics-client.ts`: endpoints V3 (lead-score, churn, segment)
- Cada cliente tiene su propia instancia de axios con interceptores JWT

## Naming

- Python: `snake_case` para funciones/variables, `PascalCase` para clases
- TypeScript: `camelCase` para funciones/variables, `PascalCase` para componentes/tipos
- Archivos: `kebab-case` para páginas, `snake_case` para módulos Python

## Diagnósticos de TypeScript en VS Code

El servidor TS de VS Code acumula diagnósticos obsoletos tras múltiples
ediciones seguidas. Antes de intentar "arreglar" un error reportado por
VS Code, verifica si es real:

1. Leer el archivo real en disco: `Get-Content <archivo>`
2. Correr `npx tsc --noEmit --pretty false` (lee del disco, no del editor)
3. Si `tsc` pasa pero VS Code reporta errores → son stale, ignóralos
4. Citar la línea y el contenido actual del archivo en el reporte

## Edición de bloques de código (search/replace)

**Problema conocido:** el editor de Cline, cuando reemplaza texto, preserva
la indentación del contexto donde inserta. Si el `old_text` no incluye los
espacios iniciales exactos de cada línea, el resultado queda mal indentado.
Este bug se ha visto en `populate_data.py`, `test_contacts.py` y otros.

**Causa raíz:** la indentación del `new_text` se combina con la del punto
de inserción, no se copia del `old_text`.

### Reglas obligatorias

1. **SIEMPRE incluir los espacios iniciales** en el `old_text` y en el
   `new_text`, sin excepción. Si el bloque tiene 4 espacios, esos 4
   espacios van en el `old_text`.

2. **Para bloques anidados**, usar un bloque completo contiguo (5-10 líneas)
   en lugar de editar una sola línea. Una línea sin indentación visible
   es la causa #1 de este bug.

3. **Máximo 2 edits por archivo por turno.** Para 3+ cambios en el mismo
   archivo, hacer UN solo edit grande que cubra todo, o esperar al
   siguiente turno del usuario.

4. **Verificación obligatoria después de cada edit:**
   ```bash
   python -c "import ast; ast.parse(open('<archivo>', encoding='utf-8').read()); print('OK')"