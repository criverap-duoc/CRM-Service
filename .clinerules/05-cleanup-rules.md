# Code Cleanup Rules

Before any commit, check and flag (don't auto-fix without approval):
1. Unused Python imports (report, don't remove)
2. Unused TypeScript imports (report, don't remove)
3. Orphaned code (old function/class replaced but not removed)
4. Dead files (superseded by newer version, e.g., lead_scoring.py vs lead_scoring_v3.py)
5. Console.log in frontend, print() in backend (debug leftovers)

## ""cleanup pass""
When asked:
1. git diff --name-only
2. Scan each modified Python file for unused imports
3. Scan each modified TS/TSX file for unused imports
4. Check for files with ""old"", ""backup"", ""copy"" in name
5. Report as table: File | Issue | Suggested Action

## Verificación obligatoria después de cambios en múltiples archivos

Cuando el cambio afecte a más de un archivo, ANTES de reportar "listo", verifica:

1. Todos los archivos tienen sintaxis válida:
   - npx tsc --noEmit --pretty false (debe salir EXIT=0)
   - npx eslint <archivos> (debe salir EXIT=0 para archivos nuevos)

2. Todos los imports referenciados existen en el código:
   - grep -r "from '@/lib/api-client'" src/
   - Verificar que cada nombre importado (ej: `products`) esté exportado
     en api-client.ts

3. Todas las referencias a endpoints del backend existen en urls.py:
   - Si agregas products.list(), verifica que /api/v1/products/ esté registrado

4. Ningún archivo quedó huérfano:
   - Antes de crear page.tsx nuevos, verificar si ya existe uno del mismo nombre
   - Si un archivo no está enlazado desde ningún router.push, es huérfano → bórralo

5. Reportar el estado del working tree:
   - git status --short
   - Listar los archivos nuevos (??) y modificados (M)


## Código basura generado por agentes

Frases típicas que indican código inalcanzable o basura que hay que
eliminar antes de commitear:

- `if False else None` — placeholder que nunca se ejecuta
- `# TODO` o `# FIXME` sin autor
- Líneas después de `return` en la misma función
- Variables declaradas y nunca usadas
- Comentarios que dicen "esto se elimina después"

Detectar con:
grep -n "if False\|# TODO\|# FIXME\|pass$" <archivo>
grep -n "return" <archivo>  # y verificar que no haya código después