from rest_framework import serializers
from django.contrib.auth.models import User

from .models import Task
from apps.contacts.models import Contact


class AssignedUserBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email"]
        read_only_fields = fields


class ContactBriefSerializer(serializers.ModelSerializer):
    """Serializer compacto del contacto para embeber en la tarea."""
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Contact
        fields = ["id", "full_name", "email"]
        read_only_fields = fields


class TaskListSerializer(serializers.ModelSerializer):
    """Serializer compacto para listados."""
    assigned_to = AssignedUserBriefSerializer(read_only=True)
    contact = ContactBriefSerializer(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = Task
        fields = [
            "id", "title", "status", "priority",
            "due_date", "completed_at", "is_overdue",
            "assigned_to", "contact",
            "created_at", "updated_at",
        ]


class TaskSerializer(serializers.ModelSerializer):
    """Serializer completo para detalle y creación."""
    assigned_to = AssignedUserBriefSerializer(read_only=True)
    assigned_to_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="assigned_to",
        write_only=True,
        required=False,
        allow_null=True,
    )
    contact = ContactBriefSerializer(read_only=True)
    contact_id = serializers.PrimaryKeyRelatedField(
        queryset=Contact.objects.all(),
        source="contact",
        write_only=True,
    )
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = Task
        fields = [
            "id", "title", "description",
            "status", "priority",
            "due_date", "completed_at", "is_overdue",
            "contact", "contact_id",
            "assigned_to", "assigned_to_id",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "completed_at"]