'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Globe, User, LogOut, Crown, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useScanStore } from '@/stores/scan-store';
import { LANGUAGES, SupportedLanguage } from '@/types';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

export function Header() {
  const { data: session, status } = useSession();
  const { selectedLanguage, setSelectedLanguage } = useScanStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/95 backdrop-blur supports-backdrop-filter:bg-[hsl(var(--background))]/60">
      <div className="mx-auto w-full max-w-2xl flex h-14 items-center px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mr-auto">
          <div className="relative h-8 w-8 sm:h-10 sm:w-10">
            <Image
              src="/icon-192.png"
              alt="StudyLens"
              fill
              className="object-contain"
              priority
            />
          </div>

          <span className="text-gradient text-2xl font-bold hidden sm:inline">
            StudyLens
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Language selector */}
          <div className="relative">
            <select
              value={selectedLanguage}
              onChange={(e) =>
                setSelectedLanguage(e.target.value as SupportedLanguage)
              }
              className="appearance-none rounded-lg border border-[hsl(var(--input))] px-2 py-1.5 pr-7 text-sm focus:outline-none"
            >
              {Object.entries(LANGUAGES).map(([code, lang]) => (
                <option key={code} value={code}>
                  {lang.nativeName}
                </option>
              ))}
            </select>
            <Globe className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 pointer-events-none text-[hsl(var(--muted-foreground))]" />
          </div>

          {/* Auth Buttons */}
          {status === 'loading' ? (
            <div className="w-8 h-8 rounded-full bg-[hsl(var(--muted))] animate-pulse" />
          ) : session?.user ? (
            <div className="flex items-center gap-2">
              {/* Plan Badge */}
              {session.user.subscriptionTier === 'premium' && (
                <div>
                  <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-medium">
                    <Crown className="h-3 w-3" />
                    Pro
                  </span>
                </div>
              )}

              {/* User Menu */}
              <div className="relative" ref={dropdownRef}>
                <button
                  className="flex items-center gap-2"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  {session.user.avatarUrl ? (
                    <div className="relative w-8 h-8">
                      <Image
                        src={session.user.avatarUrl}
                        alt={session.user.name || 'User'}
                        fill
                        className="rounded-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center text-[hsl(var(--primary-foreground))]">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </button>

                {/* Dropdown */}
                {isDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-lg z-50">
                    <div className="p-3 border-b border-[hsl(var(--border))]">
                      <p className="font-medium text-sm truncate">
                        {session.user.name}
                      </p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                        {session.user.email}
                      </p>
                    </div>
                    <div className="p-2">
                      <Link
                        href="/profile"
                        className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <User className="h-4 w-4" />
                        Profile
                      </Link>
                      <Link
                        href="/settings"
                        className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-[hsl(var(--muted))] transition-colors text-amber-900"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <Settings className="h-4 w-4" />
                        Setting
                      </Link>
                      {session.user.subscriptionTier !== 'premium' && (
                        <Link
                          href="/pricing"
                          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-[hsl(var(--muted))] transition-colors text-amber-600"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <Crown className="h-4 w-4" />
                          Upgrade to Pro
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          signOut();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-[hsl(var(--muted))] transition-colors text-red-500"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/register" className="hidden sm:block">
                <Button size="sm">Sign Up</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
