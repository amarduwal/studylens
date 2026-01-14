import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ScanResult, ConversationMessage, SupportedLanguage } from "@/types";
import { v4 as uuidv4 } from 'uuid';
import { Scan } from "@/db";

interface ScanState {
  // Current scan
  currentImage: string | null;
  currentImageFile: File | null;
  currentResult: ScanResult | null;
  isAnalyzing: boolean;
  error: string | null;
  isLoading: boolean;
  hasFetched: boolean;

  // Conversation
  messages: ConversationMessage[];
  isLoadingResponse: boolean;

  // Settings
  selectedLanguage: SupportedLanguage;
  sessionId: string;

  // History (for persistence)
  scanHistory: ScanResult[];
  // bookmarkedScans: Set<string>; // Store scan IDs

  // Actions
  setCurrentImage: (image: string | null, file?: File | null) => void;
  setCurrentResult: (result: ScanResult | null) => void;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedLanguage: (language: SupportedLanguage) => void;
  addMessage: (message: Omit<ConversationMessage, "id" | "timestamp">) => void;
  clearMessages: () => void;
  setIsLoadingResponse: (isLoading: boolean) => void;
  addToHistory: (result: ScanResult) => void;
  isBookmarked: (scanId: string) => boolean;
  getBookmarkedScans: () => ScanResult[];
  clearCurrentScan: () => void;
  reset: () => void;
  fetchScansFromDB: (sessionId: string) => Promise<void>;
  fetchBookmarksFromDB: (sessionId: string) => Promise<ScanResult[]>;
  toggleBookmarkDB: (scanId: string, sessionId?: string) => Promise<boolean>;
  getScanById: (scanId: string, sessionId: string) => Promise<ScanResult | null>;

}

export const useScanStore = create<ScanState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentImage: null,
      currentImageFile: null,
      currentResult: null,
      isAnalyzing: false,
      error: null,
      messages: [],
      isLoadingResponse: false,
      selectedLanguage: "en",
      sessionId: uuidv4(),
      scanHistory: [],
      bookmarkedScans: new Set(),
      isLoading: false,
      hasFetched: false,

      // Actions
      setCurrentImage: (image, file = null) =>
        set({
          currentImage: image,
          currentImageFile: file,
          currentResult: null,
          error: null,
          messages: [],
        }),

      setCurrentResult: (result) =>
        set((state) => {
          if (result) {
            return {
              currentResult: result,
              scanHistory: [result, ...state.scanHistory].slice(0, 50), // Keep last 50
            };
          }
          return { currentResult: result };
        }),

      setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),

      setError: (error) => set({ error, isAnalyzing: false }),

      setSelectedLanguage: (language) => set({ selectedLanguage: language }),

      addMessage: (message) =>
        set((state) => ({
          messages: [
            ...state.messages,
            {
              ...message,
              id: uuidv4(),
              timestamp: new Date(),
            },
          ],
        })),

      clearMessages: () => set({ messages: [] }),

      setIsLoadingResponse: (isLoading) => set({ isLoadingResponse: isLoading }),

      addToHistory: (result) =>
        set((state) => ({
          scanHistory: [result, ...state.scanHistory].slice(0, 50),
        })),


      isBookmarked: (scanId) => {
        const scan = get().scanHistory.find(s => s.id === scanId);
        return scan?.isBookmarked || false;
      },

      getBookmarkedScans: () => {
        return get().scanHistory.filter((scan) => scan.isBookmarked);
      },


      clearCurrentScan: () =>
        set({
          currentImage: null,
          currentImageFile: null,
          currentResult: null,
          error: null,
          messages: [],
        }),

      reset: () =>
        set({
          currentImage: null,
          currentImageFile: null,
          currentResult: null,
          isAnalyzing: false,
          error: null,
          messages: [],
          isLoadingResponse: false,
        }),

      fetchScansFromDB: async (sessionId: string) => {
        set({ isLoading: true });
        try {
          const res = await fetch(`/api/scans?sessionId=${sessionId}`);
          const data = await res.json();

          if (data.success && data.data) {
            set({ scanHistory: data.data, hasFetched: true });
          }
        } catch (error) {
          console.error("Failed to fetch scans:", error);
        } finally {
          set({ isLoading: false });
        }
      },

      fetchBookmarksFromDB: async (sessionId: string) => {
        try {
          const res = await fetch(`/api/bookmarks?sessionId=${sessionId}`);
          const data = await res.json();
          return data.success ? data.data || [] : [];
        } catch (error) {
          console.error("Failed to fetch bookmarks:", error);
          return [];
        }
      },

      toggleBookmarkDB: async (scanId: string, sessionId?: string) => {
        try {
          const res = await fetch(`/api/bookmarks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scanId,
              sessionId: sessionId || get().sessionId
            }),
          });

          if (res.ok) {
            // Refresh scans to update bookmark status
            await get().fetchScansFromDB(get().sessionId);
            return true;
          }
          return false;
        } catch (error) {
          console.error("Failed to toggle bookmark:", error);
          return false;
        }
      },

      getScanById: async (scanId: string, sessionId: string) => {
        // Check local first
        const local = get().scanHistory.find((s) => s.id === scanId);
        if (local) return local;

        // Fetch from DB
        try {
          const res = await fetch(`/api/scans/${scanId}`);
          const data = await res.json();
          return data.success ? data.data : null;
        } catch {
          return null;
        }
      },

    }),
    {
      name: "studylens-storage",
      partialize: (state) => ({
        scanHistory: state.scanHistory,
        selectedLanguage: state.selectedLanguage,
        sessionId: state.sessionId,
      }),
    }
  )
);
