'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Loader2, CheckCircle, Mail } from 'lucide-react';

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  const email = searchParams.get('email');
  const verified = searchParams.get('verified');

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').split('').slice(0, 6);
      const newCode = [...code];
      digits.forEach((digit, i) => {
        if (index + i < 6) newCode[index + i] = digit;
      });
      setCode(newCode);
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code: fullCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push('/login?verified=true'), 2000);
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setError('');

    try {
      const res = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      setCountdown(60);
      setCode(['', '', '', '', '', '']);
    } catch (err) {
      setError('Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Email Verified!</h2>
            <p className="text-[hsl(var(--muted-foreground))]">
              Redirecting to login...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-4xl">📚</span>
            <span className="text-2xl font-bold">StudyLens</span>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-[hsl(var(--primary))]/10 flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-[hsl(var(--primary))]" />
            </div>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We sent a 6-digit code to
              <br />
              <span className="font-medium text-[hsl(var(--foreground))]">
                {email}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Error */}
            {error && (
              <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500 text-center">
                {error}
              </div>
            )}

            {verified && (
              <div className="rounded-lg bg-green-500/10 p-3 text-sm text-green-600 text-center">
                Email verified successfully! You can now sign in.
              </div>
            )}
            {/* Code Input */}
            <div className="flex justify-center gap-2">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 text-center text-2xl font-bold rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] focus:outline-none"
                />
              ))}
            </div>
            {/* Verify Button */}
            <Button
              onClick={handleVerify}
              disabled={isLoading || code.join('').length !== 6}
              className="w-full h-12"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : null}
              Verify Email
            </Button>
            {/* Resend */}
            <div className="text-center">
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-2">
                Didn&apos;t receive the code?
              </p>
              {countdown > 0 ? (
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Resend in {countdown}s
                </p>
              ) : (
                <Button
                  variant="link"
                  onClick={handleResend}
                  disabled={isResending}
                  className="text-[hsl(var(--primary))]"
                >
                  {isResending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Resend Code
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Back to login */}
        <p className="text-center">
          <Link
            href="/login"
            className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          >
            ← Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
