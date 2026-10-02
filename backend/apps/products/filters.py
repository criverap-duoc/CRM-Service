import django_filters
from .models import Product


class ProductFilter(django_filters.FilterSet):
    category = django_filters.MultipleChoiceFilter(choices=Product.Category.choices)
    active = django_filters.BooleanFilter()

    class Meta:
        model = Product
        fields = ["category", "active"]
