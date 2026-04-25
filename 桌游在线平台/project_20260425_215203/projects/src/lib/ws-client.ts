export interface WsMessage<T = unknown> {
  type: string;
  payload: T;
}

export interface WsOptions {
  path: string;
  onMessage: (msg: WsMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnect?: boolean;
  heartbeatMs?: number;
}

export function createWsConnection(opts: WsOptions): {
  send: (msg: WsMessage) => void;
  close: () => void;
  isConnected: () => boolean;
} {
  const {
    path,
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnect = true,
    heartbeatMs = 30000,
  } = opts;

  let ws: WebSocket;
  let heartbeatTimer: ReturnType<typeof setInterval>;
  let closed = false;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000;

  function connect() {
    if (closed) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}${path}`);

    ws.onopen = () => {
      heartbeatTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping', payload: null }));
        }
      }, heartbeatMs);
      reconnectAttempts = 0;
      onOpen?.();
    };

    ws.onmessage = (e) => {
      try {
        const msg: WsMessage = JSON.parse(e.data);
        if (msg.type === 'pong') return;
        onMessage(msg);
      } catch (err) {
        console.error('WebSocket message parse error:', err);
      }
    };

    ws.onclose = () => {
      clearInterval(heartbeatTimer);
      onClose?.();
      if (reconnect && !closed) {
        reconnectAttempts++;
        if (reconnectAttempts <= maxReconnectAttempts) {
          const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts - 1);
          console.log(`WebSocket reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
          setTimeout(connect, delay);
        } else {
          console.error('Max reconnect attempts reached');
        }
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      onError?.(error);
    };
  }

  connect();

  return {
    send: (msg: WsMessage) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      } else {
        console.warn('WebSocket not connected, message not sent:', msg.type);
      }
    },
    close: () => {
      closed = true;
      clearInterval(heartbeatTimer);
      if (ws) {
        ws.close();
      }
    },
    isConnected: () => ws && ws.readyState === WebSocket.OPEN,
  };
}
