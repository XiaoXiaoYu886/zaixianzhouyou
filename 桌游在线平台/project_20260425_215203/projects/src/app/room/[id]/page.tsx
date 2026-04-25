'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/app/(auth)/context/AuthContext';
import { createWsConnection, type WsMessage } from '@/lib/ws-client';
import {
  Users,
  Gamepad2,
  MessageSquare,
  Play,
  ArrowLeft,
  Copy,
  Send,
  Crown,
  CheckCircle,
  Circle,
} from 'lucide-react';
import Link from 'next/link';

interface Player {
  userId: string;
  username: string;
  isReady?: boolean;
  isHost?: boolean;
}

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
}

export default function RoomPage() {
  const params = useParams();
  const roomId = params.id as string;
  const { user } = useAuth();
  const router = useRouter();
  
  const [roomData, setRoomData] = useState<any>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [gameState, setGameState] = useState<any>(null);
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // 初始化 Supabase
    import('@supabase/supabase-js').then(async ({ createClient }) => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (url && anonKey) {
        const supabase = createClient(url, anonKey);
        await fetchRoomData(supabase);
      }
    });
  }, [user, roomId, router]);

  useEffect(() => {
    if (!user || !roomId) return;

    const ws = createWsConnection({
      path: '/ws/game',
      onOpen: () => {
        console.log('WebSocket connected');
        setWsConnected(true);
        
        // 加入房间
        ws.send({
          type: 'room:join',
          payload: {
            roomId,
            userId: user.id,
            username: user.user_metadata?.username || user.email?.split('@')[0] || 'Player',
          },
        });
      },
      onMessage: (msg: WsMessage) => {
        handleWsMessage(msg);
      },
      onClose: () => {
        console.log('WebSocket disconnected');
        setWsConnected(false);
      },
      onError: (error) => {
        console.error('WebSocket error:', error);
        setWsConnected(false);
      },
    });

    return () => {
      ws.send({ type: 'room:leave', payload: {} });
      ws.close();
    };
  }, [user, roomId]);

  const handleWsMessage = (msg: WsMessage) => {
    switch (msg.type) {
      case 'room:player-joined':
        const joinPayload = msg.payload as any;
        setPlayers(joinPayload.players || []);
        addSystemMessage(`${joinPayload.username} 加入了房间`);
        break;

      case 'room:player-left':
        const leftPayload = msg.payload as any;
        setPlayers((prev) => prev.filter((p) => p.userId !== leftPayload.userId));
        addSystemMessage(`玩家离开了房间`);
        break;

      case 'game:started':
        const startPayload = msg.payload as any;
        setGameState(startPayload.state);
        setPlayers(startPayload.players);
        addSystemMessage('游戏开始！');
        break;

      case 'game:state-update':
        setGameState((msg.payload as any).state);
        break;

      case 'chat:message':
        const chatPayload = msg.payload as any;
        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            userId: chatPayload.userId,
            username: chatPayload.username,
            message: chatPayload.message,
            timestamp: chatPayload.timestamp,
          },
        ]);
        break;

      case 'error':
        console.error('Server error:', msg.payload);
        alert(`错误: ${(msg.payload as any).message}`);
        break;
    }
  };

  const addSystemMessage = (text: string) => {
    setChatMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        userId: 'system',
        username: '系统',
        message: text,
        timestamp: Date.now(),
      },
    ]);
  };

  const fetchRoomData = async (supabase: any) => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (error) throw error;
      setRoomData(data);
      
      // 获取房间玩家
      const { data: playersData } = await supabase
        .from('room_players')
        .select('*, profiles(username)')
        .eq('room_id', roomId);

      if (playersData) {
        const formattedPlayers = playersData.map((p: any, index: number) => ({
          userId: p.user_id,
          username: p.profiles?.username || `Player ${index + 1}`,
          isReady: p.is_ready,
          isHost: p.user_id === data.host_id,
        }));
        setPlayers(formattedPlayers);
        
        // 检查当前用户是否已准备
        const currentPlayer = formattedPlayers.find((p: Player) => p.userId === user?.id);
        if (currentPlayer) {
          setIsReady(currentPlayer.isReady || false);
        }
      }
    } catch (error) {
      console.error('获取房间数据失败:', error);
      alert('房间不存在或已解散');
      router.push('/rooms');
    } finally {
      setLoading(false);
    }
  };

  const toggleReady = async () => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (url && anonKey) {
        const supabase = createClient(url, anonKey);
        const { error } = await supabase
          .from('room_players')
          .update({ is_ready: !isReady })
          .eq('room_id', roomId)
          .eq('user_id', user?.id);

        if (error) throw error;
        setIsReady(!isReady);
        addSystemMessage(`${user?.user_metadata?.username || '玩家'} ${!isReady ? '准备' : '取消准备'}`);
      }
    } catch (error) {
      console.error('更新准备状态失败:', error);
    }
  };

  const startGame = () => {
    addSystemMessage('游戏即将开始...');
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    
    // 这里需要访问 WebSocket 连接
    // 由于我们使用的是 createWsConnection，我们需要通过 ref 或其他方式访问
    // 暂时简单实现
    setChatMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        userId: user?.id || '',
        username: user?.user_metadata?.username || '我',
        message: chatInput.trim(),
        timestamp: Date.now(),
      },
    ]);
    setChatInput('');
  };

  const copyRoomCode = () => {
    if (roomData?.room_code) {
      navigator.clipboard.writeText(roomData.room_code);
      alert('房间码已复制到剪贴板');
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

  if (!roomData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <Navigation />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Card className="text-center p-8">
            <CardTitle>房间不存在</CardTitle>
            <Link href="/rooms">
              <Button className="mt-4">返回房间列表</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const isHost = roomData.host_id === user?.id;
  const allPlayersReady = players.length >= 2 && players.every((p) => p.isReady || p.isHost);
  const currentPlayer = players.find((p) => p.userId === user?.id);
  const isMyTurn = currentPlayer && gameState?.currentTurn === players.indexOf(currentPlayer);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Room Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/rooms">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{roomData.room_name}</h1>
              <div className="flex items-center gap-2 text-gray-600">
                <Badge variant="secondary">{roomData.game_type === 'ludo' ? '🎲 飞行棋' : '🃏 二十一点'}</Badge>
                <span className="text-sm">房间码: {roomData.room_code}</span>
                <button onClick={copyRoomCode} className="hover:text-purple-600">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={wsConnected ? 'default' : 'destructive'}>
              {wsConnected ? '在线' : '离线'}
            </Badge>
            <Badge variant="outline">
              <Users className="h-4 w-4 mr-1" />
              {players.length}/{roomData.max_players}
            </Badge>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Game Board Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5" />
                  游戏区域
                </CardTitle>
              </CardHeader>
              <CardContent>
                {gameState ? (
                  <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-xl font-semibold mb-2">游戏进行中</p>
                      <p className="text-gray-600">
                        {isMyTurn ? '现在是你的回合！' : `等待 ${players[gameState.currentTurn]?.username || '下一位'} 的行动`}
                      </p>
                      {gameState.type === 'ludo' && gameState.diceValue > 0 && (
                        <div className="mt-4">
                          <div className="text-6xl font-bold text-purple-600">
                            {gameState.diceValue}
                          </div>
                          <p className="text-sm text-gray-500 mt-2">当前骰子点数</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Gamepad2 className="h-16 w-16 mx-auto mb-4 text-purple-400" />
                      <p className="text-xl font-semibold mb-2">等待游戏开始</p>
                      <p className="text-gray-600">请所有玩家准备完毕后开始游戏</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            {!gameState && (
              <div className="flex gap-4">
                <Button
                  variant={isReady ? 'secondary' : 'default'}
                  size="lg"
                  className="flex-1"
                  onClick={toggleReady}
                >
                  {isReady ? (
                    <>
                      <CheckCircle className="mr-2 h-5 w-5" />
                      已准备
                    </>
                  ) : (
                    <>
                      <Circle className="mr-2 h-5 w-5" />
                      准备游戏
                    </>
                  )}
                </Button>
                
                {isHost && (
                  <Button
                    size="lg"
                    className="flex-1"
                    disabled={!allPlayersReady}
                    onClick={startGame}
                  >
                    <Play className="mr-2 h-5 w-5" />
                    开始游戏
                  </Button>
                )}
              </div>
            )}

            {/* Game Actions (when in game) */}
            {gameState && (
              <div className="flex gap-4">
                {gameState.type === 'ludo' && isMyTurn && gameState.diceValue === 0 && (
                  <Button size="lg" className="flex-1">
                    🎲 掷骰子
                  </Button>
                )}
                {gameState.type === 'blackjack' && isMyTurn && (
                  <>
                    <Button size="lg" className="flex-1">要牌</Button>
                    <Button size="lg" variant="secondary" className="flex-1">停牌</Button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Players List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  玩家列表
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {players.map((player, index) => (
                    <div
                      key={player.userId}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        player.userId === user?.id ? 'bg-purple-100' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 font-semibold">
                          {player.username?.[0]?.toUpperCase() || 'P'}
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-1">
                            {player.username}
                            {player.isHost && <Crown className="h-4 w-4 text-yellow-500" />}
                            {player.userId === user?.id && (
                              <span className="text-xs text-purple-600">(你)</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {index === (gameState?.currentTurn || 0) && gameState && '回合中'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {player.isReady ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {Array.from({ length: roomData.max_players - players.length }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="flex items-center justify-between p-3 rounded-lg border-2 border-dashed border-gray-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                          ?
                        </div>
                        <span className="text-gray-400">等待加入...</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Chat */}
            <Card className="h-[400px] flex flex-col">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  聊天
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1 px-4">
                  <div className="space-y-3 pb-4">
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`${
                          msg.userId === 'system'
                            ? 'text-center text-sm text-gray-500 italic'
                            : msg.userId === user?.id
                            ? 'text-right'
                            : 'text-left'
                        }`}
                      >
                        {msg.userId !== 'system' && (
                          <div className="text-xs text-gray-500 mb-1">{msg.username}</div>
                        )}
                        <div
                          className={`inline-block px-3 py-1 rounded-lg ${
                            msg.userId === 'system'
                              ? 'bg-gray-100'
                              : msg.userId === user?.id
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100'
                          }`}
                        >
                          {msg.message}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="flex-shrink-0 p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      placeholder="输入消息..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendChat()}
                      className="flex-1"
                    />
                    <Button size="icon" onClick={sendChat}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
