'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LiveSession } from '@/components/live/live-session';
import { SessionConfig } from '@/types/live.ts';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { SelectField, ToggleField } from '@/components/ui/reuseable-fields';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ne', label: 'Nepali' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'zh', label: 'Chinese' },
];

const EDUCATION_LEVELS = [
  { value: 'primary', label: 'Primary School' },
  { value: 'middle', label: 'Middle School' },
  { value: 'high', label: 'High School' },
  { value: 'undergraduate', label: 'Undergraduate' },
  { value: 'graduate', label: 'Graduate' },
];

const SUBJECTS = [
  { value: '', label: 'Any Subject' },
  { value: 'mathematics', label: 'Mathematics' },
  { value: 'physics', label: 'Physics' },
  { value: 'chemistry', label: 'Chemistry' },
  { value: 'biology', label: 'Biology' },
  { value: 'computer_science', label: 'Computer Science' },
  { value: 'history', label: 'History' },
  { value: 'language', label: 'Language Arts' },
];

export default function LivePage() {
  const router = useRouter();
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [config, setConfig] = useState<SessionConfig>({
    language: 'en',
    voiceEnabled: true,
    videoEnabled: true,
    educationLevel: 'high',
    subject: '',
  });

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY || '';

  const handleStartSession = () => {
    if (!apiKey) {
      alert(
        'API key not configured. Please set NEXT_PUBLIC_GOOGLE_AI_API_KEY.',
      );
      return;
    }
    setIsSessionActive(true);
  };

  const handleEndSession = () => {
    setIsSessionActive(false);
  };

  if (isSessionActive) {
    return (
      <LiveSession apiKey={apiKey} config={config} onEnd={handleEndSession} />
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Header */}
      <header className="border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[hsl(var(--primary))] to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold">Live Tutor</h1>
          </div>
          <span className="px-2 py-1 bg-green-500/20 text-green-600 dark:text-green-400 text-xs rounded-full font-medium">
            Beta
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8 pb-24">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-3">Real-Time AI Tutoring</h2>
          <p className="text-[hsl(var(--muted-foreground))] text-lg">
            Have a live conversation with an AI tutor. Show your work, ask
            questions, and get instant help with visual explanations.
          </p>
        </div>

        {/* Configuration Card */}
        <div className="bg-[hsl(var(--card))] rounded-2xl p-6 space-y-6 shadow-sm border border-[hsl(var(--border))]">
          <h3 className="text-lg font-semibold">Session Settings</h3>

          {/* Language */}
          <SelectField
            label="Language"
            value={config.language}
            onChange={(value) => setConfig({ ...config, language: value })}
            options={LANGUAGES}
          />

          {/* Education Level */}
          <SelectField
            label="Education Level"
            value={config.educationLevel}
            onChange={(value) =>
              setConfig({ ...config, educationLevel: value })
            }
            options={EDUCATION_LEVELS}
          />

          {/* Subject */}
          <SelectField
            label="Focus Subject (Optional)"
            value={config.subject || ''}
            onChange={(value) => setConfig({ ...config, subject: value })}
            options={SUBJECTS}
          />

          {/* Media Options */}
          <div className="pt-4 border-t border-[hsl(var(--border))] space-y-1">
            <ToggleField
              label="Voice Conversation"
              description="Talk with the AI tutor"
              checked={config.voiceEnabled}
              onChange={(checked) =>
                setConfig({ ...config, voiceEnabled: checked })
              }
            />

            <ToggleField
              label="Camera"
              description="Show your work to the tutor"
              checked={config.videoEnabled}
              onChange={(checked) =>
                setConfig({ ...config, videoEnabled: checked })
              }
            />
          </div>

          {/* Start Button */}
          <Button
            onClick={handleStartSession}
            size="lg"
            className="w-full bg-gradient-to-r from-[hsl(var(--primary))] to-purple-600 hover:opacity-90 text-white text-lg py-6 mt-6"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Start Live Session
          </Button>

          {/* Info */}
          <div className="text-center text-sm text-[hsl(var(--muted-foreground))] space-y-1 pt-2">
            <p>Sessions are limited to 30 minutes on the free tier.</p>
            <p>Your camera and microphone will be accessed.</p>
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[hsl(var(--muted))]/50 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-[hsl(var(--primary))]/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎙️</span>
            </div>
            <h4 className="font-semibold mb-2">Voice First</h4>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Natural conversation like talking to a real tutor
            </p>
          </div>
          <div className="bg-[hsl(var(--muted))]/50 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📐</span>
            </div>
            <h4 className="font-semibold mb-2">Visual Learning</h4>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              AI draws diagrams and shows step-by-step solutions
            </p>
          </div>
          <div className="bg-[hsl(var(--muted))]/50 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">💻</span>
            </div>
            <h4 className="font-semibold mb-2">Live Code</h4>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Watch code run in real-time with explanations
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
