'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/app/(auth)/context/AuthContext';
import type { Room } from '@/storage/database/shared/schema';
import {
  Plus,
  Users,
  Gamepad2,
  Search,
  Lock,
  Copy,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface RoomWithPlayers extends Room {
  players_count: number;
}

const gameTypes = [
  { id: 'ludo', name: '飞行棋', icon: '🎲', maxPlayers: 4 },
  { id: 'blackjack', name: '二十一点', icon: '🃏', maxPlayers: 6 },
];

export default function RoomsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomWithPlayers[]>([]);
  const [loading, setLoading] = useState(true);
  const [supabase, setSupabase] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGameType, setFilterGameType] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomGameType, setNewRoomGameType] = useState('ludo');
  const [newRoomMaxPlayers, setNewRoomMaxPlayers] = useState('4');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // 初始化 Supabase
    import('@supabase/supabase-js').then(({ createClient }) => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (url && anonKey) {
        const client = createClient(url, anonKey);
        setSupabase(client);
        fetchRooms(client);
      }
    });
  }, [user, router]);

  const fetchRooms = async (client: any) => {
    if (!client) return;
    
    setLoading(true);
    try {
      const { data, error } = await client
        .from('rooms')
        .select('*, room_players(count)')
        .eq('status', 'waiting')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const roomsWithPlayers: RoomWithPlayers[] = (data || []).map((room: any) => ({
        ...room,
        players_count: room.room_players?.[0]?.count || 0,
      }));

      setRooms(roomsWithPlayers);
    } catch (error) {
      console.error('获取房间列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const createRoom = async () => {
    if (!user || !newRoomName.trim() || !supabase) return;

    setCreating(true);
    try {
      // 生成房间码
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      // 创建房间
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .insert({
          room_code: roomCode,
          room_name: newRoomName,
          game_type: newRoomGameType,
          max_players: parseInt(newRoomMaxPlayers),
          host_id: user.id,
          status: 'waiting',
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // 将创建者加入房间
      const { error: playerError } = await supabase
        .from('room_players')
        .insert({
          room_id: roomData.id,
          user_id: user.id,
          player_position: 0,
          is_ready: true,
        });

      if (playerError) throw playerError;

      // 跳转到房间
      router.push(`/room/${roomData.id}`);
    } catch (error) {
      console.error('创建房间失败:', error);
      alert('创建房间失败，请重试');
    } finally {
      setCreating(false);
    }
  };

  const joinRoom = async (roomId: string) => {
    if (!user || !supabase) return;

    try {
      // 检查是否已在房间中
      const { data: existingPlayer } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .single();

      if (existingPlayer) {
        router.push(`/room/${roomId}`);
        return;
      }

      // 加入房间
      const { error } = await supabase
        .from('room_players')
        .insert({
          room_id: roomId,
          user_id: user.id,
          player_position: 0,
          is_ready: false,
        });

      if (error) throw error;

      router.push(`/room/${roomId}`);
    } catch (error) {
      console.error('加入房间失败:', error);
      alert('加入房间失败，请重试');
    }
  };

  const filteredRooms = rooms.filter((room) => {
    const matchesSearch = room.room_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.room_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGameType = filterGameType === 'all' || room.game_type === filterGameType;
    return matchesSearch && matchesGameType;
  });

  const getGameIcon = (gameType: string) => {
    const game = gameTypes.find((g) => g.id === gameType);
    return game?.icon || '🎮';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">游戏房间</h1>
            <p className="text-gray-600">选择一个房间加入，或创建新房间开始游戏</p>
          </div>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="mt-4 md:mt-0">
                <Plus className="mr-2 h-5 w-5" />
                创建房间
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>创建新房间</DialogTitle>
                <DialogDescription>
                  创建一个房间，邀请朋友一起游戏
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="roomName">房间名称</Label>
                  <Input
                    id="roomName"
                    placeholder="我的游戏房间"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gameType">游戏类型</Label>
                  <Select value={newRoomGameType} onValueChange={setNewRoomGameType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {gameTypes.map((game) => (
                        <SelectItem key={game.id} value={game.id}>
                          {game.icon} {game.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxPlayers">最大玩家数</Label>
                  <Select value={newRoomMaxPlayers} onValueChange={setNewRoomMaxPlayers}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2人</SelectItem>
                      <SelectItem value="3">3人</SelectItem>
                      <SelectItem value="4">4人</SelectItem>
                      {newRoomGameType === 'blackjack' && (
                        <SelectItem value="5">5人</SelectItem>
                      )}
                      {newRoomGameType === 'blackjack' && (
                        <SelectItem value="6">6人</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={createRoom} disabled={creating || !newRoomName.trim()}>
                  {creating ? '创建中...' : '创建房间'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索房间名称或房间码..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterGameType} onValueChange={setFilterGameType}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="游戏类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部游戏</SelectItem>
              {gameTypes.map((game) => (
                <SelectItem key={game.id} value={game.id}>
                  {game.icon} {game.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => supabase && fetchRooms(supabase)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新
          </Button>
        </div>

        {/* Room List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">加载中...</div>
          </div>
        ) : filteredRooms.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Gamepad2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">暂无房间</h3>
              <p className="text-gray-500 mb-4">成为第一个创建房间的人吧！</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                创建房间
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.map((room) => (
              <Card key={room.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{room.room_name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">{getGameIcon(room.game_type)}</Badge>
                        {room.room_code}
                        <button
                          onClick={() => navigator.clipboard.writeText(room.room_code)}
                          className="hover:text-purple-600"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </CardDescription>
                    </div>
                    <Badge variant={room.status === 'waiting' ? 'default' : 'secondary'}>
                      {room.status === 'waiting' ? '等待中' : '游戏中'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Users className="h-4 w-4" />
                      <span>
                        {room.players_count} / {room.max_players} 人
                      </span>
                    </div>
                    <div className="text-gray-500">
                      房主: {room.host_id.slice(0, 8)}...
                    </div>
                  </div>
                </CardContent>
                <CardContent className="pt-0">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      {/* Player avatars */}
                      <div className="flex -space-x-2">
                        {Array.from({ length: Math.min(room.players_count, 4) }).map((_, i) => (
                          <div
                            key={i}
                            className="w-8 h-8 rounded-full bg-purple-100 border-2 border-white flex items-center justify-center text-purple-600 text-xs font-semibold"
                          >
                            P{i + 1}
                          </div>
                        ))}
                        {room.players_count > 4 && (
                          <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-gray-600 text-xs">
                            +{room.players_count - 4}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardContent className="pt-0">
                  <Button
                    className="w-full"
                    disabled={room.status !== 'waiting' || room.players_count >= room.max_players}
                    onClick={() => joinRoom(room.id)}
                  >
                    加入房间
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
