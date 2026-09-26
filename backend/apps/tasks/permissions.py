from rest_framework.permissions import BasePermission


class TaskPermission(BasePermission):
    """Manager: CRUD completo. Agent: solo tareas asignadas a él o a sus contactos."""

    message = "No tienes permiso para acceder a esta tarea."

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Managers ven todo
        if request.user.is_superuser or request.user.groups.filter(name="managers").exists():
            return True
        # Agents solo ven tareas donde son asignados o dueños del contacto
        return obj.assigned_to == request.user or obj.contact.assigned_to == request.user