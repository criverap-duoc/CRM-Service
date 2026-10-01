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