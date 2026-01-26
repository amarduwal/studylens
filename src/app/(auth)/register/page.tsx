import { Suspense } from 'react';
import RegisterForm from '@/components/form/register-form';

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">Loading Register Page...</div>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
