## crm_service\apps\contacts\urls\auth.py
from django.conf import settings
from django.contrib.auth.models import User
from django.http import Http404
from django.urls import path
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)


class DemoLoginView(APIView):
    """
    Login de demo: devuelve un JWT del usuario 'demo'.
    Solo disponible si DEBUG=True. En producción devuelve 404.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        if not settings.DEBUG:
            raise Http404()

        try:
            demo = User.objects.get(username="demo", is_active=True)
        except User.DoesNotExist:
            return Response(
                {"error": {
                    "code": "demo_unavailable",
                    "message": "Usuario demo no disponible. Ejecuta populate_data.py.",
                }},
                status=503,
            )

        refresh = RefreshToken.for_user(demo)
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        })


urlpatterns = [
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    path("demo/", DemoLoginView.as_view(), name="auth-demo"),
]
