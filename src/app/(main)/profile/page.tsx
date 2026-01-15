'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Languages, Settings, LogIn } from 'lucide-react';
import { useSession, signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<{
    totalScans: number;
    totalBookmarks: number;
    currentStreak: number;
    longestStreak: number;
  } | null>(null);
  const [userInfo, setUserInfo] = useState<{
    name?: string;
    email?: string;
    avatarUrl?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      if (!session?.user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/user/stats');
        const data = await res.json();
        if (data.success && data.data) {
          setStats(data.data.stats);
          setUserInfo(data.data.user);
        }
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();
  }, [session]);

  const isGuest = status === 'unauthenticated';

  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--background))]">
      <main className="flex-1 overflow-y-auto pb-20 md:pb-24">
        <div className="mx-auto w-full max-w-2xl py-6 px-4">
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
              <div className="flex items-center gap-2 mr-auto">
                <div className="relative w-20 h-20 rounded-full bg-[hsl(var(--primary))]/10 flex items-center justify-center mx-auto mb-4">
                  {userInfo?.avatarUrl ? (
                    <Image
                      src={userInfo.avatarUrl}
                      alt="Profile"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  ) : (
                    <User className="h-10 w-10 text-[hsl(var(--primary))]" />
                  )}
                </div>
              </div>
              <h1 className="text-2xl font-bold mb-1">
                {isGuest
                  ? 'Guest User'
                  : userInfo?.name || session?.user?.name || 'User'}
              </h1>
              <p className="text-[hsl(var(--muted-foreground))]">
                {isGuest
                  ? 'Sign in to sync your data across devices'
                  : userInfo?.email || session?.user?.email}
              </p>
              {isGuest && (
                <Card className="mt-6">
                  <CardContent className="p-6 text-center">
                    <div className="text-6xl mb-4">🎓</div>
                    <h3 className="text-lg font-semibold mb-2">
                      Sign in to unlock more features
                    </h3>
                    <ul className="text-sm text-[hsl(var(--muted-foreground))] space-y-2 mb-6">
                      <li>✓ Sync your scans across devices</li>
                      <li>✓ Save unlimited bookmarks</li>
                      <li>✓ Track your study streaks</li>
                      <li>✓ Customize your preferences</li>
                      <li>✓ Access your full history</li>
                    </ul>
                    <Button className="mt-4" onClick={() => signIn()}>
                      <LogIn className="h-4 w-4 mr-2" />
                      Sign In to Get Started
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Stats */}
            {!isGuest && (
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-[hsl(var(--primary))]">
                      {isLoading ? '...' : stats?.totalScans || 0}
                    </div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                      Total Scans
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-[hsl(var(--primary))]">
                      {isLoading ? '...' : stats?.totalBookmarks || 0}
                    </div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                      Bookmarked
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Streak Card */}
            {!isGuest && stats && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    🔥 Study Streak
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-around text-center">
                    <div>
                      <div className="text-2xl font-bold">
                        {stats.currentStreak}
                      </div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        Current
                      </p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {stats.longestStreak}
                      </div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        Longest
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Settings */}
            {!isGuest && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Link
                    href="/settings"
                    className="flex items-center justify-between hover:bg-[hsl(var(--muted))]/50 p-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Languages className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                      <span className="text-sm">Language & Preferences</span>
                    </div>
                    <span className="text-sm text-[hsl(var(--muted-foreground))]">
                      →
                    </span>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* About */}
            <Card>
              <CardHeader>
                <CardTitle>About StudyLens</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
                <p>
                  StudyLens uses Google&apos;s Gemini AI to help you understand
                  educational content instantly.
                </p>
                <p className="pt-2">
                  <strong>Version:</strong> 1.0.0
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
