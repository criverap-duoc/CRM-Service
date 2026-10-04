'use client';

import { useState, useMemo, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useNotifications, Notification } from '@/context/NotificationsContext';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TopNavbar } from '@/components/TopNavbar';
import {
  Bell, CheckCheck, ExternalLink, UserPlus, Webhook, Clock, Trophy, Info,
  X, ChevronLeft, ChevronRight, RefreshCw,
} from 'lucide-react';

const TYPE_ICONS: Record<string, typeof Bell> = {
  lead_assigned: UserPlus,
  webhook_received: Webhook,
  task_overdue: Clock,
  opportunity_won: Trophy,
  system: Info,
};

const TYPE_COLORS: Record<string, string> = {
  lead_assigned: 'text-blue-500',
  webhook_received: 'text-violet-500',
  task_overdue: 'text-rose-500',
  opportunity_won: 'text-emerald-500',
  system: 'text-[var(--color-subtle)]',
};

const TYPE_LABELS: Record<string, string> = {
  lead_assigned: 'Lead asignado',
  webhook_received: 'Webhook recibido',
  task_overdue: 'Tarea vencida',
  opportunity_won: 'Oportunidad ganada',
  system: 'Sistema',
};

const ITEMS_PER_PAGE = 10;

type FilterValue =
  | 'all'
  | 'unread'
  | 'lead_assigned'
  | 'webhook_received'
  | 'task_overdue'
  | 'opportunity_won'
  | 'system';

function timeAgo(iso: string): string {
  const now = new Date();
  const date = new Date(iso);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'ahora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} d`;
  return date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function NotificationsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, refresh } = useNotifications();

  const [filter, setFilter] = useState<FilterValue>('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === 'unread') return !n.read;
      if (filter !== 'all') return n.type === filter;
      return true;
    });
  }, [notifications, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Al cambiar de filtro se vuelve a la primera página
  const handleFilterChange = (value: string) => {
    setFilter(value as FilterValue);
    setPage(1);
  };

  const handleClickNotification = async (notif: Notification) => {
    if (!notif.read) await markAsRead(notif.id);
    if (notif.payload?.contact_id) {
      router.push(`/contacts/${notif.payload.contact_id}`);
    } else if (notif.payload?.task_id) {
      router.push('/tasks');
    }
  };

  const handleDelete = async (e: MouseEvent<HTMLElement>, id: number) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/notifications/${id}/`);
      await refresh();
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <TopNavbar breadcrumb={[{ label: 'Notificaciones' }]} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              Notificaciones
            </h2>
            <p className="text-sm text-[var(--color-subtle)] font-medium">
              {notifications.length} notificaciones · {unreadCount} sin leer
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filter} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-[170px] border-[var(--color-line)] focus:ring-4 focus:ring-blue-400/10 rounded-xl h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="unread">No leídas</SelectItem>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refresh()}
              className="border-[var(--color-line)] hover:border-blue-400/50 hover:bg-blue-50/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-medium text-gray-700 rounded-xl"
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Refrescar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="border-[var(--color-line)] hover:border-blue-400/50 hover:bg-blue-50/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-medium text-gray-700 rounded-xl"
            >
              <CheckCheck className="h-4 w-4 mr-1.5" />
              Marcar todas
            </Button>
          </div>
        </div>

        <Card className="border border-[var(--color-line)] shadow-sm rounded-2xl overflow-hidden bg-[var(--color-surface)] py-0">
          <CardContent className="p-0">
            {paginated.length === 0 ? (
              <div className="py-16 text-center">
                <Bell className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-[var(--color-subtle)]">
                  {filter === 'all'
                    ? 'No hay notificaciones'
                    : 'No hay notificaciones con este filtro'}
                </p>
              </div>
            ) : (
              paginated.map((notif) => {
                const Icon = TYPE_ICONS[notif.type] || Info;
                const color = TYPE_COLORS[notif.type] || 'text-[var(--color-subtle)]';
                return (
                  <div
                    key={notif.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleClickNotification(notif)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleClickNotification(notif);
                      }
                    }}
                    className={`group w-full text-left px-5 py-4 cursor-pointer flex items-start gap-4 border-b border-gray-100 last:border-0 hover:bg-blue-50/40 transition-colors ${
                      !notif.read ? 'bg-blue-50/20' : ''
                    }`}
                  >
                    <div className={`mt-0.5 shrink-0 ${color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className={`text-sm ${!notif.read ? 'font-semibold text-[var(--color-ink)]' : 'font-medium text-gray-700'}`}>
                          {notif.title}
                        </p>
                        {!notif.read && (
                          <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                        )}
                      </div>
                      {notif.message && (
                        <p className="text-sm text-[var(--color-subtle)] mb-1.5">{notif.message}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <Badge className="bg-gray-100 text-gray-600 border-0 text-[10px] px-1.5 py-0 font-medium">
                          {TYPE_LABELS[notif.type] || notif.type}
                        </Badge>
                        <span className="text-[11px] text-[var(--color-subtle)]">{timeAgo(notif.created_at)}</span>
                      </div>
                    </div>
                    {notif.payload?.contact_id !== undefined && (
                      <ExternalLink className="h-3.5 w-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                    )}
                    <button
                      onClick={(e) => handleDelete(e, notif.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-100/60 transition-all shrink-0"
                      title="Eliminar"
                    >
                      <X className="h-3.5 w-3.5 text-rose-500" />
                    </button>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-[var(--color-subtle)] font-medium">
              Página {currentPage} de {totalPages} · {filtered.length} resultados
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-xl border-[var(--color-line)]"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-xl border-[var(--color-line)]"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
