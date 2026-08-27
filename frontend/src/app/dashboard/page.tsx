'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { contacts } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, TrendingUp, Clock } from 'lucide-react';

interface Contact {
  id: number;
  full_name: string;
  email: string;
  status: string;
  source: string;
  company: string;
  created_at: string;
}

export default function DashboardPage() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [recentContacts, setRecentContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchRecentContacts();
    }
  }, [isAuthenticated]);

  const fetchRecentContacts = async () => {
    try {
      const response = await contacts.list({ ordering: '-created_at' });
      setRecentContacts(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const stats = [
    { title: 'Total Leads', value: '24', icon: Users, color: 'bg-blue-500' },
    { title: 'Nuevos Hoy', value: '3', icon: UserPlus, color: 'bg-green-500' },
    { title: 'Tasa Conversión', value: '12%', icon: TrendingUp, color: 'bg-purple-500' },
    { title: 'Tiempo Promedio', value: '2.5h', icon: Clock, color: 'bg-orange-500' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">CRM Service</h1>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.push('/contacts')}>
              Contactos
            </Button>
            <Button variant="destructive" size="sm" onClick={logout}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className={"p-3 rounded-lg " + stat.color + " text-white"}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{stat.title}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Contactos Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Cargando contactos...</p>
            ) : recentContacts.length === 0 ? (
              <p>No hay contactos registrados</p>
            ) : (
              <div className="space-y-3">
                {recentContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                    onClick={() => router.push('/contacts/' + contact.id)}
                  >
                    <div>
                      <p className="font-medium">{contact.full_name}</p>
                      <p className="text-sm text-gray-500">{contact.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={contact.status === 'lead' ? 'default' : 'secondary'}>
                        {contact.status}
                      </Badge>
                      <span className="text-sm text-gray-400">{contact.source}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
