import { Suspense } from 'react';
import LoginForm from '@/components/form/login-form';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">Loading Login Page...</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
