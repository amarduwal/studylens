import { useEffect } from 'react'
import { usePWAStore } from '@/stores/pwa-store'

export const usePWA = () => {
  const {
    setDeferredPrompt,
    setShowPrompt,
    setPlatformInfo,
    markAsInstalled,
    showPrompt,
    isIOS,
    isStandalone,
    installed,
    lastDismissed
  } = usePWAStore()

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') return

    // Perform platform detection directly in hook
    const userAgent = navigator.userAgent || navigator.vendor
    const ios = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true

    // Update store with platform info
    setPlatformInfo(ios, standalone)

    // Don't show if already installed
    if (standalone || installed) return

    // Check if dismissed recently (within 1 hour)
    if (lastDismissed) {
      const oneDay = 60 * 60 * 1000
      if (Date.now() - lastDismissed < oneDay) {
        return
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)

      // Check session storage to prevent showing on every page
      const sessionShown = sessionStorage.getItem('pwa-prompt-shown')
      if (sessionShown) return

      // Set a delay before showing prompt
      const timer = setTimeout(() => {
        setShowPrompt(true)
        sessionStorage.setItem('pwa-prompt-shown', 'true')
      }, 3000)

      return () => clearTimeout(timer)
    }

    const handleAppInstalled = () => {
      markAsInstalled()
      sessionStorage.removeItem('pwa-prompt-shown')
    }

    // Only add event listeners if not iOS (iOS doesn't support beforeinstallprompt)
    if (!ios) {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.addEventListener('appinstalled', handleAppInstalled)
    }

    return () => {
      if (!ios) {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        window.removeEventListener('appinstalled', handleAppInstalled)
      }
    }
  }, []) // Empty dependencies - runs once on mount

  return {
    showPrompt,
    isIOS,
    isStandalone,
    installed
  }
}
