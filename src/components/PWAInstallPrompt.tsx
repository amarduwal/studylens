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
              className="relative overflow-hidden rounded-2xl glass border border-white/10 dark:border-white/5 p-6 shadow-2xl backdrop-blur-xl bg-gradient-to-br from-white/90 to-white/70 dark:from-gray-900/90 dark:to-gray-900/70"
            >
              {/* Animated gradient background */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -inset-[100%] animate-gradient-shift bg-[conic-gradient(from_0deg,transparent_0deg,hsl(var(--primary))/10%,transparent_180deg)]" />
                <div className="absolute inset-0 bg-gradient-to-br from-brand-pink/5 via-transparent to-brand-purple/5" />
              </div>

              {/* Close button */}
              <button
                onClick={() => handleDismiss(7 * 24 * 60 * 60 * 1000)} // 7 days
                className="absolute right-4 top-4 z-10 p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>

              <div className="relative">
                {/* Header with icon */}
                <div className="flex items-center space-x-4 mb-6">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-lg glow animate-pulse-slow">
                      <Sparkles className="w-7 h-7 text-white" />
                    </div>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                      className="absolute inset-0 rounded-2xl border-2 border-transparent border-t-brand-pink/30 border-r-brand-purple/30"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      StudyLens Pro Experience
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Install for full app features
                    </p>
                  </div>
                </div>

                {/* Benefits grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-brand-pink/5 to-transparent dark:from-brand-pink/10">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-brand-pink/10">
                        <Zap className="w-4 h-4 text-brand-pink" />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        2x Faster
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      Instant camera access
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-gradient-to-br from-brand-purple/5 to-transparent dark:from-brand-purple/10">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-brand-purple/10">
                        <Battery className="w-4 h-4 text-brand-purple" />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        Offline Mode
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      Study anywhere
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-gradient-to-br from-brand-light-pink/10 to-transparent dark:from-brand-light-pink/5">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-brand-light-pink/20">
                        <Shield className="w-4 h-4 text-brand-light-pink" />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        Secure
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      Local processing
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-gradient-to-br from-gray-100 to-transparent dark:from-gray-800/50">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-700">
                        <Home className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        Home Screen
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      Quick access
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {isIOS ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleIOSInstructions}
                      className="flex-1 py-3.5 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-brand-pink to-brand-purple hover:shadow-lg hover:shadow-brand-pink/25 transition-shadow flex items-center justify-center space-x-2"
                    >
                      <ExternalLink className="w-5 h-5" />
                      <span>Add to Home Screen</span>
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleInstall}
                      className="flex-1 py-3.5 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-brand-pink to-brand-purple hover:shadow-lg hover:shadow-brand-pink/25 transition-shadow flex items-center justify-center space-x-2"
                    >
                      <Download className="w-5 h-5" />
                      <span>Install Now</span>
                    </motion.button>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleDismiss(24 * 60 * 60 * 1000)} // 1 day
                    className="flex-1 py-3.5 px-6 rounded-xl font-medium border-2 border-gray-200 dark:border-gray-700 hover:border-brand-pink/30 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
                  >
                    <span className="bg-gradient-to-r from-brand-pink to-brand-purple bg-clip-text text-transparent font-semibold">
                      Remind Later
                    </span>
                  </motion.button>
                </div>

                {/* Progress bar */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ delay: 0.5, duration: 30 }}
                  className="h-1 bg-gradient-to-r from-brand-pink via-brand-purple to-brand-pink rounded-full mt-4 overflow-hidden"
                />
              </div>
            </motion.div>

            {/* Mini tutorial for iOS */}
            {isIOS && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-3 text-center"
              >
                <button
                  onClick={() => setShowIOSModal(true)}
                  className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                >
                  <span>How to install on iOS</span>
                  <ExternalLink className="w-3 h-3 ml-1" />
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* iOS Instructions Modal */}
      <AnimatePresence>
        {showIOSModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowIOSModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-2xl glass border border-white/10 p-6 bg-gradient-to-br from-white to-white/90 dark:from-gray-900 dark:to-gray-900/90 shadow-2xl"
            >
              <button
                onClick={() => setShowIOSModal(false)}
                className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-xl font-bold mb-4 text-gradient">
                Install on iPhone/iPad
              </h3>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Tap the Share button
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Look for the <span className="font-mono">⎙</span> icon in
                      Safari
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Scroll and tap &quot;Add to Home Screen&quot;
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      It&39;s in the second row of actions
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Tap &quot;Add&quot; in top right
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Confirm the installation
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowIOSModal(false)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-pink to-brand-purple text-white font-semibold hover:shadow-lg transition-shadow"
                >
                  Got it, thanks!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
