import json

from channels.generic.websocket import AsyncWebsocketConsumer


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    Consumer de notificaciones.
    Cada usuario autenticado se une a su propio grupo 'user_{id}'.
    Los eventos se emiten desde el backend via channel_layer.group_send.
    """

    async def connect(self):
        user = self.scope.get("user")

        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return

        self.user = user
        self.group_name = f"user_{user.id}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Mensaje de bienvenida para confirmar que la conexión funciona
        await self.send(text_data=json.dumps({
            "type": "connection.established",
            "user_id": user.id,
            "username": user.username,
        }))

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(
                self.group_name, self.channel_name
            )

    async def receive(self, text_data):
        """Maneja mensajes del cliente (ping/pong)."""
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        if data.get("type") == "ping":
            await self.send(text_data=json.dumps({"type": "pong"}))

    async def notification_message(self, event):
        """
        Handler para eventos enviados a este grupo.
        El campo 'event' del group_send se mapea a 'notification_message'.
        Se llama automáticamente al hacer channel_layer.group_send.
        """
        await self.send(text_data=json.dumps({
            "type": "notification",
            "payload": event.get("payload", {}),
        }))
