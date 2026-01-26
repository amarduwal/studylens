'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { LANGUAGES, SupportedLanguage } from '@/types';
import {
  Loader2,
  User,
  Bell,
  Palette,
  Eye,
  Shield,
  ArrowLeft,
  Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AvatarUpload from '@/components/profile/avatar-upload';

type SettingsTab =
  | 'profile'
  | 'preferences'
  | 'notifications'
  | 'accessibility'
  | 'privacy';

interface ProfileData {
  name: string;
  username: string;
  bio: string;
  dateOfBirth: string;
  theme: string;
  educationLevel: string;
}

interface PreferencesData {
  emailNotifications: boolean;
  pushNotifications: boolean;
  streakReminders: boolean;
  weeklySummary: boolean;
  marketingEmails: boolean;
  defaultDifficulty: string;
  showLatex: boolean;
  showStepNumbers: boolean;
  compactView: boolean;
  fontSize: string;
  highContrast: boolean;
  reduceAnimations: boolean;
  profilePublic: boolean;
  showStreakPublic: boolean;
}

export default function SettingsPage() {
  const { status } = useSession();
  const router = useRouter();
  const { showToast, ToastComponent } = useToast();

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [profile, setProfile] = useState<ProfileData>({
    name: '',
    username: '',
    bio: '',
    dateOfBirth: '',
    theme: 'system',
    educationLevel: 'high',
  });

  const [userInfo, setUserInfo] = useState<{
    name?: string;
    email?: string;
    avatarUrl?: string;
  } | null>(null);

  const [preferences, setPreferences] = useState<PreferencesData>({
    emailNotifications: true,
    pushNotifications: true,
    streakReminders: true,
    weeklySummary: true,
    marketingEmails: false,
    defaultDifficulty: 'medium',
    showLatex: true,
    showStepNumbers: true,
    compactView: false,
    fontSize: 'medium',
    highContrast: false,
    reduceAnimations: false,
    profilePublic: false,
    showStreakPublic: false,
  });

  const [selectedLanguage, setSelectedLanguage] =
    useState<SupportedLanguage>('en');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      loadSettings();
    }
  }, [status, router]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) {
        if (data.data.profile) {
          setProfile(data.data.profile);
          setUserInfo({
            name: data.data.profile.name,
            email: data.data.profile.email,
            avatarUrl: data.data.profile.avatarUrl,
          });
        }
        if (data.data.preferences) setPreferences(data.data.preferences);
        if (data.data.languageCode) setSelectedLanguage(data.data.languageCode);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      showToast('Failed to load settings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          preferences,
          languageCode: selectedLanguage,
        }),
      });

      if (res.ok) {
        showToast('Settings saved successfully!', 'success');
      } else {
        showToast('Failed to save settings', 'error');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      showToast('Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'preferences' as const, label: 'Display', icon: Palette },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'accessibility' as const, label: 'Accessibility', icon: Eye },
    { id: 'privacy' as const, label: 'Privacy', icon: Shield },
  ];

  const isGuest = status === 'unauthenticated';

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-[hsl(var(--background))]">
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[hsl(var(--primary))]" />
            <p className="text-[hsl(var(--muted-foreground))]">
              Loading settings...
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--background))]">
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="mx-auto w-full max-w-2xl px-4 py-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Settings</h1>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Manage your account preferences
              </p>
            </div>
          </div>

          <div className={`${profile ? 'flex flex-col items-center' : ''}`}>
            {userInfo ? (
              <AvatarUpload
                currentAvatarUrl={userInfo?.avatarUrl}
                userName={userInfo?.name || 'User'}
                size="md"
                editable={!isGuest}
                className="mb-6"
                onAvatarChange={(newAvatarUrl) => {
                  setUserInfo((prev) =>
                    prev
                      ? { ...prev, avatarUrl: newAvatarUrl || undefined }
                      : null
                  );
                }}
              />
            ) : (
              <div className="flex items-center gap-2 mr-auto">
                <div className="relative w-20 h-20 rounded-full bg-[hsl(var(--primary))]/10 flex items-center justify-center mx-auto mb-4">
                  <User className="h-10 w-10 text-[hsl(var(--primary))]" />
                </div>
              </div>
            )}

            <h1 className="text-2xl font-bold mb-1">
              {isGuest ? 'Guest User' : userInfo?.name || 'User'}
            </h1>
            <p className="text-[hsl(var(--muted-foreground))]">
              {isGuest
                ? 'Sign in to sync your data across devices'
                : userInfo?.email}
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-4 px-4 scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                  activeTab === tab.id
                    ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                    : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/80'
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="space-y-4">
            {activeTab === 'profile' && (
              <ProfileSettings
                profile={profile}
                setProfile={setProfile}
                selectedLanguage={selectedLanguage}
                setSelectedLanguage={setSelectedLanguage}
              />
            )}

            {activeTab === 'preferences' && (
              <PreferencesSettings
                preferences={preferences}
                setPreferences={setPreferences}
              />
            )}

            {activeTab === 'notifications' && (
              <NotificationSettings
                preferences={preferences}
                setPreferences={setPreferences}
              />
            )}

            {activeTab === 'accessibility' && (
              <AccessibilitySettings
                preferences={preferences}
                setPreferences={setPreferences}
              />
            )}

            {activeTab === 'privacy' && (
              <PrivacySettings
                preferences={preferences}
                setPreferences={setPreferences}
              />
            )}
          </div>

          {/* Save Button */}
          <div className="mt-8">
            <Button
              onClick={saveSettings}
              disabled={isSaving}
              className="w-full h-12"
              size="lg"
            >
              {isSaving ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <Save className="h-5 w-5 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </main>
      {ToastComponent}
    </div>
  );
}

