import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import { setupGameHandler } from './ws-handlers/game';

const dev = process.env.COZE_PROJECT_ENV !== 'PROD';
const hostname = '0.0.0.0';
const PORT = parseInt(process.env.DEPLOY_RUN_PORT || '5000', 10);

// Create Next.js app
const app = next({ dev, hostname, port: PORT });
const handle = app.getRequestHandler();

// WebSocket 服务器映射
const wssMap = new Map<string, WebSocketServer>();

function registerWsEndpoint(path: string): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });
  wssMap.set(path, wss);
  return wss;
}

function handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer) {
  const { pathname } = new URL(req.url!, `http://${req.headers.host}`);
  
  // 查找匹配的 WebSocket 处理器
  const wss = wssMap.get(pathname);
  
  if (wss) {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  } else if (!dev) {
    // 生产环境销毁未注册的 upgrade 请求
    socket.destroy();
  }
  // 开发环境不处理，让 Next.js HMR 处理
}

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  });

  // 注册 WebSocket 端点
  const gameWss = registerWsEndpoint('/ws/game');
  setupGameHandler(gameWss);

  server.on('upgrade', handleUpgrade);

  server.listen(PORT, hostname, () => {
    console.log(`> Server listening at http://${hostname}:${PORT} as ${dev ? 'development' : process.env.COZE_PROJECT_ENV}`);
    console.log(`> WebSocket endpoint: ws://${hostname}:${PORT}/ws/game`);
  });
});
