import { WebSocketServer, WebSocket } from 'ws';
import type { WsMessage } from '../lib/ws-client';

// 房间状态管理
interface GameRoom {
  id: string;
  gameType: string;
  players: Map<string, { ws: WebSocket; userId: string; username: string }>;
  state: any;
  createdAt: Date;
}

// 活跃房间映射
const activeRooms = new Map<string, GameRoom>();

// 心跳状态
const clientAliveStatus = new WeakMap<WebSocket, boolean>();

export function setupGameHandler(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket connection');

    clientAliveStatus.set(ws, true);

    ws.on('message', (raw) => {
      try {
        const msg: WsMessage = JSON.parse(raw.toString());

        // 心跳响应
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', payload: null }));
          return;
        }

        // 处理游戏消息
        handleGameMessage(ws, msg);
      } catch (err) {
        console.error('Message parse error:', err);
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid message format' } }));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket disconnected');
      handleDisconnect(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      handleDisconnect(ws);
    });

    // 心跳检测
    ws.on('pong', () => {
      clientAliveStatus.set(ws, true);
    });
  });

  // 定期心跳检测
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (clientAliveStatus.get(ws) === false) {
        ws.terminate();
        return;
      }
      clientAliveStatus.set(ws, false);
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });
}

function handleGameMessage(ws: WebSocket, msg: WsMessage) {
  const { type, payload } = msg;

  switch (type) {
    case 'room:join':
      handleJoinRoom(ws, payload as { roomId: string; userId: string; username: string });
      break;

    case 'room:leave':
      handleLeaveRoom(ws);
      break;

    case 'game:start':
      handleStartGame(ws);
      break;

    case 'game:action':
      handleGameAction(ws, payload as { action: string; data: any });
      break;

    case 'chat:send':
      handleChatMessage(ws, payload as { message: string });
      break;

    default:
      ws.send(JSON.stringify({ type: 'error', payload: { message: `Unknown message type: ${type}` } }));
  }
}

function handleJoinRoom(ws: WebSocket, payload: { roomId: string; userId: string; username: string }) {
  const { roomId, userId, username } = payload;

  let room = activeRooms.get(roomId);
  
  if (!room) {
    // 创建新房间
    room = {
      id: roomId,
      gameType: 'ludo', // 默认游戏类型
      players: new Map(),
      state: null,
      createdAt: new Date(),
    };
    activeRooms.set(roomId, room);
  }

  // 添加玩家
  room.players.set(userId, { ws, userId, username });

  // 存储用户信息到 WebSocket
  (ws as any).userId = userId;
  (ws as any).roomId = roomId;

  // 广播玩家加入
  broadcastToRoom(roomId, {
    type: 'room:player-joined',
    payload: {
      userId,
      username,
      playerCount: room.players.size,
      players: Array.from(room.players.values()).map(p => ({
        userId: p.userId,
        username: p.username,
      })),
    },
  }, userId);

  console.log(`User ${username} joined room ${roomId}`);
}

function handleLeaveRoom(ws: WebSocket) {
  const userId = (ws as any).userId;
  const roomId = (ws as any).roomId;

  if (userId && roomId) {
    const room = activeRooms.get(roomId);
    if (room) {
      room.players.delete(userId);
      
      broadcastToRoom(roomId, {
        type: 'room:player-left',
        payload: {
          userId,
          playerCount: room.players.size,
        },
      });

      // 如果房间为空，删除房间
      if (room.players.size === 0) {
        activeRooms.delete(roomId);
        console.log(`Room ${roomId} deleted (empty)`);
      }
    }

    (ws as any).userId = null;
    (ws as any).roomId = null;
  }
}

function handleDisconnect(ws: WebSocket) {
  handleLeaveRoom(ws);
}

