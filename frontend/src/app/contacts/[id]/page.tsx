// frontend\src\app\contacts\[id]\page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { contacts, integrations, interactions, opportunities as opportunitiesApi, tags as tagsApi, tasks as tasksApi, products as productsApi } from '@/lib/api-client';
import { CONTACT_STATUS_DOT, OPPORTUNITY_STAGE_DOT, TASK_PRIORITY_DOT } from '@/lib/badge-colors';
import { TopNavbar } from '@/components/TopNavbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, Sparkles, Pencil, Mail, Phone, Building, User, X, Plus as PlusIcon, CheckCircle2, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { analytics } from '@/lib/analytics-client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Tag {
  id: number;
  name: string;
  color: string;
}

interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  unit_price: number;
  description: string;
  active: boolean;
  interested_count: number;
}

interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  company: string;
  company_id: number | null;
  tags: Tag[];
  interests: Product[];
  status: string;
  source: string;
  notes: string;
  assigned_to: { id: number; username: string } | null;
  interaction_count: number;
  created_at: string;
  updated_at: string;
}

interface Interaction {
  id: number;
  channel: string;
  direction: string;
  subject: string;
  body: string;
  agent_username: string;
  occurred_at: string;
}

interface Task {
  id: number;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  completed_at: string | null;
  is_overdue: boolean;
  assigned_to: { id: number; username: string } | null;
  contact: { id: number; full_name: string; email: string };
  created_at: string;
}

interface Opportunity {
  id: number;
  name: string;
  amount: number;
  stage: string;
  probability: number;
  expected_close_date: string | null;
}

// Etapas elegibles al crear una oportunidad desde el detalle del contacto.
// "lost" queda fuera: el backend exige lost_reason para esa etapa.
const CREATABLE_OPPORTUNITY_STAGES = ['discovery', 'proposal', 'negotiation', 'won'] as const;

const OPPORTUNITY_STAGE_LABELS: Record<string, string> = {
  discovery: 'Descubrimiento',
  proposal: 'Propuesta',
  negotiation: 'Negociación',
  won: 'Ganada',
  lost: 'Perdida',
};

export default function ContactDetailPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [contact, setContact] = useState<Contact | null>(null);
  const [interactionList, setInteractionList] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [leadScore, setLeadScore] = useState<any>(null);
  const [sentimentMap, setSentimentMap] = useState<Record<number, any>>({});
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [tagSelectorOpen, setTagSelectorOpen] = useState(false);
  const [savingTags, setSavingTags] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [interestSelectorOpen, setInterestSelectorOpen] = useState(false);
  const [savingInterests, setSavingInterests] = useState(false);
  const [taskList, setTaskList] = useState<Task[]>([]);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [savingTask, setSavingTask] = useState(false);
  const [churnData, setChurnData] = useState<any>(null);
  const [segmentData, setSegmentData] = useState<any>(null);
  const [opportunityList, setOpportunityList] = useState<Opportunity[]>([]);
  const [opportunityDialogOpen, setOpportunityDialogOpen] = useState(false);
  const [newOppName, setNewOppName] = useState('');
  const [newOppAmount, setNewOppAmount] = useState('');
  const [newOppStage, setNewOppStage] = useState('discovery');
  const [savingOpp, setSavingOpp] = useState(false);
  const [summary, setSummary] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState('');


  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && id) {
      fetchContact();
      fetchInteractions();
      fetchLeadScore();
      fetchAllTags();
      fetchTasks();
      fetchChurn();
      fetchSegment();
      fetchOpportunities();

      // Productos para el selector de intereses.
      // IIFE async para evitar setState síncrono dentro del effect.
      (async () => {
        try {
          const response = await productsApi.list({ page_size: 100, active: true });
          const data = response.data.results || response.data;
          setAllProducts(data);
        } catch (error) {
          console.error('Error fetching products:', error);
        }
      })();
    }
  }, [isAuthenticated, id]);

  const fetchContact = async () => {
    try {
      const response = await contacts.get(parseInt(id));
      setContact(response.data);
      setFormData(response.data);
    } catch (error) {
      console.error('Error fetching contact:', error);
      setError('No se pudo cargar el contacto');
    } finally {
      setLoading(false);
    }
  };

  const fetchInteractions = async () => {
  try {
    const response = await interactions.list({ contact: id });
    const data = response.data.results || response.data;
    setInteractionList(data);

    // Cargar sentimiento para cada interacción
  const sentimentData: Record<number, any> = {};
      for (const interaction of data) {
        try {
          const sentimentRes = await analytics.analyzeSentiment(interaction.id);
          sentimentData[interaction.id] = sentimentRes.data;
        } catch (e) {
          // Si falla, ignorar
        }
      }
      setSentimentMap(sentimentData);
    } catch (error) {
      console.error('Error fetching interactions:', error);
    }
  };

  const fetchLeadScore = async () => {
    try {
      const response = await analytics.getLeadScore(parseInt(id));
      setLeadScore(response.data);
    } catch (error) {
      console.error('Error fetching lead score:', error);
    }
  };

  const fetchChurn = async () => {
    try {
      const response = await analytics.getChurn(parseInt(id));
      setChurnData(response.data);
    } catch (error) {
      console.error('Error fetching churn:', error);
    }
  };

