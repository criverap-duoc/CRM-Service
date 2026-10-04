'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { companies } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Eye, Plus } from 'lucide-react';
import { TopNavbar } from '@/components/TopNavbar';


interface Company {
  id: number;
  name: string;
  industry: string;
  size: string;
  country: string;
  contact_count: number;
  created_at: string;
}

const INDUSTRY_LABELS: Record<string, string> = {
  technology: 'Tecnología',
  retail: 'Retail',
  finance: 'Finanzas',
  health: 'Salud',
  education: 'Educación',
  manufacturing: 'Manufactura',
  services: 'Servicios',
  other: 'Otra',
};

const SIZE_LABELS: Record<string, string> = {
  startup: 'Startup',
  small: 'Pequeña',
  medium: 'Mediana',
  large: 'Grande',
  enterprise: 'Corporación',
};

export default function CompaniesPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [companyList, setCompanyList] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCompanies();
    }
  }, [isAuthenticated, industryFilter, sizeFilter]);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (industryFilter && industryFilter !== 'all') params.industry = industryFilter;
      if (sizeFilter && sizeFilter !== 'all') params.size = sizeFilter;

      const response = await companies.list(params);
      const data = response.data.results || response.data;
      setCompanyList(data);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
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

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <TopNavbar breadcrumb={[{ label: 'Empresas' }]} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              Empresas
            </h2>
            <p className="text-sm text-[var(--color-subtle)] font-medium">
              {companyList.length} empresas encontradas
            </p>
          </div>
          <Button className="bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 rounded-xl font-semibold">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Empresa
          </Button>
        </div>

        <Card className="border border-[var(--color-line)] shadow-sm rounded-2xl overflow-hidden bg-[var(--color-surface)] mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-100">
                <Filter className="h-4 w-4 text-blue-600" />
              </div>
              <CardTitle className="text-base font-semibold text-gray-700 tracking-tight">
                Buscar y filtrar empresas
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              <Input
                placeholder="Buscar por nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchCompanies()}
                className="w-[300px] border-[var(--color-line)] focus:border-blue-400/50 focus:ring-4 focus:ring-blue-400/10 transition-all rounded-xl bg-white/50 backdrop-blur-sm h-11"
              />
              <Select value={industryFilter} onValueChange={setIndustryFilter}>
                <SelectTrigger className="w-[180px] border-[var(--color-line)] rounded-xl h-11">
                  <SelectValue placeholder="Industria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las industrias</SelectItem>
                  <SelectItem value="technology">Tecnología</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="finance">Finanzas</SelectItem>
                  <SelectItem value="health">Salud</SelectItem>
                  <SelectItem value="education">Educación</SelectItem>
                  <SelectItem value="manufacturing">Manufactura</SelectItem>
                  <SelectItem value="services">Servicios</SelectItem>
                  <SelectItem value="other">Otra</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sizeFilter} onValueChange={setSizeFilter}>
                <SelectTrigger className="w-[160px] border-[var(--color-line)] rounded-xl h-11">
                  <SelectValue placeholder="Tamaño" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tamaños</SelectItem>
                  <SelectItem value="startup">Startup</SelectItem>
                  <SelectItem value="small">Pequeña</SelectItem>
                  <SelectItem value="medium">Mediana</SelectItem>
                  <SelectItem value="large">Grande</SelectItem>
                  <SelectItem value="enterprise">Corporación</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between border-t border-[var(--color-line)] pt-4 mt-4">
              <p className="text-xs text-[var(--color-subtle)] font-medium">
                {companyList.length} empresas encontradas
              </p>
              <Button
                onClick={fetchCompanies}
                className="bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] transition-all rounded-xl shadow-md hover:shadow-lg"
              >
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
            </div>
          </CardContent>
        </Card>

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
            ) : companyList.length === 0 ? (
              <p className="text-center text-[var(--color-subtle)] py-12 text-sm">No hay empresas registradas</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50/50">
                    <TableRow className="hover:bg-transparent border-[var(--color-line)]">
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">Nombre</TableHead>
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">Industria</TableHead>
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">Tamaño</TableHead>
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider hidden md:table-cell">País</TableHead>
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">Contactos</TableHead>
                      <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companyList.map((company) => (
                      <TableRow
                        key={company.id}
                        className="hover:bg-blue-50/40 transition-colors duration-150 cursor-pointer border-gray-200/20"
                      >
                        <TableCell className="font-medium text-[var(--color-ink)]">{company.name}</TableCell>
                        <TableCell>
                          <Badge className="bg-blue-100 text-blue-700 border-0 font-medium text-xs">
                            {INDUSTRY_LABELS[company.industry] || company.industry}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-[var(--color-subtle)] font-medium">
                            {SIZE_LABELS[company.size] || company.size}
                          </span>
                        </TableCell>
                        <TableCell className="text-[var(--color-subtle)] hidden md:table-cell">
                          {company.country || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-indigo-100 text-indigo-700 border-0 font-medium text-xs">
                            {company.contact_count}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/companies/${company.id}`)}
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