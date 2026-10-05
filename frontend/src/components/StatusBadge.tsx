// frontend/src/components/StatusBadge.tsx
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  label: string;
  dotClass: string;
  /** sm = 12px (listados), xs = 10px (cards densas) */
  size?: 'sm' | 'xs';
}

/**
 * Badge de estado con punto de color sobre fondo neutro.
 * El color ya no compite visualmente, solo informa:
 * - fondo: --color-line al 40%
 * - punto: 6px (h-1.5 w-1.5) con el color del estado
 * - texto: --color-ink
 */
export function StatusBadge({ label, dotClass, size = 'sm' }: StatusBadgeProps) {
  const sizing = size === 'xs' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-[var(--color-line)]/40 font-medium whitespace-nowrap text-[var(--color-ink)]',
        sizing,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotClass)} />
      {label}
    </span>
  );
}
