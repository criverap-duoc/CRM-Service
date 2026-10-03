# Code Cleanup Rules

## Antes de cualquier commit — reportar, no arreglar sin aprobación

1. Imports Python no usados (reportar, no eliminar)
2. Imports TypeScript no usados (reportar, no eliminar)
3. Código huérfano (función/clase reemplazada pero no eliminada)
4. Archivos muertos (ej: lead_scoring.py vs lead_scoring_v3.py)
5. Debug leftovers: console.log en frontend, print() en backend

## Código basura generado por agentes

Frases que indican código inalcanzable o basura a eliminar antes del commit:

- `if False else None` — placeholder muerto
- `# TODO` o `# FIXME` sin autor ni fecha
- Código después de un `return` en la misma función
- Variables declaradas y nunca usadas
- Comentarios tipo "esto se elimina después" o "provisional"

Detección con grep (Git Bash):

grep -rn "if False\|# TODO\|# FIXME\|pass$" backend/ frontend/src/

grep -n "return" backend/apps/<app>/<archivo>.py
# Y verificar manualmente que no haya código después

python -m pyflakes backend/apps/ 2>&1 | head -20

npx tsc --noUnusedLocals --noUnusedParameters --noEmit

## Verificación obligatoria antes de commitear

### Archivos Python

Ejecutar para cada archivo modificado:

python -c "import ast; ast.parse(open('<archivo>', encoding='utf-8').read()); print('OK: <archivo>')"

Debe reportar OK para cada uno. Si falla, hay error de sintaxis.

### Tests

python -m pytest backend/tests/ -v

Todos los tests deben pasar. Si un test nuevo falla, verificar:
- ¿Es fallo real de código? → arreglar
- ¿Es indentación rota introducida por un edit? → revertir con git y rehacer
- ¿Es test preexistente que ya fallaba? → confirmar con git stash, restaurar
  el cambio y anotar en el mensaje del commit

### Frontend

cd frontend
npx tsc --noEmit --pretty false

Debe salir con EXIT=0.

## "cleanup pass" — cuando el usuario lo pida

git diff --name-only

Luego, para cada archivo modificado:

1. Python: python -m pyflakes <archivo> (imports no usados)
2. TypeScript: npx tsc --noUnusedLocals --noEmit (imports no usados)
3. Grep de código basura (sección anterior)
4. Verificar archivos con old, backup, copy en el nombre

Reportar como tabla: Archivo | Problema | Acción sugerida.
No aplicar cambios sin aprobación explícita del usuario.

## Indentación rota — anti-patrón principal de los agentes

Los archivos backend/tests/test_*.py y backend/scripts/*.py son
particularmente sensibles a errores de indentación porque usan
decoradores y bloques anidados.

Señal de alarma: python -c "import ast; ast.parse(...)" falla
después de un edit.

Acción inmediata: git checkout <archivo> para revertir, luego
reintentar el edit con el bloque completo (ver reglas de edición en
02-coding-standards.md).

Nunca acumular edits sobre un error de sintaxis. Cada edit encima
del error hace más difícil de revertir.