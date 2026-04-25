import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '桌游平台 - BoardGame Hub',
    template: '%s | 桌游平台',
  },
  description:
    '在线桌游平台，与朋友一起享受经典桌游的乐趣。支持飞行棋、二十一点等多种游戏。',
  keywords: [
    '桌游',
    '在线桌游',
    '飞行棋',
    '二十一点',
    '多人游戏',
    '棋牌游戏',
  ],
  authors: [{ name: 'BoardGame Hub' }],
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
