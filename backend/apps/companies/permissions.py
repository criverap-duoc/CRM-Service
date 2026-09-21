from rest_framework.permissions import BasePermission


class CompanyPermission(BasePermission):
    """Manager: CRUD completo. Agent: solo lectura."""

    message = "Solo los managers pueden modificar empresas."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return (
            request.user.is_superuser
            or request.user.groups.filter(name="managers").exists()
        )