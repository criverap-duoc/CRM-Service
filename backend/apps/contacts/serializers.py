from rest_framework import serializers
from django.contrib.auth.models import User
from apps.companies.models import Company
from .models import Contact
from .validators import UnicodeEmailValidator
from apps.tags.serializers import TagSerializer
from apps.tags.models import Tag
from apps.products.models import Product
from apps.products.serializers import ProductSerializer


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
    # Override email field to allow UTF-8 characters (acentos en emails)
    # that Django's default EmailValidator rejects.
    email = serializers.EmailField(
        validators=[UnicodeEmailValidator()]
    )
    assigned_to = AssignedUserSerializer(read_only=True)
    assigned_to_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="assigned_to",
        write_only=True,
        required=False,
        allow_null=True,
    )
    company = serializers.CharField(source="company.name", read_only=True, default="")
    # `company_id` es legible y escribible: el detalle del contacto lo usa
    # desde el frontend para enlazar a /companies/<id>. `company` (nombre)
    # sigue siendo la representación por defecto para mostrar.
    company_id = serializers.PrimaryKeyRelatedField(
        queryset=Company.objects.all(),
        source="company",
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
    interests = ProductSerializer(many=True, read_only=True)
    interest_ids = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
        source="interests",
        write_only=True,
        required=False,
        many=True,
    )

    class Meta:
        model = Contact
        fields = [
            "id", "first_name", "last_name", "full_name", "email", "phone",
            "company", "company_id", "tags", "tag_ids",
            "interests", "interest_ids",
            "status", "source",
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
    interest_count = serializers.SerializerMethodField()
    opportunity_count = serializers.SerializerMethodField()

    def get_interest_count(self, obj):
        return obj.interests.count()

    def get_opportunity_count(self, obj):
        return obj.opportunities.count()

    class Meta:
        model = Contact
        fields = [
            "id", "full_name", "email", "company", "tags",
            "interest_count", "opportunity_count",
            "status", "source", "created_at",
        ]
