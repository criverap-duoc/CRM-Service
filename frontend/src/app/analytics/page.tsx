'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { contacts } from '@/lib/api-client';
import { analytics } from '@/lib/analytics-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { 
  LogOut, TrendingUp, 
  Users, Target, Heart, Brain,
  ChartColumn
} from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';


interface Contact {
  id: number;
  full_name: string;
  email: string;
  status: string;
  source: string;
}

interface SentimentStats {
  avg_score: number;
  distribution: {
    positive: number;
    neutral: number;
    negative: number;
    total: number;
  };
}

export default function AnalyticsPage() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [contactList, setContactList] = useState<Contact[]>([]);
  const [sentimentStats, setSentimentStats] = useState<SentimentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<number | null>(null);
  const [leadScore, setLeadScore] = useState<any>(null);
  const [leadScoreLoading, setLeadScoreLoading] = useState(false);
  const [segmentStats, setSegmentStats] = useState<any>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      const contactsRes = await contacts.list();
      setContactList(contactsRes.data.results || contactsRes.data);

      const statsRes = await analytics.getSentimentStats();
      setSentimentStats(statsRes.data);

      // Nuevo: distribución de segmentos
      try {
        const segmentRes = await analytics.getSegmentStats();
        setSegmentStats(segmentRes.data);
      } catch (e) {
        // Endpoint no disponible todavía
        console.warn('Segment stats no disponible:', e);
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGetLeadScore = async (contactId: number) => {
    setSelectedContact(contactId);
    setLeadScoreLoading(true);
    try {
      const res = await analytics.getLeadScore(contactId);
      setLeadScore(res.data);
    } catch (error) {
      console.error('Error fetching lead score:', error);
    } finally {
      setLeadScoreLoading(false);
    }
  };

  // Datos para gráficos
  const sentimentData = sentimentStats ? [
    { name: 'Positivo', value: sentimentStats.distribution.positive, color: '#10b981' },
    { name: 'Neutral', value: sentimentStats.distribution.neutral, color: '#f59e0b' },
    { name: 'Negativo', value: sentimentStats.distribution.negative, color: '#ef4444' },
  ] : [];

  const sourceData = contactList.reduce((acc: any[], contact) => {
    const existing = acc.find(item => item.name === contact.source);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: contact.source, value: 1 });
    }
    return acc;
  }, []);

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse space-y-4">
          <div className="h-12 w-48 bg-gray-200 rounded-lg"></div>
          <div className="h-4 w-72 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;
  
  // Paleta de matices para las barras (azules/índigos)
  const BAR_COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'];

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-[var(--color-surface)] border-b border-[var(--color-line)] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 shadow-md">
              <ChartColumn className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              CRM Service
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => router.push('/dashboard')} className="border-[var(--color-line)] hover:border-blue-400/50 hover:bg-blue-50/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-medium text-gray-700 rounded-xl">
              Dashboard
            </Button>
            <Button variant="outline" onClick={() => router.push('/contacts')} className="border-[var(--color-line)] hover:border-blue-400/50 hover:bg-blue-50/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-medium text-gray-700 rounded-xl">
              Contactos
            </Button>
            <Button variant="ghost" onClick={() => router.push('/analytics')} className="text-[var(--color-brand)] font-medium bg-[var(--color-brand)]/8 hover:bg-[var(--color-brand)]/12 hover:text-[var(--color-brand)]">
              Analítica
            </Button>
            <Button variant="outline" onClick={() => router.push('/companies')} className="border-[var(--color-line)] hover:border-blue-400/50 hover:bg-blue-50/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-medium text-gray-700 rounded-xl">
              Empresas
            </Button>
            <Button variant="outline" onClick={() => router.push('/tags')} className="border-[var(--color-line)] hover:border-blue-400/50 hover:bg-blue-50/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-medium text-gray-700 rounded-xl">
              Tags
            </Button>
            <Button variant="outline" onClick={() => router.push('/tasks')} className="border-[var(--color-line)] hover:border-blue-400/50 hover:bg-blue-50/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-medium text-gray-700 rounded-xl">
              Tareas
            </Button>
            <Button variant="outline" onClick={() => router.push('/products')} className="border-[var(--color-line)] hover:border-blue-400/50 hover:bg-blue-50/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-medium text-gray-700 rounded-xl">
              Productos
            </Button>
            <Button variant="outline" onClick={() => router.push('/opportunities')} className="border-[var(--color-line)] hover:border-blue-400/50 hover:bg-blue-50/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-medium text-gray-700 rounded-xl">
              Oportunidades
            </Button>

            <NotificationBell />

            <Button variant="ghost" size="sm" onClick={logout} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50/50 rounded-xl transition-all duration-200">
              <LogOut className="h-4 w-4 mr-1.5" />
              Cerrar sesión
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            Analítica
          </h2>
          <div className="flex-1 h-px bg-gradient-to-r from-blue-200/60 to-transparent"></div>
          <Badge variant="outline" className="border-blue-200/60 text-blue-600 font-medium bg-blue-50/30 rounded-xl px-3 py-1">
            V3 Data-Enhanced
          </Badge>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <Card className="border border-[var(--color-line)] shadow-sm rounded-2xl overflow-hidden bg-[var(--color-surface)]">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-[var(--color-subtle)] uppercase tracking-wider">Total Contactos</p>
                  <p className="text-2xl font-bold text-[var(--color-ink)]">{contactList.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-[var(--color-line)] shadow-sm rounded-2xl overflow-hidden bg-[var(--color-surface)]">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 text-white shadow-lg">
                  <Heart className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-[var(--color-subtle)] uppercase tracking-wider">Sentimiento Promedio</p>
                  <p className="text-2xl font-bold text-[var(--color-ink)]">
                    {sentimentStats?.avg_score ? (sentimentStats.avg_score * 100).toFixed(0) : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-[var(--color-line)] shadow-sm rounded-2xl overflow-hidden bg-[var(--color-surface)]">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-400 text-white shadow-lg">
                  <Brain className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-[var(--color-subtle)] uppercase tracking-wider">Interacciones Analizadas</p>
                  <p className="text-2xl font-bold text-[var(--color-ink)]">{sentimentStats?.distribution.total || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-[var(--color-line)] shadow-sm rounded-2xl overflow-hidden bg-[var(--color-surface)]">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-400 text-white shadow-lg">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-[var(--color-subtle)] uppercase tracking-wider">Lead Score Promedio</p>
                  <p className="text-2xl font-bold text-[var(--color-ink)]">
                    {leadScore?.lead_score?.toFixed(0) || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Distribución de Sentimiento */}
          <Card className="border border-[var(--color-line)] shadow-sm rounded-2xl overflow-hidden bg-[var(--color-surface)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-700 tracking-tight">
                Distribución de Sentimiento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sentimentStats && sentimentStats.distribution.total > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={sentimentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {sentimentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-[var(--color-subtle)] py-8 text-sm">Sin datos de sentimiento</p>
              )}
            </CardContent>
          </Card>

          {/* Contactos por Fuente */}
          <Card className="border border-[var(--color-line)] shadow-sm rounded-2xl overflow-hidden bg-[var(--color-surface)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-700 tracking-tight">
                Contactos por Fuente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sourceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={sourceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {sourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-[var(--color-subtle)] py-8 text-sm">Sin datos de contactos</p>
              )}
            </CardContent>
          </Card>
        </div>

        {segmentStats && (
          <Card className="border border-[var(--color-line)] shadow-sm rounded-2xl overflow-hidden bg-[var(--color-surface)] mb-8">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-700 tracking-tight">
                Distribución de Segmentos (K-Means V3)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {segmentStats.clusters.map((cluster: any) => (
                  <div
                    key={cluster.cluster}
                    className="p-4 bg-gradient-to-br from-violet-50 to-purple-50/40 rounded-xl border border-violet-200/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-violet-100 text-violet-700 border-0 font-medium text-xs">
                        Cluster {cluster.cluster}
                      </Badge>
                      <span className="text-lg font-bold text-violet-600">{cluster.count}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-700 mb-2">{cluster.label}</p>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <p className="text-[var(--color-subtle)]">Conversión</p>
                        <p className="font-medium text-gray-700">{(cluster.conversion_rate * 100).toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-[var(--color-subtle)]">Churn</p>
                        <p className="font-medium text-gray-700">{(cluster.churn_rate * 100).toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lead Score por Contacto */}
        <Card className="border border-[var(--color-line)] shadow-sm rounded-2xl overflow-hidden bg-[var(--color-surface)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-700 tracking-tight">
              Lead Score por Contacto
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leadScore && (
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <p className="text-sm font-medium text-gray-600">Contacto: {leadScore.contact_name}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-3xl font-bold text-blue-600">{leadScore.lead_score}</span>
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200">{leadScore.label}</Badge>
                </div>
                <div className="grid grid-cols-4 gap-4 mt-4 text-sm">
                  <div>
                    <p className="text-[var(--color-subtle)]">Frecuencia interacción</p>
                    <p className="font-medium">
                      {(leadScore.features?.interaction_frequency ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--color-subtle)]">Interacciones (7d)</p>
                    <p className="font-medium">{leadScore.features?.interactions_7d ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-[var(--color-subtle)]">Tasa de respuesta</p>
                    <p className="font-medium">
                      {((leadScore.features?.response_rate ?? 0) * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--color-subtle)]">Sentimiento</p>
                    <p className="font-medium">
                      {(leadScore.features?.sentiment_avg ?? 0).toFixed(1)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {contactList.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between p-3 bg-gray-50/60 rounded-xl hover:bg-blue-50/40 transition-all duration-200 cursor-pointer border border-transparent hover:border-blue-200/30"
                  onClick={() => handleGetLeadScore(contact.id)}
                >
                  <div>
                    <p className="font-medium text-[var(--color-ink)] text-sm">{contact.full_name}</p>
                    <p className="text-xs text-[var(--color-subtle)]">{contact.email}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                    <TrendingUp className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {leadScoreLoading && (
              <p className="text-center text-[var(--color-subtle)] py-4 text-sm animate-pulse">Calculando lead score...</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
