import Link from 'next/link';

const footerLinks = [
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
];

export function Footer() {
  return (
    <footer className="bottom-14 md:bottom-16 left-0 right-0">
      <div className="mx-auto w-full max-w-2xl px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Copyright - Left */}
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            © {new Date().getFullYear()} StudyLens
          </p>

          {/* Links - Right */}
          <nav className="flex items-center gap-4">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs text-[hsl(var(--primary))] hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