const fetchSegment = async () => {
  try {
    const response = await analytics.getSegment(parseInt(id));
    setSegmentData(response.data);
  } catch (error) {
    console.error('Error fetching segment:', error);
  }
};

  const fetchAllTags = async () => {
    try {
      const response = await tagsApi.list({ page_size: 100 });
      const data = response.data.results || response.data;
      setAllTags(data);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await tasksApi.list({ contact: parseInt(id), page_size: 50 });
      const data = response.data.results || response.data;
      setTaskList(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchOpportunities = async () => {
    try {
      const response = await opportunitiesApi.list({ contact: parseInt(id), page_size: 50 });
      const data = response.data.results || response.data;
      setOpportunityList(data);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      // Sólo enviar los campos editables: evita que lleguen campos
      // read-only (full_name, tags, interests, assigned_to, etc.) o
      // el nombre de la empresa en texto que el backend no espera.
      const payload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        notes: formData.notes,
      };
      await contacts.update(parseInt(id), payload);
      setEditing(false);
      fetchContact();
    } catch (error: any) {
      setError(
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        'Error al guardar'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSummarize = async () => {
    setSummarizing(true);
    setSummaryError('');
    setSummary('');
    try {
      const res = await integrations.summarizeContact(parseInt(id));
      setSummary(res.data.summary);
    } catch (err) {
      console.error('Error generating AI summary:', err);
      setSummaryError('No se pudo generar el resumen. Intenta de nuevo.');
    } finally {
      setSummarizing(false);
    }
  };

  const getTaskStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-amber-100 text-amber-700',
      completed: 'bg-emerald-100 text-emerald-700',
      cancelled: 'bg-gray-100 text-[var(--color-subtle)]',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const TASK_STATUS_LABELS: Record<string, string> = {
    pending: 'Pendiente',
    in_progress: 'En progreso',
    completed: 'Completada',
    cancelled: 'Cancelada',
  };

  const TASK_PRIORITY_LABELS: Record<string, string> = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    urgent: 'Urgente',
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(price);

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  // Fechas relativas para el timeline: "hace 5 min", "hace 3 h", "hace 2 d".
  // Sobre un año se muestra la fecha absoluta (más legible que "hace 400 d").
  const formatRelativeDate = (value: string) => {
    const diffMs = Date.now() - new Date(value).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 60) return `hace ${Math.max(minutes, 1)} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `hace ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 365) return `hace ${days} d`;
    return formatDate(value);
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)]">
        <TopNavbar breadcrumb={[{ label: 'Contactos', href: '/contacts' }]} />
        <div className="min-h-[60vh] flex items-center justify-center">
          <p className="text-[var(--color-subtle)]">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Contacto no encontrado</p>
      </div>
    );
  }

  const toggleTag = async (tag: Tag) => {
    if (!contact) return;

    const hasTag = contact.tags.some((t) => t.id === tag.id);
    const newTags = hasTag
      ? contact.tags.filter((t) => t.id !== tag.id)
      : [...contact.tags, tag];

    // Actualización optimista
    setContact({ ...contact, tags: newTags });
    setSavingTags(true);

    try {
      await contacts.assignTags(contact.id, newTags.map((t) => t.id));
    } catch (error) {
      // Revertir si falla
      setContact({ ...contact });
      setError('No se pudieron guardar los tags');
    } finally {
      setSavingTags(false);
    }
  };

  const toggleInterest = async (product: Product) => {
    if (!contact) return;

    const interests = contact.interests || [];
    const hasInterest = interests.some((p) => p.id === product.id);
    const newInterests = hasInterest
      ? interests.filter((p) => p.id !== product.id)
      : [...interests, product];

    // Actualización optimista
    setContact({ ...contact, interests: newInterests });
    setSavingInterests(true);

    try {
      await contacts.assignInterests(contact.id, newInterests.map((p) => p.id));
    } catch {
      // Revertir si falla
      setContact({ ...contact });
      setError('No se pudieron guardar los intereses');
    } finally {
      setSavingInterests(false);
    }
  };

  const quickChangeTaskStatus = async (task: Task, newStatus: string) => {
    try {
      await tasksApi.update(task.id, { status: newStatus });
      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;
    setSavingTask(true);
    try {
      const payload: any = {
        title: newTaskTitle,
        contact_id: parseInt(id),
        status: 'pending',
        priority: newTaskPriority,
      };
      if (newTaskDueDate) {
        payload.due_date = new Date(newTaskDueDate + 'T12:00:00').toISOString();
      }
      await tasksApi.create(payload);
      setNewTaskTitle('');
      setNewTaskPriority('medium');
      setNewTaskDueDate('');
      setTaskDialogOpen(false);
      fetchTasks();
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setSavingTask(false);
    }
  };

  const handleCreateOpportunity = async () => {
    if (!newOppName.trim() || !newOppAmount) return;
    setSavingOpp(true);
    try {
      await opportunitiesApi.create({
        name: newOppName,
        contact_id: parseInt(id),
        amount: parseFloat(newOppAmount),
        stage: newOppStage,
      });
      setNewOppName('');
      setNewOppAmount('');
      setNewOppStage('discovery');
      setOpportunityDialogOpen(false);
      fetchOpportunities();
    } catch (error) {
      console.error('Error creating opportunity:', error);
    } finally {
      setSavingOpp(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <TopNavbar
        breadcrumb={[
          { label: 'Contactos', href: '/contacts' },
          { label: contact?.full_name || 'Cargando...' },
        ]}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Header: identidad del contacto a la izquierda, acciones a la derecha */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-[var(--color-ink)] truncate min-w-0">
                {contact.full_name}
              </h1>
              <StatusBadge
                label={contact.status}
                dotClass={CONTACT_STATUS_DOT[contact.status]}
              />
            </div>
            <div className="flex items-center gap-3 text-sm text-[var(--color-subtle)] flex-wrap">
              <span>{contact.email}</span>
              {contact.company && (
                <>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        contact.company_id != null
                          ? `/companies/${contact.company_id}`
                          : '/companies'
                      )
                    }
                    className="hover:text-[var(--color-brand)] transition-colors"
                  >
                    {contact.company}
                  </button>
                </>
              )}
            </div>
            {contact.tags && contact.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {contact.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-[var(--color-ink)] border"
                    style={{
                      backgroundColor: `color-mix(in oklab, ${tag.color} 12%, transparent)`,
                      borderColor: tag.color,
                    }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={handleSummarize}
              disabled={summarizing}
              className="border-[var(--color-line)] hover:border-blue-400/50 hover:bg-blue-50/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-xl"
            >
              <Sparkles className={`h-4 w-4 mr-2 text-blue-500 ${summarizing ? 'animate-pulse' : ''}`} />
              {summarizing ? 'Generando...' : 'Resumen con IA'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setTaskDialogOpen(true)}
              className="border-[var(--color-line)] hover:border-blue-400/50 hover:bg-blue-50/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-xl"
            >
              <PlusIcon className="h-4 w-4 mr-2 text-blue-500" />
              Nueva tarea
            </Button>
            <Button
              variant={editing ? 'default' : 'outline'}
              onClick={() => setEditing(!editing)}
              className={
                editing
                  ? 'bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] rounded-xl'
                  : 'border-[var(--color-line)] hover:border-blue-400/50 hover:bg-blue-50/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-xl'
              }
            >
              {editing ? <X className="h-4 w-4 mr-2" /> : <Pencil className="h-4 w-4 mr-2" />}
              {editing ? 'Cancelar' : 'Editar'}
            </Button>
          </div>
        </div>

        {/* Franja ML única: lead score, churn y segmento en una sola card */}
        {(leadScore || churnData || segmentData) && (
          <div className="mb-6 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--color-line)]">
              {leadScore && (
                <div className="p-4">
                  <p className="text-xs uppercase tracking-wide text-[var(--color-subtle)] mb-1">
                    Lead Score
                  </p>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl font-bold tabular-nums text-[var(--color-ink)]">
                      {leadScore.lead_score}
                    </span>
                    <span className="text-xs text-[var(--color-subtle)]">/ 100</span>
                  </div>
                  <div className="h-1 bg-[var(--color-line)] rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-[var(--color-brand)] transition-all"
                      style={{ width: `${leadScore.lead_score}%` }}
                    />
                  </div>
                  <p className="text-xs text-[var(--color-subtle)] truncate">{leadScore.label}</p>
                </div>
              )}

              {churnData && (
                <div className="p-4">
                  <p className="text-xs uppercase tracking-wide text-[var(--color-subtle)] mb-1">
                    Churn
                  </p>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span
                      className={`text-2xl font-bold tabular-nums ${
                        churnData.churn_probability >= 70
                          ? 'text-[var(--color-danger)]'
                          : churnData.churn_probability >= 40
                            ? 'text-[var(--color-warning)]'
                            : 'text-[var(--color-success)]'
                      }`}
                    >
                      {churnData.churn_probability}%
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-subtle)] truncate">{churnData.risk_level}</p>
                </div>
              )}

              {segmentData && (
                <div className="p-4">
                  <p className="text-xs uppercase tracking-wide text-[var(--color-subtle)] mb-1">
                    Segmento
                  </p>
                  <div className="flex items-baseline gap-2 mb-2">
                    <StatusBadge
                      label={`Cluster ${segmentData.segment.cluster}`}
                      dotClass="bg-[var(--color-brand)]"
                      size="xs"
                    />
                  </div>
                  <p className="text-xs text-[var(--color-subtle)] line-clamp-2">
                    {segmentData.segment.label}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {summary && (
          <div className="mb-6 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[var(--color-brand)]/10">
                <Sparkles className="h-4 w-4 text-[var(--color-brand)]" />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wide text-[var(--color-subtle)] mb-1">
                  Resumen generado por IA
                </p>
                <p className="text-sm text-[var(--color-ink)] leading-relaxed">
                  {summary}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSummary('')}
                className="p-1 rounded hover:bg-[var(--color-line)]/50 transition-colors"
                title="Cerrar"
              >
                <X className="h-3.5 w-3.5 text-[var(--color-subtle)]" />
              </button>
            </div>
          </div>
        )}

        {summaryError && (
          <div className="mb-6 rounded-2xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-4">
            <p className="text-sm text-[var(--color-danger)]">{summaryError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna principal (2/3): Información + Interacciones */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border border-gray-200/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-[var(--color-ink)]">Información del Contacto</CardTitle>
              </CardHeader>
              <CardContent>
                {editing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Nombre</label>
                      <Input
                        value={formData.first_name || ''}
                        onChange={(e: any) => setFormData({ ...formData, first_name: e.target.value })}
                        className="border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Apellido</label>
                      <Input
                        value={formData.last_name || ''}
                        onChange={(e: any) => setFormData({ ...formData, last_name: e.target.value })}
                        className="border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Email</label>
                      <Input
                        value={formData.email || ''}
                        onChange={(e: any) => setFormData({ ...formData, email: e.target.value })}
                        className="border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Teléfono</label>
                      <Input
                        value={formData.phone || ''}
                        onChange={(e: any) => setFormData({ ...formData, phone: e.target.value })}
                        className="border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Empresa</label>
                      <Input
                        value={formData.company || ''}
                        readOnly
                        className="border-gray-200 bg-gray-50 text-[var(--color-subtle)] cursor-not-allowed"
                      />
                      <p className="text-xs text-[var(--color-subtle)] mt-1">La empresa se gestiona desde la vista de Empresas.</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Notas</label>
                      <textarea
                        className="flex min-h-[80px] w-full rounded-md border border-gray-200 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                        value={formData.notes || ''}
                        onChange={(e: any) => setFormData({ ...formData, notes: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <Button onClick={handleSave} disabled={saving} className="bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] transition-all shadow-md hover:shadow-lg">
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Guardando...' : 'Guardar'}
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-3 bg-gray-50/80 rounded-lg border border-gray-100">
                      <User className="h-4 w-4 text-[var(--color-subtle)] mt-0.5" />
                      <div>
                        <p className="text-xs text-[var(--color-subtle)]">Nombre completo</p>
                        <p className="text-sm font-medium text-[var(--color-ink)]">{contact.full_name}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-gray-50/80 rounded-lg border border-gray-100">
                      <Mail className="h-4 w-4 text-[var(--color-subtle)] mt-0.5" />
                      <div>
                        <p className="text-xs text-[var(--color-subtle)]">Email</p>
                        <p className="text-sm font-medium text-[var(--color-ink)]">{contact.email}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-gray-50/80 rounded-lg border border-gray-100">
                      <Phone className="h-4 w-4 text-[var(--color-subtle)] mt-0.5" />
                      <div>
                        <p className="text-xs text-[var(--color-subtle)]">Teléfono</p>
                        <p className="text-sm font-medium text-[var(--color-ink)]">{contact.phone || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-gray-50/80 rounded-lg border border-gray-100">
                      <Building className="h-4 w-4 text-[var(--color-subtle)] mt-0.5" />
                      <div>
                        <p className="text-xs text-[var(--color-subtle)]">Empresa</p>
                        <p className="text-sm font-medium text-[var(--color-ink)]">{contact.company || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-gray-50/80 rounded-lg border border-gray-100 col-span-2">
                      <div>
                        <p className="text-xs text-[var(--color-subtle)]">Notas</p>
                        <p className="text-sm text-gray-700">{contact.notes || 'Sin notas'}</p>
                      </div>
                    </div>
                  </div>
                )}
                {/* Metadatos: creado, actualizado, interacciones */}
                <div className="border-t border-[var(--color-line)] mt-4 pt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-[var(--color-subtle)]">
                  <span>Creado: {formatDate(contact.created_at)}</span>
                  <span>Actualizado: {formatDate(contact.updated_at)}</span>
                  <span>{contact.interaction_count} interacciones</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-[var(--color-ink)]">Interacciones</CardTitle>
              </CardHeader>
              <CardContent>
                {interactionList.length === 0 ? (
                  <p className="py-1 text-xs text-[var(--color-subtle)]">Sin interacciones registradas</p>
                ) : (
                  <div className="relative">
                    {/* Línea vertical del timeline */}
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-[var(--color-line)]" />

                    <div className="space-y-4">
                      {interactionList.map((interaction) => {
                        const sentiment = sentimentMap[interaction.id];
                        const dotColor =
                          sentiment?.label === 'positive' ? 'bg-[var(--color-success)]' :
                          sentiment?.label === 'negative' ? 'bg-[var(--color-danger)]' :
                          'bg-[var(--color-subtle)]';

                        return (
                          <div key={interaction.id} className="relative flex gap-4 pl-10">
                            {/* Punto del timeline */}
                            <div className={`absolute left-2.5 top-2 h-3 w-3 rounded-full ring-4 ring-[var(--color-surface)] ${dotColor}`} />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline justify-between gap-2 mb-1">
                                <p className="text-sm font-medium text-[var(--color-ink)] truncate">
                                  {interaction.subject}
                                </p>
                                <span className="text-xs text-[var(--color-subtle)] tabular-nums shrink-0">
                                  {formatRelativeDate(interaction.occurred_at)}
                                </span>
                              </div>
                              <p className="text-xs text-[var(--color-subtle)]">
                                {interaction.channel} · {interaction.direction}
                              </p>
                              {interaction.body && (
                                <p className="text-xs text-[var(--color-subtle)] line-clamp-2 mt-1">
                                  {interaction.body}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Columna lateral (1/3): Oportunidades → Tareas → Tags → Intereses */}
          <div className="space-y-6">
            <Card className="border border-gray-200/80 shadow-sm">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-[var(--color-ink)]">Oportunidades</CardTitle>
                  <Dialog open={opportunityDialogOpen} onOpenChange={setOpportunityDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 rounded-lg"
                      >
                        + Nueva
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-[var(--color-ink)]">Nueva Oportunidad</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Nombre *</label>
                          <Input
                            value={newOppName}
                            onChange={(e) => setNewOppName(e.target.value)}
                            placeholder="Ej: Renovación anual"
                            className="border-[var(--color-line)] rounded-xl h-11"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="min-w-0">
                            <label className="text-sm font-medium text-gray-700">Monto (CLP) *</label>
                            <Input
                              type="number"
                              value={newOppAmount}
                              onChange={(e) => setNewOppAmount(e.target.value)}
                              placeholder="0"
                              className="border-[var(--color-line)] rounded-xl h-11"
                            />
                          </div>
                          <div className="min-w-0">
                            <label className="text-sm font-medium text-gray-700">Etapa</label>
                            <Select value={newOppStage} onValueChange={setNewOppStage}>
                              <SelectTrigger className="w-full border-[var(--color-line)] rounded-xl h-11">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CREATABLE_OPPORTUNITY_STAGES.map((stage) => (
                                  <SelectItem key={stage} value={stage}>
                                    {OPPORTUNITY_STAGE_LABELS[stage]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button
                          onClick={handleCreateOpportunity}
                          disabled={savingOpp || !newOppName.trim() || !newOppAmount}
                          className="w-full bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] rounded-xl"
                        >
                          {savingOpp ? 'Guardando...' : 'Crear oportunidad'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {opportunityList.length === 0 ? (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-xs text-[var(--color-subtle)]">Sin oportunidades</span>
                    <button
                      type="button"
                      onClick={() => setOpportunityDialogOpen(true)}
                      className="text-xs text-[var(--color-brand)] hover:underline font-medium"
                    >
                      + Agregar
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {opportunityList.map((opp) => (
                      <button
                        key={opp.id}
                        type="button"
                        onClick={() => router.push(`/opportunities/${opp.id}`)}
                        className="w-full text-left p-3 rounded-xl border border-[var(--color-line)] hover:border-blue-400/50 hover:bg-blue-50/40 transition-all duration-200"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-sm font-medium text-[var(--color-ink)] truncate">{opp.name}</p>
                          <span className="text-sm font-semibold text-[var(--color-ink)] tabular-nums shrink-0">
                            {formatPrice(Number(opp.amount))}
                          </span>
                        </div>
                        <div className="mt-1.5">
                          <StatusBadge
                            label={OPPORTUNITY_STAGE_LABELS[opp.stage] || opp.stage}
                            dotClass={OPPORTUNITY_STAGE_DOT[opp.stage]}
                            size="xs"
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-gray-200/80 shadow-sm">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-[var(--color-ink)]">Tareas</CardTitle>
                  <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 rounded-lg"
                      >
                        + Nueva
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-[var(--color-ink)]">Nueva Tarea</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Título *</label>
                          <Input
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="Ej: Llamar para seguimiento"
                            className="border-[var(--color-line)] rounded-xl h-11"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="min-w-0">
                            <label className="text-sm font-medium text-gray-700">Prioridad</label>
                            <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                              <SelectTrigger className="w-full border-[var(--color-line)] rounded-xl h-11">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Baja</SelectItem>
                                <SelectItem value="medium">Media</SelectItem>
                                <SelectItem value="high">Alta</SelectItem>
                                <SelectItem value="urgent">Urgente</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="min-w-0">
                            <label className="text-sm font-medium text-gray-700">Vence</label>
                            <Input
                              type="date"
                              value={newTaskDueDate}
                              onChange={(e) => setNewTaskDueDate(e.target.value)}
                              className="border-[var(--color-line)] rounded-xl h-11"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          variant="outline"
                          onClick={() => setTaskDialogOpen(false)}
                          className="rounded-xl"
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleCreateTask}
                          disabled={savingTask || !newTaskTitle.trim()}
                          className="bg-[var(--color-brand)] rounded-xl"
                        >
                          {savingTask ? 'Creando...' : 'Crear'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {taskList.length === 0 ? (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-xs text-[var(--color-subtle)]">Sin pendientes</span>
                    <button
                      type="button"
                      onClick={() => setTaskDialogOpen(true)}
                      className="text-xs text-[var(--color-brand)] hover:underline font-medium"
                    >
                      + Agregar
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                    {taskList.map((task) => (
                      <div
                        key={task.id}
                        className={`flex items-start gap-2 p-2.5 bg-gray-50/70 rounded-lg border-l-4 ${
                          task.is_overdue ? 'border-rose-400' : 'border-blue-400'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {task.is_overdue && (
                              <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                            )}
                            <p className="text-sm font-medium text-[var(--color-ink)] truncate">{task.title}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <Badge className={`${getTaskStatusColor(task.status)} border-0 text-[10px] px-1.5 py-0`}>
                              {TASK_STATUS_LABELS[task.status]}
                            </Badge>
                            <StatusBadge
                              label={TASK_PRIORITY_LABELS[task.priority]}
                              dotClass={TASK_PRIORITY_DOT[task.priority]}
                              size="xs"
                            />
                            {task.due_date && (
                              <span className={`text-[10px] ${task.is_overdue ? 'text-rose-600 font-semibold' : 'text-[var(--color-subtle)]'}`}>
                                {new Date(task.due_date).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Quick actions mini */}
                        <div className="flex gap-0.5 shrink-0">
                          {task.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => quickChangeTaskStatus(task, 'in_progress')}
                              className="p-1 rounded hover:bg-amber-100/60 transition-colors"
                              title="En progreso"
                            >
                              <Clock className="h-3.5 w-3.5 text-amber-500" />
                            </button>
                          )}
                          {task.status !== 'completed' && task.status !== 'cancelled' && (
                            <button
                              type="button"
                              onClick={() => quickChangeTaskStatus(task, 'completed')}
                              className="p-1 rounded hover:bg-emerald-100/60 transition-colors"
                              title="Completar"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            </button>
                          )}
                          {task.status !== 'cancelled' && task.status !== 'completed' && (
                            <button
                              type="button"
                              onClick={() => quickChangeTaskStatus(task, 'cancelled')}
                              className="p-1 rounded hover:bg-gray-100 transition-colors"
                              title="Cancelar"
                            >
                              <XCircle className="h-3.5 w-3.5 text-[var(--color-subtle)]" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-gray-200/80 shadow-sm">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-[var(--color-ink)]">Tags</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTagSelectorOpen(!tagSelectorOpen)}
                    className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 rounded-lg"
                  >
                    {tagSelectorOpen ? 'Cerrar' : 'Editar'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Tags actuales */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {contact.tags && contact.tags.length > 0 ? (
                    contact.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-[var(--color-ink)] border group"
                        style={{
                          backgroundColor: `color-mix(in oklab, ${tag.color} 12%, transparent)`,
                          borderColor: tag.color,
                        }}
                      >
                        {tag.name}
                        {tagSelectorOpen && (
                          <button
                            type="button"
                            onClick={() => toggleTag(tag)}
                            disabled={savingTags}
                            className="opacity-60 hover:opacity-100 transition-opacity disabled:opacity-30"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    ))
                  ) : (
                    <div className="flex w-full items-center justify-between py-1">
                      <span className="text-xs text-[var(--color-subtle)]">Sin tags</span>
                      <button
                        type="button"
                        onClick={() => setTagSelectorOpen(true)}
                        className="text-xs text-[var(--color-brand)] hover:underline font-medium"
                      >
                        + Agregar
                      </button>
                    </div>
                  )}
                </div>

                {/* Selector de tags disponibles */}
                {tagSelectorOpen && (
                  <div className="border-t border-gray-200/50 pt-3">
                    <p className="text-xs text-[var(--color-subtle)] mb-2 font-medium">Agregar tag:</p>
                    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                      {allTags
                        .filter((t) => !contact.tags.some((ct) => ct.id === t.id))
                        .map((tag) => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            disabled={savingTags}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition-all hover:scale-105 disabled:opacity-50 text-[var(--color-ink)]"
                            style={{
                              borderColor: tag.color,
                              backgroundColor: `color-mix(in oklab, ${tag.color} 8%, transparent)`,
                            }}
                          >
                            <PlusIcon className="h-3 w-3" />
                            {tag.name}
                          </button>
                        ))}
                      {allTags.filter((t) => !contact.tags.some((ct) => ct.id === t.id)).length === 0 && (
                        <p className="text-xs text-[var(--color-subtle)] italic">Todos los tags ya están asignados</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-gray-200/80 shadow-sm">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-[var(--color-ink)]">Intereses</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setInterestSelectorOpen(!interestSelectorOpen)}
                    className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 rounded-lg"
                  >
                    {interestSelectorOpen ? 'Cerrar' : 'Editar'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Intereses actuales */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {contact.interests && contact.interests.length > 0 ? (
                    contact.interests.map((product) => (
                      <span
                        key={product.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                      >
                        {product.name}
                        <span className="text-[var(--color-subtle)] font-normal">· {formatPrice(product.unit_price)}</span>
                        {interestSelectorOpen && (
                          <button
                            type="button"
                            onClick={() => toggleInterest(product)}
                            disabled={savingInterests}
                            className="opacity-60 hover:opacity-100 transition-opacity disabled:opacity-30"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    ))
                  ) : (
                    <div className="flex w-full items-center justify-between py-1">
                      <span className="text-xs text-[var(--color-subtle)]">Sin intereses</span>
                      <button
                        type="button"
                        onClick={() => setInterestSelectorOpen(true)}
                        className="text-xs text-[var(--color-brand)] hover:underline font-medium"
                      >
                        + Agregar
                      </button>
                    </div>
                  )}
                </div>

                {/* Selector de productos disponibles */}
                {interestSelectorOpen && (
                  <div className="border-t border-gray-200/50 pt-3">
                    <p className="text-xs text-[var(--color-subtle)] mb-2 font-medium">Agregar interés:</p>
                    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                      {allProducts
                        .filter((p) => !(contact.interests || []).some((ci) => ci.id === p.id))
                        .map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => toggleInterest(product)}
                            disabled={savingInterests}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border border-blue-300 text-blue-600 transition-all hover:scale-105 hover:bg-blue-50 disabled:opacity-50"
                          >
                            <PlusIcon className="h-3 w-3" />
                            {product.name}
                          </button>
                        ))}
                      {allProducts.filter((p) => !(contact.interests || []).some((ci) => ci.id === p.id)).length === 0 && (
                        <p className="text-xs text-[var(--color-subtle)] italic">Todos los productos ya están asignados</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}