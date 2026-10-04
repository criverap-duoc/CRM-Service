'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Package, Tag, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const CATALOG_ITEMS = [
  { label: 'Productos', href: '/products', icon: Package },
  { label: 'Tags', href: '/tags', icon: Tag },
];

export function CatalogDropdown() {
  const router = useRouter();
  const pathname = usePathname();
  const isActive = CATALOG_ITEMS.some((item) => pathname.startsWith(item.href));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`relative inline-flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors rounded-lg hover:text-[var(--color-ink)] ${
            isActive
              ? 'text-[var(--color-ink)]'
              : 'text-[var(--color-subtle)]'
          }`}
        >
          Catálogo
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          <span
            className={`absolute bottom-0 left-3 right-3 h-0.5 bg-[var(--color-brand)] rounded-full transition-opacity duration-150 ${
              isActive ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 rounded-xl">
        {CATALOG_ITEMS.map((item) => {
          const Icon = item.icon;
          const itemActive = pathname.startsWith(item.href);
          return (
            <DropdownMenuItem
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`cursor-pointer ${
                itemActive ? 'text-[var(--color-brand)] font-medium' : ''
              }`}
            >
              <Icon className="h-4 w-4 mr-2" />
              {item.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
