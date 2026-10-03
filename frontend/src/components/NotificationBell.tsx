'use client';

import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, ExternalLink, UserPlus, Webhook, Clock, Trophy, Info } from 'lucide-react';
import { useNotifications, type Notification } from '@/context/NotificationsContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  system: 'text-gray-500',
};

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
  return date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
}

export function NotificationBell() {
  const router = useRouter();
  const { notifications, unreadCount, isConnected, markAsRead, markAllAsRead } = useNotifications();

  const recent = notifications.slice(0, 10);

  const handleClick = async (notif: Notification) => {
    if (!notif.read) {
      await markAsRead(notif.id);
    }
    if (notif.payload?.contact_id) {
      router.push(`/contacts/${notif.payload.contact_id}`);
    } else if (notif.payload?.task_id) {
      router.push('/tasks');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative text-gray-500 hover:text-gray-700 hover:bg-gray-100/70 rounded-xl transition-all"
          aria-label="Notificaciones"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-semibold">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 rounded-2xl p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/60">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-800">Notificaciones</h3>
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isConnected ? 'bg-emerald-500' : 'bg-gray-300'
              }`}
              title={isConnected ? 'Conectado' : 'Desconectado'}
            />
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
            >
              <CheckCheck className="h-3 w-3" />
              Marcar todo
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {recent.length === 0 ? (
            <div className="py-10 text-center">
              <Bell className="h-8 w-8 text-gray-200 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Sin notificaciones</p>
            </div>
          ) : (
            recent.map((notif) => {
              const Icon = TYPE_ICONS[notif.type] || Info;
              const color = TYPE_COLORS[notif.type] || 'text-gray-500';
              return (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-blue-50/40 transition-colors ${
                    !notif.read ? 'bg-blue-50/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 shrink-0 ${color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${!notif.read ? 'font-semibold text-gray-800' : 'font-medium text-gray-700'} truncate`}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {timeAgo(notif.created_at)}
                      </p>
                    </div>
                    {!notif.read && (
                      <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <DropdownMenuSeparator className="m-0" />
        <DropdownMenuItem
          onClick={() => router.push('/notifications')}
          className="rounded-none justify-center text-xs text-blue-600 font-medium cursor-pointer"
        >
          Ver todas
          <ExternalLink className="h-3 w-3 ml-1.5" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
