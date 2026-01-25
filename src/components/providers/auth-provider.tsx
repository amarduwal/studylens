'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import { SessionTracker } from './session-tracker';

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SessionTracker />
      {children}
    </SessionProvider>
  );
}
