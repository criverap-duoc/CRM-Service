from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import Notification


def send_notification(user, notification_type, title, message="", payload=None):
    """
    Crea una Notification en DB y la emite por WebSocket al grupo del usuario.
    Retorna la Notification creada.
    """
    if payload is None:
        payload = {}

    notification = Notification.objects.create(
        user=user,
        type=notification_type,
        title=title,
        message=message,
        payload=payload,
    )

    channel_layer = get_channel_layer()
    if channel_layer is None:
        return notification

    group_name = f"user_{user.id}"
    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            "type": "notification.message",
            "payload": {
                "id": notification.id,
                "type": notification.type,
                "title": notification.title,
                "message": notification.message,
                "payload": notification.payload,
                "read": notification.read,
                "created_at": notification.created_at.isoformat(),
            },
        },
    )

    return notification