function handleStartGame(ws: WebSocket) {
  const roomId = (ws as any).roomId;
  const room = activeRooms.get(roomId);

  if (!room) {
    ws.send(JSON.stringify({ type: 'error', payload: { message: 'Room not found' } }));
    return;
  }

  // 初始化游戏状态
  if (room.gameType === 'ludo') {
    room.state = initializeLudoState(room.players.size);
  } else if (room.gameType === 'blackjack') {
    room.state = initializeBlackjackState();
  }

  // 广播游戏开始
  broadcastToRoom(room.id, {
    type: 'game:started',
    payload: {
      gameType: room.gameType,
      state: room.state,
      players: Array.from(room.players.values()).map(p => ({
        userId: p.userId,
        username: p.username,
      })),
    },
  });
}

function handleGameAction(ws: WebSocket, payload: { action: string; data: any }) {
  const roomId = (ws as any).roomId;
  const userId = (ws as any).userId;
  const room = activeRooms.get(roomId);

  if (!room) {
    ws.send(JSON.stringify({ type: 'error', payload: { message: 'Room not found' } }));
    return;
  }

  // 处理特定游戏的动作
  if (room.gameType === 'ludo') {
    handleLudoAction(room, userId, payload);
  } else if (room.gameType === 'blackjack') {
    handleBlackjackAction(room, userId, payload);
  }
}

function handleChatMessage(ws: WebSocket, payload: { message: string }) {
  const roomId = (ws as any).roomId;
  const userId = (ws as any).userId;
  const room = activeRooms.get(roomId);

  if (!room || !userId) return;

  const player = room.players.get(userId);
  if (!player) return;

  broadcastToRoom(roomId, {
    type: 'chat:message',
    payload: {
      userId,
      username: player.username,
      message: payload.message,
      timestamp: Date.now(),
    },
  });
}

// ==================== 飞行棋逻辑 ====================

interface LudoState {
  type: 'ludo';
  board: number[];
  players: LudoPlayer[];
  currentTurn: number;
  diceValue: number;
  gameOver: boolean;
  winner: string | null;
}

interface LudoPlayer {
  userId: string;
  username: string;
  pieces: number[]; // 每颗棋子的位置 (0-56, -1表示未出发)
  finishedCount: number;
}

function initializeLudoState(playerCount: number): LudoState {
  const players: LudoPlayer[] = [];
  
  for (let i = 0; i < playerCount; i++) {
    players.push({
      userId: '',
      username: `Player ${i + 1}`,
      pieces: [-1, -1, -1, -1], // 初始都在起点
      finishedCount: 0,
    });
  }

  return {
    type: 'ludo',
    board: new Array(52).fill(null), // 52个公共格子
    players,
    currentTurn: 0,
    diceValue: 0,
    gameOver: false,
    winner: null,
  };
}

function handleLudoAction(room: GameRoom, userId: string, payload: { action: string; data: any }) {
  const state = room.state as LudoState;
  if (!state || state.type !== 'ludo') return;

  const playerIndex = state.players.findIndex(p => p.userId === userId);
  if (playerIndex !== state.currentTurn) {
    room.players.get(userId)?.ws.send(
      JSON.stringify({ type: 'error', payload: { message: 'Not your turn' } })
    );
    return;
  }

  switch (payload.action) {
    case 'roll':
      const diceValue = Math.floor(Math.random() * 6) + 1;
      state.diceValue = diceValue;
      
      // 如果没有棋子可以移动，自动结束回合
      const canMove = checkCanMove(state, playerIndex);
      if (!canMove) {
        state.currentTurn = (state.currentTurn + 1) % state.players.length;
      }
      
      broadcastToRoom(room.id, {
        type: 'game:state-update',
        payload: { state },
      });
      break;

    case 'move':
      const pieceIndex = payload.data.pieceIndex;
      if (canMovePiece(state, playerIndex, pieceIndex)) {
        movePiece(room, state, playerIndex, pieceIndex);
        
        // 检查是否有人获胜
        const winner = checkLudoWinner(state);
        if (winner !== null) {
          state.gameOver = true;
          state.winner = state.players[winner].userId;
        } else if (state.diceValue !== 6) {
          // 非6点换人
          state.currentTurn = (state.currentTurn + 1) % state.players.length;
        }
        
        broadcastToRoom(room.id, {
          type: 'game:state-update',
          payload: { state },
        });
      }
      break;
  }
}

