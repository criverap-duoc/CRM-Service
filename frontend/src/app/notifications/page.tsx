'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationsContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

export default function NotificationsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { notifications } = useNotifications();

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40">
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-gray-200/30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">
            Notificaciones
          </h1>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard')}
            className="border-gray-200/60 hover:border-blue-400/50 hover:bg-blue-50/50 rounded-xl"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Volver
          </Button>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-500 text-sm">
              Total de notificaciones: {notifications.length}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              La vista completa viene en la Fase 3.4.3.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
