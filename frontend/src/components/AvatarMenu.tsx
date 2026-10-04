'use client';

import { LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function AvatarMenu() {
  const { user, logout } = useAuth();

  // Iniciales: primeras 2 letras del username, o "U" si no hay
  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : 'U';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="h-8 w-8 rounded-full bg-[var(--color-brand)] text-white text-xs font-semibold flex items-center justify-center hover:opacity-90 transition-opacity"
          aria-label="Menú de usuario"
        >
          {initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-xl">
        <div className="px-3 py-2">
          <p className="text-xs font-medium text-[var(--color-ink)] truncate">
            {user?.username || 'Usuario'}
          </p>
          <p className="text-[11px] text-[var(--color-subtle)]">
            Sesión activa
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={logout}
          className="cursor-pointer text-[var(--color-danger)] focus:text-[var(--color-danger)]"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
