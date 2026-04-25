'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '../context/AuthContext';
import { Loader2, AlertCircle, CheckCircle, Gamepad2 } from 'lucide-react';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp, demoMode } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 验证密码匹配
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    // 验证密码长度
    if (password.length < 6) {
      setError('密码至少需要 6 个字符');
      return;
    }

    // 验证用户名
    if (username.length < 2 || username.length > 20) {
      setError('用户名长度需要在 2-20 个字符之间');
      return;
    }

    setLoading(true);

    try {
      const { error } = await signUp(email, password, username);
      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        // 3秒后跳转到大厅
        setTimeout(() => {
          router.push('/lobby');
        }, 3000);
      }
    } catch (err) {
      setError('注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <Card className="w-full max-w-md backdrop-blur-sm bg-white/10 border-white/20">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-400" />
              <h2 className="text-2xl font-bold text-white">注册成功！</h2>
              <p className="text-gray-300">
                {demoMode ? (
                  <>
                    演示模式账号创建成功！
                    <br />
                    即将跳转到游戏大厅...
                  </>
                ) : (
                  <>
                    请查收验证邮件，点击邮件中的链接完成激活。
                    <br />
                    即将跳转到登录页面...
                  </>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <Card className="w-full max-w-md backdrop-blur-sm bg-white/10 border-white/20">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center text-white">创建账号</CardTitle>
          <CardDescription className="text-center text-gray-300">
            {demoMode ? '加入桌游平台，体验精彩游戏' : '加入桌游平台，与朋友一起玩耍'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {demoMode && (
              <div className="flex items-center gap-2 p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg text-blue-200 text-sm">
                <Gamepad2 className="h-5 w-5" />
                <span>🎮 演示模式 - 数据保存在本地</span>
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm">{error}</span>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="username" className="text-white">用户名</Label>
              <Input
                id="username"
                type="text"
                placeholder="你的游戏昵称"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white">确认密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  注册中...
                </>
              ) : (
                '注册'
              )}
            </Button>
            
            <p className="text-sm text-center text-gray-300">
              已有账号？{' '}
              <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
                立即登录
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
