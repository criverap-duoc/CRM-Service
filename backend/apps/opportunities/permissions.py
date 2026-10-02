from rest_framework.permissions import BasePermission


class OpportunityPermission(BasePermission):
    """Manager: CRUD completo. Agent: solo las que tiene asignadas o las de sus contactos."""

    message = "No tienes permiso para acceder a esta oportunidad."

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser or request.user.groups.filter(name="managers").exists():
            return True
        return (
            obj.assigned_to == request.user
            or obj.contact.assigned_to == request.user
        )
