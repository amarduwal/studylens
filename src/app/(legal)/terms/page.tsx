// src/app/(legal)/terms/page.tsx

import { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service | StudyLens',
  description:
    'Terms and conditions for using StudyLens AI-powered learning platform.',
};

export default function TermsOfServicePage() {
  const lastUpdated = 'January 13, 2026';
  const effectiveDate = 'January 13, 2026';

  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--background))] py-10">
      <main className="flex-1 overflow-y-auto pb-10 md:pb-12">
        <div className="space-y-6">
          {/* Header */}
          <div className="py-8 md:py-8">
            <div className="container mx-auto px-4 max-w-2xl">
              <h1 className="text-3xl md:text-4xl font-bold mb-3">
                Terms of Service
              </h1>
              <p className="text-[hsl(var(--muted-foreground))]">
                Last Updated: {lastUpdated} | Effective Date: {effectiveDate}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="container mx-auto px-4 max-w-2xl">
            <Card>
              <CardContent className="p-6 md:p-10">
                {/* Important Notice */}
                <div className="flex gap-4 p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.3] mb-8">
                  <AlertTriangle className="h-5 w-5 text-[hsl(var(--primary))] shrink-0 mt-0.5" />
                  <div>
                    <h2 className="font-semibold mb-1">
                      Important: Please Read Carefully
                    </h2>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      By using StudyLens, you agree to these Terms of Service.
                      If you do not agree, please do not use our service. These
                      terms include important provisions about liability
                      limitations, dispute resolution, and your
                      responsibilities.
                    </p>
                  </div>
                </div>

                {/* Table of Contents */}
                <nav className="mb-10 p-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.2]">
                  <h2 className="font-semibold mb-4">Table of Contents</h2>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
                    {[
                      { id: 'acceptance', label: 'Acceptance of Terms' },
                      { id: 'description', label: 'Description of Service' },
                      { id: 'accounts', label: 'Accounts & Registration' },
                      {
                        id: 'subscriptions',
                        label: 'Subscriptions & Payments',
                      },
                      { id: 'usage-rules', label: 'Acceptable Use' },
                      { id: 'content', label: 'Your Content' },
                      {
                        id: 'intellectual-property',
                        label: 'Intellectual Property',
                      },
                      {
                        id: 'ai-disclaimer',
                        label: 'AI & Educational Disclaimer',
                      },
                      { id: 'liability', label: 'Limitation of Liability' },
                      { id: 'indemnification', label: 'Indemnification' },
                      { id: 'termination', label: 'Termination' },
                      { id: 'disputes', label: 'Dispute Resolution' },
                      { id: 'changes', label: 'Changes to Terms' },
                      { id: 'general', label: 'General Provisions' },
                      { id: 'contact', label: 'Contact Information' },
                    ].map((item) => (
                      <li key={item.id}>
                        <a
                          href={`#${item.id}`}
                          className="hover:text-[hsl(var(--primary))] transition-colors"
                        >
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>

                {/* Sections */}
                <div className="space-y-10">
                  {/* Section 1 */}
                  <section id="acceptance">
                    <h2 className="text-xl font-bold mb-4">
                      1. Acceptance of Terms
                    </h2>
                    <div className="space-y-4 text-[hsl(var(--muted-foreground))]">
                      <p>
                        These Terms of Service (&quot;Terms&quot;) constitute a
                        legally binding agreement between you (&quot;User,&quot;
                        &quot;you,&quot; or &quot;your&quot;) and StudyLens
                        (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;)
                        governing your use of the StudyLens website, mobile
                        application, and related services (collectively, the
                        &quot;Service&quot;).
                      </p>
                      <p>
                        By accessing or using StudyLens, you acknowledge that
                        you have read, understood, and agree to be bound by
                        these Terms and our{' '}
                        <Link
                          href="/privacy"
                          className="text-[hsl(var(--primary))] hover:underline"
                        >
                          Privacy Policy
                        </Link>
                        .
                      </p>
                      <p>
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          Eligibility:
                        </span>{' '}
                        You must be at least 13 years old to use StudyLens. If
                        you are under 18, you represent that you have your
                        parent or guardian&39;s permission to use the Service.
                        Users under 13 require verified parental consent.
                      </p>
                    </div>
                  </section>

                  {/* Section 2 */}
                  <section id="description">
                    <h2 className="text-xl font-bold mb-4">
                      2. Description of Service
                    </h2>
                    <div className="space-y-4 text-[hsl(var(--muted-foreground))]">
                      <p>
                        StudyLens is an AI-powered visual learning companion
                        that:
                      </p>
                      <ul className="list-disc list-inside space-y-2 ml-2">
                        <li>
                          Analyzes images of educational content (textbooks,
                          notes, diagrams, problems)
                        </li>
                        <li>
                          Generates explanations, step-by-step solutions, and
                          learning content
                        </li>
                        <li>Provides follow-up question answering</li>
                        <li>Generates practice problems for reinforcement</li>
                        <li>Tracks learning progress and study streaks</li>
                        <li>Supports multiple languages</li>
                      </ul>
                      <p>
                        We reserve the right to modify, suspend, or discontinue
                        any aspect of the Service at any time, with or without
                        notice.
                      </p>
                    </div>
                  </section>

                  {/* Section 3 */}
                  <section id="accounts">
                    <h2 className="text-xl font-bold mb-4">
                      3. Accounts & Registration
                    </h2>

                    <h3 className="font-semibold mt-6 mb-3">
                      3.1 Account Creation
                    </h3>
                    <div className="space-y-4 text-[hsl(var(--muted-foreground))]">
                      <p>
                        To access certain features, you must create an account.
                        You agree to:
                      </p>
                      <ul className="list-disc list-inside space-y-2 ml-2">
                        <li>Provide accurate and complete information</li>
                        <li>Maintain and update your information as needed</li>
                        <li>Keep your password secure and confidential</li>
                        <li>
                          Notify us immediately of any unauthorized access
                        </li>
                        <li>
                          Accept responsibility for all activities under your
                          account
                        </li>
                      </ul>
                    </div>

                    <h3 className="font-semibold mt-6 mb-3">
                      3.2 Guest Access
                    </h3>
                    <p className="text-[hsl(var(--muted-foreground))]">
                      Limited functionality is available without an account.
                      Guest usage is subject to stricter limits and no data
                      persistence.
                    </p>
                  </section>

                  {/* Section 4 */}
                  <section id="subscriptions">
                    <h2 className="text-xl font-bold mb-4">
                      4. Subscriptions & Payments
                    </h2>

                    <h3 className="font-semibold mt-6 mb-3">
                      4.1 Free & Premium Plans
                    </h3>
                    <div className="space-y-4 text-[hsl(var(--muted-foreground))]">
                      <p>StudyLens offers:</p>
                      <ul className="list-disc list-inside space-y-2 ml-2">
                        <li>
                          <span className="font-medium text-[hsl(var(--foreground))]">
                            Free Plan:
                          </span>{' '}
                          Limited daily scans and features
                        </li>
                        <li>
                          <span className="font-medium text-[hsl(var(--foreground))]">
                            Premium Plan:
                          </span>{' '}
                          Unlimited scans, all features, priority support
                        </li>
                      </ul>
                    </div>

                    <h3 className="font-semibold mt-6 mb-3">4.2 Billing</h3>
                    <ul className="list-disc list-inside space-y-2 ml-2 text-[hsl(var(--muted-foreground))]">
                      <li>
                        Premium subscriptions are billed monthly or yearly in
                        advance
                      </li>
                      <li>
                        Prices are displayed in your local currency where
                        available
                      </li>
                      <li>
                        All payments are processed securely through Stripe
                      </li>
                      <li>
                        You authorize us to charge your payment method on file
                      </li>
                    </ul>

                    <h3 className="font-semibold mt-6 mb-3">
                      4.3 Auto-Renewal
                    </h3>
                    <p className="text-[hsl(var(--muted-foreground))]">
                      Subscriptions automatically renew unless canceled at least
                      24 hours before the current period ends. You can cancel
                      anytime in your account settings.
                    </p>

                    <h3 className="font-semibold mt-6 mb-3">4.4 Refunds</h3>
                    <div className="flex gap-4 p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.2] mb-4">
                      <Info className="h-5 w-5 text-[hsl(var(--primary))] shrink-0 mt-0.5" />
                      <p className="text-sm">
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          30-Day Money-Back Guarantee:
                        </span>{' '}
                        <span className="text-[hsl(var(--muted-foreground))]">
                          If you&39;re not satisfied with Premium, contact us
                          within 30 days of your first payment for a full
                          refund.
                        </span>
                      </p>
                    </div>
                    <p className="text-[hsl(var(--muted-foreground))]">
                      After 30 days, refunds are provided at our discretion.
                      Partial-month refunds are not provided for cancellations.
                    </p>

                    <h3 className="font-semibold mt-6 mb-3">
                      4.5 Price Changes
                    </h3>
                    <p className="text-[hsl(var(--muted-foreground))]">
                      We may change subscription prices with 30 days notice.
                      Price changes apply at your next renewal, not during the
                      current period.
                    </p>
                  </section>

                  {/* Section 5 */}
                  <section id="usage-rules">
                    <h2 className="text-xl font-bold mb-4">
                      5. Acceptable Use
                    </h2>
                    <p className="text-[hsl(var(--muted-foreground))] mb-4">
                      You agree NOT to use StudyLens to:
                    </p>

                    <div className="space-y-4">
                      <div className="p-4 rounded-xl border border-[hsl(var(--border))]">
                        <div className="flex items-center gap-2 mb-3">
                          <XCircle className="h-5 w-5 text-red-500" />
                          <h3 className="font-semibold">Prohibited Uses</h3>
                        </div>
                        <ul className="list-disc list-inside space-y-2 ml-2 text-sm text-[hsl(var(--muted-foreground))]">
                          <li>
                            Violate academic integrity policies (cheating on
                            exams)
                          </li>
                          <li>
                            Submit content for others to plagiarize or pass off
                            as their own work
                          </li>
                          <li>Upload illegal, harmful, or offensive content</li>
                          <li>
                            Upload content containing personally identifiable
                            information of others
                          </li>
                          <li>
                            Attempt to reverse-engineer, hack, or bypass
                            security measures
                          </li>
                          <li>Use automated tools to scrape or extract data</li>
                          <li>
                            Resell, redistribute, or commercialize the Service
                            without permission
                          </li>
                          <li>Impersonate others or create fake accounts</li>
                          <li>Interfere with or disrupt the Service</li>
                          <li>Violate any applicable laws or regulations</li>
                        </ul>
                      </div>

                      <div className="p-4 rounded-xl border border-[hsl(var(--border))]">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <h3 className="font-semibold">Encouraged Uses</h3>
                        </div>
                        <ul className="list-disc list-inside space-y-2 ml-2 text-sm text-[hsl(var(--muted-foreground))]">
                          <li>
                            Learning and understanding educational concepts
                          </li>
                          <li>
                            Checking your own work and understanding mistakes
                          </li>
                          <li>Practicing with generated problems</li>
                          <li>Supplementing classroom learning</li>
                          <li>Exploring topics beyond your curriculum</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  {/* Section 6 */}
                  <section id="content">
                    <h2 className="text-xl font-bold mb-4">6. Your Content</h2>

                    <h3 className="font-semibold mt-6 mb-3">6.1 Ownership</h3>
                    <div className="space-y-4 text-[hsl(var(--muted-foreground))]">
                      <p>
                        You retain ownership of all content you upload
                        (&quot;Your Content&quot;). However, by uploading
                        content, you grant us a limited license to:
                      </p>
                      <ul className="list-disc list-inside space-y-2 ml-2">
                        <li>
                          Process and analyze the content to provide the Service
                        </li>
                        <li>Store the content for your use</li>
                        <li>
                          Use anonymized, aggregated data to improve our AI
                          models
                        </li>
                      </ul>
                    </div>

                    <h3 className="font-semibold mt-6 mb-3">
                      6.2 Your Responsibilities
                    </h3>
                    <div className="space-y-4 text-[hsl(var(--muted-foreground))]">
                      <p>You represent and warrant that:</p>
                      <ul className="list-disc list-inside space-y-2 ml-2">
                        <li>You have the right to upload the content</li>
                        <li>
                          Your content does not violate any third-party rights
                        </li>
                        <li>
                          Your content does not contain malware or harmful code
                        </li>
                        <li>
                          Your content is not illegal, defamatory, or offensive
                        </li>
                      </ul>
                    </div>

                    <h3 className="font-semibold mt-6 mb-3">
                      6.3 Content Removal
                    </h3>
                    <p className="text-[hsl(var(--muted-foreground))]">
                      We may remove any content that violates these Terms or is
                      otherwise objectionable, at our sole discretion, without
                      notice.
                    </p>
                  </section>

                  {/* Section 7 */}
                  <section id="intellectual-property">
                    <h2 className="text-xl font-bold mb-4">
                      7. Intellectual Property
                    </h2>

                    <h3 className="font-semibold mt-6 mb-3">
                      7.1 Our Property
                    </h3>
                    <div className="space-y-4 text-[hsl(var(--muted-foreground))]">
                      <p>
                        The Service, including all software, AI models, designs,
                        text, graphics, logos, and other materials, is owned by
                        StudyLens and protected by intellectual property laws.
                        You may not:
                      </p>
                      <ul className="list-disc list-inside space-y-2 ml-2">
                        <li>
                          Copy, modify, or distribute any part of the Service
                        </li>
                        <li>Use our trademarks without permission</li>
                        <li>Reverse-engineer or decompile our software</li>
                        <li>Create derivative works based on the Service</li>
                      </ul>
                    </div>

                    <h3 className="font-semibold mt-6 mb-3">
                      7.2 AI-Generated Content
                    </h3>
                    <p className="text-[hsl(var(--muted-foreground))]">
                      Explanations and content generated by our AI are provided
                      for your personal educational use. You may use them for
                      learning but may not republish, sell, or commercialize
                      them.
                    </p>
                  </section>

                  {/* Section 8 */}
                  <section id="ai-disclaimer">
                    <h2 className="text-xl font-bold mb-4">
                      8. AI & Educational Disclaimer
                    </h2>

                    <div className="flex gap-4 p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.3]">
                      <AlertTriangle className="h-5 w-5 text-[hsl(var(--primary))] shrink-0 mt-0.5" />
                      <div className="space-y-3 text-sm text-[hsl(var(--muted-foreground))]">
                        <p>
                          <span className="font-medium text-[hsl(var(--foreground))]">
                            AI Limitations:
                          </span>{' '}
                          StudyLens uses AI technology that may occasionally
                          produce inaccurate, incomplete, or incorrect
                          information. Always verify important information with
                          authoritative sources.
                        </p>
                        <p>
                          <span className="font-medium text-[hsl(var(--foreground))]">
                            Not a Replacement:
                          </span>{' '}
                          StudyLens is a supplementary learning tool, not a
                          replacement for teachers, tutors, or formal education.
                        </p>
                        <p>
                          <span className="font-medium text-[hsl(var(--foreground))]">
                            Academic Integrity:
                          </span>{' '}
                          Using StudyLens to complete graded assignments or
                          exams may violate your institution&39;s academic
                          integrity policies. Use responsibly.
                        </p>
                        <p>
                          <span className="font-medium text-[hsl(var(--foreground))]">
                            No Professional Advice:
                          </span>{' '}
                          Content is for educational purposes only and does not
                          constitute professional, legal, medical, or financial
                          advice.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Section 9 */}
                  <section id="liability">
                    <h2 className="text-xl font-bold mb-4">
                      9. Limitation of Liability
                    </h2>

                    <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.2] text-sm">
                      <p className="uppercase font-semibold text-xs tracking-wide mb-4 text-[hsl(var(--muted-foreground))]">
                        To the maximum extent permitted by law:
                      </p>
                      <div className="space-y-3 text-[hsl(var(--muted-foreground))]">
                        <p>
                          The Service is provided &quot;AS IS&quot; and &quot;AS
                          AVAILABLE&quot; without warranties of any kind,
                          express or implied, including but not limited to
                          implied warranties of merchantability, fitness for a
                          particular purpose, and non-infringement.
                        </p>
                        <p>
                          We do not warrant that the Service will be
                          uninterrupted, error-free, or secure, or that any
                          defects will be corrected.
                        </p>
                        <p>
                          In no event shall StudyLens be liable for any
                          indirect, incidental, special, consequential, or
                          punitive damages, including but not limited to loss of
                          profits, data, use, or goodwill, arising out of or
                          related to your use of the Service.
                        </p>
                        <p>
                          Our total liability shall not exceed the amount you
                          paid to us in the twelve (12) months preceding the
                          claim, or $100 USD, whichever is greater.
                        </p>
                      </div>
                    </div>

                    <p className="text-[hsl(var(--muted-foreground))] mt-4 text-sm">
                      Some jurisdictions do not allow the exclusion of certain
                      warranties or limitations of liability, so some of the
                      above limitations may not apply to you.
                    </p>
                  </section>

                  {/* Section 10 */}
                  <section id="indemnification">
                    <h2 className="text-xl font-bold mb-4">
                      10. Indemnification
                    </h2>
                    <div className="space-y-4 text-[hsl(var(--muted-foreground))]">
                      <p>
                        You agree to indemnify, defend, and hold harmless
                        StudyLens, its affiliates, officers, directors,
                        employees, and agents from any claims, damages, losses,
                        liabilities, costs, or expenses (including reasonable
                        attorneys&39; fees) arising out of or related to:
                      </p>
                      <ul className="list-disc list-inside space-y-2 ml-2">
                        <li>Your use of the Service</li>
                        <li>Your violation of these Terms</li>
                        <li>Your violation of any third-party rights</li>
                        <li>Your Content</li>
                      </ul>
                    </div>
                  </section>

                  {/* Section 11 */}
                  <section id="termination">
                    <h2 className="text-xl font-bold mb-4">11. Termination</h2>

                    <h3 className="font-semibold mt-6 mb-3">11.1 By You</h3>
                    <div className="space-y-4 text-[hsl(var(--muted-foreground))]">
                      <p>
                        You may terminate your account at any time through
                        Settings → Account → Delete Account. Upon deletion:
                      </p>
                      <ul className="list-disc list-inside space-y-2 ml-2">
                        <li>Your data will be deleted within 30 days</li>
                        <li>
                          Active subscriptions will continue until the current
                          period ends
                        </li>
                        <li>
                          You will not receive refunds for unused time (except
                          under our refund policy)
                        </li>
                      </ul>
                    </div>

                    <h3 className="font-semibold mt-6 mb-3">11.2 By Us</h3>
                    <div className="space-y-4 text-[hsl(var(--muted-foreground))]">
                      <p>We may suspend or terminate your access if:</p>
                      <ul className="list-disc list-inside space-y-2 ml-2">
                        <li>You violate these Terms</li>
                        <li>Your payment fails repeatedly</li>
                        <li>We are required to do so by law</li>
                        <li>
                          We discontinue the Service (with reasonable notice)
                        </li>
                      </ul>
                    </div>

                    <h3 className="font-semibold mt-6 mb-3">
                      11.3 Effect of Termination
                    </h3>
                    <p className="text-[hsl(var(--muted-foreground))]">
                      Upon termination, your right to use the Service ceases
                      immediately. Sections regarding intellectual property,
                      limitation of liability, indemnification, and dispute
                      resolution survive termination.
                    </p>
                  </section>

                  {/* Section 12 */}
                  <section id="disputes">
                    <h2 className="text-xl font-bold mb-4">
                      12. Dispute Resolution
                    </h2>

                    <h3 className="font-semibold mt-6 mb-3">
                      12.1 Informal Resolution
                    </h3>
                    <p className="text-[hsl(var(--muted-foreground))]">
                      Before filing a formal dispute, please contact us at{' '}
                      <a
                        href="mailto:legal@studylens.app"
                        className="text-[hsl(var(--primary))] hover:underline"
                      >
                        legal@studylens.app
                      </a>
                      . We will attempt to resolve the issue within 30 days.
                    </p>

                    <h3 className="font-semibold mt-6 mb-3">
                      12.2 Arbitration Agreement
                    </h3>
                    <p className="text-[hsl(var(--muted-foreground))]">
                      Any dispute not resolved informally shall be resolved by
                      binding arbitration, rather than in court, except for
                      claims that qualify for small claims court.
                    </p>

                    <h3 className="font-semibold mt-6 mb-3">
                      12.3 Class Action Waiver
                    </h3>
                    <p className="text-[hsl(var(--muted-foreground))]">
                      You agree that any disputes will be resolved on an
                      individual basis, and you waive the right to participate
                      in class actions, class arbitrations, or representative
                      actions.
                    </p>

                    <h3 className="font-semibold mt-6 mb-3">
                      12.4 Governing Law
                    </h3>
                    <p className="text-[hsl(var(--muted-foreground))]">
                      These Terms are governed by the laws of [Your
                      Jurisdiction], without regard to conflict of law
                      principles.
                    </p>
                  </section>

                  {/* Section 13 */}
                  <section id="changes">
                    <h2 className="text-xl font-bold mb-4">
                      13. Changes to Terms
                    </h2>
                    <div className="space-y-4 text-[hsl(var(--muted-foreground))]">
                      <p>
                        We may modify these Terms at any time. When we make
                        material changes:
                      </p>
                      <ul className="list-disc list-inside space-y-2 ml-2">
                        <li>
                          We will update the &quot;Last Updated&quot; date
                        </li>
                        <li>
                          We will notify you via email or in-app notification at
                          least 30 days before the changes take effect
                        </li>
                        <li>
                          Continued use after the effective date constitutes
                          acceptance of the new Terms
                        </li>
                        <li>
                          If you do not agree to the changes, you must stop
                          using the Service
                        </li>
                      </ul>
                    </div>
                  </section>

                  {/* Section 14 */}
                  <section id="general">
                    <h2 className="text-xl font-bold mb-4">
                      14. General Provisions
                    </h2>

                    <div className="space-y-4 text-[hsl(var(--muted-foreground))]">
                      <p>
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          Entire Agreement:
                        </span>{' '}
                        These Terms, together with our Privacy Policy,
                        constitute the entire agreement between you and
                        StudyLens.
                      </p>
                      <p>
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          Severability:
                        </span>{' '}
                        If any provision is found unenforceable, the remaining
                        provisions remain in effect.
                      </p>
                      <p>
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          Waiver:
                        </span>{' '}
                        Our failure to enforce any right does not waive that
                        right in the future.
                      </p>
                      <p>
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          Assignment:
                        </span>{' '}
                        You may not assign your rights under these Terms. We may
                        assign our rights to an affiliate or successor.
                      </p>
                      <p>
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          Force Majeure:
                        </span>{' '}
                        We are not liable for failures due to circumstances
                        beyond our reasonable control.
                      </p>
                      <p>
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          Headings:
                        </span>{' '}
                        Section headings are for convenience only and have no
                        legal effect.
                      </p>
                    </div>
                  </section>

                  {/* Section 15 */}
                  <section id="contact">
                    <h2 className="text-xl font-bold mb-4">
                      15. Contact Information
                    </h2>
                    <p className="text-[hsl(var(--muted-foreground))] mb-4">
                      For questions about these Terms, please contact us:
                    </p>
                    <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.2]">
                      <p className="font-semibold mb-2">StudyLens Legal Team</p>
                      <p className="text-[hsl(var(--muted-foreground))] text-sm">
                        Email:{' '}
                        <a
                          href="mailto:legal@studylens.app"
                          className="text-[hsl(var(--primary))] hover:underline"
                        >
                          legal@studylens.app
                        </a>
                      </p>
                      <p className="text-[hsl(var(--muted-foreground))] text-sm mt-1">
                        Address: [Your Business Address]
                      </p>
                    </div>
                  </section>
                </div>

                {/* Acceptance Box */}
                <div className="mt-10 p-4 rounded-xl border border-[hsl(var(--primary))/0.3] bg-[hsl(var(--primary))/0.05] text-center">
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    By using StudyLens, you acknowledge that you have read,
                    understood, and agree to be bound by these Terms of Service
                    and our{' '}
                    <Link
                      href="/privacy"
                      className="text-[hsl(var(--primary))] hover:underline"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Footer Navigation */}
            <div className="mt-6 flex justify-between items-center text-sm text-[hsl(var(--muted-foreground))]">
              <Link
                href="/privacy"
                className="hover:text-[hsl(var(--primary))] transition-colors"
              >
                ← Privacy Policy
              </Link>
              <Link
                href="/"
                className="hover:text-[hsl(var(--primary))] transition-colors"
              >
                Back to Home →
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