// ============ Profile Settings ============
function ProfileSettings({
  profile,
  setProfile,
  selectedLanguage,
  setSelectedLanguage,
}: {
  profile: ProfileData;
  setProfile: React.Dispatch<React.SetStateAction<ProfileData>>;
  selectedLanguage: SupportedLanguage;
  setSelectedLanguage: React.Dispatch<React.SetStateAction<SupportedLanguage>>;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Personal Information</CardTitle>
          <CardDescription>Update your profile details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <InputField
            label="Name"
            value={profile.name}
            onChange={(v) => setProfile({ ...profile, name: v })}
            placeholder="Your name"
          />
          <InputField
            label="Username"
            value={profile.username}
            onChange={(v) => setProfile({ ...profile, username: v })}
            placeholder="@username"
          />
          <TextareaField
            label="Bio"
            value={profile.bio}
            onChange={(v) => setProfile({ ...profile, bio: v })}
            placeholder="Tell us about yourself..."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SelectField
            label="Preferred Language"
            value={selectedLanguage}
            onChange={(v) => setSelectedLanguage(v as SupportedLanguage)}
            options={Object.entries(LANGUAGES).map(([code, lang]) => ({
              value: code,
              label: lang.nativeName,
            }))}
          />
          <SelectField
            label="Education Level"
            value={profile.educationLevel}
            onChange={(v) => setProfile({ ...profile, educationLevel: v })}
            options={[
              { value: 'elementary', label: 'Elementary' },
              { value: 'middle', label: 'Middle School' },
              { value: 'high', label: 'High School' },
              { value: 'undergraduate', label: 'Undergraduate' },
              { value: 'graduate', label: 'Graduate' },
              { value: 'professional', label: 'Professional' },
            ]}
          />
          <SelectField
            label="Theme"
            value={profile.theme}
            onChange={(v) => setProfile({ ...profile, theme: v })}
            options={[
              { value: 'light', label: '☀️ Light' },
              { value: 'dark', label: '🌙 Dark' },
              { value: 'system', label: '💻 System' },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ============ Preferences Settings ============
function PreferencesSettings({
  preferences,
  setPreferences,
}: {
  preferences: PreferencesData;
  setPreferences: React.Dispatch<React.SetStateAction<PreferencesData>>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Display Preferences</CardTitle>
        <CardDescription>Customize how content is displayed</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <ToggleField
          label="Show LaTeX Formulas"
          description="Render mathematical expressions beautifully"
          checked={preferences.showLatex}
          onChange={(v) => setPreferences({ ...preferences, showLatex: v })}
        />
        <ToggleField
          label="Show Step Numbers"
          description="Display numbered steps in solutions"
          checked={preferences.showStepNumbers}
          onChange={(v) =>
            setPreferences({ ...preferences, showStepNumbers: v })
          }
        />
        <ToggleField
          label="Compact View"
          description="Show more content in less space"
          checked={preferences.compactView}
          onChange={(v) => setPreferences({ ...preferences, compactView: v })}
        />
        <div className="pt-4">
          <SelectField
            label="Default Difficulty"
            value={preferences.defaultDifficulty}
            onChange={(v) =>
              setPreferences({ ...preferences, defaultDifficulty: v })
            }
            options={[
              { value: 'easy', label: '🟢 Easy' },
              { value: 'medium', label: '🟡 Medium' },
              { value: 'hard', label: '🔴 Hard' },
            ]}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ============ Notification Settings ============
function NotificationSettings({
  preferences,
  setPreferences,
}: {
  preferences: PreferencesData;
  setPreferences: React.Dispatch<React.SetStateAction<PreferencesData>>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Notifications</CardTitle>
        <CardDescription>
          Choose what you want to be notified about
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <ToggleField
          label="Email Notifications"
          description="Receive updates via email"
          checked={preferences.emailNotifications}
          onChange={(v) =>
            setPreferences({ ...preferences, emailNotifications: v })
          }
        />
        <ToggleField
          label="Push Notifications"
          description="Receive push notifications on your device"
          checked={preferences.pushNotifications}
          onChange={(v) =>
            setPreferences({ ...preferences, pushNotifications: v })
          }
        />
        <ToggleField
          label="Streak Reminders"
          description="Get reminded to maintain your study streak"
          checked={preferences.streakReminders}
          onChange={(v) =>
            setPreferences({ ...preferences, streakReminders: v })
          }
        />
        <ToggleField
          label="Weekly Summary"
          description="Receive a weekly learning summary"
          checked={preferences.weeklySummary}
          onChange={(v) => setPreferences({ ...preferences, weeklySummary: v })}
        />
        <ToggleField
          label="Marketing Emails"
          description="Receive tips, updates, and promotions"
          checked={preferences.marketingEmails}
          onChange={(v) =>
            setPreferences({ ...preferences, marketingEmails: v })
          }
        />
      </CardContent>
    </Card>
  );
}

// ============ Accessibility Settings ============
function AccessibilitySettings({
  preferences,
  setPreferences,
}: {
  preferences: PreferencesData;
  setPreferences: React.Dispatch<React.SetStateAction<PreferencesData>>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Accessibility</CardTitle>
        <CardDescription>Make StudyLens easier to use</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SelectField
          label="Font Size"
          value={preferences.fontSize}
          onChange={(v) => setPreferences({ ...preferences, fontSize: v })}
          options={[
            { value: 'small', label: 'Small' },
            { value: 'medium', label: 'Medium' },
            { value: 'large', label: 'Large' },
            { value: 'extra-large', label: 'Extra Large' },
          ]}
        />
        <div className="space-y-1">
          <ToggleField
            label="High Contrast"
            description="Increase contrast for better visibility"
            checked={preferences.highContrast}
            onChange={(v) =>
              setPreferences({ ...preferences, highContrast: v })
            }
          />
          <ToggleField
            label="Reduce Animations"
            description="Minimize motion for reduced distraction"
            checked={preferences.reduceAnimations}
            onChange={(v) =>
              setPreferences({ ...preferences, reduceAnimations: v })
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ============ Privacy Settings ============
function PrivacySettings({
  preferences,
  setPreferences,
}: {
  preferences: PreferencesData;
  setPreferences: React.Dispatch<React.SetStateAction<PreferencesData>>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Privacy</CardTitle>
        <CardDescription>Control your privacy settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <ToggleField
          label="Public Profile"
          description="Allow others to view your profile"
          checked={preferences.profilePublic}
          onChange={(v) => setPreferences({ ...preferences, profilePublic: v })}
        />
        <ToggleField
          label="Show Streak Publicly"
          description="Display your study streak on your profile"
          checked={preferences.showStreakPublic}
          onChange={(v) =>
            setPreferences({ ...preferences, showStreakPublic: v })
          }
        />
      </CardContent>
    </Card>
  );
}

// ============ Reusable Field Components ============

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium mb-1.5 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 px-4 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-shadow"
      />
    </div>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="text-sm font-medium mb-1.5 block">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-4 py-3 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-shadow resize-none"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="text-sm font-medium mb-1.5 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 px-4 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-shadow appearance-none cursor-pointer"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between py-4 border-b border-[hsl(var(--border))] last:border-0 text-left hover:bg-[hsl(var(--muted))]/50 -mx-2 px-2 rounded-lg transition-colors"
    >
      <div className="flex-1 mr-4">
        <p className="font-medium text-sm">{label}</p>
        {description && (
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            {description}
          </p>
        )}
      </div>
      <div
        className={cn(
          'w-11 h-6 rounded-full relative transition-colors',
          checked ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted))]'
        )}
      >
        <div
          className={cn(
            'absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </div>
    </button>
  );
}
