'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { contacts } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, TrendingUp, Clock, Sparkles, LogOut } from 'lucide-react';

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
        <div className="animate-pulse space-y-4">
          <div className="h-12 w-48 bg-gray-200 rounded-lg"></div>
          <div className="h-4 w-72 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const stats = [
    { title: 'Total Leads', value: '24', icon: Users, gradient: 'from-blue-500 to-cyan-400', shadow: 'shadow-blue-500/20' },
    { title: 'Nuevos Hoy', value: '3', icon: UserPlus, gradient: 'from-emerald-500 to-teal-400', shadow: 'shadow-emerald-500/20' },
    { title: 'Tasa Conversión', value: '12%', icon: TrendingUp, gradient: 'from-violet-500 to-purple-400', shadow: 'shadow-violet-500/20' },
    { title: 'Tiempo Promedio', value: '2.5h', icon: Clock, gradient: 'from-amber-500 to-orange-400', shadow: 'shadow-amber-500/20' },
  ];

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      lead: 'bg-blue-100 text-blue-700 border-blue-200',
      prospect: 'bg-amber-100 text-amber-700 border-amber-200',
      customer: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      churned: 'bg-rose-100 text-rose-700 border-rose-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-gray-200/30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 shadow-md">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
              CRM Service
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => router.push('/contacts')}
              className="border-gray-200/60 hover:border-blue-400/50 hover:bg-blue-50/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-medium text-gray-700 rounded-xl"
            >
              Contactos
            </Button>
            <Button 
              variant="outline" 
              onClick={() => router.push('/analytics')}
              className="border-gray-200/60 hover:border-blue-400/50 hover:bg-blue-50/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-medium text-gray-700 rounded-xl"
            >
              Analítica
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={logout}
              className="text-rose-500 hover:text-rose-600 hover:bg-rose-50/50 rounded-xl transition-all duration-200"
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              Cerrar sesión
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Título con línea decorativa */}
        <div className="flex items-center gap-4 mb-8">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent tracking-tight">
            Dashboard
          </h2>
          <div className="flex-1 h-px bg-gradient-to-r from-blue-200/60 to-transparent"></div>
          <Badge variant="outline" className="border-blue-200/60 text-blue-600 font-medium bg-blue-50/30 rounded-xl px-3 py-1">
            Hoy
          </Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="group border border-gray-200/30 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 rounded-2xl overflow-hidden bg-white/60 backdrop-blur-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${stat.gradient} text-white shadow-lg ${stat.shadow} group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-800 tracking-tight">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Contacts */}
        <Card className="border border-gray-200/30 shadow-sm rounded-2xl overflow-hidden bg-white/60 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-700 tracking-tight">
              Contactos Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3 animate-pulse">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-100/50 rounded-xl">
                    <div className="space-y-1.5">
                      <div className="h-4 w-32 bg-gray-200 rounded"></div>
                      <div className="h-3 w-48 bg-gray-200 rounded"></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-16 bg-gray-200 rounded-full"></div>
                      <div className="h-4 w-12 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentContacts.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">No hay contactos registrados</p>
            ) : (
              <div className="space-y-2">
                {recentContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-3.5 bg-gray-50/60 rounded-xl hover:bg-blue-50/40 hover:shadow-sm transition-all duration-200 cursor-pointer border border-transparent hover:border-blue-200/30"
                    onClick={() => router.push(`/contacts/${contact.id}`)}
                  >
                    <div>
                      <p className="font-medium text-gray-800">{contact.full_name}</p>
                      <p className="text-sm text-gray-400">{contact.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={`${getStatusColor(contact.status)} border font-medium rounded-full px-2.5 py-0.5 text-xs`}>
                        {contact.status}
                      </Badge>
                      <span className="text-xs text-gray-400 font-medium">{contact.source}</span>
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