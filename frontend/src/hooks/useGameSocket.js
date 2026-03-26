import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 15000]; // exponential backoff

export function useGameSocket(onEvent) {
  const { token, role, teamId } = useAuth();
  const wsRef = useRef(null);
  const reconnectAttempt = useRef(0);
  const [connectionState, setConnectionState] = useState('disconnected'); // 'disconnected', 'connected'

  const connect = useCallback(() => {
    // Wait until we have a token and role before connecting
    if (!token || !role) return;
    
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const params = new URLSearchParams({ role, token });
    if (teamId) params.set('team_id', teamId);

    const ws = new WebSocket(`${WS_BASE}/ws?${params}`);

    ws.onopen = () => {
      setConnectionState('connected');
      reconnectAttempt.current = 0;
    };

    ws.onmessage = (rawEvent) => {
      try {
        const { event, data } = JSON.parse(rawEvent.data);
        if (onEvent) onEvent(event, data);
      } catch (err) {
        console.error('[WS] Failed to parse message:', err);
      }
    };

    ws.onclose = (closeEvent) => {
      setConnectionState('disconnected');
      // Don't reconnect if server explicitly rejected us
      if (closeEvent.code === 4001) return;

      const delay = RECONNECT_DELAYS[
        Math.min(reconnectAttempt.current, RECONNECT_DELAYS.length - 1)
      ];
      reconnectAttempt.current += 1;
      setTimeout(connect, delay);
    };

    ws.onerror = () => {
      // close triggers onclose, causing reconnection logic
      ws.close();
    };

    wsRef.current = ws;
  }, [role, token, teamId, onEvent]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((event, data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event, data }));
    }
  }, []);

  return { send, connectionState };
}
