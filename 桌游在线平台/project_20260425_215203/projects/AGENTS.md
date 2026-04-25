# 桌游平台项目 - AGENTS.md

## 项目概述

这是一个基于 Next.js 的在线桌游平台，支持用户注册登录、房间系统、实时联机对战等功能。

## 技术栈

- **框架**: Next.js 16 (App Router)
- **核心**: React 19
- **语言**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **样式**: Tailwind CSS 4
- **数据库**: Supabase (PostgreSQL)
- **实时通信**: WebSocket (ws)
- **包管理**: pnpm

## 项目结构

```
/workspace/projects/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── context/AuthContext.tsx     # 认证上下文
│   │   │   ├── login/page.tsx              # 登录页面
│   │   │   └── register/page.tsx           # 注册页面
│   │   ├── lobby/page.tsx                  # 大厅页面
│   │   ├── rooms/page.tsx                  # 房间列表页面
│   │   ├── room/[id]/page.tsx              # 游戏房间页面
│   │   ├── profile/page.tsx                # 个人中心页面
│   │   ├── layout.tsx                      # 根布局
│   │   └── page.tsx                        # 首页（重定向到大厅）
│   ├── components/
│   │   └── Navigation.tsx                  # 导航栏组件
│   ├── lib/
│   │   ├── supabase-client.ts              # 客户端 Supabase 客户端
│   │   └── ws-client.ts                     # WebSocket 客户端工具
│   ├── ws-handlers/
│   │   └── game.ts                         # 游戏 WebSocket 处理器
│   ├── storage/database/
│   │   ├── supabase-client.ts              # 服务端 Supabase 客户端
│   │   └── shared/schema.ts                # 数据库 schema 定义
│   └── server.ts                           # 自定义服务器入口
├── .coze                                   # 项目配置文件
└── package.json
```

## 数据库表

### profiles (用户资料表)
- `id`: 主键 UUID
- `user_id`: 关联 Supabase Auth
- `username`: 用户名
- `avatar_url`: 头像 URL
- `total_games`: 总游戏场次
- `total_wins`: 总获胜次数
- `total_score`: 总积分

### rooms (房间表)
- `id`: 主键 UUID
- `room_code`: 房间码 (8位)
- `room_name`: 房间名称
- `game_type`: 游戏类型 (ludo/blackjack)
- `max_players`: 最大玩家数
- `current_players`: 当前玩家数
- `status`: 房间状态 (waiting/playing/finished)
- `host_id`: 房主 ID

### room_players (玩家房间关系表)
- `id`: 主键 UUID
- `room_id`: 房间 ID
- `user_id`: 用户 ID
- `player_position`: 玩家位置
- `is_ready`: 是否准备
- `is_online`: 是否在线
- `score`: 当前分数

### game_records (游戏记录表)
- `id`: 主键 UUID
- `room_id`: 房间 ID
- `game_type`: 游戏类型
- `winner_id`: 获胜者 ID
- `game_data`: 游戏数据 (JSON)
- `started_at`: 开始时间
- `ended_at`: 结束时间

### chat_messages (聊天记录表)
- `id`: 主键 UUID
- `room_id`: 房间 ID
- `user_id`: 用户 ID
- `message`: 消息内容
- `message_type`: 消息类型

## 主要功能

### 1. 用户系统
- 用户注册 (邮箱 + 用户名 + 密码)
- 用户登录
- 个人信息管理
- 战绩统计

### 2. 房间系统
- 创建房间 (选择游戏类型、最大玩家数)
- 加入房间 (通过房间码或房间列表)
- 房间管理 (准备/取消准备)
- 实时玩家列表

### 3. 游戏系统
- **飞行棋 (Ludo)**: 经典飞行棋游戏，支持 2-4 人对战
- **二十一点 (Blackjack)**: 经典赌场纸牌游戏

### 4. 实时通信
- WebSocket 实时同步游戏状态
- 房间内聊天功能
- 玩家状态同步

## 开发命令

```bash
# 安装依赖
pnpm install

# 开发环境
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务
pnpm start

# 类型检查
pnpm ts-check

# 代码检查
pnpm lint
```

## 访问地址

- 本地开发: http://localhost:5000
- 大厅: /lobby
- 房间列表: /rooms
- 登录: /login
- 注册: /register

## 游戏规则

### 飞行棋
- 玩家轮流掷骰子
- 掷到 6 点可以出发棋子
- 棋子到达终点即为完成
- 最先完成所有棋子 (4颗) 的玩家获胜
- 撞到其他棋子会将其打回起点

### 二十一点
- 玩家下注后获得两张牌
- 可以选择要牌或停牌
- 点数超过 21 点爆牌
- 最接近 21 点且不超过的获胜

## 注意事项

1. 所有页面都需要登录才能访问
2. WebSocket 连接使用 `/ws/game` 端点
3. 数据库操作使用 Supabase SDK
4. 客户端 Supabase 使用 `src/lib/supabase-client.ts`
5. 服务端 Supabase 使用 `src/storage/database/supabase-client.ts`
