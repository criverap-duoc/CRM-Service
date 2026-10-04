'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { tags as tagsApi } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Tag as TagIcon, LogOut } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';


interface Tag {
  id: number;
  name: string;
  color: string;
  description: string;
  created_at: string;
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#94a3b8',
];

export default function TagsPage() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [tagList, setTagList] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [formData, setFormData] = useState({ name: '', color: '#6366f1', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTags();
    }
  }, [isAuthenticated]);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const response = await tagsApi.list({ page_size: 100 });
      const data = response.data.results || response.data;
      setTagList(data);
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingTag(null);
    setFormData({ name: '', color: '#6366f1', description: '' });
    setError('');
    setDialogOpen(true);
  };

  const openEditDialog = (tag: Tag) => {
    setEditingTag(tag);
    setFormData({ name: tag.name, color: tag.color, description: tag.description });
    setError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editingTag) {
        await tagsApi.update(editingTag.id, formData);
      } else {
        await tagsApi.create(formData);
      }
      setDialogOpen(false);
      fetchTags();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.name?.[0] || 'Error al guardar';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tag: Tag) => {
    if (!confirm(`¿Eliminar el tag "${tag.name}"? Esto lo quitará de todos los contactos.`)) {
      return;
    }
    try {
      await tagsApi.delete(tag.id);
      fetchTags();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Error al eliminar');
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <nav className="sticky top-0 z-50 bg-[var(--color-surface)] border-b border-[var(--color-line)] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 shadow-md">
              <TagIcon className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              CRM Service
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => router.push('/dashboard')} className="border-[var(--color-line)] hover:border-blue-400/50 hover:bg-blue-50/50 rounded-xl">
              Dashboard
            </Button>
            <Button variant="outline" onClick={() => router.push('/contacts')} className="border-[var(--color-line)] hover:border-blue-400/50 hover:bg-blue-50/50 rounded-xl">
              Contactos
            </Button>
            <Button variant="outline" onClick={() => router.push('/analytics')} className="border-[var(--color-line)] hover:border-blue-400/50 hover:bg-blue-50/50 rounded-xl">
              Analítica
            </Button>
            <Button variant="outline" onClick={() => router.push('/companies')} className="border-[var(--color-line)] hover:border-blue-400/50 hover:bg-blue-50/50 rounded-xl">
              Empresas
            </Button>
            <Button variant="ghost" onClick={() => router.push('/tags')} className="text-[var(--color-brand)] font-medium bg-[var(--color-brand)]/8 hover:bg-[var(--color-brand)]/12 hover:text-[var(--color-brand)]">
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

            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-rose-500 hover:text-rose-600 hover:bg-rose-50/50 rounded-xl"
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              Cerrar sesión
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              Tags
            </h2>
            <p className="text-sm text-[var(--color-subtle)] font-medium">
              {tagList.length} tags registrados
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={openCreateDialog}
                className="bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 rounded-xl font-semibold"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Tag
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-[var(--color-ink)]">
                  {editingTag ? 'Editar Tag' : 'Crear Nuevo Tag'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
                    {error}
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-700">Nombre</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: VIP, Pyme, Frío"
                    className="border-[var(--color-line)] focus:border-blue-400/50 focus:ring-4 focus:ring-blue-400/10 rounded-xl h-11"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Descripción (opcional)</label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Breve descripción del tag"
                    className="border-[var(--color-line)] focus:border-blue-400/50 focus:ring-4 focus:ring-blue-400/10 rounded-xl h-11"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: c })}
                        className={`w-8 h-8 rounded-full transition-all ${
                          formData.color === c
                            ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                            : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: c }}
                        aria-label={`Color ${c}`}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Vista previa</label>
                  <Badge
                    className="border-0 font-medium px-3 py-1 text-white"
                    style={{ backgroundColor: formData.color }}
                  >
                    {formData.name || 'Nombre del tag'}
                  </Badge>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-[var(--color-brand)] rounded-xl"
                >
                  {saving ? 'Guardando...' : editingTag ? 'Guardar cambios' : 'Crear tag'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border border-[var(--color-line)] shadow-sm rounded-2xl overflow-hidden bg-[var(--color-surface)]">
          <CardContent className="pt-6">
            {tagList.length === 0 ? (
              <p className="text-center text-[var(--color-subtle)] py-12 text-sm">No hay tags registrados</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {tagList.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-4 bg-gray-50/70 rounded-xl border border-gray-100 hover:border-blue-200/50 hover:bg-white/80 transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Badge
                        className="border-0 font-medium px-3 py-1 text-white shrink-0"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.name}
                      </Badge>
                      {tag.description && (
                        <span className="text-xs text-[var(--color-subtle)] truncate">
                          {tag.description}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(tag)}
                        className="h-8 w-8 p-0 hover:bg-blue-100/50 rounded-lg"
                      >
                        <Pencil className="h-3.5 w-3.5 text-[var(--color-subtle)]" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(tag)}
                        className="h-8 w-8 p-0 hover:bg-rose-100/50 rounded-lg"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                      </Button>
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