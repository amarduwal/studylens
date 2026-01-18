import { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import {
  GraduationCap,
  User,
  BarChart3,
  Shield,
  Download,
  Pencil,
  Trash2,
  FileOutput,
  Ban,
  Pause,
  Info,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | StudyLens',
  description:
    'Learn how StudyLens collects, uses, and protects your personal information.',
};

export default function PrivacyPolicyPage() {
  const lastUpdated = 'January 13, 2026';
  const effectiveDate = 'January 13, 2026';

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] py-10">
      <main className="flex-1 overflow-y-auto pb-10 md:pb-12">
        <div className="space-y-6">
          {/* Header */}
          <div className="py-8 md:py-8">
            <div className="container mx-auto px-4 max-w-2xl">
              <h1 className="text-3xl md:text-4xl font-bold mb-3">
                Privacy Policy
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
                {/* Table of Contents */}
                <nav className="mb-10 p-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.2]">
                  <h2 className="font-semibold mb-4">Table of Contents</h2>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
                    {[
                      { id: 'introduction', label: 'Introduction' },
                      {
                        id: 'information-we-collect',
                        label: 'Information We Collect',
                      },
                      {
                        id: 'how-we-use',
                        label: 'How We Use Your Information',
                      },
                      {
                        id: 'data-sharing',
                        label: 'Data Sharing & Third Parties',
                      },
                      { id: 'data-storage', label: 'Data Storage & Security' },
                      { id: 'your-rights', label: 'Your Rights & Choices' },
                      { id: 'cookies', label: 'Cookies & Tracking' },
                      { id: 'children', label: "Children's Privacy" },
                      {
                        id: 'international',
                        label: 'International Data Transfers',
                      },
                      { id: 'changes', label: 'Changes to This Policy' },
                      { id: 'contact', label: 'Contact Us' },
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
                  <section id="introduction">
                    <h2 className="text-xl font-bold mb-4">1. Introduction</h2>
                    <div className="space-y-4 text-[hsl(var(--muted-foreground))]">
                      <p>
                        Welcome to StudyLens (&quot;we,&quot; &quot;our,&quot;
                        or &quot;us&quot;). We are committed to protecting your
                        privacy and ensuring transparency about how we collect,
                        use, and safeguard your personal information.
                      </p>
                      <p>
                        StudyLens is an AI-powered visual learning companion
                        that helps students understand educational content by
                        analyzing images of textbooks, notes, and problems. This
                        Privacy Policy explains our practices regarding the data
                        we collect when you use our website and services at{' '}
                        <Link
                          href="/"
                          className="text-[hsl(var(--primary))] hover:underline"
                        >
                          studylens.app
                        </Link>
                        .
                      </p>
                      <p>
                        By using StudyLens, you agree to the collection and use
                        of information in accordance with this policy. If you do
                        not agree, please do not use our services.
                      </p>
                    </div>
                  </section>

                  {/* Section 2 */}
                  <section id="information-we-collect">
                    <h2 className="text-xl font-bold mb-4">
                      2. Information We Collect
                    </h2>

                    <h3 className="font-semibold mt-6 mb-3">
                      2.1 Information You Provide
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-[hsl(var(--muted-foreground))] ml-2">
                      <li>
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          Account Information:
                        </span>{' '}
                        Name, email address, password (encrypted), profile
                        picture, and username when you create an account.
                      </li>
                      <li>
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          Profile Information:
                        </span>{' '}
                        Education level, preferred language, date of birth
                        (optional), and learning preferences.
                      </li>
                      <li>
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          Uploaded Content:
                        </span>{' '}
                        Images of educational materials you scan, including
                        textbook pages, handwritten notes, diagrams, and
                        problems.
                      </li>
                      <li>
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          Communication Data:
                        </span>{' '}
                        Messages you send through follow-up questions, feedback,
                        and support requests.
                      </li>
                      <li>
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          Payment Information:
                        </span>{' '}
                        Billing address and payment method details (processed
                        securely by Stripe; we do not store full card numbers).
                      </li>
                    </ul>

                    <h3 className="font-semibold mt-6 mb-3">
                      2.2 Information Collected Automatically
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-[hsl(var(--muted-foreground))] ml-2">
                      <li>
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          Usage Data:
                        </span>{' '}
                        Features used, scans performed, time spent, learning
                        streaks, and interaction patterns.
                      </li>
                      <li>
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          Device Information:
                        </span>{' '}
                        Browser type, operating system, device type, screen
                        resolution, and unique device identifiers.
                      </li>
                      <li>
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          Log Data:
                        </span>{' '}
                        IP address, access times, pages viewed, and referring
                        URLs.
                      </li>
                      <li>
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          Location Data:
                        </span>{' '}
                        Approximate location based on IP address (country/region
                        level only).
                      </li>
                    </ul>

                    <h3 className="font-semibold mt-6 mb-3">
                      2.3 Information from Third Parties
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-[hsl(var(--muted-foreground))] ml-2">
                      <li>
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          OAuth Providers:
                        </span>{' '}
                        If you sign in with Google, we receive your name, email,
                        and profile picture from Google.
                      </li>
                      <li>
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          Payment Processors:
                        </span>{' '}
                        Stripe provides us with transaction status and billing
                        information (not full card details).
                      </li>
                    </ul>
                  </section>

                  {/* Section 3 */}
                  <section id="how-we-use">
                    <h2 className="text-xl font-bold mb-4">
                      3. How We Use Your Information
                    </h2>
                    <p className="text-[hsl(var(--muted-foreground))] mb-6">
                      We use your information for the following purposes:
                    </p>

                    <div className="space-y-4">
                      <div className="p-4 rounded-xl border border-[hsl(var(--border))]">
                        <div className="flex items-center gap-2 mb-3">
                          <GraduationCap className="h-5 w-5 text-[hsl(var(--primary))]" />
                          <h3 className="font-semibold">
                            Providing Educational Services
                          </h3>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-sm text-[hsl(var(--muted-foreground))] ml-2">
                          <li>
                            Analyze uploaded images using AI to generate
                            explanations
                          </li>
                          <li>
                            Provide step-by-step solutions and learning content
                          </li>
                          <li>
                            Generate practice problems based on your learning
                          </li>
                          <li>Maintain your scan history and bookmarks</li>
                          <li>Track your learning streaks and progress</li>
                        </ul>
                      </div>

                      <div className="p-4 rounded-xl border border-[hsl(var(--border))]">
                        <div className="flex items-center gap-2 mb-3">
                          <User className="h-5 w-5 text-[hsl(var(--primary))]" />
                          <h3 className="font-semibold">Account Management</h3>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-sm text-[hsl(var(--muted-foreground))] ml-2">
                          <li>Create and manage your account</li>
                          <li>Process subscription payments and billing</li>
                          <li>Send account-related notifications</li>
                          <li>Provide customer support</li>
                        </ul>
                      </div>

                      <div className="p-4 rounded-xl border border-[hsl(var(--border))]">
                        <div className="flex items-center gap-2 mb-3">
                          <BarChart3 className="h-5 w-5 text-[hsl(var(--primary))]" />
                          <h3 className="font-semibold">
                            Improvement & Analytics
                          </h3>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-sm text-[hsl(var(--muted-foreground))] ml-2">
                          <li>
                            Analyze usage patterns to improve our AI and
                            features
                          </li>
                          <li>
                            Conduct research to enhance educational outcomes
                          </li>
                          <li>Fix bugs and optimize performance</li>
                          <li>Develop new features based on user needs</li>
                        </ul>
                      </div>

                      <div className="p-4 rounded-xl border border-[hsl(var(--border))]">
                        <div className="flex items-center gap-2 mb-3">
                          <Shield className="h-5 w-5 text-[hsl(var(--primary))]" />
                          <h3 className="font-semibold">Safety & Legal</h3>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-sm text-[hsl(var(--muted-foreground))] ml-2">
                          <li>Prevent fraud and abuse</li>
                          <li>Enforce our Terms of Service</li>
                          <li>Comply with legal obligations</li>
                          <li>Protect the rights and safety of users</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  {/* Section 4 */}
                  <section id="data-sharing">
                    <h2 className="text-xl font-bold mb-4">
                      4. Data Sharing & Third Parties
                    </h2>
                    <p className="text-[hsl(var(--muted-foreground))] mb-6">
                      We do not sell your personal information. We share data
                      only in the following circumstances:
                    </p>

                    <div className="overflow-x-auto mb-6">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-[hsl(var(--border))]">
                            <th className="px-4 py-3 text-left font-semibold">
                              Service Provider
                            </th>
                            <th className="px-4 py-3 text-left font-semibold">
                              Purpose
                            </th>
                            <th className="px-4 py-3 text-left font-semibold">
                              Data Shared
                            </th>
                          </tr>
                        </thead>
                        <tbody className="text-[hsl(var(--muted-foreground))]">
                          <tr className="border-b border-[hsl(var(--border))]">
                            <td className="px-4 py-3 font-medium text-[hsl(var(--foreground))]">
                              Google Gemini
                            </td>
                            <td className="px-4 py-3">
                              AI-powered image analysis and explanations
                            </td>
                            <td className="px-4 py-3">
                              Uploaded images, text content
                            </td>
                          </tr>
                          <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.3]">
                            <td className="px-4 py-3 font-medium text-[hsl(var(--foreground))]">
                              Stripe
                            </td>
                            <td className="px-4 py-3">Payment processing</td>
                            <td className="px-4 py-3">
                              Billing info, transaction data
                            </td>
                          </tr>
                          <tr className="border-b border-[hsl(var(--border))]">
                            <td className="px-4 py-3 font-medium text-[hsl(var(--foreground))]">
                              Google OAuth
                            </td>
                            <td className="px-4 py-3">Authentication</td>
                            <td className="px-4 py-3">
                              Email, name, profile picture
                            </td>
                          </tr>
                          <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.3]">
                            <td className="px-4 py-3 font-medium text-[hsl(var(--foreground))]">
                              Vercel
                            </td>
                            <td className="px-4 py-3">
                              Hosting and infrastructure
                            </td>
                            <td className="px-4 py-3">
                              Server logs, IP addresses
                            </td>
                          </tr>
                          <tr className="border-b border-[hsl(var(--border))]">
                            <td className="px-4 py-3 font-medium text-[hsl(var(--foreground))]">
                              Cloudflare R2
                            </td>
                            <td className="px-4 py-3">Image storage</td>
                            <td className="px-4 py-3">Uploaded images</td>
                          </tr>
                          <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.3]">
                            <td className="px-4 py-3 font-medium text-[hsl(var(--foreground))]">
                              Neon
                            </td>
                            <td className="px-4 py-3">Database hosting</td>
                            <td className="px-4 py-3">
                              All user data (encrypted)
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <p className="text-[hsl(var(--muted-foreground))] mb-4">
                      We may also share information:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-[hsl(var(--muted-foreground))] ml-2">
                      <li>With your consent or at your direction</li>
                      <li>To comply with legal obligations or court orders</li>
                      <li>To protect our rights, property, or safety</li>
                      <li>
                        In connection with a merger, acquisition, or sale of
                        assets (with notice to you)
                      </li>
                    </ul>
                  </section>

                  {/* Section 5 */}
                  <section id="data-storage">
                    <h2 className="text-xl font-bold mb-4">
                      5. Data Storage & Security
                    </h2>

                    <h3 className="font-semibold mt-6 mb-3">
                      5.1 Data Retention
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-[hsl(var(--muted-foreground))] ml-2">
                      <li>
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          Account Data:
                        </span>{' '}
                        Retained until you delete your account
                      </li>
                      <li>
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          Scan History:
                        </span>{' '}
                        Based on your plan (7 days for free, unlimited for
                        premium)
                      </li>
                      <li>
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          Uploaded Images:
                        </span>{' '}
                        Automatically deleted after 30 days (unless bookmarked)
                      </li>
                      <li>
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          Usage Logs:
                        </span>{' '}
                        Retained for 90 days
                      </li>
                      <li>
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          Payment Records:
                        </span>{' '}
                        Retained for 7 years (legal requirement)
                      </li>
                    </ul>

                    <h3 className="font-semibold mt-6 mb-3">
                      5.2 Security Measures
                    </h3>
                    <p className="text-[hsl(var(--muted-foreground))] mb-4">
                      We implement industry-standard security measures:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-[hsl(var(--muted-foreground))] ml-2">
                      <li>TLS 1.3 encryption for all data in transit</li>
                      <li>AES-256 encryption for data at rest</li>
                      <li>Secure password hashing using bcrypt</li>
                      <li>Regular security audits and penetration testing</li>
                      <li>Role-based access controls for our team</li>
                      <li>
                        Automatic session expiry and secure token handling
                      </li>
                    </ul>

                    <div className="flex gap-4 p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.2] mt-6">
                      <Info className="h-5 w-5 text-[hsl(var(--primary))] shrink-0 mt-0.5" />
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          Important:
                        </span>{' '}
                        While we strive to protect your data, no method of
                        transmission over the Internet is 100% secure. We cannot
                        guarantee absolute security.
                      </p>
                    </div>
                  </section>

                  {/* Section 6 */}
                  <section id="your-rights">
                    <h2 className="text-xl font-bold mb-4">
                      6. Your Rights & Choices
                    </h2>
                    <p className="text-[hsl(var(--muted-foreground))] mb-6">
                      Depending on your location, you may have the following
                      rights:
                    </p>

                    <div className="grid sm:grid-cols-2 gap-4 mb-6">
                      <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.2]">
                        <div className="flex items-center gap-2 mb-2">
                          <Download className="h-4 w-4 text-[hsl(var(--primary))]" />
                          <h4 className="font-semibold text-sm">Access</h4>
                        </div>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                          Request a copy of your personal data
                        </p>
                      </div>
                      <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.2]">
                        <div className="flex items-center gap-2 mb-2">
                          <Pencil className="h-4 w-4 text-[hsl(var(--primary))]" />
                          <h4 className="font-semibold text-sm">
                            Rectification
                          </h4>
                        </div>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                          Correct inaccurate personal data
                        </p>
                      </div>
                      <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.2]">
                        <div className="flex items-center gap-2 mb-2">
                          <Trash2 className="h-4 w-4 text-[hsl(var(--primary))]" />
                          <h4 className="font-semibold text-sm">Deletion</h4>
                        </div>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                          Request deletion of your data
                        </p>
                      </div>
                      <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.2]">
                        <div className="flex items-center gap-2 mb-2">
                          <FileOutput className="h-4 w-4 text-[hsl(var(--primary))]" />
                          <h4 className="font-semibold text-sm">Portability</h4>
                        </div>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                          Export your data in a machine-readable format
                        </p>
                      </div>
                      <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.2]">
                        <div className="flex items-center gap-2 mb-2">
                          <Ban className="h-4 w-4 text-[hsl(var(--primary))]" />
                          <h4 className="font-semibold text-sm">Objection</h4>
                        </div>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                          Object to processing of your data
                        </p>
                      </div>
                      <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.2]">
                        <div className="flex items-center gap-2 mb-2">
                          <Pause className="h-4 w-4 text-[hsl(var(--primary))]" />
                          <h4 className="font-semibold text-sm">Restriction</h4>
                        </div>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                          Limit how we use your data
                        </p>
                      </div>
                    </div>

                    <p className="text-[hsl(var(--muted-foreground))] mb-6">
                      To exercise these rights, please contact us at{' '}
                      <a
                        href="mailto:privacy@studylens.app"
                        className="text-[hsl(var(--primary))] hover:underline"
                      >
                        privacy@studylens.app
                      </a>
                      . We will respond within 30 days.
                    </p>

                    <h3 className="font-semibold mt-6 mb-3">
                      Account Controls
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-[hsl(var(--muted-foreground))] ml-2">
                      <li>
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          Profile Settings:
                        </span>{' '}
                        Update your information in Settings → Profile
                      </li>
                      <li>
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          Notification Preferences:
                        </span>{' '}
                        Manage emails in Settings → Notifications
                      </li>
                      <li>
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          Delete Account:
                        </span>{' '}
                        Settings → Account → Delete Account
                      </li>
                      <li>
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          Export Data:
                        </span>{' '}
                        Settings → Privacy → Download My Data
                      </li>
                    </ul>
                  </section>

                  {/* Section 7 */}
                  <section id="cookies">
                    <h2 className="text-xl font-bold mb-4">
                      7. Cookies & Tracking
                    </h2>
                    <p className="text-[hsl(var(--muted-foreground))] mb-6">
                      We use cookies and similar technologies for:
                    </p>

                    <div className="overflow-x-auto mb-6">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-[hsl(var(--border))]">
                            <th className="px-4 py-3 text-left font-semibold">
                              Type
                            </th>
                            <th className="px-4 py-3 text-left font-semibold">
                              Purpose
                            </th>
                            <th className="px-4 py-3 text-left font-semibold">
                              Duration
                            </th>
                          </tr>
                        </thead>
                        <tbody className="text-[hsl(var(--muted-foreground))]">
                          <tr className="border-b border-[hsl(var(--border))]">
                            <td className="px-4 py-3 font-medium text-[hsl(var(--foreground))]">
                              Essential
                            </td>
                            <td className="px-4 py-3">
                              Authentication, security, basic functionality
                            </td>
                            <td className="px-4 py-3">Session / 30 days</td>
                          </tr>
                          <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.3]">
                            <td className="px-4 py-3 font-medium text-[hsl(var(--foreground))]">
                              Preferences
                            </td>
                            <td className="px-4 py-3">
                              Theme, language, display settings
                            </td>
                            <td className="px-4 py-3">1 year</td>
                          </tr>
                          <tr className="border-b border-[hsl(var(--border))]">
                            <td className="px-4 py-3 font-medium text-[hsl(var(--foreground))]">
                              Analytics
                            </td>
                            <td className="px-4 py-3">
                              Usage patterns, feature popularity
                            </td>
                            <td className="px-4 py-3">90 days</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <p className="text-[hsl(var(--muted-foreground))]">
                      You can manage cookies through your browser settings. Note
                      that disabling essential cookies may affect functionality.
                    </p>
                  </section>

                  {/* Section 8 */}
                  <section id="children">
                    <h2 className="text-xl font-bold mb-4">
                      8. Children&#39;s Privacy
                    </h2>
                    <p className="text-[hsl(var(--muted-foreground))] mb-4">
                      StudyLens is designed for students of all ages. However,
                      we take special care with younger users:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-[hsl(var(--muted-foreground))] ml-2 mb-4">
                      <li>
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          Under 13 (COPPA):
                        </span>{' '}
                        Children under 13 should use StudyLens with parental
                        consent. We do not knowingly collect personal
                        information from children under 13 without parental
                        consent.
                      </li>
                      <li>
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          Under 16 (GDPR):
                        </span>{' '}
                        In the EU, children under 16 require parental consent to
                        create an account.
                      </li>
                      <li>
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          Student Data:
                        </span>{' '}
                        We do not sell student data or use it for behavioral
                        advertising.
                      </li>
                    </ul>
                    <p className="text-[hsl(var(--muted-foreground))]">
                      If you believe we have collected information from a child
                      without proper consent, please contact us immediately at{' '}
                      <a
                        href="mailto:privacy@studylens.app"
                        className="text-[hsl(var(--primary))] hover:underline"
                      >
                        privacy@studylens.app
                      </a>
                      .
                    </p>
                  </section>

                  {/* Section 9 */}
                  <section id="international">
                    <h2 className="text-xl font-bold mb-4">
                      9. International Data Transfers
                    </h2>
                    <p className="text-[hsl(var(--muted-foreground))] mb-4">
                      StudyLens operates globally. Your data may be processed
                      in:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-[hsl(var(--muted-foreground))] ml-2 mb-4">
                      <li>United States (Vercel, Stripe, Google)</li>
                      <li>European Union (some infrastructure)</li>
                    </ul>
                    <p className="text-[hsl(var(--muted-foreground))]">
                      We use Standard Contractual Clauses and other safeguards
                      to protect data transferred outside your country. For EU
                      users, we comply with GDPR requirements for international
                      transfers.
                    </p>
                  </section>

                  {/* Section 10 */}
                  <section id="changes">
                    <h2 className="text-xl font-bold mb-4">
                      10. Changes to This Policy
                    </h2>
                    <p className="text-[hsl(var(--muted-foreground))] mb-4">
                      We may update this Privacy Policy from time to time. When
                      we make significant changes:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-[hsl(var(--muted-foreground))] ml-2">
                      <li>We will update the &quot;Last Updated&quot; date</li>
                      <li>
                        We will notify you via email or in-app notification
                      </li>
                      <li>
                        For material changes, we may ask for your consent again
                      </li>
                    </ul>
                  </section>

                  {/* Section 11 */}
                  <section id="contact">
                    <h2 className="text-xl font-bold mb-4">11. Contact Us</h2>
                    <p className="text-[hsl(var(--muted-foreground))] mb-4">
                      If you have questions about this Privacy Policy or our
                      data practices:
                    </p>
                    <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.2]">
                      <p className="font-semibold mb-2">
                        StudyLens Privacy Team
                      </p>
                      <p className="text-[hsl(var(--muted-foreground))] text-sm">
                        Email:{' '}
                        <a
                          href="mailto:privacy@studylens.app"
                          className="text-[hsl(var(--primary))] hover:underline"
                        >
                          privacy@studylens.app
                        </a>
                      </p>
                      <p className="text-[hsl(var(--muted-foreground))] text-sm mt-1">
                        Address: [Your Business Address]
                      </p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-4">
                        We aim to respond to all privacy inquiries within 30
                        days.
                      </p>
                    </div>
                  </section>
                </div>

                {/* Acceptance Box */}
                <div className="mt-10 p-4 rounded-xl border border-[hsl(var(--primary))/0.3] bg-[hsl(var(--primary))/0.05] text-center">
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    By using StudyLens, you acknowledge that you have read and
                    understood this Privacy Policy.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Footer Navigation */}
            <div className="mt-6 flex justify-between items-center text-sm text-[hsl(var(--muted-foreground))]">
              <Link
                href="/"
                className="hover:text-[hsl(var(--primary))] transition-colors"
              >
                ← Back to Home
              </Link>
              <Link
                href="/terms"
                className="hover:text-[hsl(var(--primary))] transition-colors"
              >
                Terms of Service →
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