function checkCanMove(state: LudoState, playerIndex: number): boolean {
  for (let i = 0; i < 4; i++) {
    if (canMovePiece(state, playerIndex, i)) return true;
  }
  return false;
}

function canMovePiece(state: LudoState, playerIndex: number, pieceIndex: number): boolean {
  const piece = state.players[playerIndex].pieces[pieceIndex];
  const diceValue = state.diceValue;

  if (piece === -1) {
    // 棋子未出发，需要掷到6点
    return diceValue === 6;
  } else if (piece >= 0 && piece < 52) {
    // 棋子在棋盘上
    const newPos = (piece + diceValue) % 52;
    return true;
  } else if (piece >= 52 && piece < 56) {
    // 棋子在终点区域
    const newPos = piece + diceValue;
    return newPos <= 56;
  }
  return false;
}

function movePiece(room: GameRoom, state: LudoState, playerIndex: number, pieceIndex: number) {
  const piece = state.players[playerIndex].pieces[pieceIndex];
  const diceValue = state.diceValue;

  if (piece === -1 && diceValue === 6) {
    // 出发
    state.players[playerIndex].pieces[pieceIndex] = 0;
  } else if (piece >= 0 && piece < 52) {
    // 移动
    const newPos = (piece + diceValue) % 52;
    state.players[playerIndex].pieces[pieceIndex] = newPos;
    
    // 检查是否撞到其他棋子（打回起点）
    for (let i = 0; i < state.players.length; i++) {
      if (i !== playerIndex) {
        for (let j = 0; j < 4; j++) {
          if (state.players[i].pieces[j] === newPos) {
            state.players[i].pieces[j] = -1;
            broadcastToRoom(room.id, {
              type: 'game:piece-eaten',
              payload: { by: state.players[playerIndex].username },
            });
          }
        }
      }
    }
  } else if (piece >= 52 && piece < 56) {
    // 终点区域
    const newPos = piece + diceValue;
    if (newPos === 56) {
      state.players[playerIndex].finishedCount++;
      state.players[playerIndex].pieces[pieceIndex] = 57; // 已完成
    } else {
      state.players[playerIndex].pieces[pieceIndex] = newPos;
    }
  }
}

function checkLudoWinner(state: LudoState): number | null {
  for (let i = 0; i < state.players.length; i++) {
    if (state.players[i].finishedCount >= 4) {
      return i;
    }
  }
  return null;
}

// ==================== 二十一点逻辑 ====================

interface BlackjackState {
  type: 'blackjack';
  deck: string[];
  players: BlackjackPlayer[];
  dealerHand: string[];
  currentPlayerIndex: number;
  gamePhase: 'betting' | 'playing' | 'dealing' | 'finished';
  winner: string | null;
}

interface BlackjackPlayer {
  userId: string;
  username: string;
  hand: string[];
  bet: number;
  score: number;
  standing: boolean;
  busted: boolean;
}

function initializeBlackjackState(): BlackjackState {
  return {
    type: 'blackjack',
    deck: createDeck(),
    players: [],
    dealerHand: [],
    currentPlayerIndex: 0,
    gamePhase: 'betting',
    winner: null,
  };
}

function createDeck(): string[] {
  const suits = ['♠', '♥', '♦', '♣'];
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck: string[] = [];
  
  for (let i = 0; i < 4; i++) {
    for (const value of values) {
      deck.push(`${value}${suits[i]}`);
    }
  }
  
  // 洗牌
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  
  return deck;
}

function getCardValue(card: string): number {
  const value = card.slice(0, -1);
  if (value === 'A') return 11;
  if (['K', 'Q', 'J'].includes(value)) return 10;
  return parseInt(value);
}

function calculateScore(hand: string[]): number {
  let score = 0;
  let aces = 0;
  
  for (const card of hand) {
    const value = getCardValue(card);
    score += value;
    if (card.startsWith('A')) aces++;
  }
  
  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }
  
  return score;
}

