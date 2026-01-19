import { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'FAQ | StudyLens',
  description: 'Frequently asked questions about StudyLens.',
};

const faqs = [
  {
    category: 'General',
    questions: [
      {
        q: 'What is StudyLens?',
        a: 'StudyLens is an AI-powered visual learning companion that helps students understand educational content by analyzing images of textbooks, notes, diagrams, and problems. Simply take a photo, and get instant explanations, step-by-step solutions, and practice problems.',
      },
      {
        q: 'What subjects does StudyLens support?',
        a: 'StudyLens supports a wide range of subjects including Mathematics, Physics, Chemistry, Biology, History, Geography, Literature, Computer Science, Economics, and more. Our AI is trained to recognize and explain content across various educational domains.',
      },
      {
        q: 'Is StudyLens free to use?',
        a: 'Yes! StudyLens offers a free plan with limited daily scans. For unlimited scans and premium features, you can upgrade to our Premium plan.',
      },
      {
        q: 'What languages does StudyLens support?',
        a: 'StudyLens supports multiple languages including English, Spanish, French, German, Hindi, Chinese, Japanese, Korean, Portuguese, and many more. You can set your preferred language in the settings.',
      },
    ],
  },
  {
    category: 'Scanning & Analysis',
    questions: [
      {
        q: 'What types of content can I scan?',
        a: 'You can scan textbook pages, handwritten notes, printed worksheets, diagrams, graphs, mathematical equations, scientific formulas, historical documents, maps, and more. The clearer the image, the better the analysis.',
      },
      {
        q: 'How accurate are the explanations?',
        a: 'StudyLens uses advanced AI technology to provide accurate explanations. However, like any AI system, it may occasionally make mistakes. We recommend using StudyLens as a learning aid and verifying important information with authoritative sources.',
      },
      {
        q: 'Why is my scan taking a long time?',
        a: 'Scan time depends on the complexity of the content and current server load. Most scans complete within 10-15 seconds. If a scan takes longer than 30 seconds, try again with a clearer image.',
      },
      {
        q: 'Can I scan handwritten notes?',
        a: 'Yes! StudyLens can analyze handwritten notes, though clearer handwriting produces better results. Make sure the writing is legible and the image is well-lit.',
      },
    ],
  },
  {
    category: 'Account & Subscription',
    questions: [
      {
        q: 'Do I need an account to use StudyLens?',
        a: 'You can use StudyLens as a guest with limited features. Creating a free account gives you access to scan history, bookmarks, and personalized settings. Premium accounts get unlimited scans and additional features.',
      },
      {
        q: 'How do I upgrade to Premium?',
        a: 'Go to Profile → Subscription to view our Premium plans. You can choose between monthly or yearly billing. Premium includes unlimited scans, priority processing, and advanced features.',
      },
      {
        q: 'Can I cancel my subscription?',
        a: 'Yes, you can cancel your subscription anytime from Profile → Subscription → Manage. Your premium features will remain active until the end of your billing period.',
      },
      {
        q: 'Do you offer refunds?',
        a: "Yes! We offer a 30-day money-back guarantee for first-time Premium subscribers. Contact us at support@studylens.app if you're not satisfied.",
      },
    ],
  },
  {
    category: 'Privacy & Data',
    questions: [
      {
        q: 'Is my data safe?',
        a: 'Absolutely. We use industry-standard encryption (TLS 1.3 and AES-256) to protect your data. We never sell your personal information and you can delete your data anytime.',
      },
      {
        q: 'How long do you keep my scans?',
        a: 'Free accounts retain scans for 7 days. Premium accounts have unlimited retention. Uploaded images are automatically deleted after 30 days unless bookmarked. You can manually delete any scan at any time.',
      },
      {
        q: 'Can I export my data?',
        a: 'Yes! Go to Settings → Privacy → Download My Data to export all your data in a machine-readable format.',
      },
      {
        q: 'Do you use my scans to train AI?',
        a: 'We may use anonymized, aggregated data to improve our AI models. Your personal information and identifiable content are never used for training without consent.',
      },
    ],
  },
  {
    category: 'Technical Issues',
    questions: [
      {
        q: "The camera isn't working. What should I do?",
        a: "Make sure you've granted camera permissions to StudyLens. On iOS, go to Settings → StudyLens → Camera. On Android, go to Settings → Apps → StudyLens → Permissions.",
      },
      {
        q: 'My scan failed. What went wrong?',
        a: 'Scans can fail due to poor image quality, unsupported content, or server issues. Try taking a clearer photo with good lighting, and ensure the content is educational material.',
      },
      {
        q: 'Is there a mobile app?',
        a: 'StudyLens is a Progressive Web App (PWA) that works on any device with a browser. You can install it on your home screen for an app-like experience. Go to your browser menu and select "Add to Home Screen".',
      },
      {
        q: 'How do I report a bug?',
        a: 'Please email us at support@studylens.app with a description of the issue, your device/browser information, and screenshots if possible. We appreciate your help in improving StudyLens!',
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))] py-10">
      <main className="flex-1 overflow-y-auto pb-10 md:pb-12">
        {/* Header */}
        <div className="py-12 md:py-12">
          <div className="container mx-auto px-4 max-w-2xl">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              Frequently Asked Questions
            </h1>
            <p className="text-[hsl(var(--muted-foreground))]">
              Find answers to common questions about StudyLens
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="space-y-8">
            {faqs.map((category) => (
              <section key={category.category}>
                <h2 className="text-lg font-bold mb-4 text-[hsl(var(--primary))]">
                  {category.category}
                </h2>
                <Card>
                  <CardContent className="p-0 divide-y divide-[hsl(var(--border))]">
                    {category.questions.map((item, index) => (
                      <div key={index} className="p-4 md:p-6">
                        <h3 className="font-semibold mb-2">{item.q}</h3>
                        <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
                          {item.a}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </section>
            ))}

            {/* Still have questions */}
            <div className="text-center p-6 rounded-xl border border-[hsl(var(--primary))/0.3] bg-[hsl(var(--primary))/0.05]">
              <h2 className="text-lg font-semibold mb-2">
                Still have questions?
              </h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                Can&#39;t find what you&#39;re looking for? We&#39;re here to
                help.
              </p>
              <p className="text-sm">
                Email us at{' '}
                <a
                  href="mailto:support@studylens.app"
                  className="text-[hsl(var(--primary))] hover:underline"
                >
                  support@studylens.app
                </a>
              </p>
            </div>
          </div>

          {/* Footer Navigation */}
          <div className="mt-8 flex justify-between items-center text-sm text-[hsl(var(--muted-foreground))]">
            <Link
              href="/about"
              className="hover:text-[hsl(var(--primary))] transition-colors"
            >
              ← About Us
            </Link>
            <Link
              href="/"
              className="hover:text-[hsl(var(--primary))] transition-colors"
            >
              Back to Home →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
