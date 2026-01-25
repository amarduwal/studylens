import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ScanResult, ConversationMessage, SupportedLanguage, ScanBookmarkResult, LimitError, BookmarkResponse } from "@/types";
import { v4 as uuidv4 } from 'uuid';

interface ScanState {
  // Current scan
  currentImages: string[];
  currentImageFiles: File[];
  currentResult: ScanResult | null;
  isAnalyzing: boolean;
  error: string | null;
  limitError: LimitError | null;
  isLoading: boolean;
  hasFetched: boolean;
  currentPage: number;
  hasMore: boolean;
  isLoadingMore: boolean;

  // Conversation
  messages: ConversationMessage[];
  setMessages: (messages: ConversationMessage[]) => void;
  isLoadingResponse: boolean;

  // Settings
  selectedLanguage: SupportedLanguage;
  sessionId: string;

  // History (for persistence)
  scanHistory: ScanResult[];
  // bookmarkedScans: Set<string>; // Store scan IDs

  // Recent Scan History
  // recentScans: [];

  // Scan Search
  searchResults: ScanResult[];
  searchQuery: string;

  // Device fingerprint/identifier
  deviceFingerprint: string | null;
  setDeviceFingerprint: (fingerprint: string) => void;

  // Actions
  setCurrentImages: (images: string[], files: File[]) => void;
  addImage: (image: string, file: File) => void;
  removeImage: (index: number) => void;
  setCurrentResult: (result: ScanResult | null) => void;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  setError: (error: string | null) => void;
  setLimitError: (error: LimitError) => void;
  clearLimitError: () => void;
  setSelectedLanguage: (language: SupportedLanguage) => void;
  addMessage: (message: Omit<ConversationMessage, "id" | "timestamp">) => void;
  clearMessages: () => void;
  setIsLoadingResponse: (isLoading: boolean) => void;
  addToHistory: (result: ScanResult) => void;
  // fetchRecentScans: (sessionId: string) => Promise<void>;
  getRecentScans: () => ScanResult[];
  isBookmarked: (scanId: string) => boolean;
  getBookmarkedScans: () => ScanResult[];
  clearCurrentScan: () => void;
  reset: () => void;
  fetchScansFromDB: (sessionId: string, page?: number) => Promise<void>;
  fetchBookmarksFromDB: (sessionId: string, page?: number) => Promise<ScanBookmarkResult[]>;
  loadMoreScans: () => Promise<void>;
  // setCurrentPage: (page: number) => void;
  toggleBookmarkDB: (scanId: string, sessionId?: string) => Promise<BookmarkResponse>;
  getScanById: (scanId: string, sessionId: string) => Promise<ScanResult | null>;
  searchScans: (query: string, sessionId: string) => Promise<ScanBookmarkResult[]>;
  clearSearch: () => void;
}

