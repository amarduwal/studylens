import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 pb-20 md:pb-0">
        {children}
        <Footer />
      </main>
    </div>
  );
}
