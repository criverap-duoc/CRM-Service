'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { apiClient } from '@/lib/api-client';

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  payload: Record<string, any>;
  read: boolean;
  created_at: string;
}

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await apiClient.get('/notifications/', { params: { page_size: 50 } });
      const data = res.data.results || res.data;
      setNotifications(data);
      setUnreadCount(data.filter((n: Notification) => !n.read).length);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // La carga se difiere a un macrotask: la regla
    // react-hooks/set-state-in-effect prohíbe llamar setState de forma
    // síncrona dentro de un efecto, y fetchNotifications actualiza estado.
    const id = setTimeout(fetchNotifications, 0);
    return () => clearTimeout(id);
  }, [fetchNotifications]);

  const handleWsMessage = useCallback((msg: any) => {
    if (msg.type === 'notification' && msg.payload) {
      const notif: Notification = msg.payload;
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((prev) => prev + 1);
      toast(notif.title, {
        description: notif.message,
        duration: 6000,
        action: {
          label: 'Ver',
          onClick: () => {
            // Navegación opcional: si el payload tiene contact_id, ir al detalle
            if (notif.payload?.contact_id) {
              window.location.href = `/contacts/${notif.payload.contact_id}`;
            } else if (notif.payload?.task_id) {
              window.location.href = '/tasks';
            }
          },
        },
      });
    }
  }, []);

  const { isConnected } = useWebSocket('/ws/notifications/', {
    onMessage: handleWsMessage,
    enabled: isAuthenticated,
  });

  const markAsRead = useCallback(async (id: number) => {
    try {
      await apiClient.patch(`/notifications/${id}/read/`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await apiClient.post('/notifications/mark-all-read/');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  }, []);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        isConnected,
        markAsRead,
        markAllAsRead,
        refresh: fetchNotifications,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
