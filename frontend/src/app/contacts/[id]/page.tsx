'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { contacts, interactions, integrations } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Save, Sparkles, Mail, Phone, Building, User, TrendingUp } from 'lucide-react';
import { analytics } from '@/lib/analytics-client';

interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  company: string;
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
  const [summary, setSummary] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [leadScore, setLeadScore] = useState<any>(null);
  const [sentimentMap, setSentimentMap] = useState<Record<number, any>>({});

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

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await contacts.update(parseInt(id), formData);
      setEditing(false);
      fetchContact();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleSummarize = async () => {
    if (!contact) return;
    setSummarizing(true);
    try {
      const response = await integrations.summarize(parseInt(id));
      setSummary(response.data.summary);
    } catch (error) {
      setError('Error al generar resumen con IA');
    } finally {
      setSummarizing(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      lead: 'bg-blue-100 text-blue-800 border-0 font-medium',
      prospect: 'bg-yellow-100 text-yellow-800 border-0 font-medium',
      customer: 'bg-green-100 text-green-800 border-0 font-medium',
      churned: 'bg-red-100 text-red-800 border-0 font-medium',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-0 font-medium';
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40">
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold cursor-pointer" onClick={() => router.push('/dashboard')}>
            CRM Service
          </h1>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.push('/contacts')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <span onClick={() => router.push('/contacts')} className="hover:text-blue-600 cursor-pointer transition-colors">
            Contactos
          </span>
          <span>/</span>
          <span className="text-gray-800 font-medium">{contact.full_name}</span>
        </div>
        {leadScore && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-md">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Lead Score</p>
            <p className="text-2xl font-bold text-blue-600">{leadScore.lead_score}</p>
          </div>
          <Badge className="ml-auto bg-blue-100 text-blue-700 border-blue-200">
            {leadScore.label}
          </Badge>
        </div>
      )}

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{contact.full_name}</h2>
            <p className="text-gray-500">{contact.email}</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => alert('La integración con IA estará disponible en la próxima versión')}
              className="border-blue-200 hover:bg-blue-50 transition-colors"
            >
              <Sparkles className="h-4 w-4 mr-2 text-blue-500" />
              Resumen con IA
            </Button>
            <Button 
              variant={editing ? 'default' : 'outline'} 
              onClick={() => setEditing(!editing)}
              className={editing ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'border-gray-300'}
            >
              {editing ? 'Cancelar' : 'Editar'}
            </Button>
          </div>
        </div>

        {summary && (
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-sm">
            <CardContent className="pt-4">
              <p className="text-sm text-gray-600 font-medium">Resumen generado por IA:</p>
              <p className="text-gray-800">{summary}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border border-gray-200/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-800">Información del Contacto</CardTitle>
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
                      onChange={(e: any) => setFormData({ ...formData, company: e.target.value })}
                      className="border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all"
                    />
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
                  <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg">
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-3 bg-gray-50/80 rounded-lg border border-gray-100">
                    <User className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Nombre completo</p>
                      <p className="text-sm font-medium text-gray-800">{contact.full_name}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50/80 rounded-lg border border-gray-100">
                    <Mail className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-sm font-medium text-gray-800">{contact.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50/80 rounded-lg border border-gray-100">
                    <Phone className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Teléfono</p>
                      <p className="text-sm font-medium text-gray-800">{contact.phone || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50/80 rounded-lg border border-gray-100">
                    <Building className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Empresa</p>
                      <p className="text-sm font-medium text-gray-800">{contact.company || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50/80 rounded-lg border border-gray-100 col-span-2">
                    <div>
                      <p className="text-xs text-gray-500">Notas</p>
                      <p className="text-sm text-gray-700">{contact.notes || 'Sin notas'}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border border-gray-200/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-800">Estado</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className={getStatusColor(contact.status)}>
                  {contact.status}
                </Badge>
                <div className="mt-4 space-y-1 text-sm">
                  <p className="text-gray-500">
                    <span className="font-medium text-gray-700">Creado:</span> {new Date(contact.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-gray-500">
                    <span className="font-medium text-gray-700">Actualizado:</span> {new Date(contact.updated_at).toLocaleDateString()}
                  </p>
                  <p className="text-gray-500">
                    <span className="font-medium text-gray-700">Interacciones:</span> {contact.interaction_count}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-800">Interacciones</CardTitle>
              </CardHeader>
              <CardContent>
                {interactionList.length === 0 ? (
                  <p className="text-gray-500 text-sm">Sin interacciones registradas</p>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {interactionList.map((interaction) => {
                      const sentiment = sentimentMap[interaction.id];
                      const sentimentColor = sentiment?.label === 'positive' ? 'border-emerald-400' :
                                            sentiment?.label === 'negative' ? 'border-rose-400' :
                                            'border-blue-400';
                      const sentimentBadge = sentiment?.label === 'positive' ? 'bg-emerald-100 text-emerald-700' :
                                            sentiment?.label === 'negative' ? 'bg-rose-100 text-rose-700' :
                                            'bg-blue-100 text-blue-700';
                      
                      return (
                        <div key={interaction.id} className={`flex gap-3 p-3 bg-gray-50/70 rounded-lg border-l-4 ${sentimentColor}`}>
                          <div className="flex-1">
                            <p className="font-medium text-sm text-gray-800">{interaction.subject}</p>
                            <p className="text-xs text-gray-500">
                              {interaction.channel} · {interaction.direction}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(interaction.occurred_at).toLocaleDateString()}
                            </p>
                          </div>
                          {sentiment && (
                            <Badge className={`${sentimentBadge} border-0 text-xs h-5`}>
                              {sentiment.label === 'positive' ? '😊' : sentiment.label === 'negative' ? '😟' : '😐'}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
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