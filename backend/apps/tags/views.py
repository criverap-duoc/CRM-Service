from rest_framework import viewsets
from .models import Tag
from .serializers import TagSerializer
from .permissions import TagPermission


class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [TagPermission]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)