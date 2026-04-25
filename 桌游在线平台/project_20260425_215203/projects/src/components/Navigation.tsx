'use client';

import Link from 'next/link';
import { useAuth } from '@/app/(auth)/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Gamepad2, LogOut, User, Trophy, Users } from 'lucide-react';

export function Navigation() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
  };

  return (
    <nav className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/lobby" className="flex items-center gap-2">
            <Gamepad2 className="h-8 w-8 text-purple-600" />
            <span className="text-xl font-bold text-gray-900">桌游平台</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/lobby"
              className="text-sm font-medium text-gray-700 hover:text-purple-600 transition-colors"
            >
              大厅
            </Link>
            <Link
              href="/lobby#games"
              className="text-sm font-medium text-gray-700 hover:text-purple-600 transition-colors"
            >
              游戏
            </Link>
            <Link
              href="/lobby#leaderboard"
              className="text-sm font-medium text-gray-700 hover:text-purple-600 transition-colors"
            >
              排行榜
            </Link>
          </div>

          {/* User Menu */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar>
                    <AvatarImage src="" alt={user.email || ''} />
                    <AvatarFallback className="bg-purple-100 text-purple-600">
                      {user.email?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.email}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.user_metadata?.username || '玩家'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    个人中心
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile#stats">
                    <Trophy className="mr-2 h-4 w-4" />
                    我的战绩
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/rooms">
                    <Users className="mr-2 h-4 w-4" />
                    我的房间
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost">登录</Button>
              </Link>
              <Link href="/register">
                <Button>注册</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
