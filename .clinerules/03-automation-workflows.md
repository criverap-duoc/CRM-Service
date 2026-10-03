# Automation Workflows

Todos los comandos están en Git Bash (no PowerShell) para consistencia.

## "project health check" — cuando el usuario lo pida

Reportar:
1. git status --short
2. git log --oneline -5
3. cd backend && python -m pytest --co -q (conteo de tests)
4. ls backend/apps/analytics/ml/models/*.pkl (modelos ML presentes)

## "light backup"

mkdir -p ../backups
git bundle create ../backups/crm-$(date +%Y%m%d).bundle --all

Salta si ya existe el bundle del día.

## "clean commit"

1. git add -A
2. git diff --cached --stat
3. Generar mensaje Conventional Commit:
   - Formato: <type>(<scope>): <descripción>
   - Types: feat, fix, docs, test, refactor, chore
   - Scope: v4, ml, frontend, backend, ci, ui
4. Mostrar el mensaje al usuario y esperar aprobación antes de commitear

## "tag and release"

1. Confirmar formato de versión vX.Y.Z
2. git tag -a vX.Y.Z -m "VX.Y.Z: <descripción generada>"
3. git push origin master
4. git push origin vX.Y.Z
5. Mostrar output del tag y del push para verificación

## "dependency audit"

1. cd backend && pip list --outdated
2. cd frontend && pnpm outdated
3. Reportar paquetes desactualizados agrupados por severidad (major/minor/patch)

## "cerrar feature"

Cuando el usuario diga "cerrar feature" o "cerrar bloque":

1. Verificación Python (si aplica):
   cd backend
   python -m pytest tests/ -v
   Todos los tests deben pasar.

2. Verificación TypeScript:
   cd frontend
   npx tsc --noEmit --pretty false
   Debe salir EXIT=0.

3. Verificación de rutas (si aplica frontend):
   for p in dashboard contacts companies tags tasks products opportunities analytics; do
     status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/$p)
     echo "$p -> $status"
   done
   Todas deben devolver 200.

4. Estado del working tree:
   git status --short
   Listar nuevos (??), modificados (M), eliminados (D).

5. Verificar huérfanos (si se agregaron páginas nuevas):
   grep -rn "router.push('/<nueva-ruta>')" frontend/src/
   Si devuelve 0 resultados, la página no está enlazada desde ningún
   navbar. Reportar y preguntar al usuario.

6. Si todo está OK, proceder con:
   git add .
   git commit -m "<type>(<scope>): <descripción>"
   git push origin master

7. Reportar: hash del commit + output del push + resumen de archivos.

## "verificación post-edit" — ejecutar tras cada edit en archivos .py

Inmediatamente después de cualquier edit:

1. Sintaxis:
   python -c "import ast; ast.parse(open('<archivo>', encoding='utf-8').read()); print('OK: <archivo>')"

2. Tests del módulo afectado (si existen):
   python -m pytest backend/tests/test_<modulo>.py -v

3. Reportar: archivos modificados, resultado de sintaxis, resultado de tests.

4. Si algo falla: NO continuar al siguiente paso. Corregir primero con
   git checkout <archivo> y reintentar el edit con el bloque completo.

## "verificación pre-commit" — antes de reportar "feature completo"

1. python -m pytest backend/tests/ -v (todos pasan)
2. cd frontend && npx tsc --noEmit --pretty false (EXIT=0)
3. git status --short (listar cambios)
4. Reportar resumen y esperar confirmación del usuario antes de commitear.