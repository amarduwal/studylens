'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, LogIn, Loader2 } from 'lucide-react';
import { useSession, signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { formatDate, formatHour, StatItem } from '@/components/common/helper';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<{
    totalScans: number;
    totalMessages: number;
    totalBookmarks: number;
    totalPracticeAttempts: number;
    correctAnswers: number;
    accuracyPercentage: number | null;
    currentStreak: number;
    longestStreak: number;
    favoriteSubject: string | null;
    mostActiveHour: number | null;
  } | null>(null);

  const [memberSince, setMemberSince] = useState<string | null>(null);

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
          setMemberSince(data.data.user.memberSince);
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-[hsl(var(--background))]">
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[hsl(var(--primary))]" />
            <p className="text-[hsl(var(--muted-foreground))]">
              Loading Stats...
            </p>
          </div>
        </main>
      </div>
    );
  }

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

            {!isGuest && stats && (
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                      <span className="text-xl">🔥</span>
                    </div>
                    <div>
                      <h3 className="font-semibold">Study Streak</h3>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        Keep learning daily!
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 rounded-xl bg-[hsl(var(--muted))]/50">
                      <div className="text-2xl font-bold text-orange-500">
                        {stats.currentStreak}
                      </div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        Current Streak
                      </p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-[hsl(var(--muted))]/50">
                      <div className="text-2xl font-bold text-amber-500">
                        {stats.longestStreak}
                      </div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        Longest Streak
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Activity Stats */}
            {!isGuest && stats && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span>📊</span> Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <StatItem
                      icon="📷"
                      label="Total Scans"
                      value={stats.totalScans}
                      color="text-blue-500"
                    />
                    <StatItem
                      icon="💬"
                      label="Messages"
                      value={stats.totalMessages}
                      color="text-green-500"
                    />
                    <StatItem
                      icon="🔖"
                      label="Bookmarks"
                      value={stats.totalBookmarks}
                      color="text-purple-500"
                    />
                    <StatItem
                      icon="✏️"
                      label="Practice Problems"
                      value={stats.totalPracticeAttempts}
                      color="text-pink-500"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Practice Performance */}
            {stats && stats.totalPracticeAttempts > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span>🎯</span> Practice Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-[hsl(var(--muted-foreground))]">
                      Accuracy
                    </span>
                    <span className="font-bold text-lg">
                      {stats.accuracyPercentage?.toFixed(1) || 0}%
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                      style={{ width: `${stats.accuracyPercentage || 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                    <span>{stats.correctAnswers} correct</span>
                    <span>{stats.totalPracticeAttempts} attempted</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Insights */}
            {!isGuest && stats && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span>💡</span> Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stats.favoriteSubject && (
                    <div className="flex items-center justify-between py-2 border-b border-[hsl(var(--border))]">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📚</span>
                        <span className="text-sm">Favorite Subject</span>
                      </div>
                      <span className="font-medium text-[hsl(var(--primary))]">
                        {stats.favoriteSubject}
                      </span>
                    </div>
                  )}
                  {stats.mostActiveHour !== null && (
                    <div className="flex items-center justify-between py-2 border-b border-[hsl(var(--border))]">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">⏰</span>
                        <span className="text-sm">Most Active Time</span>
                      </div>
                      <span className="font-medium">
                        {formatHour(stats.mostActiveHour)}
                      </span>
                    </div>
                  )}
                  {memberSince && (
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📅</span>
                        <span className="text-sm">Member Since</span>
                      </div>
                      <span className="font-medium">
                        {formatDate(memberSince)}
                      </span>
                    </div>
                  )}
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
