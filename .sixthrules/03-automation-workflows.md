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