export const useScanStore = create<ScanState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentImages: [],
      currentImageFiles: [],
      currentResult: null,
      isAnalyzing: false,
      error: null,
      limitError: null,
      messages: [],
      isLoadingResponse: false,
      selectedLanguage: "en",
      sessionId: uuidv4(),
      scanHistory: [],
      recentScans: [],
      bookmarkedScans: new Set(),
      isLoading: false,
      hasFetched: false,
      currentPage: 1,
      hasMore: false,
      isLoadingMore: false,
      searchResults: [],
      searchQuery: '',
      deviceFingerprint: null,

      setDeviceFingerprint: (fingerprint) => set({ deviceFingerprint: fingerprint }),

      // Actions
      setCurrentImages: (images, files) =>
        set({ currentImages: images, currentImageFiles: files }),

      addImage: (image, file) =>
        set((state) => ({
          currentImages: [...state.currentImages, image],
          currentImageFiles: [...state.currentImageFiles, file],
        })),

      removeImage: (index) =>
        set((state) => ({
          currentImages: state.currentImages.filter((_, i) => i !== index),
          currentImageFiles: state.currentImageFiles.filter((_, i) => i !== index),
        })),

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

      setLimitError: (error) => set({ limitError: error }),

      clearLimitError: () => set({ limitError: null }),

      setSelectedLanguage: (language) => set({ selectedLanguage: language }),

      addMessage: (message) =>
        set((state) => {
          // Check if message with same content and role already exists in last few messages
          const isDuplicate = state.messages
            .slice(-5) // Check last 5 messages
            .some(
              (m) =>
                m.role === message.role &&
                m.content === message.content &&
                Date.now() - new Date(m.timestamp).getTime() < 1000 // Within 1 second
            );

          if (isDuplicate) {
            return state; // Don't add duplicate
          }

          return {
            messages: [
              ...state.messages,
              {
                ...message,
                id: uuidv4(),
                timestamp: new Date(),
              },
            ],
          };
        }),

      setMessages: (messages) => set({ messages }),

      clearMessages: () => set({ messages: [] }),

      setIsLoadingResponse: (isLoading) => set({ isLoadingResponse: isLoading }),

      addToHistory: (result) =>
        set((state) => ({
          scanHistory: [result, ...state.scanHistory].slice(0, 50),
        })),

      // fetchRecentScans: async (sessionId: string) => {
      //   set({ isLoading: true });
      //   try {
      //     const res = await fetch(`/api/scans/recent?sessionId=${sessionId}&limit=5`); // Change how much recent scan to show
      //     const data = await res.json();

      //     if (data.success && data.data) {
      //       set({ recentScans: data.data });
      //     }
      //   } catch (error) {
      //     console.error("Failed to fetch recent scans:", error);
      //   } finally {
      //     set({ isLoading: false });
      //   }
      // },

      getRecentScans: () => {
        return get().scanHistory.slice(0, 5); // Get first 5 from local history
      },

      isBookmarked: (scanId) => {
        const scan = get().scanHistory.find(s => s.id === scanId);
        return scan?.isBookmarked || false;
      },

      getBookmarkedScans: () => {
        return get().scanHistory.filter((scan) => scan.isBookmarked);
      },

      searchScans: async (query: string, sessionId: string) => {
        if (!query.trim()) {
          set({ searchResults: [], searchQuery: '' });
          return;
        }

        set({ isLoading: true, searchQuery: query });
        try {
          const res = await fetch(`/api/scans/search?q=${encodeURIComponent(query)}&sessionId=${sessionId}`);
          const data = await res.json();

          if (data.success && data.data) {
            set({
              searchResults: data.data,
              currentPage: data?.pagination?.page,
              hasMore: data?.pagination?.hasMore,
            });
          }
          return data.success ? data.data || [] : [];
        } catch (error) {
          console.error("Failed to search scans:", error);
        } finally {
          set({ isLoading: false });
        }
      },

      clearSearch: () => set({ searchResults: [], searchQuery: '' }),

      clearCurrentScan: () =>
        set({
          currentImages: [],
          currentImageFiles: [],
          currentResult: null,
          error: null,
          messages: [],
        }),

      reset: () =>
        set({
          currentImages: [],
          currentImageFiles: [],
          currentResult: null,
          isAnalyzing: false,
          error: null,
          messages: [],
          isLoadingResponse: false,
        }),

      fetchScansFromDB: async (sessionId: string, page = 1) => {
        set({ isLoading: true });
        try {
          const res = await fetch(`/api/scans?sessionId=${sessionId}&page=${page}&pageSize=10`);
          const data = await res.json();

          if (data.success && data.data) {
            set({
              scanHistory: page === 1 ? data.data : [...get().scanHistory, ...data.data],
              hasFetched: true,
              currentPage: data.pagination.page,
              hasMore: data.pagination.hasMore,
            });
          }
        } catch (error) {
          console.error("Failed to fetch scans:", error);
        } finally {
          set({ isLoading: false });
        }
      },

      loadMoreScans: async () => {
        const { hasMore, isLoadingMore, currentPage, sessionId } = get();
        if (!hasMore || isLoadingMore) return;

        set({ isLoadingMore: true });
        await get().fetchScansFromDB(sessionId, currentPage + 1);
        set({ isLoadingMore: false });
      },

      fetchBookmarksFromDB: async (sessionId: string, page = 1) => {
        try {
          const res = await fetch(`/api/bookmarks?sessionId=${sessionId}&page=${page}&pageSize=10`);
          const data = await res.json();
          if (data.success && data.data) {
            set({
              currentPage: data?.pagination?.page,
              hasMore: data?.pagination?.hasMore,
            });
          }
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
          const data = await res.json();

          if (data.error?.code === "AUTH_REQUIRED") {
            // Return special flag for auth required
            return { success: false, authRequired: true, message: data.error };
          }

          if (res.ok) {
            // Refresh scans to update bookmark status
            await get().fetchScansFromDB(get().sessionId);
            return { success: true, isBookmarked: data.data.isBookmarked };
          }
          return { success: false, authRequired: false };
        } catch (error) {
          console.error("Failed to toggle bookmark:", error);
          return { success: false, authRequired: false };
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
        deviceFingerprint: state.deviceFingerprint
      }),
    }
  )
);
