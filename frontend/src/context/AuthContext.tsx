// frontend\src\context\AuthContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '@/lib/api-client';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  loginAsDemo: () => Promise<void>;
  logout: () => void;
  user: { username: string } | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Lee el token de localStorage (fuente externa a React).
// OJO: se usa DESPUÉS del montaje, nunca durante el render. En el servidor no
// existe localStorage, así que resolver la sesión en el estado inicial haría
// que el primer render del cliente no coincida con el HTML del servidor:
// desajuste de hidratación en todo el árbol (el AvatarMenu renderiza
// iniciales distintas para `null` y para un username).
function readAuthFromStorage(): {
  isAuthenticated: boolean;
  user: { username: string } | null;
} {
  const token = localStorage.getItem('access_token');
  if (!token) {
    return { isAuthenticated: false, user: null };
  }
  // No tenemos el username real sin decodificar el JWT o llamar a /me.
  // El avatar mostrará "US" hasta que se agregue un endpoint /auth/me/.
  // Es un límite conocido documentado en el README.
  return { isAuthenticated: true, user: { username: 'Usuario' } };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ username: string } | null>(null);

  useEffect(() => {
    // El setState va dentro de un setTimeout a propósito: la regla
    // react-hooks/set-state-in-effect prohíbe llamar setState de forma
    // síncrona dentro de un efecto, y diferirlo a un macrotask mantiene
    // además el primer render idéntico al del servidor (hidratación intacta).
    const id = setTimeout(() => {
      const initial = readAuthFromStorage();
      setIsAuthenticated(initial.isAuthenticated);
      setUser(initial.user);
      setIsLoading(false);
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const login = async (username: string, password: string) => {
    await auth.login(username, password);
    setIsAuthenticated(true);
    setUser({ username });
  };

  const loginAsDemo = async () => {
    await auth.loginAsDemo();
    setIsAuthenticated(true);
    setUser({ username: 'demo' });
  };

  const logout = () => {
    auth.logout();
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading, login, loginAsDemo, logout, user }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
