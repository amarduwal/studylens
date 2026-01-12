import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ScanResult, ConversationMessage, SupportedLanguage } from "@/types";
import { nanoid } from "nanoid";

interface ScanState {
  // Current scan
  currentImage: string | null;
  currentImageFile: File | null;
  currentResult: ScanResult | null;
  isAnalyzing: boolean;
  error: string | null;

  // Conversation
  messages: ConversationMessage[];
  isLoadingResponse: boolean;

  // Settings
  selectedLanguage: SupportedLanguage;
  sessionId: string;

  // History (for persistence)
  scanHistory: ScanResult[];
  bookmarkedScans: Set<string>; // Store scan IDs

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
  toggleBookmark: (scanId: string) => void;
  isBookmarked: (scanId: string) => boolean;
  getBookmarkedScans: () => ScanResult[];
  clearCurrentScan: () => void;
  reset: () => void;
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
      sessionId: nanoid(),
      scanHistory: [],
      bookmarkedScans: new Set(),

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
              id: nanoid(),
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

      toggleBookmark: (scanId) =>
        set((state) => {
          const newBookmarks = new Set(state.bookmarkedScans);
          if (newBookmarks.has(scanId)) {
            newBookmarks.delete(scanId);
          } else {
            newBookmarks.add(scanId);
          }
          return { bookmarkedScans: newBookmarks };
        }),

      isBookmarked: (scanId) => {
        return get().bookmarkedScans.has(scanId);
      },

      getBookmarkedScans: () => {
        const state = get();
        return state.scanHistory.filter((scan) =>
          state.bookmarkedScans.has(scan.id)
        );
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
    }),
    {
      name: "studylens-storage",
      partialize: (state) => ({
        scanHistory: state.scanHistory,
        selectedLanguage: state.selectedLanguage,
        sessionId: state.sessionId,
        bookmarkedScans: Array.from(state.bookmarkedScans), // Convert Set to Array for storage
      }),
      // Restore Set from Array
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.bookmarkedScans)) {
          state.bookmarkedScans = new Set(state.bookmarkedScans as unknown as string[]);
        }
      },
    }
  )
);
