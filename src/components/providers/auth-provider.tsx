'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import { SessionTracker } from './session-tracker';
import { SessionSync } from './session-sync';

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SessionSync />
      <SessionTracker />
      {children}
    </SessionProvider>
  );
}
