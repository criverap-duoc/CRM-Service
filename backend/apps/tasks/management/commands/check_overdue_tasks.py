from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.tasks.models import Task
from apps.notifications.services import send_notification


class Command(BaseCommand):
    help = "Detecta tareas vencidas no notificadas y emite task_overdue al agente."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Solo mostrar qué tareas se notificarían, sin crear notificaciones.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        now = timezone.now()

        overdue_tasks = Task.objects.filter(
            due_date__lt=now,
            overdue_notified=False,
        ).exclude(
            status__in=["completed", "cancelled"]
        ).select_related("assigned_to", "contact")

        count = overdue_tasks.count()
        self.stdout.write(f"Tareas vencidas no notificadas: {count}")

        if count == 0:
            self.stdout.write(self.style.SUCCESS("Nada que notificar."))
            return

        notified = 0
        for task in overdue_tasks:
            if not task.assigned_to:
                # Sin responsable: se marca como notificada pero no se emite
                task.overdue_notified = True
                if not dry_run:
                    task.save(update_fields=["overdue_notified"])
                continue

            if dry_run:
                self.stdout.write(
                    f"  [dry-run] {task.title} → {task.assigned_to.username}"
                )
            else:
                send_notification(
                    user=task.assigned_to,
                    notification_type="task_overdue",
                    title=f"Tarea vencida: {task.title}",
                    message=f"La tarea '{task.title}' del contacto {task.contact.full_name} está vencida.",
                    payload={
                        "task_id": task.id,
                        "contact_id": task.contact.id,
                        "due_date": task.due_date.isoformat() if task.due_date else None,
                        "priority": task.priority,
                    },
                )
                task.overdue_notified = True
                task.save(update_fields=["overdue_notified"])

            notified += 1

        if dry_run:
            self.stdout.write(self.style.WARNING(f"[dry-run] Se notificarían {notified} tareas."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Se notificaron {notified} tareas vencidas."))
