'use client';

import { useState } from 'react';
import { TopNavbar } from '@/components/TopNavbar';
import { BookOpen, Users, Building2, Tag, CheckSquare, Package, Target, Brain, Bell, Lightbulb } from 'lucide-react';

const SECTIONS = [
  { id: 'intro', label: '¿Qué es CRM Service?', icon: BookOpen },
  { id: 'lifecycle', label: 'Ciclo de vida del contacto', icon: Users },
  { id: 'entities', label: 'Entidades del CRM', icon: Building2 },
  { id: 'ml', label: 'Machine Learning', icon: Brain },
  { id: 'notifications', label: 'Notificaciones', icon: Bell },
  { id: 'quickstart', label: 'Guía rápida de uso', icon: Lightbulb },
];

export default function HelpPage() {
  const [activeSection, setActiveSection] = useState('intro');

  const scrollTo = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -80; // altura del navbar
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <TopNavbar breadcrumb={[{ label: 'Ayuda' }]} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Sidebar sticky (solo desktop) */}
          <aside className="hidden lg:block lg:w-64 shrink-0">
            <div className="sticky top-24">
              <p className="text-xs uppercase tracking-wide text-[var(--color-subtle)] font-semibold mb-3 px-3">
                Manual de usuario
              </p>
              <nav className="space-y-0.5">
                {SECTIONS.map((section) => {
                  const Icon = section.icon;
                  const active = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => scrollTo(section.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                        active
                          ? 'bg-[var(--color-brand)]/8 text-[var(--color-brand)] font-medium'
                          : 'text-[var(--color-subtle)] hover:text-[var(--color-ink)] hover:bg-[var(--color-line)]/50'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{section.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Contenido */}
          <div className="flex-1 min-w-0 space-y-12">

            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-[var(--color-ink)] tracking-tight mb-2">
                Manual de usuario
              </h1>
              <p className="text-[var(--color-subtle)] leading-relaxed">
                Guía completa de los conceptos, entidades y funcionalidades de CRM Service.
                Si es tu primera vez en el sistema, empieza por &quot;¿Qué es CRM Service?&quot;
                y sigue el orden de las secciones.
              </p>
            </div>

            {/* Sección A: Intro */}
            <section id="intro" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-[var(--color-ink)] mb-4 tracking-tight">
                ¿Qué es CRM Service?
              </h2>

              <div className="space-y-4 text-[var(--color-ink)]">
                <p className="leading-relaxed">
                  CRM Service es un sistema de gestión de relaciones con clientes (Customer
                  Relationship Management) diseñado para equipos comerciales. Su objetivo es
                  centralizar la información de contactos, empresas y oportunidades de venta,
                  automatizar el seguimiento de leads y priorizar el trabajo del equipo
                  mediante Machine Learning.
                </p>

                <p className="leading-relaxed">
                  El problema que resuelve: en un equipo comercial, los leads generados por
                  campañas digitales (Meta Ads, formularios web, referidos) suelen perderse
                  por falta de seguimiento oportuno. Un lead sin respuesta en 48 horas tiene
                  una probabilidad de conversión muy baja. Este sistema reduce ese tiempo
                  a menos de 2 horas mediante notificaciones en tiempo real y priorización
                  automática.
                </p>

                <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5 mt-6">
                  <h3 className="text-sm font-semibold text-[var(--color-ink)] mb-3">
                    Las 6 entidades del sistema
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { icon: Users, title: 'Contactos', desc: 'Personas con las que interactúa el equipo comercial.' },
                      { icon: Building2, title: 'Empresas', desc: 'Organizaciones a las que pertenecen los contactos.' },
                      { icon: Tag, title: 'Tags', desc: 'Etiquetas para categorizar contactos (VIP, Pyme, etc.).' },
                      { icon: CheckSquare, title: 'Tareas', desc: 'Acciones pendientes asignadas a agentes.' },
                      { icon: Package, title: 'Productos', desc: 'Catálogo de productos de interés.' },
                      { icon: Target, title: 'Oportunidades', desc: 'Negocios en curso con valor y probabilidad.' },
                    ].map((item, idx) => {
                      const Icon = item.icon;
                      return (
                        <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--color-bg)]">
                          <div className="p-1.5 rounded-lg bg-[var(--color-brand)]/10 shrink-0">
                            <Icon className="h-4 w-4 text-[var(--color-brand)]" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--color-ink)]">{item.title}</p>
                            <p className="text-xs text-[var(--color-subtle)] leading-relaxed">{item.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <p className="leading-relaxed pt-4">
                  Las entidades se relacionan entre sí: un contacto pertenece a una empresa,
                  puede tener múltiples tags, varias tareas asignadas, varios productos de
                  interés, y una o más oportunidades abiertas. El sistema analiza todas estas
                  relaciones para predecir qué contactos tienen mayor probabilidad de
                  convertirse en clientes.
                </p>
              </div>
            </section>

            {/* Sección B: Ciclo de vida */}
            <section id="lifecycle" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-[var(--color-ink)] mb-4 tracking-tight">
                Ciclo de vida del contacto
              </h2>

              <p className="text-[var(--color-ink)] leading-relaxed mb-6">
                Todo contacto pasa por una serie de estados que reflejan su relación con el
                equipo comercial. El estado es la clasificación más importante de un contacto
                porque determina cómo lo trata el sistema.
              </p>

              <div className="space-y-4">
                {[
                  {
                    status: 'lead',
                    label: 'Lead',
                    desc: 'Contacto recién capturado. Todavía no se ha calificado si tiene interés real o capacidad de compra.',
                    actions: 'Acción típica: contactar, calificar, asignar responsable.',
                  },
                  {
                    status: 'prospect',
                    label: 'Prospect',
                    desc: 'Lead calificado. Mostró interés real y tiene potencial. Suele tener una o más oportunidades abiertas.',
                    actions: 'Acción típica: hacer seguimiento, agendar demos, enviar propuestas.',
                  },
                  {
                    status: 'customer',
                    label: 'Customer',
                    desc: 'Cliente activo. Ya compró o contrató al menos un producto. La relación está establecida.',
                    actions: 'Acción típica: mantener satisfacción, renovaciones, upselling.',
                  },
                  {
                    status: 'churned',
                    label: 'Churned',
                    desc: 'Cliente que abandonó el servicio. Puede ser por insatisfacción, competencia o falta de uso.',
                    actions: 'Acción típica: análisis post-mortem, intento de recuperación.',
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-4 p-5 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)]"
                  >
                    <div className="shrink-0 pt-1">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-[var(--color-ink)] bg-[var(--color-line)]/40">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            item.status === 'lead' ? 'bg-blue-500' :
                            item.status === 'prospect' ? 'bg-amber-500' :
                            item.status === 'customer' ? 'bg-emerald-500' :
                            'bg-rose-500'
                          }`}
                        />
                        {item.label}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--color-ink)] leading-relaxed mb-1">{item.desc}</p>
                      <p className="text-xs text-[var(--color-subtle)] italic">{item.actions}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-2xl bg-[var(--color-brand)]/5 border border-[var(--color-brand)]/20">
                <p className="text-sm text-[var(--color-ink)] leading-relaxed">
                  <strong className="font-semibold">Nota:</strong> el estado puede avanzar y retroceder.
                  Un customer puede volver a churned si deja de usar el servicio. Un lead puede
                  saltar directamente a customer si convierte rápido. No es un flujo lineal.
                </p>
              </div>
            </section>

            {/* Secciones C-F: se completan en los bloques siguientes */}
            <section id="entities" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-[var(--color-ink)] mb-4 tracking-tight">
                Entidades del CRM
              </h2>
              <div className="p-6 rounded-2xl border-2 border-dashed border-[var(--color-line)] text-center">
                <p className="text-sm text-[var(--color-subtle)]">
                  Contenido en construcción — se completa en el siguiente bloque.
                </p>
              </div>
            </section>

            <section id="ml" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-[var(--color-ink)] mb-4 tracking-tight">
                Machine Learning
              </h2>
              <div className="p-6 rounded-2xl border-2 border-dashed border-[var(--color-line)] text-center">
                <p className="text-sm text-[var(--color-subtle)]">
                  Contenido en construcción — se completa en el siguiente bloque.
                </p>
              </div>
            </section>

            <section id="notifications" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-[var(--color-ink)] mb-4 tracking-tight">
                Notificaciones en tiempo real
              </h2>
              <div className="p-6 rounded-2xl border-2 border-dashed border-[var(--color-line)] text-center">
                <p className="text-sm text-[var(--color-subtle)]">
                  Contenido en construcción — se completa en el siguiente bloque.
                </p>
              </div>
            </section>

            <section id="quickstart" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-[var(--color-ink)] mb-4 tracking-tight">
                Guía rápida de uso
              </h2>
              <div className="p-6 rounded-2xl border-2 border-dashed border-[var(--color-line)] text-center">
                <p className="text-sm text-[var(--color-subtle)]">
                  Contenido en construcción — se completa en el siguiente bloque.
                </p>
              </div>
            </section>

            {/* Footer */}
            <div className="pt-8 border-t border-[var(--color-line)]">
              <p className="text-xs text-[var(--color-subtle)]">
                Manual de usuario de CRM Service. Para más información técnica,
                visita el <a href="https://github.com/criverap-duoc/CRM-Service" target="_blank" rel="noopener noreferrer" className="text-[var(--color-brand)] hover:underline">repositorio en GitHub</a>.
              </p>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
