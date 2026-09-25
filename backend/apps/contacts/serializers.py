from rest_framework import serializers
from django.contrib.auth.models import User
from apps.companies.models import Company
from .models import Contact
from apps.tags.serializers import TagSerializer
from apps.tags.models import Tag


class AssignedUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email"]
        read_only_fields = fields


class CompanyBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ["id", "name", "industry", "size"]
        read_only_fields = fields


class ContactSerializer(serializers.ModelSerializer):
    assigned_to = AssignedUserSerializer(read_only=True)
    assigned_to_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="assigned_to",
        write_only=True,
        required=False,
        allow_null=True,
    )
    company = serializers.CharField(source="company.name", read_only=True, default="")
    company_id = serializers.PrimaryKeyRelatedField(
        queryset=Company.objects.all(),
        source="company",
        write_only=True,
        required=False,
        allow_null=True,
    )
    full_name = serializers.CharField(read_only=True)
    interaction_count = serializers.IntegerField(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        queryset=Tag.objects.all(),
        source="tags",
        write_only=True,
        required=False,
        many=True,
    )

    class Meta:
        model = Contact
        fields = [
            "id", "first_name", "last_name", "full_name", "email", "phone",
            "company", "company_id", "tags", "tag_ids", "status", "source",
            "assigned_to", "assigned_to_id", "notes", "interaction_count",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "full_name", "interaction_count"]

    def validate_email(self, value):
        qs = Contact.objects.filter(email=value)
        instance = self.instance
        if instance:
            qs = qs.exclude(pk=instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A contact with this email already exists.")
        return value


class ContactListSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    company = serializers.CharField(source="company.name", read_only=True, default="")
    tags = TagSerializer(many=True, read_only=True)

    class Meta:
        model = Contact
        fields = ["id", "full_name", "email", "company", "tags", "status", "source", "created_at"]