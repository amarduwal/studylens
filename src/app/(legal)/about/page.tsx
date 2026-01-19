import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import {
  Camera,
  Sparkles,
  MessageSquare,
  Target,
  Users,
  Zap,
  Globe,
  Heart,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Us | StudyLens',
  description:
    'Learn about StudyLens - Your AI-powered visual learning companion.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))] py-10">
      <main className="flex-1 overflow-y-auto pb-10 md:pb-12">
        {/* Header */}
        <div className="py-8 md:py-8 text-center">
          <div className="container mx-auto px-4 max-w-2xl">
            <div className="flex justify-center mb-6">
              <div className="relative h-16 w-16">
                <Image
                  src="/icon-192.png"
                  alt="StudyLens"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              About StudyLens
            </h1>
            <p className="text-[hsl(var(--muted-foreground))] text-lg max-w-2xl mx-auto">
              Your AI-powered visual learning companion that transforms the way
              you study
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="space-y-12">
            {/* Mission Section */}
            <section>
              <Card>
                <CardContent className="p-6 md:p-10">
                  <div className="flex items-center gap-3 mb-4">
                    <Target className="h-6 w-6 text-[hsl(var(--primary))]" />
                    <h2 className="text-xl font-bold">Our Mission</h2>
                  </div>
                  <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                    At StudyLens, we believe that understanding should never be
                    a barrier to learning. Our mission is to make education more
                    accessible by providing instant, AI-powered explanations for
                    any educational content. Whether you&#39;re stuck on a
                    complex math problem, trying to understand a scientific
                    diagram, or decoding historical events, StudyLens is here to
                    help you learn smarter, not harder.
                  </p>
                </CardContent>
              </Card>
            </section>

            {/* How It Works */}
            <section>
              <h2 className="text-xl font-bold mb-6 text-center">
                How It Works
              </h2>
              <div className="grid sm:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="flex justify-center mb-4">
                      <div className="p-3 rounded-full bg-[hsl(var(--primary))]/10">
                        <Camera className="h-6 w-6 text-[hsl(var(--primary))]" />
                      </div>
                    </div>
                    <h3 className="font-semibold mb-2">1. Scan</h3>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      Take a photo of any educational content - textbooks,
                      notes, diagrams, or problems
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="flex justify-center mb-4">
                      <div className="p-3 rounded-full bg-[hsl(var(--primary))]/10">
                        <Sparkles className="h-6 w-6 text-[hsl(var(--primary))]" />
                      </div>
                    </div>
                    <h3 className="font-semibold mb-2">2. Analyze</h3>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      Our AI instantly analyzes the content and generates clear
                      explanations
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="flex justify-center mb-4">
                      <div className="p-3 rounded-full bg-[hsl(var(--primary))]/10">
                        <MessageSquare className="h-6 w-6 text-[hsl(var(--primary))]" />
                      </div>
                    </div>
                    <h3 className="font-semibold mb-2">3. Learn</h3>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      Get step-by-step solutions, ask follow-up questions, and
                      practice
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Features */}
            <section>
              <h2 className="text-xl font-bold mb-6 text-center">
                Why StudyLens?
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex gap-4 p-4 rounded-xl border border-[hsl(var(--border))]">
                  <Zap className="h-5 w-5 text-[hsl(var(--primary))] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-1">Instant Explanations</h3>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      Get detailed explanations in seconds, not minutes
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-xl border border-[hsl(var(--border))]">
                  <Globe className="h-5 w-5 text-[hsl(var(--primary))] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-1">Multiple Languages</h3>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      Learn in your preferred language with multi-language
                      support
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-xl border border-[hsl(var(--border))]">
                  <Users className="h-5 w-5 text-[hsl(var(--primary))] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-1">All Subjects</h3>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      Math, Science, History, Literature, and more
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-xl border border-[hsl(var(--border))]">
                  <Heart className="h-5 w-5 text-[hsl(var(--primary))] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-1">Student-Focused</h3>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      Designed with students in mind, for students of all ages
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Values */}
            <section>
              <Card>
                <CardContent className="p-6 md:p-10">
                  <h2 className="text-xl font-bold mb-6">Our Values</h2>
                  <div className="space-y-4 text-[hsl(var(--muted-foreground))]">
                    <p>
                      <span className="font-medium text-[hsl(var(--foreground))]">
                        Accessibility:
                      </span>{' '}
                      Education should be available to everyone, regardless of
                      their background or resources.
                    </p>
                    <p>
                      <span className="font-medium text-[hsl(var(--foreground))]">
                        Integrity:
                      </span>{' '}
                      We encourage learning and understanding, not shortcuts.
                      StudyLens is a study companion, not a cheating tool.
                    </p>
                    <p>
                      <span className="font-medium text-[hsl(var(--foreground))]">
                        Privacy:
                      </span>{' '}
                      Your data is yours. We&#39;re committed to protecting your
                      privacy and never selling your information.
                    </p>
                    <p>
                      <span className="font-medium text-[hsl(var(--foreground))]">
                        Continuous Improvement:
                      </span>{' '}
                      We&#39;re always working to make StudyLens better based on
                      your feedback.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Contact */}
            <section>
              <div className="text-center p-6 rounded-xl border border-[hsl(var(--primary))/0.3] bg-[hsl(var(--primary))/0.05]">
                <h2 className="text-lg font-semibold mb-2">Get in Touch</h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                  Have questions, feedback, or just want to say hi?
                </p>
                <p className="text-sm">
                  Email us at{' '}
                  <a
                    href="mailto:hello@studylens.app"
                    className="text-[hsl(var(--primary))] hover:underline"
                  >
                    hello@studylens.app
                  </a>
                </p>
              </div>
            </section>
          </div>

          {/* Footer Navigation */}
          <div className="mt-8 flex justify-between items-center text-sm text-[hsl(var(--muted-foreground))]">
            <Link
              href="/"
              className="hover:text-[hsl(var(--primary))] transition-colors"
            >
              ← Back to Home
            </Link>
            <Link
              href="/faq"
              className="hover:text-[hsl(var(--primary))] transition-colors"
            >
              FAQ →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
