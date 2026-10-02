from rest_framework import serializers
from django.contrib.auth.models import User

from apps.contacts.models import Contact
from apps.companies.models import Company
from .models import Opportunity


class AssignedUserBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email"]
        read_only_fields = fields


class ContactBriefSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Contact
        fields = ["id", "full_name", "email"]
        read_only_fields = fields


class CompanyBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ["id", "name"]
        read_only_fields = fields


class OpportunityListSerializer(serializers.ModelSerializer):
    contact = ContactBriefSerializer(read_only=True)
    company = CompanyBriefSerializer(read_only=True)
    assigned_to = AssignedUserBriefSerializer(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    weighted_amount = serializers.FloatField(read_only=True)

    class Meta:
        model = Opportunity
        fields = [
            "id", "name", "amount", "stage", "probability",
            "expected_close_date", "closed_at", "is_overdue",
            "weighted_amount",
            "contact", "company", "assigned_to",
            "created_at", "updated_at",
        ]


class OpportunitySerializer(serializers.ModelSerializer):
    contact = ContactBriefSerializer(read_only=True)
    contact_id = serializers.PrimaryKeyRelatedField(
        queryset=Contact.objects.all(),
        source="contact",
        write_only=True,
    )
    company = CompanyBriefSerializer(read_only=True)
    company_id = serializers.PrimaryKeyRelatedField(
        queryset=Company.objects.all(),
        source="company",
        write_only=True,
        required=False,
        allow_null=True,
    )
    assigned_to = AssignedUserBriefSerializer(read_only=True)
    assigned_to_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="assigned_to",
        write_only=True,
        required=False,
        allow_null=True,
    )
    is_overdue = serializers.BooleanField(read_only=True)
    weighted_amount = serializers.FloatField(read_only=True)

    class Meta:
        model = Opportunity
        fields = [
            "id", "name",
            "amount", "stage", "probability",
            "expected_close_date", "closed_at", "lost_reason",
            "is_overdue", "weighted_amount",
            "contact", "contact_id",
            "company", "company_id",
            "assigned_to", "assigned_to_id",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "closed_at"]

    def validate(self, data):
        stage = data.get("stage", getattr(self.instance, "stage", None))
        lost_reason = data.get("lost_reason", getattr(self.instance, "lost_reason", ""))

        if stage == Opportunity.Stage.LOST and not lost_reason.strip():
            raise serializers.ValidationError({
                "lost_reason": "Debes indicar un motivo de pérdida cuando stage=lost."
            })

        probability = data.get("probability", getattr(self.instance, "probability", 0))
        if probability is not None and (probability < 0 or probability > 100):
            raise serializers.ValidationError({
                "probability": "La probabilidad debe estar entre 0 y 100."
            })

        return data
