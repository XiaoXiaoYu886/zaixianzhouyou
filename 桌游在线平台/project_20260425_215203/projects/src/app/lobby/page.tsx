'use client';

import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/app/(auth)/context/AuthContext';
import Link from 'next/link';
import { useEffect } from 'react';
import { 
  Gamepad2, 
  Users, 
  Trophy, 
  Zap, 
  TrendingUp,
  Crown,
  Star,
  ArrowRight,
  Dice5,
  Target,
  Timer
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Game {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  players: string;
  color: string;
  path: string;
}

const games: Game[] = [
  {
    id: 'ludo',
    name: '飞行棋',
    description: '经典飞行棋，与朋友一起投掷骰子，驾飞机回家！支持2-4人游戏。',
    icon: <Dice5 className="h-12 w-12" />,
    players: '2-4人',
    color: 'text-blue-600 bg-blue-100',
    path: '/games/ludo',
  },
  {
    id: 'blackjack',
    name: '二十一点',
    description: '经典赌场纸牌游戏，尝试获得最接近21点的点数！',
    icon: <Target className="h-12 w-12" />,
    players: '2-6人',
    color: 'text-green-600 bg-green-100',
    path: '/games/blackjack',
  },
  {
    id: 'coming-soon',
    name: '更多游戏',
    description: '狼人杀、UNO、斗地主... 更多精彩游戏即将上线！',
    icon: <Zap className="h-12 w-12" />,
    players: '开发中',
    color: 'text-purple-600 bg-purple-100',
    path: '/lobby#games',
  },
];

interface LeaderboardUser {
  rank: number;
  username: string;
  score: number;
  games: number;
  wins: number;
}

const leaderboard: LeaderboardUser[] = [
  { rank: 1, username: '游戏大神', score: 12500, games: 156, wins: 89 },
  { rank: 2, username: '桌游达人', score: 11800, games: 142, wins: 78 },
  { rank: 3, username: '骰子之王', score: 10200, games: 128, wins: 65 },
  { rank: 4, username: '棋逢对手', score: 9800, games: 115, wins: 58 },
  { rank: 5, username: '牌技精湛', score: 8500, games: 98, wins: 49 },
];

export default function LobbyPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // 使用 useEffect 处理重定向，避免在渲染期间调用 router
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  // 加载中或未登录时显示加载状态
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <Navigation />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">
              欢迎来到桌游平台
            </h1>
            <p className="text-xl text-purple-100 mb-8">
              与朋友一起享受经典桌游的乐趣，在线对战，实时互动
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/rooms">
                <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50">
                  <Users className="mr-2 h-5 w-5" />
                  进入房间
                </Button>
              </Link>
              <Link href="/lobby#games">
                <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10">
                  浏览游戏
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="py-12 bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">1,234</div>
              <div className="text-gray-600">在线玩家</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">567</div>
              <div className="text-gray-600">开放房间</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">8,901</div>
              <div className="text-gray-600">今日对局</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-600 mb-2">99.9%</div>
              <div className="text-gray-600">服务稳定性</div>
            </div>
          </div>
        </div>
      </section>

      {/* Games Section */}
      <section id="games" className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">选择你的游戏</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              经典桌游，线上对决。无论你喜欢策略还是运气，这里都有适合你的游戏！
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {games.map((game) => (
              <Card key={game.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-lg ${game.color}`}>
                      {game.icon}
                    </div>
                    <Badge variant="secondary">{game.players}</Badge>
                  </div>
                  <CardTitle className="text-2xl mt-4">{game.name}</CardTitle>
                  <CardDescription>{game.description}</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Link href={game.path} className="w-full">
                    <Button className="w-full">
                      开始游戏
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Leaderboard Section */}
      <section id="leaderboard" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              <Trophy className="inline-block h-10 w-10 text-yellow-500 mr-2" />
              排行榜
            </h2>
            <p className="text-gray-600">本周最活跃的玩家，争夺榜首位置！</p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>本周积分榜</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {leaderboard.map((player) => (
                    <div
                      key={player.rank}
                      className="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          player.rank === 1 ? 'bg-yellow-100 text-yellow-600' :
                          player.rank === 2 ? 'bg-gray-200 text-gray-600' :
                          player.rank === 3 ? 'bg-orange-100 text-orange-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {player.rank <= 3 ? (
                            <Crown className="h-5 w-5" />
                          ) : (
                            player.rank
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{player.username}</div>
                          <div className="text-sm text-gray-500">
                            {player.games} 场游戏 · {player.wins} 胜
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-purple-600">
                          {player.score.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">积分</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Link href="/leaderboard" className="w-full">
                  <Button variant="outline" className="w-full">
                    查看完整排行榜
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">实时对战</h3>
              <p className="text-gray-600">WebSocket 实时同步，流畅的游戏体验</p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">好友系统</h3>
              <p className="text-gray-600">邀请好友一起玩，社交娱乐两不误</p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">战绩统计</h3>
              <p className="text-gray-600">详细数据统计，不断提升你的游戏技巧</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Gamepad2 className="h-6 w-6" />
              <span className="text-lg font-bold">桌游平台</span>
            </div>
            <p className="text-gray-400">
              与朋友一起，享受桌游的乐趣
            </p>
            <p className="text-sm text-gray-500 mt-4">
              © 2024 桌游平台. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
