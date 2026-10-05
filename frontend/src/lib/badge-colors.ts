// frontend/src/lib/badge-colors.ts
// Colores de los PUNTOS de estado (Iteración 4.2).
// Los badges ya no se pintan con fondo saturado: usan un punto de color
// (h-1.5 w-1.5) sobre fondo neutro --color-line/40. Ver components/StatusBadge.tsx.

export const CONTACT_STATUS_DOT: Record<string, string> = {
  lead: 'bg-blue-500',
  prospect: 'bg-amber-500',
  customer: 'bg-emerald-500',
  churned: 'bg-rose-500',
};

export const OPPORTUNITY_STAGE_DOT: Record<string, string> = {
  discovery: 'bg-slate-400',
  proposal: 'bg-blue-500',
  negotiation: 'bg-violet-500',
  won: 'bg-emerald-500',
  lost: 'bg-rose-500',
};

export const TASK_PRIORITY_DOT: Record<string, string> = {
  low: 'bg-slate-400',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-rose-500',
};

export const PRODUCT_CATEGORY_DOT: Record<string, string> = {
  software: 'bg-blue-500',
  hardware: 'bg-slate-500',
  service: 'bg-violet-500',
  training: 'bg-amber-500',
  other: 'bg-gray-400',
};
