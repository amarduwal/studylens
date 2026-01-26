'use client';

import {
  X,
  Download,
  Sparkles,
  ExternalLink,
  Zap,
  Battery,
  Shield,
  Home,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePWA } from '@/hooks/use-pwa';
import { usePWAStore } from '@/stores/pwa-store';
import { Button } from './ui/button';

export default function PWAInstallPrompt() {
  const { showPrompt, isIOS, isStandalone, installed } = usePWA();
  const {
    deferredPrompt,
    showIOSModal,
    setShowPrompt,
    setShowIOSModal,
    dismissPrompt,
    markAsInstalled,
  } = usePWAStore();

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        markAsInstalled();
        sessionStorage.removeItem('pwa-prompt-shown');
      } else {
        dismissPrompt(60 * 60 * 1000); // 1 hour
      }
    } catch (error) {
      console.error('Installation failed:', error);
      dismissPrompt(30 * 60 * 1000); // 30 minutes on error
    }
  };

  const handleIOSInstructions = () => {
    setShowIOSModal(true);
    setShowPrompt(false);
  };

  const handleDismiss = (duration?: number) => {
    dismissPrompt(duration);
    sessionStorage.setItem('pwa-prompt-shown', 'true');
  };

  // Don't show if already installed or in standalone mode
  if (installed || isStandalone || showIOSModal) return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className="fixed inset-x-0 bottom-0 z-50 p-4 md:p-6 pb-safe"
        >
          <div className="max-w-md mx-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="relative overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-lg"
            >
              {/* Close button */}
              <button
                onClick={() => handleDismiss(7 * 24 * 60 * 60 * 1000)} // 7 days
                className="absolute right-4 top-4 z-10 p-2 rounded-full hover:bg-[hsl(var(--muted))] transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              </button>

              <div className="p-6">
                {/* Header with icon */}
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--primary))] flex items-center justify-center shadow-lg">
                    <Sparkles className="w-7 h-7 text-[hsl(var(--primary-foreground))]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-[hsl(var(--foreground))]">
                      StudyLens Pro Experience
                    </h3>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      Install for full app features
                    </p>
                  </div>
                </div>

                {/* Benefits grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="p-4 rounded-xl bg-[hsl(var(--muted))]/50 border border-[hsl(var(--border))]">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-[hsl(var(--primary))]/10">
                        <Zap className="w-4 h-4 text-[hsl(var(--primary))]" />
                      </div>
                      <span className="text-sm font-semibold text-[hsl(var(--foreground))]">
                        2x Faster
                      </span>
                    </div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      Instant camera access
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[hsl(var(--muted))]/50 border border-[hsl(var(--border))]">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-[hsl(var(--primary))]/10">
                        <Battery className="w-4 h-4 text-[hsl(var(--primary))]" />
                      </div>
                      <span className="text-sm font-semibold text-[hsl(var(--foreground))]">
                        Offline Mode
                      </span>
                    </div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      Study anywhere
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[hsl(var(--muted))]/50 border border-[hsl(var(--border))]">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-[hsl(var(--primary))]/10">
                        <Shield className="w-4 h-4 text-[hsl(var(--primary))]" />
                      </div>
                      <span className="text-sm font-semibold text-[hsl(var(--foreground))]">
                        Secure
                      </span>
                    </div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      Local processing
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[hsl(var(--muted))]/50 border border-[hsl(var(--border))]">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-[hsl(var(--muted-foreground))]/20">
                        <Home className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                      </div>
                      <span className="text-sm font-semibold text-[hsl(var(--foreground))]">
                        Home Screen
                      </span>
                    </div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      Quick access
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {isIOS ? (
                    <Button
                      onClick={handleIOSInstructions}
                      className="flex-1 py-3"
                    >
                      <ExternalLink className="w-5 h-5 mr-2" />
                      Add to Home Screen
                    </Button>
                  ) : (
                    <Button onClick={handleInstall} className="flex-1 py-3">
                      <Download className="w-5 h-5 mr-2" />
                      Install Now
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => handleDismiss(24 * 60 * 60 * 1000)} // 1 day
                    className="flex-1 py-3"
                  >
                    Remind Later
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* iOS Instructions Modal */}
      <AnimatePresence>
        {showIOSModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in-0"
              onClick={() => setShowIOSModal(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 top-[50%] z-50 translate-y-[-50%] mx-auto max-w-md animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[hsl(var(--border))]">
                  <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    Install on iPhone/iPad
                  </h2>
                  <button
                    onClick={() => setShowIOSModal(false)}
                    className="p-2 rounded-full hover:bg-[hsl(var(--muted))] transition-colors"
                  >
                    <X className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="space-y-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-8 h-8 rounded-xl bg-[hsl(var(--primary))] flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-sm">1</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-[hsl(var(--foreground))] mb-1">
                          Tap the Share button
                        </p>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                          Look for the{' '}
                          <span className="font-mono text-[hsl(var(--foreground))]">
                            ⎙
                          </span>{' '}
                          icon in Safari
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="w-8 h-8 rounded-xl bg-[hsl(var(--primary))] flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-sm">2</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-[hsl(var(--foreground))] mb-1">
                          Scroll and tap &quot;Add to Home Screen&quot;
                        </p>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                          Its in the second row of actions
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="w-8 h-8 rounded-xl bg-[hsl(var(--primary))] flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-sm">3</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-[hsl(var(--foreground))] mb-1">
                          Tap &quot;Add&quot; in top right
                        </p>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                          Confirm the installation
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-[hsl(var(--border))]">
                  <Button
                    variant="outline"
                    onClick={() => setShowIOSModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => setShowIOSModal(false)}
                    className="flex-1"
                  >
                    Got it, thanks!
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
