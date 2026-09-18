'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { contacts } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Eye, Sparkles, LogOut } from 'lucide-react';
import { analytics } from '@/lib/analytics-client';

interface Contact {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  company: string;
  status: string;
  source: string;
  assigned_to: { id: number; username: string } | null;
  created_at: string;
}

export default function ContactsPage() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [contactList, setContactList] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
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
  }, [isAuthenticated]);

  const fetchContacts = async () => {
    try {
      const params: any = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      
      const response = await contacts.list(params);
      const data = response.data.results || response.data;
      setContactList(data);
      
      // Cargar lead scores para cada contacto
      const scores: Record<number, any> = {};
      for (const contact of data) {
        try {
          const scoreRes = await analytics.getLeadScore(contact.id);
          scores[contact.id] = scoreRes.data;
        } catch (e) {
          // Ignorar errores
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      lead: 'bg-blue-100 text-blue-700 border-blue-200',
      prospect: 'bg-amber-100 text-amber-700 border-amber-200',
      customer: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      churned: 'bg-rose-100 text-rose-700 border-rose-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
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
              onClick={() => router.push('/dashboard')}
              className="border-gray-200/60 hover:border-blue-400/50 hover:bg-blue-50/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-medium text-gray-700 rounded-xl"
            >
              Dashboard
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent tracking-tight">
              Contactos
            </h2>
            <p className="text-sm text-gray-400 font-medium">
              {contactList.length} contactos encontrados
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 rounded-xl font-semibold">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Contacto
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-gray-800">Crear Nuevo Contacto</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-gray-400">Próximamente: formulario de creación</p>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search Card */}
        <Card className="border border-gray-200/30 shadow-sm rounded-2xl overflow-hidden bg-white/60 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-600 tracking-tight">Buscar Contactos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por nombre, email o empresa..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="border-gray-200/60 focus:border-blue-400/50 focus:ring-4 focus:ring-blue-400/10 transition-all rounded-xl bg-white/50 backdrop-blur-sm h-11"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px] border-gray-200/60 rounded-xl h-11">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="churned">Churned</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleSearch} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 rounded-xl h-11">
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table Card */}
        <Card className="mt-6 border border-gray-200/30 shadow-sm rounded-2xl overflow-hidden bg-white/60 backdrop-blur-sm">
          <CardContent className="pt-6">
            {loading ? (
              <div className="space-y-3 animate-pulse">
                {[...Array(4)].map((_, i) => (
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
            ) : contactList.length === 0 ? (
              <p className="text-center text-gray-400 py-12 text-sm">No hay contactos registrados</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50/50">
                    <TableRow className="hover:bg-transparent border-gray-200/30">
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">Nombre</TableHead>
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">Email</TableHead>
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider hidden md:table-cell">Empresa</TableHead>
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">Estado</TableHead>
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">Lead Score</TableHead>
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider hidden lg:table-cell">Fuente</TableHead>
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contactList.map((contact) => (
                      <TableRow key={contact.id} className="hover:bg-blue-50/40 transition-colors duration-150 cursor-pointer border-gray-200/20">
                        <TableCell className="font-medium text-gray-800">{contact.full_name}</TableCell>
                        <TableCell className="text-gray-600">{contact.email}</TableCell>
                        <TableCell className="text-gray-500 hidden md:table-cell">{contact.company || '-'}</TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(contact.status)} border font-medium rounded-full px-2.5 py-0.5 text-xs`}>
                            {contact.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {leadScores[contact.id] ? (
                            <Badge className={`${
                              leadScores[contact.id].lead_score >= 70 ? 'bg-emerald-100 text-emerald-700' :
                              leadScores[contact.id].lead_score >= 40 ? 'bg-amber-100 text-amber-700' :
                              'bg-rose-100 text-rose-700'
                            } border-0 font-medium text-xs`}>
                              {leadScores[contact.id].lead_score}
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-xs text-gray-400 font-medium">{contact.source}</span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/contacts/${contact.id}`)}
                            className="hover:bg-blue-100/50 rounded-xl transition-all duration-200"
                          >
                            <Eye className="h-4 w-4 text-gray-400 hover:text-blue-600 transition-colors" />
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