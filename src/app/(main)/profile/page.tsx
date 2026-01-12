'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useScanStore } from '@/stores/scan-store';
import { User, Languages, Settings } from 'lucide-react';

export default function ProfilePage() {
  const { scanHistory, getBookmarkedScans, selectedLanguage } = useScanStore();
  const bookmarkedScans = getBookmarkedScans();

  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--background))]">
      <main className="flex-1 overflow-y-auto pb-20 md:pb-24">
        <div className="mx-auto w-full max-w-2xl py-6 px-4">
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-[hsl(var(--primary))]/10 flex items-center justify-center mx-auto mb-4">
                <User className="h-10 w-10 text-[hsl(var(--primary))]" />
              </div>
              <h1 className="text-2xl font-bold mb-1">Guest User</h1>
              <p className="text-[hsl(var(--muted-foreground))]">
                Sign in to sync your data across devices
              </p>
              <Button className="mt-4">Sign In</Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-[hsl(var(--primary))]">
                    {scanHistory.length}
                  </div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                    Total Scans
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-[hsl(var(--primary))]">
                    {bookmarkedScans.length}
                  </div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                    Bookmarked
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Languages className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                    <span className="text-sm">Language</span>
                  </div>
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">
                    {selectedLanguage.toUpperCase()}
                  </span>
                </div>
              </CardContent>
            </Card>

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
