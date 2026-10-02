# Automation Workflows

## ""project health check""
When asked, run and report:
1. git status --short
2. git log --oneline -5
3. pytest --co -q  (from backend/)
4. Get-ChildItem backend/apps/analytics/ml/models/*.pkl

## ""light backup""
When asked, run:
1. New-Item -ItemType Directory -Force -Path ""../backups"" | Out-Null
2. git bundle create ../backups/crm-$(Get-Date -Format 'yyyyMMdd').bundle --all
Skip if today's bundle exists.

## ""clean commit""
When asked, run:
1. git add -A
2. git diff --cached --stat
3. Generate Conventional Commit message (type(scope): description)
4. Show message for approval BEFORE committing

## ""tag and release""
When asked, run:
1. Confirm version format vX.Y.Z
2. git tag -a vX.Y.Z -m ""VX.Y.Z: <generated description>""
3. git push origin master
4. git push origin vX.Y.Z

## ""dependency audit""
When asked, run:
1. pip list --outdated (from backend/ with venv active)
2. pnpm outdated (from frontend/)

## "cerrar feature"

Cuando el usuario diga "cerrar feature", ejecuta y reporta:

1. npx tsc --noEmit --pretty false (debe ser EXIT=0)
2. npx eslint <archivos nuevos> (debe ser EXIT=0)
3. Verifica que todas las rutas del feature respondan 200 en dev server:
   foreach ($p in @("ruta1","ruta2")) { Invoke-WebRequest ... }
4. git status --short → listar nuevos, modificados, eliminados
5. Verifica que ningún archivo del feature quedó huérfano:
   - grep -rn "router.push('/<nueva-ruta>')" src/
   - Si devuelve 0 resultados, la página no está enlazada
6. Si todo está OK, procede con:
   git add .
   git commit -m "<type>(<scope>): <descripción>"
   git push origin master
7. Reporta: hash del commit + output del push


## "verificar indentación"

Ejecuta para cada archivo .py modificado:

1. python -c "import ast; ast.parse(open('<archivo>').read())"
2. Mostrar las líneas sospechosas con espacios visibles:
   - PowerShell: Get-Content <archivo> | Select-Object -First 50 | ForEach-Object { $_.Replace(' ', '·') }
3. Reportar cualquier línea con más de 8 espacios consecutivos seguidos
   de código (probable indentación rota).