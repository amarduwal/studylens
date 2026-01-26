import { Suspense } from 'react';
import ResetPasswordForm from '@/components/form/reset-password-form';

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">Loading Password Reset...</div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
