'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const WS_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1')
  .replace('/api/v1', '')
  .replace('http://', 'ws://')
  .replace('https://', 'wss://');

interface UseWebSocketOptions {
  onMessage?: (data: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
  enabled?: boolean;
}

export function useWebSocket(path: string, options: UseWebSocketOptions = {}) {
  const { onMessage, onOpen, onClose, enabled = true } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIntentionalCloseRef = useRef(false);
  const onMessageRef = useRef(onMessage);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);

  // Mantener refs actualizadas sin reconectar
  useEffect(() => {
    onMessageRef.current = onMessage;
    onOpenRef.current = onOpen;
    onCloseRef.current = onClose;
  }, [onMessage, onOpen, onClose]);

  const connect = useCallback(() => {
    if (!enabled) return;

    const token = typeof window !== 'undefined'
      ? localStorage.getItem('access_token')
      : null;
    if (!token) return;

    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const url = `${WS_BASE_URL}${path}?token=${token}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setIsReconnecting(false);
      reconnectAttemptsRef.current = 0;
      onOpenRef.current?.();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessageRef.current?.(data);
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      onCloseRef.current?.();

      // Cierre intencional (logout / unmount / deshabilitado): no se
      // programa reconexión, así que tampoco se anuncia "Reconectando".
      if (isIntentionalCloseRef.current || !enabled) {
        setIsReconnecting(false);
        return;
      }

      // Entre caída y caída el ref vuelve a 0 en cada onopen, por lo que
      // los 3 primeros reintentos consecutivos se muestran como
      // "Reconectando..." en lugar de "Desconectado".
      if (reconnectAttemptsRef.current < 3) {
        setIsReconnecting(true);
      }

      // Backoff exponencial: 1s, 2s, 4s, 8s, 16s, 30s max
      const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 30000);
      reconnectAttemptsRef.current += 1;

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
  }, [path, enabled]);

  useEffect(() => {
    isIntentionalCloseRef.current = false;
    connect();

    return () => {
      isIntentionalCloseRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { isConnected, isReconnecting, send };
}
