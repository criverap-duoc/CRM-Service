'use client';

import { useState } from 'react';
import { TopNavbar } from '@/components/TopNavbar';
import {
  BookOpen,
  Users,
  Building2,
  Tag,
  CheckSquare,
  Package,
  Target,
  Brain,
  Bell,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  Activity,
  UserPlus,
  Webhook,
  Clock,
} from 'lucide-react';

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

            {/* Sección C: Entidades del CRM */}
            <section id="entities" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-[var(--color-ink)] mb-4 tracking-tight">
                Entidades del CRM
              </h2>

              <p className="text-[var(--color-ink)] leading-relaxed mb-6">
                El sistema gira alrededor de 6 entidades que se relacionan entre sí.
                Entender cómo se conectan es clave para usar el CRM con criterio.
              </p>

              <div className="space-y-6">

                {/* Contactos */}
                <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-[var(--color-brand)]/10">
                      <Users className="h-4 w-4 text-[var(--color-brand)]" />
                    </div>
                    <h3 className="text-base font-semibold text-[var(--color-ink)]">Contactos</h3>
                  </div>
                  <p className="text-sm text-[var(--color-ink)] leading-relaxed mb-3">
                    Es la entidad central. Representa a las personas con las que interactúa el
                    equipo comercial: leads, prospectos, clientes o ex-clientes.
                  </p>
                  <ul className="text-sm text-[var(--color-ink)] space-y-1.5 ml-4 list-disc marker:text-[var(--color-subtle)]">
                    <li>Pertenecen a una <strong className="font-medium">empresa</strong> (opcional).</li>
                    <li>Pueden tener múltiples <strong className="font-medium">tags</strong> para categorizarlos.</li>
                    <li>Se les asignan <strong className="font-medium">tareas</strong> operativas.</li>
                    <li>Tienen <strong className="font-medium">interacciones</strong> (llamadas, emails, reuniones).</li>
                    <li>Pueden estar interesados en varios <strong className="font-medium">productos</strong>.</li>
                    <li>Pueden tener una o más <strong className="font-medium">oportunidades</strong> comerciales abiertas.</li>
                  </ul>
                  <p className="text-xs text-[var(--color-subtle)] mt-3 italic">
                    Cada contacto tiene un estado (Lead/Prospect/Customer/Churned) y una fuente
                    (Meta Ads, Organic, Referral, etc.).
                  </p>
                </div>

                {/* Empresas */}
                <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-[var(--color-brand)]/10">
                      <Building2 className="h-4 w-4 text-[var(--color-brand)]" />
                    </div>
                    <h3 className="text-base font-semibold text-[var(--color-ink)]">Empresas</h3>
                  </div>
                  <p className="text-sm text-[var(--color-ink)] leading-relaxed mb-3">
                    Organizaciones a las que pertenecen los contactos. Permiten agrupar y analizar
                    contactos por cuenta, no solo individualmente.
                  </p>
                  <ul className="text-sm text-[var(--color-ink)] space-y-1.5 ml-4 list-disc marker:text-[var(--color-subtle)]">
                    <li>Tienen industria, tamaño, país e ingresos anuales.</li>
                    <li>Agrupan uno o más contactos (relación 1-a-muchos).</li>
                    <li>Tienen un <strong className="font-medium">Health Score</strong> agregado (0-100) calculado a partir de la actividad de sus contactos.</li>
                  </ul>
                  <p className="text-xs text-[var(--color-subtle)] mt-3 italic">
                    El health score considera volumen de interacciones, balance de sentimiento
                    y cantidad de contactos asociados. Es un indicador temprano de cuentas
                    que requieren atención.
                  </p>
                </div>

                {/* Tags */}
                <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-[var(--color-brand)]/10">
                      <Tag className="h-4 w-4 text-[var(--color-brand)]" />
                    </div>
                    <h3 className="text-base font-semibold text-[var(--color-ink)]">Tags</h3>
                  </div>
                  <p className="text-sm text-[var(--color-ink)] leading-relaxed mb-3">
                    Etiquetas libres con color para categorizar contactos de forma rápida y
                    visual. Permiten crear segmentaciones manuales que complementan el ML.
                  </p>
                  <ul className="text-sm text-[var(--color-ink)] space-y-1.5 ml-4 list-disc marker:text-[var(--color-subtle)]">
                    <li>Cada tag tiene un nombre único y un color.</li>
                    <li>Un contacto puede tener varios tags (relación muchos-a-muchos).</li>
                    <li>Sirven como features para el ML (por ejemplo, &quot;VIP&quot; o &quot;en riesgo&quot;).</li>
                  </ul>
                </div>

                {/* Tareas */}
                <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-[var(--color-brand)]/10">
                      <CheckSquare className="h-4 w-4 text-[var(--color-brand)]" />
                    </div>
                    <h3 className="text-base font-semibold text-[var(--color-ink)]">Tareas</h3>
                  </div>
                  <p className="text-sm text-[var(--color-ink)] leading-relaxed mb-3">
                    Acciones concretas que debe ejecutar un agente sobre un contacto.
                    Son la unidad operativa del CRM: &quot;llamar a Juan&quot;, &quot;enviar propuesta&quot;,
                    &quot;agendar demo&quot;.
                  </p>
                  <ul className="text-sm text-[var(--color-ink)] space-y-1.5 ml-4 list-disc marker:text-[var(--color-subtle)]">
                    <li>Cada tarea tiene estado: Pendiente, En progreso, Completada, Cancelada.</li>
                    <li>Tienen prioridad: Baja, Media, Alta, Urgente.</li>
                    <li>Tienen fecha límite (opcional). Si la fecha pasa sin completarse, se marca como vencida y se notifica al agente.</li>
                  </ul>
                </div>

                {/* Productos */}
                <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-[var(--color-brand)]/10">
                      <Package className="h-4 w-4 text-[var(--color-brand)]" />
                    </div>
                    <h3 className="text-base font-semibold text-[var(--color-ink)]">Productos</h3>
                  </div>
                  <p className="text-sm text-[var(--color-ink)] leading-relaxed mb-3">
                    Catálogo de productos o servicios que ofrece la empresa. Permite registrar
                    qué productos le interesan a cada contacto.
                  </p>
                  <ul className="text-sm text-[var(--color-ink)] space-y-1.5 ml-4 list-disc marker:text-[var(--color-subtle)]">
                    <li>Cada producto tiene categoría (Software, Hardware, Servicio, Capacitación).</li>
                    <li>Los contactos pueden tener varios productos de interés (relación muchos-a-muchos).</li>
                    <li>El precio promedio de los productos de interés es una feature del ML.</li>
                  </ul>
                </div>

                {/* Oportunidades */}
                <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-[var(--color-brand)]/10">
                      <Target className="h-4 w-4 text-[var(--color-brand)]" />
                    </div>
                    <h3 className="text-base font-semibold text-[var(--color-ink)]">Oportunidades</h3>
                  </div>
                  <p className="text-sm text-[var(--color-ink)] leading-relaxed mb-3">
                    Negocios en curso con un contacto. Representan el pipeline comercial y son
                    la fuente principal de ingresos futuros.
                  </p>
                  <ul className="text-sm text-[var(--color-ink)] space-y-1.5 ml-4 list-disc marker:text-[var(--color-subtle)]">
                    <li>Pasan por 5 etapas: Descubrimiento, Propuesta, Negociación, Ganada, Perdida.</li>
                    <li>Cada una tiene un valor estimado (CLP) y una probabilidad de cierre (0-100%).</li>
                    <li>El <strong className="font-medium">valor ponderado</strong> es monto × probabilidad / 100. Es la base del forecast.</li>
                    <li>Al pasar a Ganada, la probabilidad se fija en 100%. Al pasar a Perdida, se requiere un motivo.</li>
                  </ul>
                  <p className="text-xs text-[var(--color-subtle)] mt-3 italic">
                    El pipeline total es la suma de montos de oportunidades abiertas. El
                    pipeline ponderado es la suma de valores ponderados. El forecast agrupa
                    por mes de cierre esperado.
                  </p>
                </div>

              </div>
            </section>

            <section id="ml" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-[var(--color-ink)] mb-4 tracking-tight">
                Machine Learning
              </h2>

              <p className="text-[var(--color-ink)] leading-relaxed mb-6">
                El sistema usa Machine Learning para priorizar el trabajo comercial y
                anticipar riesgos. Cada modelo analiza el historial completo de un contacto
                y devuelve una métrica accionable.
              </p>

              <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5 mb-6">
                <h3 className="text-sm font-semibold text-[var(--color-ink)] mb-2">
                  ¿Cómo funciona el ML en este sistema?
                </h3>
                <p className="text-sm text-[var(--color-ink)] leading-relaxed">
                  Cada modelo se entrenó con datos históricos (2.000 leads sintéticos + 60 leads
                  reales) y aprende patrones a partir de 32 features derivadas de las 6 entidades
                  del CRM. Las features incluyen: cantidad de interacciones, sentimiento promedio,
                  días sin contacto, tags asignados, cantidad de tareas vencidas, valor del
                  pipeline abierto, entre otras. Los modelos viven en el backend y se consultan
                  vía API bajo demanda.
                </p>
              </div>

              <div className="space-y-6">

                {/* Lead Scoring */}
                <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-[var(--color-brand)]/10">
                      <TrendingUp className="h-4 w-4 text-[var(--color-brand)]" />
                    </div>
                    <h3 className="text-base font-semibold text-[var(--color-ink)]">Lead Scoring</h3>
                  </div>
                  <p className="text-sm text-[var(--color-ink)] leading-relaxed mb-3">
                    Calcula la probabilidad de conversión de un contacto en un rango de 0 a 100.
                    Se usa para priorizar a quién contactar primero.
                  </p>
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-[var(--color-ink)] bg-[var(--color-line)]/40">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
                        80-100
                      </span>
                      <span className="text-[var(--color-ink)]">Alta prioridad — Contactar ahora</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-[var(--color-ink)] bg-[var(--color-line)]/40">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-warning)]" />
                        60-79
                      </span>
                      <span className="text-[var(--color-ink)]">Media prioridad — Seguimiento pronto</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-[var(--color-ink)] bg-[var(--color-line)]/40">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-subtle)]" />
                        40-59
                      </span>
                      <span className="text-[var(--color-ink)]">Prioridad normal — Monitorear</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-[var(--color-ink)] bg-[var(--color-line)]/40">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-danger)]" />
                        0-39
                      </span>
                      <span className="text-[var(--color-ink)]">Baja prioridad — Nutrir con contenido</span>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--color-subtle)] italic">
                    Modelo: Random Forest entrenado con datos históricos. Se complementa con
                    reglas de negocio si el modelo no está disponible.
                  </p>
                </div>

                {/* Churn Prediction */}
                <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-[var(--color-brand)]/10">
                      <AlertTriangle className="h-4 w-4 text-[var(--color-brand)]" />
                    </div>
                    <h3 className="text-base font-semibold text-[var(--color-ink)]">Churn Prediction</h3>
                  </div>
                  <p className="text-sm text-[var(--color-ink)] leading-relaxed mb-3">
                    Calcula la probabilidad de que un cliente abandone el servicio (0-100%).
                    Se usa para actuar antes de perderlo.
                  </p>
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-[var(--color-ink)] bg-[var(--color-line)]/40">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-danger)]" />
                        70-100%
                      </span>
                      <span className="text-[var(--color-ink)]">Alto riesgo — intervención urgente</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-[var(--color-ink)] bg-[var(--color-line)]/40">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-warning)]" />
                        40-69%
                      </span>
                      <span className="text-[var(--color-ink)]">Riesgo medio — monitorear de cerca</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-[var(--color-ink)] bg-[var(--color-line)]/40">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
                        0-39%
                      </span>
                      <span className="text-[var(--color-ink)]">Bajo riesgo — cliente estable</span>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--color-subtle)] italic">
                    Un cliente con muchas interacciones recientes, sentimiento positivo y
                    sin tareas vencidas tiene churn bajo. La falta de interacción y el
                    sentimiento negativo son las señales más fuertes de abandono.
                  </p>
                </div>

                {/* Segmentación */}
                <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-[var(--color-brand)]/10">
                      <Brain className="h-4 w-4 text-[var(--color-brand)]" />
                    </div>
                    <h3 className="text-base font-semibold text-[var(--color-ink)]">Segmentación (K-Means)</h3>
                  </div>
                  <p className="text-sm text-[var(--color-ink)] leading-relaxed mb-3">
                    Agrupa automáticamente a los contactos en 3 clusters según su comportamiento
                    y valor. Cada cluster representa un perfil de cliente distinto.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--color-bg)]">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--color-ink)]">🏆 Cliente consolidado</p>
                        <p className="text-xs text-[var(--color-subtle)] leading-relaxed mt-0.5">
                          Alta conversión, sentimiento positivo, churn cercano a cero. Son los clientes activos y satisfechos. Prioridad: retención y upselling.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--color-bg)]">
                      <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--color-ink)]">⚡ Prospect activo</p>
                        <p className="text-xs text-[var(--color-subtle)] leading-relaxed mt-0.5">
                          Buena conversación, en progreso, conversión media. Tienen interés real pero todavía no compran. Prioridad: empujar el cierre.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--color-bg)]">
                      <span className="h-2 w-2 rounded-full bg-slate-400 shrink-0 mt-1.5" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--color-ink)]">📉 Lead frío o en riesgo</p>
                        <p className="text-xs text-[var(--color-subtle)] leading-relaxed mt-0.5">
                          Baja actividad, sentimiento neutral o negativo, churn alto. Requieren reactivación o descarte. Prioridad: campañas de reactivación.
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--color-subtle)] italic mt-4">
                    Los clusters se recalculan periódicamente a medida que cambian los datos.
                    Un contacto puede moverse de un cluster a otro según su evolución.
                  </p>
                </div>

                {/* Análisis de Sentimiento */}
                <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-[var(--color-brand)]/10">
                      <Lightbulb className="h-4 w-4 text-[var(--color-brand)]" />
                    </div>
                    <h3 className="text-base font-semibold text-[var(--color-ink)]">Análisis de Sentimiento</h3>
                  </div>
                  <p className="text-sm text-[var(--color-ink)] leading-relaxed mb-3">
                    Clasifica cada interacción como Positiva, Neutral o Negativa. Se usa como
                    feature para el resto de los modelos y aparece en el timeline de cada
                    contacto con un punto de color.
                  </p>
                  <ul className="text-sm text-[var(--color-ink)] space-y-1.5 ml-4 list-disc marker:text-[var(--color-subtle)]">
                    <li>Usa OpenAI si hay API key configurada.</li>
                    <li>Sin API key, usa un modo simulado basado en palabras clave.</li>
                    <li>Se almacena en la base de datos por cada interacción.</li>
                  </ul>
                </div>

                {/* Health Score */}
                <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-[var(--color-brand)]/10">
                      <Activity className="h-4 w-4 text-[var(--color-brand)]" />
                    </div>
                    <h3 className="text-base font-semibold text-[var(--color-ink)]">Health Score de empresa</h3>
                  </div>
                  <p className="text-sm text-[var(--color-ink)] leading-relaxed mb-3">
                    Métrica agregada (0-100) que refleja la salud de la relación con una empresa.
                    Se calcula en vivo consultando todos sus contactos.
                  </p>
                  <ul className="text-sm text-[var(--color-ink)] space-y-1.5 ml-4 list-disc marker:text-[var(--color-subtle)]">
                    <li>40% volumen de interacciones (más actividad = más salud).</li>
                    <li>40% balance de sentimiento (positivas menos negativas).</li>
                    <li>20% cantidad de contactos asociados.</li>
                  </ul>
                  <p className="text-xs text-[var(--color-subtle)] italic mt-3">
                    Se muestra en la página de detalle de cada empresa con una barra visual y
                    una etiqueta de estado: Saludable (70+), En riesgo (40-69), Crítico (0-39).
                  </p>
                </div>

              </div>
            </section>

            <section id="notifications" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-[var(--color-ink)] mb-4 tracking-tight">
                Notificaciones en tiempo real
              </h2>

              <p className="text-[var(--color-ink)] leading-relaxed mb-6">
                El sistema emite notificaciones al instante cuando ocurren eventos importantes.
                El objetivo es reducir el tiempo de respuesta del equipo comercial.
              </p>

              <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5 mb-6">
                <h3 className="text-sm font-semibold text-[var(--color-ink)] mb-2">
                  ¿Cómo funciona?
                </h3>
                <p className="text-sm text-[var(--color-ink)] leading-relaxed">
                  El backend abre un canal WebSocket por usuario autenticado. Cuando ocurre
                  un evento, el sistema crea la notificación en la base de datos (persistencia)
                  y la emite por WebSocket (tiempo real). Si el usuario está conectado, la ve
                  al instante como un toast y en la campana del navbar. Si no está conectado,
                  la ve al volver a entrar.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-base font-semibold text-[var(--color-ink)] mb-2">
                  Eventos que generan notificaciones
                </h3>

                <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[var(--color-brand)]/10 shrink-0">
                      <UserPlus className="h-4 w-4 text-[var(--color-brand)]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--color-ink)]">Lead asignado</p>
                      <p className="text-xs text-[var(--color-subtle)] leading-relaxed mt-0.5">
                        Cuando un manager reasigna un contacto a otro agente. El nuevo agente
                        recibe la notificación al instante. También se le envía un email.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[var(--color-brand)]/10 shrink-0">
                      <Webhook className="h-4 w-4 text-[var(--color-brand)]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--color-ink)]">Webhook de Meta</p>
                      <p className="text-xs text-[var(--color-subtle)] leading-relaxed mt-0.5">
                        Cuando llega un lead nuevo desde Meta Lead Ads. Todos los managers
                        reciben la notificación para que alguien lo atienda rápido.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[var(--color-brand)]/10 shrink-0">
                      <Clock className="h-4 w-4 text-[var(--color-brand)]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--color-ink)]">Tarea vencida</p>
                      <p className="text-xs text-[var(--color-subtle)] leading-relaxed mt-0.5">
                        Cuando el sistema detecta tareas con fecha límite vencida. El agente
                        asignado recibe la notificación para que las atienda.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-2xl bg-[var(--color-brand)]/5 border border-[var(--color-brand)]/20">
                <p className="text-sm text-[var(--color-ink)] leading-relaxed">
                  <strong className="font-semibold">Dónde verlas:</strong> la campana
                  (con badge rojo de no leídas) está en la barra superior. Al hacer click
                  se abre un dropdown con las últimas 10. La página
                  <code className="px-1.5 py-0.5 rounded bg-[var(--color-line)]/50 text-xs font-mono mx-1">/notifications</code>
                  muestra el historial completo con filtros.
                </p>
              </div>
            </section>

            <section id="quickstart" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-[var(--color-ink)] mb-4 tracking-tight">
                Guía rápida de uso
              </h2>

              <p className="text-[var(--color-ink)] leading-relaxed mb-6">
                Las acciones más comunes del día a día, paso a paso.
              </p>

              <div className="space-y-6">

                {/* Crear un contacto */}
                <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
                  <h3 className="text-base font-semibold text-[var(--color-ink)] mb-3">
                    Crear un contacto
                  </h3>
                  <ol className="text-sm text-[var(--color-ink)] space-y-1.5 ml-4 list-decimal marker:text-[var(--color-subtle)]">
                    <li>Ve a <strong className="font-medium">Contactos</strong> en la barra superior.</li>
                    <li>Haz click en <strong className="font-medium">Nuevo Contacto</strong>.</li>
                    <li>Completa nombre, apellido, email y (opcional) teléfono.</li>
                    <li>Selecciona la empresa, estado inicial y fuente.</li>
                    <li>Guarda. El contacto aparecerá en el listado.</li>
                  </ol>
                </div>

                {/* Registrar una interacción */}
                <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
                  <h3 className="text-base font-semibold text-[var(--color-ink)] mb-3">
                    Registrar una interacción
                  </h3>
                  <ol className="text-sm text-[var(--color-ink)] space-y-1.5 ml-4 list-decimal marker:text-[var(--color-subtle)]">
                    <li>Entra al detalle del contacto (click en su nombre).</li>
                    <li>En la columna principal, scroll hasta la timeline de interacciones.</li>
                    <li>Click en <strong className="font-medium">+ Nueva interacción</strong>.</li>
                    <li>Selecciona canal (email, teléfono, WhatsApp, reunión) y dirección.</li>
                    <li>Escribe el asunto y el cuerpo. Guarda.</li>
                  </ol>
                  <p className="text-xs text-[var(--color-subtle)] italic mt-3">
                    El sistema analiza automáticamente el sentimiento de la interacción
                    con IA y lo marca con un punto de color en la timeline.
                  </p>
                </div>

                {/* Crear una tarea */}
                <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
                  <h3 className="text-base font-semibold text-[var(--color-ink)] mb-3">
                    Crear una tarea
                  </h3>
                  <ol className="text-sm text-[var(--color-ink)] space-y-1.5 ml-4 list-decimal marker:text-[var(--color-subtle)]">
                    <li>Ve a <strong className="font-medium">Tareas</strong> o al detalle del contacto.</li>
                    <li>Click en <strong className="font-medium">Nueva Tarea</strong>.</li>
                    <li>Escribe el título (ej: &quot;Llamar para seguimiento&quot;).</li>
                    <li>Asigna prioridad y fecha límite (opcional).</li>
                    <li>Guarda. La tarea aparecerá en tu lista.</li>
                  </ol>
                </div>

                {/* Crear una oportunidad */}
                <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
                  <h3 className="text-base font-semibold text-[var(--color-ink)] mb-3">
                    Crear una oportunidad
                  </h3>
                  <ol className="text-sm text-[var(--color-ink)] space-y-1.5 ml-4 list-decimal marker:text-[var(--color-subtle)]">
                    <li>Ve a <strong className="font-medium">Oportunidades</strong> o al detalle del contacto.</li>
                    <li>Click en <strong className="font-medium">Nueva Oportunidad</strong>.</li>
                    <li>Selecciona el contacto, escribe el monto y la fecha de cierre esperada.</li>
                    <li>Elige la etapa inicial (Descubrimiento, Propuesta o Negociación).</li>
                    <li>Guarda. La oportunidad aparecerá en el kanban.</li>
                  </ol>
                </div>

                {/* Mover una oportunidad en el kanban */}
                <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
                  <h3 className="text-base font-semibold text-[var(--color-ink)] mb-3">
                    Mover una oportunidad de etapa
                  </h3>
                  <ol className="text-sm text-[var(--color-ink)] space-y-1.5 ml-4 list-decimal marker:text-[var(--color-subtle)]">
                    <li>Ve a <strong className="font-medium">Oportunidades</strong>.</li>
                    <li>Encuentra la card en el kanban.</li>
                    <li>Click en el ícono de menú (⋮) de la card.</li>
                    <li>Selecciona la nueva etapa (Propuesta, Negociación, Ganada o Perdida).</li>
                    <li>Si marcas como Perdida, el sistema te pedirá un motivo.</li>
                  </ol>
                </div>

                {/* Etiquetar un contacto */}
                <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
                  <h3 className="text-base font-semibold text-[var(--color-ink)] mb-3">
                    Etiquetar un contacto
                  </h3>
                  <ol className="text-sm text-[var(--color-ink)] space-y-1.5 ml-4 list-decimal marker:text-[var(--color-subtle)]">
                    <li>Entra al detalle del contacto.</li>
                    <li>En la columna lateral, busca la card &quot;Tags&quot;.</li>
                    <li>Click en <strong className="font-medium">Editar</strong>.</li>
                    <li>Haz click en los tags disponibles para agregarlos, o en la X para quitarlos.</li>
                    <li>Los cambios se guardan automáticamente.</li>
                  </ol>
                </div>

              </div>

              <div className="mt-8 p-5 rounded-2xl bg-[var(--color-brand)]/5 border border-[var(--color-brand)]/20">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[var(--color-brand)]/10 shrink-0">
                    <Lightbulb className="h-4 w-4 text-[var(--color-brand)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-ink)] mb-1">
                      Tip: flujo recomendado para un lead nuevo
                    </p>
                    <p className="text-sm text-[var(--color-ink)] leading-relaxed">
                      Cuando llega un lead de Meta Ads, aparece una notificación en tiempo real.
                      Abre el contacto, revisa el <strong className="font-medium">Lead Score</strong> y el <strong className="font-medium">Segmento</strong> para entender su perfil, crea una
                      tarea de seguimiento con prioridad Alta, y si hay interés real, crea una
                      oportunidad en la etapa Descubrimiento.
                    </p>
                  </div>
                </div>
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
