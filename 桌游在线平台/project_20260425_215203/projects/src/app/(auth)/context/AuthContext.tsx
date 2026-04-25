'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';

// 本地存储的用户类型
interface LocalUser {
  id: string;
  email: string;
  user_metadata: {
    username: string;
  };
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  supabaseConfigured: boolean;
  demoMode: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 演示模式管理器
class DemoAuthManager {
  private users: LocalUser[] = [];
  private currentUser: LocalUser | null = null;

  constructor() {
    // 从 localStorage 加载用户
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('demo_users');
      if (stored) {
        this.users = JSON.parse(stored);
      }
      const current = localStorage.getItem('demo_current_user');
      if (current) {
        this.currentUser = JSON.parse(current);
      }
    }
  }

  generateId(): string {
    return 'demo-' + Math.random().toString(36).substring(2, 15);
  }

  async signUp(email: string, password: string, username: string): Promise<{ user: LocalUser | null; error: Error | null }> {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 800));

    // 检查邮箱是否已存在
    if (this.users.find(u => u.email === email)) {
      return { user: null, error: new Error('该邮箱已被注册') };
    }

    // 创建新用户
    const newUser: LocalUser = {
      id: this.generateId(),
      email,
      user_metadata: { username }
    };

    this.users.push(newUser);
    this.currentUser = newUser;

    // 保存到 localStorage
    localStorage.setItem('demo_users', JSON.stringify(this.users));
    localStorage.setItem('demo_current_user', JSON.stringify(newUser));

    return { user: newUser, error: null };
  }

  async signIn(email: string, password: string): Promise<{ user: LocalUser | null; error: Error | null }> {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 500));

    const user = this.users.find(u => u.email === email);
    if (!user) {
      return { user: null, error: new Error('邮箱或密码错误') };
    }

    this.currentUser = user;
    localStorage.setItem('demo_current_user', JSON.stringify(user));

    return { user, error: null };
  }

  async signOut(): Promise<void> {
    this.currentUser = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('demo_current_user');
    }
  }

  getCurrentUser(): LocalUser | null {
    return this.currentUser;
  }
}

// 全局演示模式管理器
const demoAuth = typeof window !== 'undefined' ? new DemoAuthManager() : null;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [supabase, setSupabase] = useState<any>(null);

  useEffect(() => {
    // 检查 Supabase 配置
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    // 如果配置了有效的 Supabase，使用真实服务
    if (url && anonKey && url !== 'your-project-id.supabase.co' && url.includes('.supabase.co')) {
      import('@supabase/supabase-js').then(({ createClient }) => {
        const client = createClient(url, anonKey);
        setSupabase(client);
        setSupabaseConfigured(true);
        
        // 获取初始会话
        client.auth.getSession().then(({ data: { session } }: any) => {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }).catch((error: Error) => {
          console.error('获取会话失败:', error);
          setLoading(false);
        });

        // 监听认证状态变化
        client.auth.onAuthStateChange((_event: string, session: Session | null) => {
          setSession(session);
          setUser(session?.user ?? null);
        });
      }).catch((error) => {
        console.error('加载 Supabase 失败:', error);
        enableDemoMode();
      });
    } else {
      // 启用演示模式
      enableDemoMode();
    }
  }, []);

  const enableDemoMode = () => {
    console.log('🎮 启用演示模式 - 使用本地存储模拟登录');
    setDemoMode(true);
    setSupabaseConfigured(true); // 演示模式也视为"已配置"
    
    // 加载演示模式用户
    const demoUser = demoAuth?.getCurrentUser();
    if (demoUser) {
      // 创建符合 User 类型要求的对象
      const userObj = {
        id: demoUser.id,
        email: demoUser.email,
        user_metadata: demoUser.user_metadata,
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString()
      } as unknown as User;
      
      setUser(userObj);
      setSession({
        user: userObj
      } as Session);
    }
    setLoading(false);
  };

  const signIn = async (email: string, password: string) => {
    if (demoMode) {
      const { user: demoUser, error } = await demoAuth!.signIn(email, password);
      if (demoUser) {
        // 创建符合 User 类型要求的对象
        const userObj = {
          id: demoUser.id,
          email: demoUser.email,
          user_metadata: demoUser.user_metadata,
          app_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString()
        } as unknown as User;
        
        setUser(userObj);
        setSession({
          user: userObj
        } as Session);
      }
      return { error };
    }
    
    if (!supabase) {
      return { error: new Error('服务未初始化') };
    }
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signUp = async (email: string, password: string, username: string) => {
    if (demoMode) {
      const { user: demoUser, error } = await demoAuth!.signUp(email, password, username);
      if (demoUser) {
        // 创建符合 User 类型要求的对象
        const userObj = {
          id: demoUser.id,
          email: demoUser.email,
          user_metadata: demoUser.user_metadata,
          app_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString()
        } as unknown as User;
        
        setUser(userObj);
        setSession({
          user: userObj
        } as Session);
      }
      return { error };
    }
    
    if (!supabase) {
      return { error: new Error('服务未初始化') };
    }
    
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          username
        }
      }
    });
    
    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  };

  const signOut = async () => {
    if (demoMode) {
      await demoAuth!.signOut();
      setUser(null);
      setSession(null);
      return;
    }
    
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    if (demoMode) {
      return { error: new Error('演示模式不支持重置密码') };
    }
    
    if (!supabase) {
      return { error: new Error('服务未初始化') };
    }
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error ? new Error(error.message) : null };
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      supabaseConfigured,
      demoMode,
      signIn, 
      signUp, 
      signOut, 
      resetPassword 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth 必须在 AuthProvider 内使用');
  }
  return context;
}
