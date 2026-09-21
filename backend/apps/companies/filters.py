import django_filters
from .models import Company


class CompanyFilter(django_filters.FilterSet):
    industry = django_filters.MultipleChoiceFilter(choices=Company.Industry.choices)
    size = django_filters.MultipleChoiceFilter(choices=Company.Size.choices)
    country = django_filters.CharFilter(lookup_expr="icontains")

    class Meta:
        model = Company
        fields = ["industry", "size", "country"]