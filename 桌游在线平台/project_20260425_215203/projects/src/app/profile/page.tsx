'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/app/(auth)/context/AuthContext';
import type { Profile, GameRecord } from '@/storage/database/shared/schema';
import { Trophy, Gamepad2, TrendingUp, Calendar, Star, Target } from 'lucide-react';
import Link from 'next/link';

interface ProfileWithStats extends Profile {
  winRate?: number;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileWithStats | null>(null);
  const [gameRecords, setGameRecords] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // 初始化 Supabase
    import('@supabase/supabase-js').then(async ({ createClient }) => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (url && anonKey) {
        const supabase = createClient(url, anonKey);
        await fetchProfile(supabase);
        await fetchGameRecords(supabase);
      }
    });
  }, [user]);

  const fetchProfile = async (supabase: any) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      
      const winRate = data.total_games > 0 
        ? ((data.total_wins / data.total_games) * 100).toFixed(1)
        : '0';
      
      setProfile({ ...data, winRate: parseFloat(winRate) });
    } catch (error) {
      console.error('获取用户资料失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGameRecords = async (supabase: any) => {
    try {
      const { data, error } = await supabase
        .from('game_records')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setGameRecords(data || []);
    } catch (error) {
      console.error('获取游戏记录失败:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <Navigation />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-gray-500">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-4xl font-bold">
                {profile?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{profile?.username || '玩家'}</h1>
                <p className="text-gray-600 mb-4">{user?.email}</p>
                <div className="flex gap-4">
                  <Badge variant="secondary" className="text-sm">
                    <Star className="h-4 w-4 mr-1" />
                    总积分: {profile?.total_score || 0}
                  </Badge>
                  <Badge variant="secondary" className="text-sm">
                    <Target className="h-4 w-4 mr-1" />
                    胜率: {profile?.winRate || 0}%
                  </Badge>
                </div>
              </div>
              <Link href="/lobby">
                <Button>开始游戏</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总游戏场次</CardTitle>
              <Gamepad2 className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{profile?.total_games || 0}</div>
              <p className="text-xs text-gray-500">场</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">获胜场次</CardTitle>
              <Trophy className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{profile?.total_wins || 0}</div>
              <p className="text-xs text-gray-500">胜</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总积分</CardTitle>
              <Star className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{profile?.total_score || 0}</div>
              <p className="text-xs text-gray-500">分</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">平均排名</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {profile?.total_games && profile.total_games > 0
                  ? ((profile.total_score / profile.total_games) + 1).toFixed(1)
                  : '-'}
              </div>
              <p className="text-xs text-gray-500">名</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="records" className="space-y-6">
          <TabsList>
            <TabsTrigger value="records">
              <Gamepad2 className="h-4 w-4 mr-2" />
              游戏记录
            </TabsTrigger>
            <TabsTrigger value="achievements">
              <Trophy className="h-4 w-4 mr-2" />
              成就
            </TabsTrigger>
          </TabsList>

          <TabsContent value="records">
            <Card>
              <CardHeader>
                <CardTitle>最近游戏</CardTitle>
                <CardDescription>查看你最近的10场游戏记录</CardDescription>
              </CardHeader>
              <CardContent>
                {gameRecords.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Gamepad2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>还没有游戏记录</p>
                    <Link href="/lobby">
                      <Button className="mt-4">开始游戏</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {gameRecords.map((record) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-gray-50"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                            record.game_type === 'ludo' ? 'bg-blue-100' : 'bg-green-100'
                          }`}>
                            {record.game_type === 'ludo' ? '🎲' : '🃏'}
                          </div>
                          <div>
                            <div className="font-semibold">
                              {record.game_type === 'ludo' ? '飞行棋' : '二十一点'}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              {new Date(record.created_at).toLocaleDateString('zh-CN')}
                            </div>
                          </div>
                        </div>
                        <Badge variant={record.winner_id === user?.id ? 'default' : 'secondary'}>
                          {record.winner_id === user?.id ? '胜利' : '参与'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements">
            <Card>
              <CardHeader>
                <CardTitle>成就系统</CardTitle>
                <CardDescription>完成成就解锁奖励和称号</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border-2 border-dashed border-gray-200 text-center opacity-50">
                    <div className="text-4xl mb-2">🏆</div>
                    <div className="font-semibold">首胜</div>
                    <div className="text-sm text-gray-500">赢得第一场游戏</div>
                  </div>
                  <div className="p-4 rounded-lg border-2 border-dashed border-gray-200 text-center opacity-50">
                    <div className="text-4xl mb-2">🎯</div>
                    <div className="font-semibold">十连胜</div>
                    <div className="text-sm text-gray-500">连续赢得10场游戏</div>
                  </div>
                  <div className="p-4 rounded-lg border-2 border-dashed border-gray-200 text-center opacity-50">
                    <div className="text-4xl mb-2">🌟</div>
                    <div className="font-semibold">常胜将军</div>
                    <div className="text-sm text-gray-500">累计赢得100场游戏</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
