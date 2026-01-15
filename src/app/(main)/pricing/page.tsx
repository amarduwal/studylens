'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import {
  Check,
  Crown,
  Zap,
  Loader2,
  ArrowLeft,
  Sparkles,
  Infinity,
} from 'lucide-react';

interface PricingPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceMonthly: string;
  priceYearly: string;
  currency: string;
  features: string[];
  dailyScanLimit: number | null;
  maxBookmarks: number | null;
  maxHistoryDays: number | null;
  stripePriceIdMonthly: string;
  stripePriceIdYearly: string;
  isFeatured: boolean;
}

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { showToast, ToastComponent } = useToast();

  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [selectedTab, setSelectedTab] = useState<'monthly' | 'yearly'>(
    'monthly'
  );

  const monthlyPlans = plans.filter(
    (p) =>
      p.slug !== 'guest' && (p.slug.includes('monthly') || p.slug === 'free')
  );
  const yearlyPlans = plans.filter(
    (p) => p.slug !== 'guest' && p.slug.includes('yearly')
  );

  useEffect(() => {
    loadPlans();
    if (session?.user?.id) {
      loadCurrentSubscription();
    }
  }, [session]);

  const loadPlans = async () => {
    try {
      const res = await fetch('/api/pricing');
      const data = await res.json();
      if (data.success) {
        setPlans(data.data);
      }
    } catch (error) {
      console.error('Failed to load plans:', error);
      showToast('Failed to load pricing plans', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCurrentSubscription = async () => {
    try {
      const res = await fetch('/api/subscription');
      const data = await res.json();
      if (data.success && data.data) {
        setCurrentPlan(data.data.planSlug || 'free');
      }
    } catch (error) {
      console.error('Failed to load subscription:', error);
    }
  };

  const handleSubscribe = async (plan: PricingPlan) => {
    showToast('Coming soon! Enjoy Free Version for now ✨', 'info', 6000);

    // if (!session?.user?.id) {
    //   router.push('/login?callbackUrl=/pricing');
    //   return;
    // }

    // if (plan.slug === 'free' || plan.slug === currentPlan) {
    //   return;
    // }

    // setIsProcessing(plan.id);

    // try {
    //   const res = await fetch('/api/subscription/checkout', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({
    //       planId: plan.id,
    //       billingCycle: selectedTab, // Use selectedTab instead
    //     }),
    //   });

    //   const data = await res.json();

    //   if (data.success && data.data.checkoutUrl) {
    //     window.location.href = data.data.checkoutUrl;
    //   } else {
    //     showToast(data.error || 'Failed to start checkout', 'error');
    //   }
    // } catch (error) {
    //   console.error('Checkout error:', error);
    //   showToast('Something went wrong', 'error');
    // } finally {
    //   setIsProcessing(null);
    // }
  };

  const getCurrencySymbol = (currency: string): string => {
    const symbols: Record<string, string> = {
      USD: '$',
      INR: '₹',
      NPR: 'Rs.',
      EUR: '€',
      GBP: '£',
    };
    return symbols[currency] || '$';
  };

  const formatPrice = (price: string, currency: string): string => {
    const symbol = getCurrencySymbol(currency);
    const amount = parseFloat(price).toFixed(2);

    // For INR and NPR, symbol comes after
    if (currency === 'INR' || currency === 'NPR') {
      return `${symbol}${amount}`;
    }

    // For USD, EUR, GBP, symbol comes before
    return `${symbol}${amount}`;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-[hsl(var(--background))]">
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[hsl(var(--primary))]" />
            <p className="text-[hsl(var(--muted-foreground))]">
              Loading plans...
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
              <h1 className="text-2xl font-bold">Upgrade to Pro</h1>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Unlock unlimited learning
              </p>
            </div>
          </div>

          {/* Hero Banner */}
          <Card className="mb-6 bg-gradient-to-br from-[hsl(var(--primary))] to-purple-600 text-white border-0 overflow-hidden">
            <CardContent className="p-6 relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <Crown className="h-6 w-6" />
                  <span className="font-semibold">StudyLens Pro</span>
                </div>
                <h2 className="text-xl font-bold mb-2">Learn without limits</h2>
                <p className="text-white/80 text-sm">
                  Unlimited scans, priority support, and exclusive features
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-2 p-1 bg-[hsl(var(--muted))] rounded-xl mb-6">
            <button
              onClick={() => setSelectedTab('monthly')}
              className={cn(
                'flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                selectedTab === 'monthly'
                  ? 'bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm'
                  : 'text-[hsl(var(--muted-foreground))]'
              )}
            >
              Monthly Plans
            </button>
            <button
              onClick={() => setSelectedTab('yearly')}
              className={cn(
                'flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all relative',
                selectedTab === 'yearly'
                  ? 'bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm'
                  : 'text-[hsl(var(--muted-foreground))]'
              )}
            >
              Yearly Plans
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                SAVE
              </span>
            </button>
          </div>

          {/* Plans */}
          <div className="space-y-4">
            {(selectedTab === 'monthly' ? monthlyPlans : yearlyPlans)
              .sort((a, b) => (a.isFeatured ? -1 : 1))
              .map((plan) => {
                const price =
                  selectedTab === 'monthly'
                    ? plan.priceMonthly
                    : plan.priceYearly;
                const isCurrentPlan = plan.slug === currentPlan;
                const isFree = plan.slug === 'free';

                // Extract region from slug if exists
                const regionMatch = plan.slug.match(/\((.*?)\)/);
                const region = regionMatch ? regionMatch[1] : null;

                return (
                  <Card
                    key={plan.id}
                    className={cn(
                      'relative overflow-hidden transition-all',
                      plan.isFeatured &&
                        'border-2 border-[hsl(var(--primary))] shadow-lg',
                      isCurrentPlan && 'bg-[hsl(var(--primary))]/5'
                    )}
                  >
                    {/* Featured Badge */}
                    {plan.isFeatured && (
                      <div className="absolute top-0 right-0">
                        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs px-3 py-1 rounded-bl-lg font-medium flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Popular
                        </div>
                      </div>
                    )}

                    {/* Region Badge */}
                    {region && (
                      <div className="absolute top-0 left-0">
                        <div className="bg-blue-500 text-white text-xs px-3 py-1 rounded-br-lg font-medium">
                          {region}
                        </div>
                      </div>
                    )}

                    {/* Current Plan Badge */}
                    {isCurrentPlan && !region && (
                      <div className="absolute top-0 left-0">
                        <div className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-xs px-3 py-1 rounded-br-lg font-medium">
                          Current
                        </div>
                      </div>
                    )}

                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            {plan.isFeatured ? (
                              <Crown className="h-5 w-5 text-amber-500" />
                            ) : (
                              <Zap className="h-5 w-5 text-[hsl(var(--primary))]" />
                            )}
                            <h3 className="text-lg font-bold">
                              {plan.name} {region && `- ${region}`}
                            </h3>
                          </div>
                          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                            {plan.description}
                          </p>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="mb-4">
                        {isFree ? (
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold">Free</span>
                          </div>
                        ) : (
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold">
                              {formatPrice(
                                price || plan.priceYearly,
                                plan.currency
                              )}
                            </span>
                            <span className="text-[hsl(var(--muted-foreground))]">
                              /{selectedTab === 'monthly' ? 'mo' : 'yr'}
                            </span>
                            {selectedTab === 'yearly' && plan.priceMonthly && (
                              <span className="ml-2 text-xs text-green-600 font-medium">
                                Save {getCurrencySymbol(plan.currency)}
                                {(
                                  parseFloat(plan.priceMonthly) * 12 -
                                  parseFloat(plan.priceYearly)
                                ).toFixed(0)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Limits Summary */}
                      <div className="flex gap-4 mb-4 text-sm">
                        <div className="flex items-center gap-1.5">
                          <div
                            className={cn(
                              'w-2 h-2 rounded-full',
                              plan.dailyScanLimit === null
                                ? 'bg-green-500'
                                : 'bg-amber-500'
                            )}
                          />
                          <span className="text-[hsl(var(--muted-foreground))]">
                            {plan.dailyScanLimit === null ? (
                              <span className="flex items-center gap-1">
                                <Infinity className="h-3 w-3" /> Unlimited scans
                              </span>
                            ) : (
                              `${plan.dailyScanLimit} scans/day`
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Features */}
                      <ul className="space-y-2 mb-5">
                        {((plan.features as string[]) || [])
                          .slice(0, 5)
                          .map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                              <span className="text-sm">{feature}</span>
                            </li>
                          ))}
                      </ul>

                      {/* CTA Button */}
                      <Button
                        className={cn(
                          'w-full h-11',
                          plan.isFeatured
                            ? 'bg-gradient-to-r from-[hsl(var(--primary))] to-purple-600 hover:opacity-90'
                            : ''
                        )}
                        variant={plan.isFeatured ? 'default' : 'outline'}
                        onClick={() => handleSubscribe(plan)}
                        disabled={isCurrentPlan || isProcessing === plan.id}
                      >
                        {isProcessing === plan.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isCurrentPlan ? (
                          'Current Plan'
                        ) : isFree ? (
                          'Downgrade'
                        ) : (
                          <>
                            <Zap className="h-4 w-4 mr-2" />
                            Upgrade to {plan.name}
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
          </div>

          {/* Features Comparison */}
          <div className="mt-8">
            <h3 className="text-lg font-bold mb-4 text-center">
              Why upgrade to Pro?
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  icon: '🚀',
                  title: 'Unlimited Scans',
                  desc: 'No daily limits',
                },
                { icon: '⚡', title: 'Priority AI', desc: 'Faster responses' },
                {
                  icon: '📚',
                  title: 'Unlimited History',
                  desc: 'Access forever',
                },
                {
                  icon: '🔖',
                  title: 'Unlimited Bookmarks',
                  desc: 'Save everything',
                },
                { icon: '🎯', title: 'Advanced Topics', desc: 'All subjects' },
                { icon: '💬', title: 'Priority Support', desc: '24/7 help' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="bg-[hsl(var(--muted))]/50 rounded-xl p-4 text-center"
                >
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <div className="font-medium text-sm">{item.title}</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ or Trust */}
          <div className="mt-8 text-center">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Cancel anytime • Secure payment • Instant access
            </p>
          </div>
        </div>
      </main>

      {ToastComponent}
    </div>
  );
}
