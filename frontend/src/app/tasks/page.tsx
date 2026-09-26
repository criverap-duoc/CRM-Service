'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { tasks as tasksApi, contacts as contactsApi } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  CheckSquare, Filter, Plus, LogOut, AlertTriangle, Clock, CheckCircle2, XCircle, Calendar, Check, ChevronsUpDown
} from 'lucide-react';
import { cn } from "@/lib/utils"


interface Task {
  id: number;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  completed_at: string | null;
  is_overdue: boolean;
  assigned_to: { id: number; username: string; email: string } | null;
  contact: { id: number; full_name: string; email: string };
  created_at: string;
  updated_at: string;
}

interface ContactOption {
  id: number;
  full_name: string;
  email: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-rose-100 text-rose-700',
};

export default function TasksPage() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  const [taskList, setTaskList] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [overdueFilter, setOverdueFilter] = useState(false);
  const [search, setSearch] = useState('');

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [contactOptions, setContactOptions] = useState<ContactOption[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    contact_id: '' as any,
    status: 'pending',
    priority: 'medium',
    due_date: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [openCombobox, setOpenCombobox] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) fetchTasks();
  }, [isAuthenticated, statusFilter, priorityFilter, overdueFilter]);

  useEffect(() => {
    if (isAuthenticated && dialogOpen && contactOptions.length === 0) {
      fetchContactOptions();
    }
  }, [isAuthenticated, dialogOpen]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter && priorityFilter !== 'all') params.priority = priorityFilter;
      if (overdueFilter) params.overdue = 'true';
      if (search) params.search = search;
      params.page_size = 50;

      const response = await tasksApi.list(params);
      const data = response.data.results || response.data;
      setTaskList(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContactOptions = async () => {
    try {
      const response = await contactsApi.list({ page_size: 300 });
      const data = response.data.results || response.data;
      setContactOptions(data.map((c: any) => ({ id: c.id, full_name: c.full_name, email: c.email })));
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const openCreateDialog = () => {
    setFormData({
      title: '',
      description: '',
      contact_id: '',
      status: 'pending',
      priority: 'medium',
      due_date: '',
    });
    setError('');
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!formData.title.trim() || !formData.contact_id) {
      setError('El título y el contacto son obligatorios');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload: any = {
        title: formData.title,
        description: formData.description,
        contact_id: formData.contact_id,
        status: formData.status,
        priority: formData.priority,
      };
      if (formData.due_date) {
        // Convertir a ISO con hora 12:00 para evitar problemas de zona horaria
        payload.due_date = new Date(formData.due_date + 'T12:00:00').toISOString();
      }
      await tasksApi.create(payload);
      setDialogOpen(false);
      fetchTasks();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Error al crear la tarea';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const quickStatusChange = async (task: Task, newStatus: string) => {
    try {
      await tasksApi.update(task.id, { status: newStatus });
      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40">
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-gray-200/30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 shadow-md">
              <CheckSquare className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
              CRM Service
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => router.push('/dashboard')} className="border-gray-200/60 hover:border-blue-400/50 hover:bg-blue-50/50 rounded-xl">Dashboard</Button>
            <Button variant="outline" onClick={() => router.push('/contacts')} className="border-gray-200/60 hover:border-blue-400/50 hover:bg-blue-50/50 rounded-xl">Contactos</Button>
            <Button variant="outline" onClick={() => router.push('/companies')} className="border-gray-200/60 hover:border-blue-400/50 hover:bg-blue-50/50 rounded-xl">Empresas</Button>
            <Button variant="outline" onClick={() => router.push('/tags')} className="border-gray-200/60 hover:border-blue-400/50 hover:bg-blue-50/50 rounded-xl">Tags</Button>
            <Button variant="outline" onClick={() => router.push('/analytics')} className="border-gray-200/60 hover:border-blue-400/50 hover:bg-blue-50/50 rounded-xl">Analítica</Button>
            <Button variant="ghost" size="sm" onClick={logout} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50/50 rounded-xl">
              <LogOut className="h-4 w-4 mr-1.5" />
              Cerrar sesión
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent tracking-tight">
              Tareas
            </h2>
            <p className="text-sm text-gray-400 font-medium">
              {taskList.length} tareas encontradas
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={openCreateDialog}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 rounded-xl font-semibold"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nueva Tarea
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl max-w-xl overflow-hidden">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-gray-800">Crear Nueva Tarea</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
                    {error}
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-700">Título *</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ej: Llamar para seguimiento"
                    className="border-gray-200/60 rounded-xl h-11"
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
                            className="w-full justify-between h-11 rounded-xl border-gray-200/60 font-normal text-left overflow-hidden"
                        >
                            {formData.contact_id
                            ? contactOptions.find((c) => c.id === formData.contact_id)?.full_name
                            : "Selecciona un contacto..."}
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
                            <Command
                                className="max-h-[320px]"
                                shouldFilter={true}
                                onWheel={(e) => e.stopPropagation()}
                            >
                                <CommandInput placeholder="Buscar contacto..." />
                                <CommandList
                                className="max-h-[280px] overflow-y-auto overscroll-contain"
                                onWheel={(e) => e.stopPropagation()}
                                >
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
                                        <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            formData.contact_id === c.id ? "opacity-100" : "opacity-0"
                                        )}
                                        />
                                        <span className="truncate">
                                        {c.full_name} — {c.email}
                                        </span>
                                    </CommandItem>
                                    ))}
                                </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Descripción</label>
                  <textarea
                    className="flex min-h-[70px] w-full rounded-xl border border-gray-200/60 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <label className="text-sm font-medium text-gray-700">Prioridad</label>
                    <Select
                        value={formData.priority}
                        onValueChange={(v) => setFormData({ ...formData, priority: v })}
                    >
                        <SelectTrigger className="w-full border-gray-200/60 rounded-xl h-11">
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
                    <label className="text-sm font-medium text-gray-700">Fecha límite</label>
                    <Input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      className="border-gray-200/60 rounded-xl h-11"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={saving}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl"
                >
                  {saving ? 'Creando...' : 'Crear tarea'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filtros */}
        <Card className="border border-gray-200/30 shadow-sm rounded-2xl overflow-hidden bg-white/60 backdrop-blur-sm mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-100">
                <Filter className="h-4 w-4 text-blue-600" />
              </div>
              <CardTitle className="text-base font-semibold text-gray-700 tracking-tight">
                Filtrar tareas
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              <Input
                placeholder="Buscar por título, contacto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchTasks()}
                className="w-[280px] border-gray-200/60 rounded-xl h-11"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px] border-gray-200/60 rounded-xl h-11">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="in_progress">En progreso</SelectItem>
                  <SelectItem value="completed">Completada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[150px] border-gray-200/60 rounded-xl h-11">
                  <SelectValue placeholder="Prioridad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="low">Baja</SelectItem>
                </SelectContent>
              </Select>
              <button
                type="button"
                onClick={() => setOverdueFilter(!overdueFilter)}
                className={`flex items-center gap-2 px-3 h-11 rounded-xl border transition-all ${
                  overdueFilter
                    ? 'bg-rose-50 border-rose-300 text-rose-700'
                    : 'bg-white/50 border-gray-200/60 text-gray-600 hover:border-rose-300 hover:bg-rose-50/30'
                }`}
              >
                <AlertTriangle className="h-4 w-4" />
                Solo vencidas
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Tabla */}
        <Card className="border border-gray-200/30 shadow-sm rounded-2xl overflow-hidden bg-white/60 backdrop-blur-sm">
          <CardContent className="pt-6">
            {loading ? (
              <div className="space-y-3 animate-pulse">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-14 bg-gray-100/50 rounded-xl"></div>
                ))}
              </div>
            ) : taskList.length === 0 ? (
              <p className="text-center text-gray-400 py-12 text-sm">No hay tareas registradas</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50/50">
                    <TableRow className="hover:bg-transparent border-gray-200/30">
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase">Tarea</TableHead>
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase hidden md:table-cell">Contacto</TableHead>
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase">Estado</TableHead>
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase">Prioridad</TableHead>
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase hidden lg:table-cell">Vence</TableHead>
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase hidden lg:table-cell">Asignado</TableHead>
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taskList.map((task) => (
                      <TableRow
                        key={task.id}
                        className={`hover:bg-blue-50/40 transition-colors border-gray-200/20 ${
                          task.is_overdue ? 'bg-rose-50/30' : ''
                        }`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {task.is_overdue && <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />}
                            <span className="font-medium text-gray-800">{task.title}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600 hidden md:table-cell">
                          <button
                            onClick={() => router.push(`/contacts/${task.contact.id}`)}
                            className="hover:text-blue-600 hover:underline transition-colors"
                          >
                            {task.contact.full_name}
                          </button>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${STATUS_COLORS[task.status]} border-0 font-medium text-xs`}>
                            {STATUS_LABELS[task.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${PRIORITY_COLORS[task.priority]} border-0 font-medium text-xs`}>
                            {PRIORITY_LABELS[task.priority]}
                          </Badge>
                        </TableCell>
                        <TableCell className={`hidden lg:table-cell text-xs ${task.is_overdue ? 'text-rose-600 font-semibold' : 'text-gray-500'}`}>
                          {formatDate(task.due_date)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-gray-500">
                          {task.assigned_to?.username || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {task.status === 'pending' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => quickStatusChange(task, 'in_progress')}
                                className="h-7 px-2 text-xs hover:bg-amber-50 rounded-lg"
                                title="Marcar en progreso"
                              >
                                <Clock className="h-3.5 w-3.5 text-amber-500" />
                              </Button>
                            )}
                            {task.status !== 'completed' && task.status !== 'cancelled' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => quickStatusChange(task, 'completed')}
                                className="h-7 px-2 text-xs hover:bg-emerald-50 rounded-lg"
                                title="Marcar completada"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                              </Button>
                            )}
                            {task.status !== 'cancelled' && task.status !== 'completed' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => quickStatusChange(task, 'cancelled')}
                                className="h-7 px-2 text-xs hover:bg-gray-50 rounded-lg"
                                title="Cancelar"
                              >
                                <XCircle className="h-3.5 w-3.5 text-gray-400" />
                              </Button>
                            )}
                            {task.status === 'completed' && (
                              <span className="text-xs text-emerald-600 font-medium">Completada</span>
                            )}
                            {task.status === 'cancelled' && (
                              <span className="text-xs text-gray-400 font-medium">Cancelada</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}