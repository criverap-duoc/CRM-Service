## crm_service\apps\contacts\filters.py
import django_filters
from .models import Contact


class ContactFilter(django_filters.FilterSet):
    status = django_filters.MultipleChoiceFilter(choices=Contact.Status.choices)
    source = django_filters.MultipleChoiceFilter(choices=Contact.Source.choices)
    assigned_to = django_filters.NumberFilter(field_name="assigned_to__id")
    company = django_filters.NumberFilter(field_name="company__id")
    tags = django_filters.BaseInFilter(field_name="tags__id", lookup_expr="in")
    created_after = django_filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    created_before = django_filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")

    class Meta:
        model = Contact
        fields = ["status", "source", "assigned_to", "company", "tags", "created_after", "created_before"]