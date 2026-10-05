// frontend/src/app/opportunities/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { opportunities } from '@/lib/api-client';
import { OPPORTUNITY_STAGE_DOT } from '@/lib/badge-colors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft, Save, X, Trash2, Target, User, Building2, CalendarDays,
  TrendingUp, AlertTriangle, Percent, Timer, Pencil,
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
  lost_reason: string;
  is_overdue: boolean;
  weighted_amount: number;
  contact: OppContact | null;
  company: OppCompany | null;
  assigned_to: OppUser | null;
  created_at: string;
  updated_at: string;
}

const STAGES = ['discovery', 'proposal', 'negotiation', 'won', 'lost'] as const;

const STAGE_LABELS: Record<string, string> = {
  discovery: 'Descubrimiento',
  proposal: 'Propuesta',
  negotiation: 'Negociación',
  won: 'Ganada',
  lost: 'Perdida',
};

const formatCLP = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (date: string | null) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatDateTime = (date: string | null) => {
  if (!date) return '—';
  return new Date(date).toLocaleString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const daysToClose = (date: string | null) => {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
};

export default function OpportunityDetailPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stageSaving, setStageSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    stage: 'discovery',
    probability: '',
    expected_close_date: '',
    lost_reason: '',
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && id) fetchOpportunity();
  }, [isAuthenticated, id]);

  const fetchOpportunity = async () => {
    setLoading(true);
    try {
      const response = await opportunities.get(Number(id));
      setOpp(response.data);
    } catch {
      setError('No se pudo cargar la oportunidad.');
    } finally {
      setLoading(false);
    }
  };

  const extractError = (err: any, fallback: string) => {
    const payload = err?.response?.data;
    const details = payload?.error?.details;
    if (details && typeof details === 'object') {
      const field = Object.keys(details)[0];
      if (field) {
        const value = (details as any)[field];
        const message = Array.isArray(value) ? value.join(' ') : String(value);
        return `${field}: ${message}`;
      }
    }
    return payload?.error?.message || fallback;
  };

  const startEdit = () => {
    if (!opp) return;
    setError('');
    setFormData({
      name: opp.name || '',
      amount: String(opp.amount ?? ''),
      stage: opp.stage,
      probability: String(opp.probability ?? ''),
      expected_close_date: opp.expected_close_date || '',
      lost_reason: opp.lost_reason || '',
    });
    setEditing(true);
  };

  const save = async () => {
    if (!opp) return;
    setSaving(true);
    setError('');
    try {
      await opportunities.update(opp.id, {
        name: formData.name,
        amount: Number(formData.amount || 0),
        stage: formData.stage,
        probability: formData.probability === '' ? 0 : Number(formData.probability),
        expected_close_date: formData.expected_close_date || null,
        lost_reason: formData.stage === 'lost' ? formData.lost_reason : '',
      });
      setEditing(false);
      await fetchOpportunity();
    } catch (err) {
      setError(extractError(err, 'No se pudo guardar la oportunidad.'));
    } finally {
      setSaving(false);
    }
  };

  const changeStage = async (stage: string) => {
    if (!opp || opp.stage === stage) return;
    if (stage === 'lost') {
      setFormData({
        name: opp.name || '',
        amount: String(opp.amount ?? ''),
        stage: 'lost',
        probability: String(opp.probability ?? ''),
        expected_close_date: opp.expected_close_date || '',
        lost_reason: opp.lost_reason || '',
      });
      setError('Indica el motivo de pérdida para marcar la oportunidad como perdida.');
      setEditing(true);
      return;
    }
    setStageSaving(true);
    setError('');
    try {
      await opportunities.update(opp.id, { stage });
      await fetchOpportunity();
    } catch (err) {
      setError(extractError(err, 'No se pudo cambiar la etapa.'));
    } finally {
      setStageSaving(false);
    }
  };

  const remove = async () => {
    if (!opp) return;
    setDeleting(true);
    try {
      await opportunities.delete(opp.id);
      router.push('/opportunities');
    } catch (err) {
      setError(extractError(err, 'No se pudo eliminar la oportunidad.'));
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)]">
        <TopNavbar breadcrumb={[{ label: 'Oportunidades', href: '/opportunities' }]} />
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-pulse space-y-4">
            <div className="h-12 w-64 bg-gray-200 rounded-lg"></div>
            <div className="h-4 w-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (!opp) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-[var(--color-subtle)]">{error || 'Oportunidad no encontrada.'}</p>
        <Button
          variant="outline"
          onClick={() => router.push('/opportunities')}
          className="border-[var(--color-line)] hover:border-blue-400/50 hover:bg-blue-50/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-medium text-gray-700 rounded-xl"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Volver a oportunidades
        </Button>
      </div>
    );
  }

  const days = daysToClose(opp.expected_close_date);
  const isOpen = opp.stage !== 'won' && opp.stage !== 'lost';

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <TopNavbar
        breadcrumb={[
          { label: 'Oportunidades', href: '/opportunities' },
          { label: opp?.name || 'Cargando...' },
        ]}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="border border-[var(--color-line)] shadow-sm rounded-2xl bg-[var(--color-surface)] mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-[var(--color-brand)] text-white shadow-md">
                  <Target className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-2xl font-bold text-[var(--color-ink)] tracking-tight">{opp.name}</h2>
                    <StatusBadge
                      label={STAGE_LABELS[opp.stage] || opp.stage}
                      dotClass={OPPORTUNITY_STAGE_DOT[opp.stage] || 'bg-gray-400'}
                    />
                    {opp.is_overdue && (
                      <Badge className="bg-rose-100 text-rose-700 border border-rose-200 font-medium rounded-full px-2.5 py-0.5 text-xs flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Vencida
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-[var(--color-subtle)] mt-1.5">
                    {opp.assigned_to ? `Asignada a ${opp.assigned_to.username}` : 'Sin asignar'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={startEdit}
                  disabled={saving}
                  className="border-[var(--color-line)] hover:border-blue-400/50 hover:bg-blue-50/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-medium text-gray-700 rounded-xl"
                >
                  <Pencil className="h-4 w-4 mr-1.5" />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setDeleteOpen(true)}
                  className="text-rose-500 hover:text-rose-600 hover:bg-rose-50/50 rounded-xl transition-all duration-200"
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Eliminar
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-5 pt-5 border-t border-gray-200/50">
              <span className="text-xs font-medium text-[var(--color-subtle)] mr-1">Mover a:</span>
              {STAGES.map((stage) => (
                <Button
                  key={stage}
                  variant="outline"
                  size="sm"
                  disabled={stageSaving || opp.stage === stage}
                  onClick={() => changeStage(stage)}
                  className={`rounded-xl transition-all duration-200 font-medium ${
                    opp.stage === stage
                      ? 'border-blue-400/50 bg-blue-50 text-blue-700'
                      : 'border-[var(--color-line)] hover:border-blue-400/50 hover:bg-blue-50/50 hover:-translate-y-0.5 text-gray-600'
                  }`}
                >
                  {STAGE_LABELS[stage]}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border border-[var(--color-line)] shadow-sm rounded-2xl bg-[var(--color-surface)]">
            <CardContent className="pt-5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-subtle)] uppercase tracking-wider mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                Monto
              </div>
              <p className="text-xl font-bold text-[var(--color-ink)] tracking-tight">{formatCLP(opp.amount)}</p>
            </CardContent>
          </Card>
          <Card className="border border-[var(--color-line)] shadow-sm rounded-2xl bg-[var(--color-surface)]">
            <CardContent className="pt-5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-subtle)] uppercase tracking-wider mb-1">
                <Target className="h-3.5 w-3.5 text-indigo-500" />
                Ponderado
              </div>
              <p className="text-xl font-bold text-indigo-600 tracking-tight">{formatCLP(opp.weighted_amount)}</p>
            </CardContent>
          </Card>
          <Card className="border border-[var(--color-line)] shadow-sm rounded-2xl bg-[var(--color-surface)]">
            <CardContent className="pt-5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-subtle)] uppercase tracking-wider mb-1">
                <Percent className="h-3.5 w-3.5 text-violet-500" />
                Probabilidad
              </div>
              <p className="text-xl font-bold text-violet-600 tracking-tight">{opp.probability}%</p>
            </CardContent>
          </Card>
          <Card className="border border-[var(--color-line)] shadow-sm rounded-2xl bg-[var(--color-surface)]">
            <CardContent className="pt-5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-subtle)] uppercase tracking-wider mb-1">
                <CalendarDays className="h-3.5 w-3.5 text-amber-500" />
                Cierre esperado
              </div>
              <p className="text-base font-bold text-[var(--color-ink)] tracking-tight">{formatDate(opp.expected_close_date)}</p>
              {isOpen && days !== null && (
                <p className={`text-xs font-medium mt-0.5 flex items-center gap-1 ${days < 0 ? 'text-rose-500' : 'text-[var(--color-subtle)]'}`}>
                  <Timer className="h-3 w-3" />
                  {days < 0 ? `${Math.abs(days)} días de atraso` : days === 0 ? 'Cierra hoy' : `en ${days} días`}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {editing && (
              <Card className="border border-blue-200/60 shadow-sm rounded-2xl bg-white/70 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-[var(--color-ink)] flex items-center gap-2">
                    <Pencil className="h-4 w-4 text-blue-500" />
                    Editar oportunidad
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-[var(--color-subtle)] mb-1.5 block">Nombre</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="rounded-xl h-11 focus:ring-4 focus:ring-blue-400/10"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-[var(--color-subtle)] mb-1.5 block">Monto (CLP)</label>
                      <Input
                        type="number"
                        min={0}
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="rounded-xl h-11 focus:ring-4 focus:ring-blue-400/10"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--color-subtle)] mb-1.5 block">Probabilidad (%)</label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={formData.probability}
                        onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                        className="rounded-xl h-11 focus:ring-4 focus:ring-blue-400/10"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-[var(--color-subtle)] mb-1.5 block">Etapa</label>
                      <Select value={formData.stage} onValueChange={(value) => setFormData({ ...formData, stage: value })}>
                        <SelectTrigger className="rounded-xl h-11">
                          <SelectValue placeholder="Etapa" />
                        </SelectTrigger>
                        <SelectContent>
                          {STAGES.map((stage) => (
                            <SelectItem key={stage} value={stage}>
                              {STAGE_LABELS[stage]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--color-subtle)] mb-1.5 block">Fecha de cierre esperada</label>
                      <Input
                        type="date"
                        value={formData.expected_close_date}
                        onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                        className="rounded-xl h-11 focus:ring-4 focus:ring-blue-400/10"
                      />
                    </div>
                  </div>
                  {formData.stage === 'lost' && (
                    <div>
                      <label className="text-xs font-medium text-[var(--color-subtle)] mb-1.5 block">Motivo de pérdida</label>
                      <Input
                        value={formData.lost_reason}
                        onChange={(e) => setFormData({ ...formData, lost_reason: e.target.value })}
                        className="rounded-xl h-11 focus:ring-4 focus:ring-blue-400/10"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      onClick={save}
                      disabled={saving}
                      className="bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white rounded-xl hover:-translate-y-0.5 transition-all duration-200"
                    >
                      <Save className="h-4 w-4 mr-1.5" />
                      {saving ? 'Guardando...' : 'Guardar'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => { setEditing(false); setError(''); }}
                      disabled={saving}
                      className="border-[var(--color-line)] hover:border-blue-400/50 hover:bg-blue-50/50 rounded-xl font-medium text-gray-700 transition-all duration-200"
                    >
                      <X className="h-4 w-4 mr-1.5" />
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {!editing && (
              <Card className="border border-[var(--color-line)] shadow-sm rounded-2xl bg-[var(--color-surface)]">
                <CardHeader>
                  <CardTitle className="text-[var(--color-ink)] flex items-center gap-2">
                    <Target className="h-4 w-4 text-indigo-500" />
                    Detalle
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <dt className="text-xs text-[var(--color-subtle)] uppercase tracking-wider font-medium">Etapa</dt>
                      <dd className="text-sm text-[var(--color-ink)] font-medium mt-0.5">{STAGE_LABELS[opp.stage] || opp.stage}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[var(--color-subtle)] uppercase tracking-wider font-medium">Estado</dt>
                      <dd className="text-sm text-[var(--color-ink)] font-medium mt-0.5">{isOpen ? 'Abierta' : 'Cerrada'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[var(--color-subtle)] uppercase tracking-wider font-medium">Monto</dt>
                      <dd className="text-sm text-[var(--color-ink)] font-medium mt-0.5">{formatCLP(opp.amount)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[var(--color-subtle)] uppercase tracking-wider font-medium">Ponderado</dt>
                      <dd className="text-sm text-[var(--color-ink)] font-medium mt-0.5">{formatCLP(opp.weighted_amount)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[var(--color-subtle)] uppercase tracking-wider font-medium">Probabilidad</dt>
                      <dd className="text-sm text-[var(--color-ink)] font-medium mt-0.5">{opp.probability}%</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[var(--color-subtle)] uppercase tracking-wider font-medium">Cierre esperado</dt>
                      <dd className="text-sm text-[var(--color-ink)] font-medium mt-0.5">{formatDate(opp.expected_close_date)}</dd>
                    </div>
                  </dl>
                  {opp.lost_reason && (
                    <div className="mt-4 p-3 bg-rose-50/60 rounded-xl border border-rose-100/60">
                      <p className="text-xs text-rose-500 font-medium mb-1">Motivo de pérdida</p>
                      <p className="text-sm text-gray-700">{opp.lost_reason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
          <div className="space-y-6">
            <Card className="border border-[var(--color-line)] shadow-sm rounded-2xl bg-[var(--color-surface)]">
              <CardHeader>
                <CardTitle className="text-[var(--color-ink)] flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-500" />
                  Contacto
                </CardTitle>
              </CardHeader>
              <CardContent>
                {opp.contact ? (
                  <div
                    onClick={() => router.push(`/contacts/${opp.contact!.id}`)}
                    className="p-3.5 bg-gray-50/60 rounded-xl border border-transparent hover:border-blue-200/40 hover:bg-blue-50/40 hover:shadow-sm transition-all duration-200 cursor-pointer"
                  >
                    <p className="font-medium text-[var(--color-ink)]">{opp.contact.full_name}</p>
                    <p className="text-sm text-[var(--color-subtle)]">{opp.contact.email}</p>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--color-subtle)]">Sin contacto vinculado</p>
                )}
              </CardContent>
            </Card>

            <Card className="border border-[var(--color-line)] shadow-sm rounded-2xl bg-[var(--color-surface)]">
              <CardHeader>
                <CardTitle className="text-[var(--color-ink)] flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-violet-500" />
                  Empresa
                </CardTitle>
              </CardHeader>
              <CardContent>
                {opp.company ? (
                  <div
                    onClick={() => router.push(`/companies/${opp.company!.id}`)}
                    className="p-3.5 bg-gray-50/60 rounded-xl border border-transparent hover:border-violet-200/40 hover:bg-violet-50/40 hover:shadow-sm transition-all duration-200 cursor-pointer"
                  >
                    <p className="font-medium text-[var(--color-ink)]">{opp.company.name}</p>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--color-subtle)]">Sin empresa vinculada</p>
                )}
              </CardContent>
            </Card>

            <Card className="border border-[var(--color-line)] shadow-sm rounded-2xl bg-[var(--color-surface)]">
              <CardHeader>
                <CardTitle className="text-[var(--color-ink)] flex items-center gap-2">
                  <Timer className="h-4 w-4 text-slate-500" />
                  Registro
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-[var(--color-subtle)] uppercase tracking-wider font-medium">Creada</p>
                  <p className="text-sm text-gray-700 mt-0.5">{formatDateTime(opp.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-subtle)] uppercase tracking-wider font-medium">Actualizada</p>
                  <p className="text-sm text-gray-700 mt-0.5">{formatDateTime(opp.updated_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-subtle)] uppercase tracking-wider font-medium">Cerrada</p>
                  <p className="text-sm text-gray-700 mt-0.5">{formatDateTime(opp.closed_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-subtle)] uppercase tracking-wider font-medium">Asignada a</p>
                  <p className="text-sm text-gray-700 mt-0.5">
                    {opp.assigned_to ? opp.assigned_to.username : 'Sin asignar'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--color-ink)]">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
              Eliminar oportunidad
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            ¿Seguro que quieres eliminar{' '}
            <span className="font-medium text-[var(--color-ink)]">{opp.name}</span>? Esta acción no se puede deshacer.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
              className="border-[var(--color-line)] hover:border-blue-400/50 hover:bg-blue-50/50 rounded-xl font-medium text-gray-700 transition-all duration-200"
            >
              Cancelar
            </Button>
            <Button
              onClick={remove}
              disabled={deleting}
              className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-all duration-200 hover:-translate-y-0.5"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
