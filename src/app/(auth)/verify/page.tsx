import { Suspense } from 'react';
import VerifyForm from '@/components/form/verify-form';

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">Loading login...</div>
        </div>
      }
    >
      <VerifyForm />
    </Suspense>
  );
}
