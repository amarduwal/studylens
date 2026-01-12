'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Globe } from 'lucide-react';
import { useScanStore } from '@/stores/scan-store';
import { LANGUAGES, SupportedLanguage } from '@/types';

export function Header() {
  const { selectedLanguage, setSelectedLanguage } = useScanStore();

  return (
    <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/95 backdrop-blur supports-backdrop-filter:bg-[hsl(var(--background))]/60">
      <div className="mx-auto w-full max-w-2xl flex h-14 items-center px-4">
        <Link href="/" className="flex items-center gap-2 mr-auto">
          <Image
            src="/icon-192.png"
            alt="Logo"
            fill
            className="object-contain"
          />
          <span className="font-bold text-xl">StudyLens</span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Language selector */}
          <div className="relative">
            <select
              value={selectedLanguage}
              onChange={(e) =>
                setSelectedLanguage(e.target.value as SupportedLanguage)
              }
              className="appearance-none rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-1.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
            >
              {Object.entries(LANGUAGES).map(([code, lang]) => (
                <option key={code} value={code}>
                  {lang.nativeName}
                </option>
              ))}
            </select>
            <Globe className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none text-[hsl(var(--muted-foreground))]" />
          </div>
        </div>
      </div>
    </header>
  );
}
