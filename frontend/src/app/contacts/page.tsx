// frontend\src\app\contacts\page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { contacts } from '@/lib/api-client';
import { analytics } from '@/lib/analytics-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Eye, Download, Filter, LogOut } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';


interface Contact {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  company: string;
  tags: Tag[];
  status: string;
  source: string;
  assigned_to: { id: number; username: string } | null;
  created_at: string;
}

interface Tag {
  id: number;
  name: string;
  color: string;
}

export default function ContactsPage() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [contactList, setContactList] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [ordering, setOrdering] = useState('-created_at');
  const [pageSize, setPageSize] = useState('10');
  const [leadScores, setLeadScores] = useState<Record<number, any>>({});

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchContacts();
    }
  }, [isAuthenticated, statusFilter, sourceFilter, ordering, pageSize]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (sourceFilter && sourceFilter !== 'all') params.source = sourceFilter;
      if (ordering) params.ordering = ordering;
      if (pageSize) params.page_size = pageSize;
      
      const response = await contacts.list(params);
      const data = response.data.results || response.data;
      setContactList(data);
      
      // Cargar lead scores
      const scores: Record<number, any> = {};
      for (const contact of data) {
        try {
          const scoreRes = await analytics.getLeadScore(contact.id);
          scores[contact.id] = scoreRes.data;
        } catch (e) {
          // Ignorar
        }
      }
      setLeadScores(scores);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchContacts();
  };

  const handleExport = async (type: 'contacts' | 'interactions') => {
    try {
      const token = localStorage.getItem('access_token');
      const url = type === 'contacts' 
        ? 'http://localhost:8000/api/v3/export/contacts/'
        : 'http://localhost:8000/api/v3/export/interactions/';
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = type === 'contacts' ? 'contactos.csv' : 'interacciones.csv';
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error exporting:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      lead: 'bg-blue-100 text-blue-700 border-blue-200',
      prospect: 'bg-amber-100 text-amber-700 border-amber-200',
      customer: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      churned: 'bg-rose-100 text-rose-700 border-rose-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'bg-emerald-100 text-emerald-700';
    if (score >= 40) return 'bg-amber-100 text-amber-700';
    return 'bg-rose-100 text-rose-700';
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

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <nav className="sticky top-0 z-50 bg-[var(--color-surface)] border-b border-[var(--color-line)] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 shadow-md">
              <Filter className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              CRM Service
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => router.push('/dashboard')} className="border-[var(--color-line)] hover:border-blue-400/50 hover:bg-blue-50/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-medium text-gray-700 rounded-xl">
              Dashboard
            </Button>
            <Button variant="ghost" onClick={() => router.push('/contacts')} className="text-[var(--color-brand)] font-medium bg-[var(--color-brand)]/8 hover:bg-[var(--color-brand)]/12">
              Contactos
            </Button>
            <Button variant="outline" onClick={() => router.push('/analytics')} className="border-[var(--color-line)] hover:border-blue-400/50 hover:bg-blue-50/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-medium text-gray-700 rounded-xl">
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              Contactos
            </h2>
            <p className="text-sm text-[var(--color-subtle)] font-medium">
              {contactList.length} contactos encontrados
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => handleExport('contacts')}
              className="border-[var(--color-line)] hover:border-blue-400/50 hover:bg-blue-50/50 transition-all rounded-xl"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 rounded-xl font-semibold">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Contacto
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-[var(--color-ink)]">Crear Nuevo Contacto</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-[var(--color-subtle)]">Próximamente: formulario de creación</p>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filtros */}
        <Card className="border border-[var(--color-line)] shadow-sm rounded-2xl overflow-hidden bg-[var(--color-surface)] mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-100">
                <Filter className="h-4 w-4 text-blue-600" />
              </div>
              <CardTitle className="text-base font-semibold text-gray-700 tracking-tight">
                Buscar y filtrar contactos
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              <Input
                placeholder="Buscar por nombre, email o empresa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-[303px] border-[var(--color-line)] focus:border-blue-400/50 focus:ring-4 focus:ring-blue-400/10 transition-all rounded-xl bg-white/50 backdrop-blur-sm h-11"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px] border-[var(--color-line)] rounded-xl h-11">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="churned">Churned</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[160px] border-[var(--color-line)] rounded-xl h-11">
                  <SelectValue placeholder="Fuente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las fuentes</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="meta_ads">Meta Ads</SelectItem>
                  <SelectItem value="organic">Organic</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                </SelectContent>
              </Select>
              <Select value={ordering} onValueChange={setOrdering}>
                <SelectTrigger className="w-[170px] border-[var(--color-line)] rounded-xl h-11">
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-created_at">Más recientes</SelectItem>
                  <SelectItem value="created_at">Más antiguos</SelectItem>
                  <SelectItem value="last_name">Apellido (A-Z)</SelectItem>
                  <SelectItem value="-last_name">Apellido (Z-A)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={pageSize} onValueChange={setPageSize}>
                <SelectTrigger className="w-[150px] border-[var(--color-line)] rounded-xl h-11">
                  <SelectValue placeholder="Por página" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 por página</SelectItem>
                  <SelectItem value="10">10 por página</SelectItem>
                  <SelectItem value="20">20 por página</SelectItem>
                  <SelectItem value="50">50 por página</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between border-t border-[var(--color-line)] pt-4 mt-4">
              <p className="text-xs text-[var(--color-subtle)] font-medium">
                {contactList.length} contactos encontrados
              </p>
              <Button 
                onClick={handleSearch} 
                className="bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] transition-all rounded-xl shadow-md hover:shadow-lg"
              >
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabla */}
        <Card className="border border-[var(--color-line)] shadow-sm rounded-2xl overflow-hidden bg-[var(--color-surface)]">
          <CardContent className="pt-6">
            {loading ? (
              <div className="space-y-3 animate-pulse">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-100/50 rounded-xl">
                    <div className="space-y-1.5">
                      <div className="h-4 w-32 bg-gray-200 rounded"></div>
                      <div className="h-3 w-48 bg-gray-200 rounded"></div>
                    </div>
                    <div className="h-5 w-16 bg-gray-200 rounded-full"></div>
                  </div>
                ))}
              </div>
            ) : contactList.length === 0 ? (
              <p className="text-center text-[var(--color-subtle)] py-12 text-sm">No hay contactos registrados</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50/50">
                    <TableRow className="hover:bg-transparent border-[var(--color-line)]">
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">Nombre</TableHead>
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">Email</TableHead>
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider hidden md:table-cell">Empresa</TableHead>
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">Estado</TableHead>
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">Lead Score</TableHead>
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider hidden lg:table-cell">Fuente</TableHead>
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider hidden lg:table-cell">Tags</TableHead>
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contactList.map((contact) => (
                      <TableRow key={contact.id} className="hover:bg-blue-50/40 transition-colors duration-150 cursor-pointer border-gray-200/20">
                        <TableCell className="font-medium text-[var(--color-ink)]">{contact.full_name}</TableCell>
                        <TableCell className="text-gray-600">{contact.email}</TableCell>
                        <TableCell className="text-[var(--color-subtle)] hidden md:table-cell">{contact.company || '-'}</TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(contact.status)} border font-medium rounded-full px-2.5 py-0.5 text-xs`}>
                            {contact.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {leadScores[contact.id] ? (
                            <Badge className={`${getScoreColor(leadScores[contact.id].lead_score)} border-0 font-medium text-xs`}>
                              {leadScores[contact.id].lead_score}
                            </Badge>
                          ) : (
                            <span className="text-xs text-[var(--color-subtle)]">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-xs text-[var(--color-subtle)] font-medium">{contact.source}</span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {contact.tags && contact.tags.length > 0 ? (
                              contact.tags.map((tag) => (
                                <span
                                  key={tag.id}
                                  className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                                  style={{ backgroundColor: tag.color }}
                                >
                                  {tag.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/contacts/${contact.id}`)}
                            className="hover:bg-blue-100/50 rounded-xl transition-all duration-200"
                          >
                            <Eye className="h-4 w-4 text-[var(--color-subtle)] hover:text-blue-600 transition-colors" />
                          </Button>
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