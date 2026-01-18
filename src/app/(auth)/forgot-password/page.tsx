'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Loader2, Mail } from 'lucide-react';
import Image from 'next/image';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Check your email for reset instructions');
        // Optionally redirect to login after a delay
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setError(data.error || 'Failed to send reset email');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.log('Something went wrong. Please try again.', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 mr-auto"
          >
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
          <p className="mt-2 text-[hsl(var(--muted-foreground))]">
            Reset your password
          </p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Forgot Password</CardTitle>
            <CardDescription>
              Enter your email to receive a reset link
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Success Message */}
            {success && (
              <div className="rounded-lg bg-green-500/10 p-3 text-sm text-green-500 text-center">
                {success}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500 text-center">
                {error}
              </div>
            )}

            {/* Email Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[hsl(var(--muted-foreground))]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] focus:outline-none"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : null}
                Send Reset Link
              </Button>
            </form>

            {/* Back to Login */}
            <p className="text-center text-sm text-[hsl(var(--muted-foreground))]">
              Remember your password?{' '}
              <Link
                href="/login"
                className="font-medium text-[hsl(var(--primary))] hover:underline"
              >
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>

        {/* Back to Login */}
        <p className="text-center">
          <Link
            href="/login"
            className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          >
            ← Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}
