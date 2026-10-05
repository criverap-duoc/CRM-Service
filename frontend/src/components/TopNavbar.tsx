'use client';

import { useRouter, usePathname } from 'next/navigation';
import { CircleUserRound, ChevronRight, HelpCircle } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import { ConnectionIndicator } from '@/components/ConnectionIndicator';
import { CatalogDropdown } from '@/components/CatalogDropdown';
import { AvatarMenu } from '@/components/AvatarMenu';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface TopNavbarProps {
  breadcrumb?: BreadcrumbItem[];
}

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Contactos', href: '/contacts' },
  { label: 'Empresas', href: '/companies' },
  { label: 'Oportunidades', href: '/opportunities' },
  { label: 'Tareas', href: '/tasks' },
  { label: 'Analítica', href: '/analytics' },
];

export function TopNavbar({ breadcrumb }: TopNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isItemActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <nav className="sticky top-0 z-50 bg-[var(--color-surface)] border-b border-[var(--color-line)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 shrink-0"
          >
            <div className="p-1.5 rounded-lg bg-[var(--color-brand)] shadow-sm">
              <CircleUserRound className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold text-[var(--color-ink)] tracking-tight hidden sm:inline">
              CRM Service
            </span>
          </button>

          {/* Links principales */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isItemActive(item.href);
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`relative px-3 py-2 text-sm font-medium transition-colors rounded-lg hover:text-[var(--color-ink)] ${
                    active
                      ? 'text-[var(--color-ink)]'
                      : 'text-[var(--color-subtle)]'
                  }`}
                >
                  {item.label}
                  <span
                    className={`absolute bottom-0 left-3 right-3 h-0.5 bg-[var(--color-brand)] rounded-full transition-opacity duration-150 ${
                      active ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                </button>
              );
            })}
            <CatalogDropdown />
          </div>

          {/* Zona derecha */}
          <div className="flex items-center gap-3 shrink-0">
            <ConnectionIndicator />
            <NotificationBell />
            <button
              onClick={() => router.push('/help')}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--color-subtle)] hover:text-[var(--color-ink)] hover:bg-[var(--color-line)]/50 transition-colors"
              aria-label="Ayuda"
              title="Manual de usuario"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
            <AvatarMenu />
          </div>
        </div>

        {/* Breadcrumb (si aplica) */}
        {breadcrumb && breadcrumb.length > 0 && (
          <div className="pb-3 flex items-center gap-1.5 text-xs">
            {breadcrumb.map((item, idx) => {
              const isLast = idx === breadcrumb.length - 1;
              return (
                <div key={idx} className="flex items-center gap-1.5">
                  {item.href && !isLast ? (
                    <button
                      onClick={() => router.push(item.href!)}
                      className="text-[var(--color-subtle)] hover:text-[var(--color-brand)] transition-colors"
                    >
                      {item.label}
                    </button>
                  ) : (
                    <span
                      className={
                        isLast
                          ? 'text-[var(--color-ink)] font-medium'
                          : 'text-[var(--color-subtle)]'
                      }
                    >
                      {item.label}
                    </span>
                  )}
                  {!isLast && (
                    <ChevronRight className="h-3 w-3 text-[var(--color-subtle)]/50" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
