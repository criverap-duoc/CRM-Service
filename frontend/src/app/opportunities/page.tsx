// frontend/src/app/opportunities/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { opportunities, contacts as contactsApi } from '@/lib/api-client';
import { OPPORTUNITY_STAGE_DOT } from '@/lib/badge-colors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/StatusBadge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  Plus, BarChart3, TrendingUp,
  ChevronsUpDown, Check, MoreVertical, Pencil, Trophy, XCircle,
} from 'lucide-react';
import { TopNavbar } from '@/components/TopNavbar';


interface OppUser {
  id: number;
  username: string;
  email: string;
}

interface OppContact {
  id: number;
  full_name: string;
  email: string;
}

interface OppCompany {
  id: number;
  name: string;
}

interface Opportunity {
  id: number;
  name: string;
  amount: number;
  stage: string;
  probability: number;
  expected_close_date: string | null;
  closed_at: string | null;
  is_overdue: boolean;
  weighted_amount: number;
  contact: OppContact | null;
  company: OppCompany | null;
  assigned_to: OppUser | null;
  created_at: string;
  updated_at: string;
}

interface PipelineStage {
  stage: string;
  label: string;
  count: number;
  total_amount: number;
  weighted_amount: number;
}

interface ForecastRow {
  month: string;
  count: number;
  total_amount: number;
  weighted_amount: number;
}

interface ContactOption {
  id: number;
  full_name: string;
  email: string;
}

const STAGES = ['discovery', 'proposal', 'negotiation', 'won', 'lost'] as const;

const STAGE_LABELS: Record<string, string> = {
  discovery: 'Descubrimiento',
  proposal: 'Propuesta',
  negotiation: 'Negociación',
  won: 'Ganada',
  lost: 'Perdida',
};

// Solo para los chips del filtro de etapas; los badges usan OPPORTUNITY_STAGE_DOT
const STAGE_COLORS: Record<string, string> = {
  discovery: 'bg-slate-100 text-slate-700',
  proposal: 'bg-blue-100 text-blue-700',
  negotiation: 'bg-violet-100 text-violet-700',
  won: 'bg-emerald-100 text-emerald-700',
  lost: 'bg-rose-100 text-rose-700',
};

const formatCLP = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

// Color de la barra de probabilidad del pie de cada card del kanban.
const probabilityBarColor = (p: number) => {
  if (p >= 70) return 'bg-[var(--color-success)]';
  if (p >= 40) return 'bg-[var(--color-warning)]';
  return 'bg-[var(--color-subtle)]';
};

