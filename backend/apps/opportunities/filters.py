import django_filters
from django.utils import timezone
from .models import Opportunity


class OpportunityFilter(django_filters.FilterSet):
    stage = django_filters.MultipleChoiceFilter(choices=Opportunity.Stage.choices)
    assigned_to = django_filters.NumberFilter(field_name="assigned_to__id")
    contact = django_filters.NumberFilter(field_name="contact__id")
    company = django_filters.NumberFilter(field_name="company__id")
    amount_min = django_filters.NumberFilter(field_name="amount", lookup_expr="gte")
    amount_max = django_filters.NumberFilter(field_name="amount", lookup_expr="lte")
    expected_close_before = django_filters.DateFilter(
        field_name="expected_close_date", lookup_expr="lte"
    )
    expected_close_after = django_filters.DateFilter(
        field_name="expected_close_date", lookup_expr="gte"
    )
    overdue = django_filters.BooleanFilter(method="filter_overdue")
    open_only = django_filters.BooleanFilter(method="filter_open_only")

    class Meta:
        model = Opportunity
        fields = [
            "stage", "assigned_to", "contact", "company",
            "amount_min", "amount_max",
            "expected_close_before", "expected_close_after",
            "overdue", "open_only",
        ]

    def filter_overdue(self, queryset, name, value):
        if value is True:
            today = timezone.now().date()
            return queryset.filter(
                expected_close_date__lt=today
            ).exclude(stage__in=[Opportunity.Stage.WON, Opportunity.Stage.LOST])
        return queryset

    def filter_open_only(self, queryset, name, value):
        if value is True:
            return queryset.exclude(
                stage__in=[Opportunity.Stage.WON, Opportunity.Stage.LOST]
            )
        return queryset
