'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldCheck, Brain, Zap, FlaskConical, CircleUserRound, GitBranch, Sparkles } from 'lucide-react';

const FEATURES = [
  { icon: ShieldCheck, label: 'Autenticación JWT con roles (Manager/Agent)' },
  { icon: Brain, label: '3 modelos ML: lead scoring, churn, segmentación' },
  { icon: Zap, label: 'Notificaciones en tiempo real con WebSockets' },
  { icon: FlaskConical, label: '32 features ML, 105 tests automatizados' },
];

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, loginAsDemo } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(username, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Credenciales inválidas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setIsLoading(true);

    try {
      await loginAsDemo();
      router.push('/dashboard');
    } catch {
      setError('No se pudo iniciar sesión como demo. ¿Ejecutaste populate_data.py?');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Columna izquierda: informativa del proyecto (solo desktop) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[var(--color-bg)] p-12 flex-col justify-between">
        <div className="space-y-10">
          {/* Logo + nombre del proyecto */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[var(--color-brand)] shadow-sm">
              <CircleUserRound className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold text-[var(--color-ink)] tracking-tight">
              CRM Service
            </span>
          </div>

          <div className="space-y-6">
            <p className="max-w-md text-2xl font-bold tracking-tight text-[var(--color-ink)]">
              CRM completo con Django REST, Next.js y Machine Learning.
            </p>

            <ul className="max-w-md space-y-3">
              {FEATURES.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3"
                >
                  <div className="p-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-line)] shrink-0">
                    <Icon className="h-4 w-4 text-[var(--color-brand)]" />
                  </div>
                  <span className="text-sm text-[var(--color-ink)]">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <a
          href="https://github.com/criverap-duoc/CRM-Service"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 w-fit text-sm text-[var(--color-subtle)] hover:text-[var(--color-brand)] transition-colors"
        >
          <GitBranch className="h-4 w-4" />
          github.com/criverap-duoc/CRM-Service
        </a>
      </div>

      {/* Columna derecha: formulario de login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[var(--color-surface)]">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-[var(--color-ink)]">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-[var(--color-subtle)]">
            Accede a tu cuenta de CRM Service.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <Alert
                variant="destructive"
                className="rounded-xl border-[var(--color-danger)]!"
              >
                <AlertDescription className="text-[var(--color-danger)]!">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-[var(--color-ink)]">
                Usuario
              </label>
              <Input
                id="username"
                type="text"
                placeholder="Ingresa tu usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-11 rounded-xl border-[var(--color-line)] focus-visible:border-[var(--color-brand)] focus-visible:ring-4 focus-visible:ring-[var(--color-brand)]/10 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-[var(--color-ink)]">
                Contraseña
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 rounded-xl border-[var(--color-line)] focus-visible:border-[var(--color-brand)] focus-visible:ring-4 focus-visible:ring-[var(--color-brand)]/10 transition-all"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Cargando...
                </span>
              ) : (
                'Ingresar'
              )}
            </Button>

            {/* Divisor con "o" */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--color-line)]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[var(--color-surface)] px-2 text-[var(--color-subtle)]">
                  o
                </span>
              </div>
            </div>

            {/* Acceso de demo: no requiere credenciales */}
            <Button
              type="button"
              variant="outline"
              onClick={handleDemoLogin}
              disabled={isLoading}
              className="w-full h-11 rounded-xl border-[var(--color-line)]! hover:bg-[var(--color-line)]/30! text-[var(--color-ink)] transition-all duration-200"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Entrar como demo
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}