function handleBlackjackAction(room: GameRoom, userId: string, payload: { action: string; data: any }) {
  const state = room.state as BlackjackState;
  if (!state || state.type !== 'blackjack') return;

  const playerIndex = state.players.findIndex(p => p.userId === userId);
  if (playerIndex !== state.currentPlayerIndex) {
    room.players.get(userId)?.ws.send(
      JSON.stringify({ type: 'error', payload: { message: 'Not your turn' } })
    );
    return;
  }

  switch (payload.action) {
    case 'bet':
      const player = state.players[playerIndex];
      if (state.gamePhase === 'betting') {
        player.bet = payload.data.bet || 100;
        state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
        
        if (state.currentPlayerIndex === 0) {
          // 所有玩家下注完成，开始发牌
          state.gamePhase = 'dealing';
          dealInitialCards(state);
        }
        
        broadcastToRoom(room.id, {
          type: 'game:state-update',
          payload: { state },
        });
      }
      break;

    case 'hit':
      const hitCard = state.deck.pop();
      if (hitCard) {
        state.players[playerIndex].hand.push(hitCard);
        state.players[playerIndex].score = calculateScore(state.players[playerIndex].hand);
        
        if (state.players[playerIndex].score > 21) {
          state.players[playerIndex].busted = true;
          nextPlayer(state);
        }
        
        broadcastToRoom(room.id, {
          type: 'game:state-update',
          payload: { state },
        });
      }
      break;

    case 'stand':
      state.players[playerIndex].standing = true;
      nextPlayer(state);
      
      if (state.currentPlayerIndex === -1) {
        // 庄家回合
        dealerPlay(room, state);
      }
      
      broadcastToRoom(room.id, {
        type: 'game:state-update',
        payload: { state },
      });
      break;
  }
}

function dealInitialCards(state: BlackjackState) {
  // 每人发两张
  for (let i = 0; i < 2; i++) {
    for (const player of state.players) {
      const card = state.deck.pop();
      if (card) {
        player.hand.push(card);
        player.score = calculateScore(player.hand);
      }
    }
    // 庄家两张
    const dealerCard = state.deck.pop();
    if (dealerCard) {
      state.dealerHand.push(dealerCard);
    }
  }
  
  state.gamePhase = 'playing';
  state.currentPlayerIndex = 0;
}

function nextPlayer(state: BlackjackState) {
  let next = state.currentPlayerIndex + 1;
  
  while (next < state.players.length) {
    if (!state.players[next].busted && !state.players[next].standing) {
      state.currentPlayerIndex = next;
      return;
    }
    next++;
  }
  
  // 所有玩家都已完成
  state.currentPlayerIndex = -1;
}

function dealerPlay(room: GameRoom, state: BlackjackState) {
  const dealerScore = calculateScore(state.dealerHand);
  
  while (dealerScore < 17) {
    const card = state.deck.pop();
    if (card) {
      state.dealerHand.push(card);
    }
  }
  
  state.gamePhase = 'finished';
  
  // 计算赢家
  const finalDealerScore = calculateScore(state.dealerHand);
  
  for (const player of state.players) {
    if (player.busted) {
      player.score = 0; // 输了
    } else if (finalDealerScore > 21) {
      // 庄家爆牌，所有玩家赢
      state.winner = player.userId;
    } else if (player.score > finalDealerScore) {
      state.winner = player.userId;
    } else if (player.score < finalDealerScore) {
      player.score = 0; // 输了
    } else {
      // 平局
      player.score = player.bet; // 退回赌注
    }
  }
  
  broadcastToRoom(room.id, {
    type: 'game:finished',
    payload: { state, dealerScore: finalDealerScore },
  });
}

// ==================== 辅助函数 ====================

function broadcastToRoom(roomId: string, message: WsMessage, excludeUserId?: string) {
  const room = activeRooms.get(roomId);
  if (!room) return;

  const messageStr = JSON.stringify(message);
  
  room.players.forEach((player) => {
    if (excludeUserId && player.userId === excludeUserId) return;
    
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(messageStr);
    }
  });
}
