'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, History, Bookmark, User, Mic, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';

const navItems = [
  { href: '/', icon: Home, label: 'Scan' },
  { href: '/live', icon: Mic, label: 'Live', authRequired: true },
  { href: '/history', icon: History, label: 'History' },
  { href: '/saved', icon: Bookmark, label: 'Saved' },
  { href: '/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const isAuthenticated = status === 'authenticated' && !!session?.user;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[hsl(var(--border))] bg-[hsl(var(--background))]">
      <div className="mx-auto w-full max-w-2xl flex items-center justify-around py-3 safe-area-inset-bottom md:py-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const isLocked = item.authRequired && !isAuthenticated;

          // If locked, show disabled state or redirect to login
          if (isLocked) {
            return (
              <Link
                key={item.href}
                href="/login?redirect=/live"
                className={cn(
                  'flex flex-col items-center gap-1 px-4 text-xs transition-colors relative',
                  'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]',
                )}
              >
                <div className="relative">
                  <item.icon className="h-5 w-5 opacity-50" />
                  <Lock className="h-2.5 w-2.5 absolute -top-1 -right-1 text-[hsl(var(--muted-foreground))]" />
                </div>
                <span className="opacity-50">{item.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-4 text-xs transition-colors',
                isActive
                  ? 'text-[hsl(var(--primary))]'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]',
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
