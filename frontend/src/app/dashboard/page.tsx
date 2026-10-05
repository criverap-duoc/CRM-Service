'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { contacts, tasks as tasksApi, opportunities as opportunitiesApi } from '@/lib/api-client';
import { CONTACT_STATUS_DOT } from '@/lib/badge-colors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { Users, UserPlus, TrendingUp, Clock, CheckSquare, AlertTriangle, Target } from 'lucide-react';
import { TopNavbar } from '@/components/TopNavbar';


interface Contact {
  id: number;
  full_name: string;
  email: string;
  status: string;
  source: string;
  company: string;
  created_at: string;
}

interface OppSummary {
  total: number;
  by_stage: {
    discovery: number;
    proposal: number;
    negotiation: number;
    won: number;
    lost: number;
  };
  pipeline_total: number;
  pipeline_weighted: number;
  overdue: number;
}

const formatCLP = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default function DashboardPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [recentContacts, setRecentContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskSummary, setTaskSummary] = useState<any>(null);
  const [overdueTasks, setOverdueTasks] = useState<any[]>([]);
  const [oppSummary, setOppSummary] = useState<OppSummary | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchRecentContacts();
      fetchTaskData();
      fetchOppData();
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

  const fetchTaskData = async () => {
    try {
      const [summaryRes, overdueRes] = await Promise.all([
        tasksApi.mySummary(),
        tasksApi.overdue({ page_size: 5 }),
      ]);
      setTaskSummary(summaryRes.data);
      const data = overdueRes.data.results || overdueRes.data;
      setOverdueTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchOppData = async () => {
    try {
      const response = await opportunitiesApi.mySummary();
      setOppSummary(response.data);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
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

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <TopNavbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Título con línea decorativa */}
        <div className="flex items-center gap-4 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
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
              <Card key={stat.title} className="group border border-[var(--color-line)] shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 rounded-2xl overflow-hidden bg-[var(--color-surface)]">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${stat.gradient} text-white shadow-lg ${stat.shadow} group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[var(--color-subtle)] uppercase tracking-wider">{stat.title}</p>
                      <p className="text-2xl font-bold text-[var(--color-ink)] tracking-tight">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <Card className="border border-[var(--color-line)] shadow-sm rounded-2xl bg-[var(--color-surface)] mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-[var(--color-ink)] flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-blue-500" />
                Mis Tareas
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/tasks')}
                className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 rounded-lg"
              >
                Ver todas →
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {taskSummary ? (
              <>
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-100">
                    <p className="text-xs text-[var(--color-subtle)]">Pendientes</p>
                    <p className="text-2xl font-bold text-blue-600">{taskSummary.by_status.pending}</p>
                  </div>
                  <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-100">
                    <p className="text-xs text-[var(--color-subtle)]">En progreso</p>
                    <p className="text-2xl font-bold text-amber-600">{taskSummary.by_status.in_progress}</p>
                  </div>
                  <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-100">
                    <p className="text-xs text-[var(--color-subtle)]">Completadas</p>
                    <p className="text-2xl font-bold text-emerald-600">{taskSummary.by_status.completed}</p>
                  </div>
                  <div className="p-3 bg-rose-50/70 rounded-lg border border-rose-100">
                    <p className="text-xs text-[var(--color-subtle)]">Vencidas</p>
                    <p className="text-2xl font-bold text-rose-600">{taskSummary.overdue}</p>
                  </div>
                </div>

                {overdueTasks.length > 0 && (
                  <div>
                    <p className="text-xs text-[var(--color-subtle)] font-medium mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                      Vencidas que requieren atención
                    </p>
                    <div className="space-y-1.5">
                      {overdueTasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => router.push(`/contacts/${task.contact.id}`)}
                          className="flex items-center justify-between p-2 bg-rose-50/50 rounded-lg border border-rose-100/60 hover:bg-rose-50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Clock className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-[var(--color-ink)] truncate">{task.title}</p>
                              <p className="text-xs text-[var(--color-subtle)] truncate">{task.contact.full_name}</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-rose-600 font-semibold shrink-0 ml-2">
                            {new Date(task.due_date).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-[var(--color-subtle)]">Cargando tareas...</p>
            )}
          </CardContent>
        </Card>
        {/* Oportunidades */}
        <Card className="border border-[var(--color-line)] shadow-sm rounded-2xl bg-[var(--color-surface)] mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-[var(--color-ink)] flex items-center gap-2">
                <Target className="h-4 w-4 text-indigo-500" />
                Mi Pipeline
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/opportunities')}
                className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 rounded-lg"
              >
                Ver todas →
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {oppSummary ? (
              <>
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200">
                    <p className="text-xs text-[var(--color-subtle)]">Descubrimiento</p>
                    <p className="text-2xl font-bold text-slate-600">{oppSummary.by_stage.discovery}</p>
                  </div>
                  <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-100">
                    <p className="text-xs text-[var(--color-subtle)]">Propuesta</p>
                    <p className="text-2xl font-bold text-blue-600">{oppSummary.by_stage.proposal}</p>
                  </div>
                  <div className="p-3 bg-violet-50/70 rounded-lg border border-violet-100">
                    <p className="text-xs text-[var(--color-subtle)]">Negociación</p>
                    <p className="text-2xl font-bold text-violet-600">{oppSummary.by_stage.negotiation}</p>
                  </div>
                  <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-100">
                    <p className="text-xs text-[var(--color-subtle)]">Ganadas</p>
                    <p className="text-2xl font-bold text-emerald-600">{oppSummary.by_stage.won}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-indigo-50/70 rounded-lg border border-indigo-100">
                    <p className="text-xs text-[var(--color-subtle)]">Pipeline abierto</p>
                    <p className="text-lg font-bold text-indigo-600">{formatCLP(oppSummary.pipeline_total)}</p>
                  </div>
                  <div className="p-3 bg-cyan-50/70 rounded-lg border border-cyan-100">
                    <p className="text-xs text-[var(--color-subtle)]">Ponderado</p>
                    <p className="text-lg font-bold text-cyan-700">{formatCLP(oppSummary.pipeline_weighted)}</p>
                  </div>
                  <div className="p-3 bg-rose-50/70 rounded-lg border border-rose-100">
                    <p className="text-xs text-[var(--color-subtle)]">Vencidas</p>
                    <p className="text-lg font-bold text-rose-600 flex items-center gap-1.5">
                      {oppSummary.overdue > 0 && <AlertTriangle className="h-3.5 w-3.5" />}
                      {oppSummary.overdue}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-[var(--color-subtle)]">Cargando oportunidades...</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Contacts */}
        <Card className="border border-[var(--color-line)] shadow-sm rounded-2xl overflow-hidden bg-[var(--color-surface)]">
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
              <p className="text-center text-[var(--color-subtle)] py-8 text-sm">No hay contactos registrados</p>
            ) : (
              <div className="space-y-2">
                {recentContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-3.5 bg-gray-50/60 rounded-xl hover:bg-blue-50/40 hover:shadow-sm transition-all duration-200 cursor-pointer border border-transparent hover:border-blue-200/30"
                    onClick={() => router.push(`/contacts/${contact.id}`)}
                  >
                    <div>
                      <p className="font-medium text-[var(--color-ink)]">{contact.full_name}</p>
                      <p className="text-sm text-[var(--color-subtle)]">{contact.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge label={contact.status} dotClass={CONTACT_STATUS_DOT[contact.status]} />
                      <span className="text-xs text-[var(--color-subtle)] font-medium">{contact.source}</span>
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