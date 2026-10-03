from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser


@database_sync_to_async
def get_user_from_token(token):
    """Valida un JWT y devuelve el User asociado, o AnonymousUser."""
    from rest_framework_simplejwt.tokens import AccessToken
    from rest_framework_simplejwt.exceptions import TokenError
    from django.contrib.auth import get_user_model

    try:
        access = AccessToken(token)
        user_id = access["user_id"]
        User = get_user_model()
        return User.objects.get(pk=user_id)
    except (TokenError, KeyError, User.DoesNotExist):
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """
    Middleware de Channels que autentica via JWT pasado en el query string.
    Uso: ws://host/ws/notifications/?token=<access_token>
    """

    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        params = parse_qs(query_string)
        token_list = params.get("token", [])
        token = token_list[0] if token_list else None

        if token:
            scope["user"] = await get_user_from_token(token)
        else:
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    return JWTAuthMiddleware(inner)
