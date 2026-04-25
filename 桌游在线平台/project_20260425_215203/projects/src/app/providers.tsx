'use client';

import { AuthProvider } from '@/app/(auth)/context/AuthContext';
import { Toaster } from '@/components/ui/sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Toaster />
      {children}
    </AuthProvider>
  );
}
