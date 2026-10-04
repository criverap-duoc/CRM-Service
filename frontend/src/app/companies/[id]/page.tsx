// frontend\src\app\companies\[id]\page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { companies, contacts } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Globe, MapPin, DollarSign, Users, Activity, TrendingUp, CircleUserRound } from 'lucide-react';

import { TopNavbar } from '@/components/TopNavbar';
interface Company {
  id: number;
  name: string;
  industry: string;
  size: string;
  country: string;
  website: string;
  annual_revenue: number | null;
  notes: string;
  contact_count: number;
  created_at: string;
  updated_at: string;
}

interface HealthData {
  company_id: number;
  company_name: string;
  health_score: number;
  breakdown: {
    contact_count: number;
    interaction_volume: number;
    sentiment_balance: number;
    volume_score: number;
  };
  note?: string;
}

interface ContactLite {
  id: number;
  full_name: string;
  email: string;
  status: string;
  source: string;
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
  startup: 'Startup (1-10)',
  small: 'Pequeña (11-50)',
  medium: 'Mediana (51-200)',
  large: 'Grande (201-1000)',
  enterprise: 'Corporación (1000+)',
};

export default function CompanyDetailPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [companyContacts, setCompanyContacts] = useState<ContactLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && id) {
      fetchCompany();
      fetchHealth();
      fetchContacts();
    }
  }, [isAuthenticated, id]);

  const fetchCompany = async () => {
    try {
      const response = await companies.get(parseInt(id));
      setCompany(response.data);
    } catch (error) {
      console.error('Error fetching company:', error);
      setError('No se pudo cargar la empresa');
    } finally {
      setLoading(false);
    }
  };

  const fetchHealth = async () => {
    try {
      const response = await companies.health(parseInt(id));
      setHealth(response.data);
    } catch (error) {
      console.error('Error fetching health:', error);
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await contacts.list({ company: parseInt(id), page_size: 200 });
      const data = response.data.results || response.data;
      setCompanyContacts(data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 70) return { text: 'text-emerald-600', bg: 'bg-emerald-500', label: 'Saludable' };
    if (score >= 40) return { text: 'text-amber-600', bg: 'bg-amber-500', label: 'En riesgo' };
    return { text: 'text-rose-600', bg: 'bg-rose-500', label: 'Crítico' };
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      lead: 'bg-blue-100 text-blue-700',
      prospect: 'bg-amber-100 text-amber-700',
      customer: 'bg-emerald-100 text-emerald-700',
      churned: 'bg-rose-100 text-rose-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)]">
        <TopNavbar breadcrumb={[{ label: 'Empresas', href: '/companies' }]} />
        <div className="min-h-[60vh] flex items-center justify-center">
          <p className="text-[var(--color-subtle)]">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Empresa no encontrada</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <TopNavbar
        breadcrumb={[
          { label: 'Empresas', href: '/companies' },
          { label: company?.name || 'Cargando...' },
        ]}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}


        {/* Header con nombre y health score */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-ink)]">{company.name}</h2>
            <div className="flex items-center gap-3 mt-1">
              <Badge className="bg-blue-100 text-blue-700 border-0 font-medium">
                {INDUSTRY_LABELS[company.industry] || company.industry}
              </Badge>
              <span className="text-sm text-[var(--color-subtle)]">{SIZE_LABELS[company.size] || company.size}</span>
            </div>
          </div>
        </div>

        {/* Health score destacado */}
        {health && (
          <Card className="mb-6 border border-[var(--color-line)] shadow-sm rounded-2xl bg-[var(--color-surface)]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-md">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-subtle)] font-medium uppercase tracking-wider">Health Score</p>
                    <p className={`text-3xl font-bold ${getHealthColor(health.health_score).text}`}>
                      {health.health_score}
                      <span className="text-base font-medium text-[var(--color-subtle)] ml-1">/ 100</span>
                    </p>
                  </div>
                </div>
                <Badge className={`${getHealthColor(health.health_score).bg} text-white border-0 font-medium px-3 py-1`}>
                  {getHealthColor(health.health_score).label}
                </Badge>
              </div>

              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-6">
                <div
                  className={`h-full ${getHealthColor(health.health_score).bg} transition-all duration-500`}
                  style={{ width: `${health.health_score}%` }}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-gray-50/80 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-3.5 w-3.5 text-[var(--color-subtle)]" />
                    <p className="text-xs text-[var(--color-subtle)]">Contactos</p>
                  </div>
                  <p className="text-lg font-bold text-[var(--color-ink)]">{health.breakdown.contact_count}</p>
                </div>
                <div className="p-3 bg-gray-50/80 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="h-3.5 w-3.5 text-[var(--color-subtle)]" />
                    <p className="text-xs text-[var(--color-subtle)]">Interacciones</p>
                  </div>
                  <p className="text-lg font-bold text-[var(--color-ink)]">{health.breakdown.interaction_volume}</p>
                </div>
                <div className="p-3 bg-gray-50/80 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-3.5 w-3.5 text-[var(--color-subtle)]" />
                    <p className="text-xs text-[var(--color-subtle)]">Balance sentimental</p>
                  </div>
                  <p className="text-lg font-bold text-[var(--color-ink)]">{health.breakdown.sentiment_balance}</p>
                </div>
                <div className="p-3 bg-gray-50/80 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="h-3.5 w-3.5 text-[var(--color-subtle)]" />
                    <p className="text-xs text-[var(--color-subtle)]">Volumen (score)</p>
                  </div>
                  <p className="text-lg font-bold text-[var(--color-ink)]">{health.breakdown.volume_score}</p>
                </div>
              </div>

              {health.note && (
                <p className="text-xs text-[var(--color-subtle)] mt-3 italic">{health.note}</p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Info general */}
          <Card className="lg:col-span-2 border border-[var(--color-line)] shadow-sm rounded-2xl bg-[var(--color-surface)]">
            <CardHeader>
              <CardTitle className="text-[var(--color-ink)]">Información de la Empresa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3 bg-gray-50/80 rounded-lg border border-gray-100">
                  <MapPin className="h-4 w-4 text-[var(--color-subtle)] mt-0.5" />
                  <div>
                    <p className="text-xs text-[var(--color-subtle)]">País</p>
                    <p className="text-sm font-medium text-[var(--color-ink)]">{company.country || '-'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50/80 rounded-lg border border-gray-100">
                  <Globe className="h-4 w-4 text-[var(--color-subtle)] mt-0.5" />
                  <div>
                    <p className="text-xs text-[var(--color-subtle)]">Sitio web</p>
                    {company.website ? (
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-600 hover:underline"
                      >
                        {company.website}
                      </a>
                    ) : (
                      <p className="text-sm font-medium text-[var(--color-ink)]">-</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50/80 rounded-lg border border-gray-100">
                  <DollarSign className="h-4 w-4 text-[var(--color-subtle)] mt-0.5" />
                  <div>
                    <p className="text-xs text-[var(--color-subtle)]">Ingresos anuales</p>
                    <p className="text-sm font-medium text-[var(--color-ink)]">
                      {company.annual_revenue
                        ? `$${company.annual_revenue.toLocaleString('es-CL')} CLP`
                        : '-'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50/80 rounded-lg border border-gray-100">
                  <Users className="h-4 w-4 text-[var(--color-subtle)] mt-0.5" />
                  <div>
                    <p className="text-xs text-[var(--color-subtle)]">Contactos asociados</p>
                    <p className="text-sm font-medium text-[var(--color-ink)]">{company.contact_count}</p>
                  </div>
                </div>
                {company.notes && (
                  <div className="col-span-2 flex items-start gap-3 p-3 bg-gray-50/80 rounded-lg border border-gray-100">
                    <div>
                      <p className="text-xs text-[var(--color-subtle)]">Notas</p>
                      <p className="text-sm text-gray-700">{company.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contactos asociados */}
          <Card className="border border-[var(--color-line)] shadow-sm rounded-2xl bg-[var(--color-surface)]">
            <CardHeader>
              <CardTitle className="text-[var(--color-ink)]">Contactos</CardTitle>
            </CardHeader>
            <CardContent>
              {companyContacts.length === 0 ? (
                <p className="text-[var(--color-subtle)] text-sm">Sin contactos asociados</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                  {companyContacts.map((contact) => (
                    <div
                      key={contact.id}
                      onClick={() => router.push(`/contacts/${contact.id}`)}
                      className="flex items-center justify-between p-3 bg-gray-50/70 rounded-lg cursor-pointer hover:bg-blue-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <CircleUserRound className="h-4 w-4 text-[var(--color-subtle)]" />
                        <div>
                          <p className="text-sm font-medium text-[var(--color-ink)]">{contact.full_name}</p>
                          <p className="text-xs text-[var(--color-subtle)]">{contact.email}</p>
                        </div>
                      </div>
                      <Badge className={`${getStatusColor(contact.status)} border-0 text-xs`}>
                        {contact.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}