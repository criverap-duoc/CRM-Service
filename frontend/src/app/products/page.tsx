'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { useAuth } from '@/context/AuthContext';
import { products as productsApi } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Package, Plus, Pencil, Trash2, LogOut, Filter } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';


interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  unit_price: number;
  description: string;
  active: boolean;
  interested_count: number;
  created_at: string;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  software: { bg: 'bg-blue-100', text: 'text-blue-700' },
  hardware: { bg: 'bg-slate-100', text: 'text-slate-700' },
  service: { bg: 'bg-violet-100', text: 'text-violet-700' },
  training: { bg: 'bg-amber-100', text: 'text-amber-700' },
  other: { bg: 'bg-gray-100', text: 'text-gray-700' },
};

interface ApiErrorResponse {
  error?: { message?: string };
  name?: string[];
}

const getErrorMessage = (err: unknown, fallback: string): string => {
  if (isAxiosError(err)) {
    const data = err.response?.data as ApiErrorResponse | undefined;
    return data?.error?.message || data?.name?.[0] || fallback;
  }
  return fallback;
};

export default function ProductsPage() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [productList, setProductList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'software',
    unit_price: 0,
    description: '',
    active: true,
  });
  const [saving, setSaving] = useState(false);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);

  // Bumping this re-runs the fetch effect after create/update/delete
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    const loadProducts = async () => {
      try {
        const params: Record<string, string | number | boolean> = { page_size: 100 };
        if (categoryFilter) params.category = categoryFilter;
        if (activeOnly) params.active = true;

        const response = await productsApi.list(params);
        if (cancelled) return;

        const data = (response.data.results ?? response.data ?? []) as Product[];
        // Normaliza: la API entrega unit_price como string y el listado no
        // incluye description (se completa al abrir el diálogo de edición).
        setProductList(
          data.map((p) => ({
            ...p,
            unit_price: Number(p.unit_price ?? 0),
            description: p.description ?? '',
            interested_count: p.interested_count ?? 0,
          }))
        );
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProducts();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, categoryFilter, activeOnly, refreshKey]);

  const openCreateDialog = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: '',
      category: 'software',
      unit_price: 0,
      description: '',
      active: true,
    });
    setError('');
    setDialogOpen(true);
  };

  const openEditDialog = async (product: Product) => {
    setError('');
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      category: product.category,
      unit_price: product.unit_price,
      description: product.description ?? '',
      active: product.active,
    });
    setDialogOpen(true);

    // El listado no incluye `description`; se obtiene el detalle completo.
    try {
      const response = await productsApi.get(product.id);
      const full = response.data as Product;
      setFormData({
        name: full.name,
        sku: full.sku,
        category: full.category,
        unit_price: Number(full.unit_price ?? 0),
        description: full.description ?? '',
        active: full.active,
      });
    } catch (error) {
      console.error('Error fetching product detail:', error);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    if (!formData.sku.trim()) {
      setError('El SKU es obligatorio');
      return;
    }
    if (formData.unit_price < 0) {
      setError('El precio debe ser mayor o igual a cero');
      return;
    }
    
    setSaving(true);
    setError('');
    try {
      if (editingProduct) {
        await productsApi.update(editingProduct.id, formData);
      } else {
        await productsApi.create(formData);
      }
      setDialogOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(getErrorMessage(err, 'Error al guardar'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`¿Eliminar el producto "${product.name}"?`)) {
      return;
    }
    try {
      await productsApi.delete(product.id);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(getErrorMessage(err, 'Error al eliminar'));
    }
  };

  // Format price as CLP
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(price);
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  // Filter products
  const filteredProducts = productList.filter(product => {
    if (categoryFilter && product.category !== categoryFilter) return false;
    if (activeOnly && !product.active) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-gray-200/30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 shadow-md">
              <Package className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              CRM Service
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => router.push('/dashboard')} className="border-gray-200/60 hover:border-blue-400/50 hover:bg-blue-50/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-medium text-gray-700 rounded-xl">
              Dashboard
            </Button>
            <Button variant="outline" onClick={() => router.push('/contacts')} className="border-gray-200/60 hover:border-blue-400/50 hover:bg-blue-50/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-medium text-gray-700 rounded-xl">
              Contactos
            </Button>
            <Button variant="outline" onClick={() => router.push('/analytics')} className="border-gray-200/60 hover:border-blue-400/50 hover:bg-blue-50/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-medium text-gray-700 rounded-xl">
              Analítica
            </Button>
            <Button variant="outline" onClick={() => router.push('/companies')} className="border-gray-200/60 hover:border-blue-400/50 hover:bg-blue-50/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-medium text-gray-700 rounded-xl">
              Empresas
            </Button>
            <Button variant="outline" onClick={() => router.push('/tags')} className="border-gray-200/60 hover:border-blue-400/50 hover:bg-blue-50/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-medium text-gray-700 rounded-xl">
              Tags
            </Button>
            <Button variant="outline" onClick={() => router.push('/tasks')} className="border-gray-200/60 hover:border-blue-400/50 hover:bg-blue-50/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-medium text-gray-700 rounded-xl">
              Tareas
            </Button>
            <Button variant="outline" onClick={() => router.push('/products')} className="border-blue-400/50 hover:border-blue-400/50 hover:bg-blue-50/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-medium text-gray-700 rounded-xl bg-blue-50">
              Productos
            </Button>
            <Button variant="outline" onClick={() => router.push('/opportunities')} className="border-gray-200/60 hover:border-blue-400/50 hover:bg-blue-50/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-medium text-gray-700 rounded-xl">
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
        {/* Header + Filtros */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              Productos
            </h2>
            <p className="text-sm text-gray-400 font-medium">
              {filteredProducts.length} productos registrados
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={categoryFilter || 'all'} onValueChange={(value) => setCategoryFilter(value === 'all' ? '' : value)}>
              <SelectTrigger className="w-[180px] border-gray-200/60 rounded-xl h-11 bg-white/50 backdrop-blur-sm">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                <SelectItem value="software">Software</SelectItem>
                <SelectItem value="hardware">Hardware</SelectItem>
                <SelectItem value="service">Servicio</SelectItem>
                <SelectItem value="training">Capacitación</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={activeOnly ? 'default' : 'outline'}
              onClick={() => setActiveOnly((prev) => !prev)}
              className={activeOnly
                ? 'rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md'
                : 'border-gray-200/60 hover:border-blue-400/50 hover:bg-blue-50/50 rounded-xl text-gray-700'}
            >
              <Filter className="h-4 w-4 mr-2" />
              Solo activos
            </Button>
            <Button
              onClick={openCreateDialog}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 rounded-xl font-semibold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Producto
            </Button>
          </div>
        </div>

        {/* Dialog Crear/Editar */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="rounded-2xl sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800">
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Nombre</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Nombre del producto"
                  className="border-gray-200/60 rounded-xl h-11 focus:border-blue-400/50 focus:ring-4 focus:ring-blue-400/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">SKU</label>
                <Input
                  value={formData.sku}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sku: e.target.value }))}
                  placeholder="SKU"
                  className="border-gray-200/60 rounded-xl h-11 focus:border-blue-400/50 focus:ring-4 focus:ring-blue-400/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Categoría</label>
                <Select value={formData.category} onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}>
                  <SelectTrigger className="border-gray-200/60 rounded-xl h-11">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="software">Software</SelectItem>
                    <SelectItem value="hardware">Hardware</SelectItem>
                    <SelectItem value="service">Servicio</SelectItem>
                    <SelectItem value="training">Capacitación</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Precio unitario (CLP)</label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.unit_price}
                  onChange={(e) => setFormData((prev) => ({ ...prev, unit_price: Number(e.target.value) || 0 }))}
                  className="border-gray-200/60 rounded-xl h-11 focus:border-blue-400/50 focus:ring-4 focus:ring-blue-400/10"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Descripción</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción del producto"
                  className="border-gray-200/60 rounded-xl focus:border-blue-400/50 focus:ring-4 focus:ring-blue-400/10"
                />
              </div>
              <div className="flex items-center gap-2 md:col-span-2">
                <input
                  id="product-active"
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData((prev) => ({ ...prev, active: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400/30"
                />
                <label htmlFor="product-active" className="text-sm font-medium text-gray-700">
                  Activo
                </label>
              </div>
            </div>

            {error ? <p className="text-sm text-rose-600">{error}</p> : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md"
              >
                {saving ? 'Guardando...' : editingProduct ? 'Guardar cambios' : 'Crear producto'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Grid de productos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <p className="col-span-full text-center text-gray-400 py-12 text-sm">Cargando productos...</p>
          ) : filteredProducts.length === 0 ? (
            <p className="col-span-full text-center text-gray-400 py-12 text-sm">No hay productos registrados</p>
          ) : (
            filteredProducts.map((product) => {
              const colors = CATEGORY_COLORS[product.category] || CATEGORY_COLORS.other;
              return (
                <Card
                  key={product.id}
                  className="group relative overflow-hidden border border-gray-200/30 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 rounded-2xl bg-white/60 backdrop-blur-sm"
                >
                  <CardContent className="p-5">
                    {/* Hover actions */}
                    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(product)}
                        className="h-8 w-8 p-0 hover:bg-blue-100/50 rounded-lg"
                      >
                        <Pencil className="h-3.5 w-3.5 text-gray-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(product)}
                        className="h-8 w-8 p-0 hover:bg-rose-100/50 rounded-lg"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                      </Button>
                    </div>

                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-md shrink-0">
                        <Package className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0 flex-1 pr-14">
                        <h3 className="font-semibold text-gray-800 truncate tracking-tight">{product.name}</h3>
                        <p className="text-xs text-gray-400 font-mono truncate">{product.sku}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <Badge className={`border-0 font-medium rounded-full px-2.5 py-0.5 text-xs ${colors.bg} ${colors.text}`}>
                        {product.category}
                      </Badge>
                      {!product.active && (
                        <Badge className="border-0 font-medium rounded-full px-2.5 py-0.5 text-xs bg-gray-100 text-gray-500">
                          Inactivo
                        </Badge>
                      )}
                    </div>

                    <p className="text-lg font-bold text-gray-800 tracking-tight mb-1">
                      {formatPrice(product.unit_price)}
                    </p>
                    <p className="text-xs text-gray-400 font-medium">
                      {product.interested_count} {product.interested_count === 1 ? 'interesado' : 'interesados'}
                    </p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>


      </main>

    </div>
  );
}
