'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LiveSession } from '@/components/live/live-session';
import { LiveConfigResponse, SessionConfig } from '@/types/live';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { SelectField, ToggleField } from '@/components/ui/reuseable-fields';
import { BottomNav } from '@/components/layout/bottom-nav';
import Image from 'next/image';

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [maxDuration, setMaxDuration] = useState(30 * 60);

  const [config, setConfig] = useState<SessionConfig>({
    language: 'en',
    voiceEnabled: true,
    videoEnabled: true,
    educationLevel: 'high',
    subject: '',
  });

  // Fetch configuration on mount
  useEffect(() => {
    async function fetchConfig() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/live/config');
        const data: LiveConfigResponse = await response.json();

        if (data.success && data.data) {
          setApiKey(data.data.apiKey);
          setMaxDuration(data.data.maxDuration);
        } else {
          setError(data.error || 'Failed to load configuration');
        }
      } catch (err) {
        console.error('Error fetching config:', err);
        setError('Failed to connect to server');
      } finally {
        setIsLoading(false);
      }
    }

    fetchConfig();
  }, []);

  const handleStartSession = () => {
    if (!apiKey) {
      setError('API key not available');
      return;
    }
    setIsSessionActive(true);
  };

  const handleEndSession = () => {
    setIsSessionActive(false);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show active session
  if (isSessionActive && apiKey) {
    return (
      <LiveSession apiKey={apiKey} config={config} onEnd={handleEndSession} />
    );
  }

  // Show configuration page
  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Header */}
      <header className="border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center">
            <div className="relative w-8 h-8 sm:w-10 sm:h-10flex items-center justify-center overflow-hidden">
              <Image
                src="/icon-192.png"
                alt="StudyLens"
                fill
                className="object-contain drop-shadow-sm"
                priority
              />
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

        {/* Error Alert */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 mb-8 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

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
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-lg py-6"
            disabled={!apiKey || !!error}
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Start Live Session
          </Button>

          {/* Info */}
          <div className="text-center text-sm text-gray-500">
            <p>
              Sessions are limited to {Math.floor(maxDuration / 60)} minutes.
            </p>
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
      <BottomNav />
    </div>
  );
}
