'use client';

import { useNotifications } from '@/context/NotificationsContext';

export function ConnectionIndicator() {
  const { isConnected, isReconnecting } = useNotifications();

  const label = isConnected
    ? 'En vivo'
    : isReconnecting
      ? 'Reconectando...'
      : 'Desconectado';

  return (
    <div
      className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-[var(--color-line)]/50"
      title={isConnected ? 'Conectado en tiempo real' : label}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isConnected
            ? 'bg-[var(--color-success)] animate-pulse'
            : isReconnecting
              ? 'bg-[var(--color-warning)] animate-pulse'
              : 'bg-[var(--color-subtle)]'
        }`}
      />
      <span
        className={`text-[11px] font-medium tracking-tight ${
          !isConnected && isReconnecting
            ? 'text-[var(--color-warning)]'
            : 'text-[var(--color-subtle)]'
        }`}
      >
        {label}
      </span>
    </div>
  );
}