// `expected_close_date` llega como "YYYY-MM-DD" (DateField de DRF). Sin la hora
// local explícita, `new Date("2026-11-03")` se interpreta como medianoche UTC y
// en America/Santiago (UTC-3) se renderiza un día antes ("02 nov 2026").
const formatDate = (date: string | null) => {
  if (!date) return '—';
  return new Date(date + 'T00:00:00').toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function OpportunitiesPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState<string[]>([]);
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [openOnly, setOpenOnly] = useState(false);
  const [userOptions, setUserOptions] = useState<OppUser[]>([]);

  const [pipelineOpen, setPipelineOpen] = useState(false);
  const [pipelineData, setPipelineData] = useState<{ stages: PipelineStage[]; total_count: number } | null>(null);
  const [forecastOpen, setForecastOpen] = useState(false);
  const [forecastData, setForecastData] = useState<ForecastRow[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [contactOptions, setContactOptions] = useState<ContactOption[]>([]);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contact_id: '' as number | '',
    amount: '',
    stage: 'discovery',
    probability: '',
    expected_close_date: '',
    lost_reason: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Acciones del kanban (menú kebab de cada card)
  const [actionError, setActionError] = useState('');
  const [lostTarget, setLostTarget] = useState<Opportunity | null>(null);
  const [lostReason, setLostReason] = useState('');
  const [lostSaving, setLostSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) fetchOpportunities();
  }, [isAuthenticated, stageFilter, assignedFilter, openOnly]);

  useEffect(() => {
    if (isAuthenticated) fetchUserOptions();
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && createOpen && contactOptions.length === 0) fetchContactOptions();
  }, [isAuthenticated, createOpen]);

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const params: any = { page_size: 200 };
      if (stageFilter.length) params.stage = stageFilter;
      if (assignedFilter && assignedFilter !== 'all') params.assigned_to = assignedFilter;
      if (openOnly) params.open_only = 'true';
      const response = await opportunities.list(params);
      setOpps(response.data.results || response.data);
    } catch (err) {
      console.error('Error fetching opportunities:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserOptions = async () => {
    try {
      const response = await opportunities.list({ page_size: 500 });
      const data: Opportunity[] = response.data.results || response.data;
      const map = new Map<number, OppUser>();
      data.forEach((o) => {
        if (o.assigned_to) map.set(o.assigned_to.id, o.assigned_to);
      });
      setUserOptions(Array.from(map.values()));
    } catch (err) {
      console.error('Error fetching assigned users:', err);
    }
  };

  const fetchContactOptions = async () => {
    try {
      const response = await contactsApi.list({ page_size: 300 });
      const data = response.data.results || response.data;
      setContactOptions(data.map((c: any) => ({ id: c.id, full_name: c.full_name, email: c.email })));
    } catch (err) {
      console.error('Error fetching contacts:', err);
    }
  };

  const openPipeline = async () => {
    setPipelineOpen(true);
    try {
      const res = await opportunities.pipeline();
      setPipelineData(res.data);
    } catch (err) {
      console.error('Error fetching pipeline:', err);
    }
  };

  const openForecast = async () => {
    setForecastOpen(true);
    try {
      const res = await opportunities.forecast();
      setForecastData(res.data.forecast || []);
    } catch (err) {
      console.error('Error fetching forecast:', err);
    }
  };

  const toggleStage = (stage: string) =>
    setStageFilter((prev) =>
      prev.includes(stage) ? prev.filter((s) => s !== stage) : [...prev, stage]
    );

  const openCreate = () => {
    setFormData({
      name: '',
      contact_id: '',
      amount: '',
      stage: 'discovery',
      probability: '',
      expected_close_date: '',
      lost_reason: '',
    });
    setError('');
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.contact_id || !formData.amount) {
      setError('El nombre, el contacto y el monto son obligatorios');
      return;
    }
    if (formData.stage === 'lost' && !formData.lost_reason.trim()) {
      setError('Debes indicar un motivo de pérdida cuando el stage es "Perdida"');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload: any = {
        name: formData.name,
        contact_id: formData.contact_id,
        amount: Number(formData.amount),
        stage: formData.stage,
      };
      if (formData.probability !== '') payload.probability = Number(formData.probability);
      if (formData.expected_close_date) payload.expected_close_date = formData.expected_close_date;
      if (formData.stage === 'lost') payload.lost_reason = formData.lost_reason;
      await opportunities.create(payload);
      setCreateOpen(false);
      fetchOpportunities();
    } catch (err: any) {
      const data = err.response?.data;
      const firstFieldError = data && typeof data === 'object' && !data.error
        ? (Object.values(data)[0] as string[] | string | undefined)
        : undefined;
      const fieldMessage = Array.isArray(firstFieldError) ? firstFieldError[0] : firstFieldError;
      setError(data?.error?.message || fieldMessage || 'Error al crear la oportunidad');
    } finally {
      setSaving(false);
    }
  };

  // Mueve una oportunidad a otra etapa desde el menú de la card.
  const changeStage = async (op: Opportunity, stage: string) => {
    if (op.stage === stage) return;
    setActionError('');
    try {
      await opportunities.update(op.id, { stage });
      fetchOpportunities();
    } catch (err) {
      console.error('Error changing stage:', err);
      setActionError(`No se pudo mover "${op.name}" a ${STAGE_LABELS[stage]}.`);
    }
  };

  const openLostDialog = (op: Opportunity) => {
    setActionError('');
    setLostReason('');
    setLostTarget(op);
  };

  const confirmLost = async () => {
    if (!lostTarget || !lostReason.trim()) return;
    setLostSaving(true);
    setActionError('');
    try {
      await opportunities.update(lostTarget.id, {
        stage: 'lost',
        lost_reason: lostReason.trim(),
      });
      setLostTarget(null);
      setLostReason('');
      fetchOpportunities();
    } catch (err) {
      console.error('Error marking opportunity as lost:', err);
      setActionError(`No se pudo marcar "${lostTarget.name}" como perdida.`);
    } finally {
      setLostSaving(false);
    }
  };

  const byStage = STAGES.map((stage) => {
    const items = opps.filter((o) => o.stage === stage);
    const total = items.reduce((sum, o) => sum + Number(o.amount || 0), 0);
    return { stage, items, total };
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <TopNavbar breadcrumb={[{ label: 'Oportunidades' }]} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            Oportunidades
          </h2>
          <p className="text-sm text-[var(--color-subtle)] font-medium">
            {opps.length} oportunidades en el pipeline
          </p>
        </div>
        {/* Toolbar de filtros — una sola línea, sin Card */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            {STAGES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleStage(s)}
                className={`px-2.5 h-9 rounded-xl border text-xs font-medium transition-all ${
                  stageFilter.includes(s)
                    ? `${STAGE_COLORS[s]} border-transparent`
                    : 'bg-white/50 border-[var(--color-line)] text-gray-600 hover:border-blue-300 hover:bg-blue-50/30'
                }`}
              >
                {STAGE_LABELS[s]}
              </button>
            ))}
          </div>
          <Select value={assignedFilter} onValueChange={setAssignedFilter}>
            <SelectTrigger className="w-[170px] border-[var(--color-line)] rounded-xl h-9">
              <SelectValue placeholder="Asignado a" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los asignados</SelectItem>
              {userOptions.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>{u.username}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={() => setOpenOnly(!openOnly)}
            className={`flex items-center gap-2 px-2.5 h-9 rounded-xl border text-xs font-medium transition-all ${
              openOnly
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'bg-white/50 border-[var(--color-line)] text-gray-600 hover:border-emerald-300 hover:bg-emerald-50/30'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Solo abiertas
          </button>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" onClick={openPipeline} className="border-[var(--color-line)] hover:border-blue-400/50 hover:bg-blue-50/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-xl">
              <BarChart3 className="h-4 w-4 mr-2" />
              Pipeline
            </Button>
            <Button variant="outline" onClick={openForecast} className="border-[var(--color-line)] hover:border-blue-400/50 hover:bg-blue-50/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-xl">
              <TrendingUp className="h-4 w-4 mr-2" />
              Forecast
            </Button>
            <Button
              onClick={openCreate}
              className="bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 rounded-xl font-semibold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Oportunidad
            </Button>
          </div>
        </div>

        {actionError && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {actionError}
          </div>
        )}

        {/* Kanban — board horizontal con scroll */}
        {loading ? (
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 scroll-pl-4 sm:scroll-pl-6 lg:scroll-pl-8 snap-x snap-mandatory">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-[264px] shrink-0 snap-start h-64 bg-gray-100/50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 scroll-pl-4 sm:scroll-pl-6 lg:scroll-pl-8 snap-x snap-mandatory">
            {byStage.map(({ stage, items, total }) => (
              <div key={stage} className="w-[264px] shrink-0 snap-start bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-3 min-h-[220px] flex flex-col">
                <div className="flex items-center justify-between gap-2 px-1 pb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn('h-2 w-2 rounded-full shrink-0', OPPORTUNITY_STAGE_DOT[stage])} />
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-subtle)] truncate">
                      {STAGE_LABELS[stage]}
                    </h3>
                    <span className="text-xs text-[var(--color-subtle)] tabular-nums">{items.length}</span>
                  </div>
                  <span className="text-xs text-[var(--color-subtle)] tabular-nums shrink-0">{formatCLP(total)}</span>
                </div>
                <div className="space-y-2 flex-1">
                  {items.length === 0 ? (
                    <div className="border-2 border-dashed border-[var(--color-line)] rounded-2xl h-24 flex items-center justify-center">
                      <span className="text-xs text-[var(--color-subtle)]">Sin oportunidades</span>
                    </div>
                  ) : (
                    items.map((op) => (
                      <div
                        key={op.id}
                        onClick={() => router.push(`/opportunities/${op.id}`)}
                        className="group relative overflow-hidden bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-3.5 cursor-pointer transition-colors hover:border-[var(--color-ink)]/30"
                      >
                        {/* Nivel 1 — título + kebab (visible en hover) */}
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="text-sm font-medium line-clamp-2 text-[var(--color-ink)]">
                            {op.name}
                          </h4>
                          <div onClick={(e) => e.stopPropagation()} className="shrink-0 -mr-1 -mt-1">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  title="Acciones"
                                  aria-label="Acciones"
                                  className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 p-1 rounded hover:bg-[var(--color-line)]/50 transition-opacity"
                                >
                                  <MoreVertical className="h-3.5 w-3.5 text-[var(--color-subtle)]" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 rounded-xl">
                                <DropdownMenuItem
                                  onClick={() => router.push(`/opportunities/${op.id}`)}
                                  className="cursor-pointer"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => changeStage(op, 'won')}
                                  className="cursor-pointer"
                                >
                                  <Trophy className="h-3.5 w-3.5" />
                                  Marcar como ganada
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => openLostDialog(op)}
                                  className="cursor-pointer"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  Marcar como perdida
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Nivel 2 — empresa · contacto */}
                        <p className="text-xs text-[var(--color-subtle)] truncate mb-2">
                          {op.company?.name || '-'} · {op.contact?.full_name || '-'}
                        </p>

                        {/* Nivel 3 — monto (izq) + probabilidad (der) */}
                        <div className="flex items-baseline justify-between mb-2">
                          <span className="text-base font-semibold tabular-nums text-[var(--color-ink)]">
                            {formatCLP(op.amount)}
                          </span>
                          <span className="text-xs text-[var(--color-subtle)] tabular-nums">
                            {op.probability}%
                          </span>
                        </div>

                        {/* Nivel 4 — fecha de cierre + responsable */}
                        <div className="flex items-center justify-between text-xs">
                          <span
                            className={op.is_overdue
                              ? 'text-[var(--color-danger)] font-medium'
                              : 'text-[var(--color-subtle)]'}
                          >
                            {formatDate(op.expected_close_date)}
                          </span>
                          {op.assigned_to && (
                            <span
                              className="h-5 w-5 rounded-full bg-[var(--color-line)] flex items-center justify-center text-[10px] font-semibold text-[var(--color-ink)] shrink-0"
                              title={op.assigned_to.username}
                            >
                              {op.assigned_to.username.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>

                        {/* Barra de probabilidad — 2px pegada al borde inferior */}
                        <span
                          className={cn('absolute bottom-0 left-0 h-0.5', probabilityBarColor(op.probability))}
                          style={{ width: `${op.probability}%` }}
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      {/* Dialog: marcar oportunidad como perdida */}
      <Dialog open={!!lostTarget} onOpenChange={(open) => { if (!open) setLostTarget(null); }}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[var(--color-ink)]">Marcar como perdida</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-[var(--color-subtle)] truncate">{lostTarget?.name}</p>
            <label className="text-sm font-medium text-gray-700">Motivo de pérdida *</label>
            <textarea
              className="flex min-h-[70px] w-full rounded-xl border border-[var(--color-line)] bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
              rows={3}
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              placeholder="Ej: Recorte de presupuesto, eligió a la competencia..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLostTarget(null)} className="rounded-xl">Cancelar</Button>
            <Button
              onClick={confirmLost}
              disabled={lostSaving || !lostReason.trim()}
              className="bg-[var(--color-brand)] rounded-xl"
            >
              {lostSaving ? 'Guardando...' : 'Marcar como perdida'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Pipeline */}
      <Dialog open={pipelineOpen} onOpenChange={setPipelineOpen}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[var(--color-ink)]">Pipeline por stage</DialogTitle>
          </DialogHeader>
          {pipelineData ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow className="hover:bg-transparent border-[var(--color-line)]">
                    <TableHead className="font-semibold text-gray-600 text-xs uppercase">Stage</TableHead>
                    <TableHead className="font-semibold text-gray-600 text-xs uppercase text-right">Cantidad</TableHead>
                    <TableHead className="font-semibold text-gray-600 text-xs uppercase text-right">Total</TableHead>
                    <TableHead className="font-semibold text-gray-600 text-xs uppercase text-right">Ponderado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pipelineData.stages.map((row) => (
                    <TableRow key={row.stage} className="border-gray-200/20">
                      <TableCell>
                        <StatusBadge label={row.label} dotClass={OPPORTUNITY_STAGE_DOT[row.stage]} />
                      </TableCell>
                      <TableCell className="text-right text-sm text-gray-700">{row.count}</TableCell>
                      <TableCell className="text-right text-sm text-gray-700">{formatCLP(row.total_amount)}</TableCell>
                      <TableCell className="text-right text-sm font-medium text-[var(--color-ink)]">{formatCLP(row.weighted_amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-xs text-[var(--color-subtle)] mt-3 text-right">Total: {pipelineData.total_count} oportunidades</p>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-subtle)] py-6 text-center">Cargando...</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Forecast */}
      <Dialog open={forecastOpen} onOpenChange={setForecastOpen}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[var(--color-ink)]">Forecast por mes de cierre</DialogTitle>
          </DialogHeader>
          {forecastData.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow className="hover:bg-transparent border-[var(--color-line)]">
                    <TableHead className="font-semibold text-gray-600 text-xs uppercase">Mes</TableHead>
                    <TableHead className="font-semibold text-gray-600 text-xs uppercase text-right">Cantidad</TableHead>
                    <TableHead className="font-semibold text-gray-600 text-xs uppercase text-right">Total</TableHead>
                    <TableHead className="font-semibold text-gray-600 text-xs uppercase text-right">Ponderado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forecastData.map((row) => (
                    <TableRow key={row.month} className="border-gray-200/20">
                      <TableCell className="text-sm font-medium text-gray-700">{row.month}</TableCell>
                      <TableCell className="text-right text-sm text-gray-700">{row.count}</TableCell>
                      <TableCell className="text-right text-sm text-gray-700">{formatCLP(row.total_amount)}</TableCell>
                      <TableCell className="text-right text-sm font-medium text-[var(--color-ink)]">{formatCLP(row.weighted_amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-subtle)] py-6 text-center">Sin datos de forecast</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Nueva oportunidad */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-2xl max-w-xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[var(--color-ink)]">Nueva Oportunidad</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">{error}</div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700">Nombre *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Renovación anual CRM Pro"
                className="border-[var(--color-line)] rounded-xl h-11"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Contacto *</label>
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCombobox}
                    className="w-full justify-between h-11 rounded-xl border-[var(--color-line)] font-normal text-left overflow-hidden"
                  >
                    {formData.contact_id
                      ? contactOptions.find((c) => c.id === formData.contact_id)?.full_name
                      : 'Selecciona un contacto...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0 max-h-[320px] overflow-hidden"
                  align="start"
                  sideOffset={4}
                  onWheel={(e) => e.stopPropagation()}
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <Command className="max-h-[320px]" shouldFilter onWheel={(e) => e.stopPropagation()}>
                    <CommandInput placeholder="Buscar contacto..." />
                    <CommandList className="max-h-[280px] overflow-y-auto overscroll-contain" onWheel={(e) => e.stopPropagation()}>
                      <CommandEmpty>No se encontró ningún contacto.</CommandEmpty>
                      <CommandGroup>
                        {contactOptions.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={c.full_name}
                            onSelect={() => {
                              setFormData({ ...formData, contact_id: c.id });
                              setOpenCombobox(false);
                            }}
                          >
                            <Check className={cn('mr-2 h-4 w-4', formData.contact_id === c.id ? 'opacity-100' : 'opacity-0')} />
                            <span className="truncate">{c.full_name} — {c.email}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <label className="text-sm font-medium text-gray-700">Monto (CLP) *</label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="Ej: 2490000"
                  className="border-[var(--color-line)] rounded-xl h-11"
                />
              </div>
              <div className="min-w-0">
                <label className="text-sm font-medium text-gray-700">Probabilidad (%)</label>
                <Input
                  type="number"
                  value={formData.probability}
                  onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                  placeholder="0-100"
                  className="border-[var(--color-line)] rounded-xl h-11"
                />
              </div>
              <div className="min-w-0">
                <label className="text-sm font-medium text-gray-700">Stage</label>
                <Select value={formData.stage} onValueChange={(v) => setFormData({ ...formData, stage: v })}>
                  <SelectTrigger className="w-full border-[var(--color-line)] rounded-xl h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0">
                <label className="text-sm font-medium text-gray-700">Fecha de cierre</label>
                <Input
                  type="date"
                  value={formData.expected_close_date}
                  onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                  className="border-[var(--color-line)] rounded-xl h-11"
                />
              </div>
            </div>
            {formData.stage === 'lost' && (
              <div>
                <label className="text-sm font-medium text-gray-700">Motivo de pérdida *</label>
                <textarea
                  className="flex min-h-[70px] w-full rounded-xl border border-[var(--color-line)] bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
                  value={formData.lost_reason}
                  onChange={(e) => setFormData({ ...formData, lost_reason: e.target.value })}
                  rows={2}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button
              onClick={handleCreate}
              disabled={saving}
              className="bg-[var(--color-brand)] rounded-xl"
            >
              {saving ? 'Creando...' : 'Crear oportunidad'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
