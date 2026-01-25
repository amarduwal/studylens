'use client';

import { useEffect } from 'react';
import { useScanStore } from '@/stores/scan-store';
import { generateDeviceFingerprint } from '@/lib/fingerprint';

export function FingerprintProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { deviceFingerprint, setDeviceFingerprint } = useScanStore();

  useEffect(() => {
    if (!deviceFingerprint) {
      generateDeviceFingerprint().then(setDeviceFingerprint);
    }
  }, [deviceFingerprint, setDeviceFingerprint]);

  return <>{children}</>;
}
