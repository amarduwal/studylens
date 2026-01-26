import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PWAStore {
  deferredPrompt: any
  showPrompt: boolean
  showIOSModal: boolean
  isIOS: boolean
  isStandalone: boolean
  lastDismissed: number | null
  installed: boolean

  setDeferredPrompt: (prompt: any) => void
  setShowPrompt: (show: boolean) => void
  setShowIOSModal: (show: boolean) => void
  setPlatformInfo: (ios: boolean, standalone: boolean) => void
  dismissPrompt: (duration?: number) => void
  markAsInstalled: () => void
  resetDismissal: () => void
  initializePlatform: () => void
}

export const usePWAStore = create<PWAStore>()(
  persist(
    (set) => ({
      deferredPrompt: null,
      showPrompt: false,
      showIOSModal: false,
      isIOS: false,
      isStandalone: false,
      lastDismissed: null,
      installed: false,

      setDeferredPrompt: (prompt) => set({ deferredPrompt: prompt }),
      setShowPrompt: (show) => set({ showPrompt: show }),
      setShowIOSModal: (show) => set({ showIOSModal: show }),

      setPlatformInfo: (ios, standalone) => set({
        isIOS: ios,
        isStandalone: standalone,
        installed: standalone
      }),

      dismissPrompt: (duration) => {
        const dismissedAt = duration ? Date.now() : null
        set({
          lastDismissed: dismissedAt,
          showPrompt: false
        })
      },

      markAsInstalled: () => {
        set({
          installed: true,
          showPrompt: false,
          lastDismissed: Date.now()
        })
      },

      resetDismissal: () => set({ lastDismissed: null }),

      initializePlatform: () => {
        if (typeof window === 'undefined') return

        const userAgent = navigator.userAgent || navigator.vendor
        const ios = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream
        const standalone = window.matchMedia('(display-mode: standalone)').matches ||
          (navigator as any).standalone === true

        set({
          isIOS: ios,
          isStandalone: standalone,
          installed: standalone
        })
      }
    }),
    {
      name: 'pwa-storage',
      partialize: (state) => ({
        lastDismissed: state.lastDismissed,
        installed: state.installed
      })
    }
  )
)
