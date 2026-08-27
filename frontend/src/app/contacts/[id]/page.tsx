'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { contacts, interactions, integrations } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Save, Sparkles } from 'lucide-react';

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

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && id) {
      fetchContact();
      fetchInteractions();
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
      setInteractionList(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching interactions:', error);
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
      lead: 'bg-blue-100 text-blue-800',
      prospect: 'bg-yellow-100 text-yellow-800',
      customer: 'bg-green-100 text-green-800',
      churned: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold cursor-pointer" onClick={() => router.push('/dashboard')}>
            CRM Service
          </h1>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.push('/contacts')}>
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

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">{contact.full_name}</h2>
            <p className="text-gray-500">{contact.email}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSummarize} disabled={summarizing}>
              <Sparkles className="h-4 w-4 mr-2" />
              {summarizing ? 'Generando...' : 'Resumen con IA'}
            </Button>
            <Button variant={editing ? 'default' : 'outline'} onClick={() => setEditing(!editing)}>
              {editing ? 'Cancelar' : 'Editar'}
            </Button>
          </div>
        </div>

        {summary && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <p className="text-sm text-gray-600 font-medium">Resumen generado por IA:</p>
              <p className="text-gray-800">{summary}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Información del Contacto</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Nombre</label>
                    <Input
                      value={formData.first_name || ''}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Apellido</label>
                    <Input
                      value={formData.last_name || ''}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Teléfono</label>
                    <Input
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Empresa</label>
                    <Input
                      value={formData.company || ''}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Notas</label>
                    <Textarea
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-500">Nombre completo</span>
                    <p className="font-medium">{contact.full_name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Email</span>
                    <p>{contact.email}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Teléfono</span>
                    <p>{contact.phone || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Empresa</span>
                    <p>{contact.company || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Fuente</span>
                    <p>{contact.source}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Notas</span>
                    <p className="text-gray-600">{contact.notes || 'Sin notas'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Total interacciones</span>
                    <p>{contact.interaction_count}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Estado</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className={getStatusColor(contact.status)}>
                  {contact.status}
                </Badge>
                <p className="text-sm text-gray-500 mt-2">
                  Creado: {new Date(contact.created_at).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-500">
                  Actualizado: {new Date(contact.updated_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Interacciones</CardTitle>
              </CardHeader>
              <CardContent>
                {interactionList.length === 0 ? (
                  <p className="text-gray-500">Sin interacciones registradas</p>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {interactionList.map((interaction) => (
                      <div key={interaction.id} className="border-b pb-2">
                        <p className="font-medium text-sm">{interaction.subject}</p>
                        <p className="text-xs text-gray-500">
                          {interaction.channel} · {interaction.direction}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(interaction.occurred_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
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