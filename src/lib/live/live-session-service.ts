export interface LiveMessage {
  id?: string;
  role: "user" | "assistant" | "system" | "tool";
  type: "text" | "audio" | "tool_call" | "tool_result";
  content: string;
  audioUrl?: string;
  audioKey?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}

export interface CreateSessionParams {
  userId?: string;
  sessionId: string;
  language?: string;
  educationLevel?: string;
  subject?: string;
}

export interface SessionUpdateParams {
  status?: string;
  endedAt?: Date;
  duration?: number;
  messageCount?: number;
  toolCallsCount?: number;
}

export class LiveSessionService {
  private sessionDbId: string | null = null;
  private baseUrl: string;

  constructor(baseUrl: string = "") {
    this.baseUrl = baseUrl;
  }

  /**
 * Load existing session by ID
 */
  async loadSession(sessionDbId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/live-sessions/${sessionDbId}`);
      const data = await response.json();

      if (data.success && data.session) {
        this.sessionDbId = sessionDbId;
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to load session:", error);
      return false;
    }
  }

  /**
 * Get user's previous sessions
 */
  async getUserSessions(userId?: string, sessionId?: string, limit: number = 10): Promise<any[]> {
    try {
      const params = new URLSearchParams({ limit: limit.toString() });
      if (userId) params.append("userId", userId);
      if (sessionId) params.append("sessionId", sessionId);

      const response = await fetch(`${this.baseUrl}/api/live-sessions?${params}`);
      const data = await response.json();

      return data.success ? data.sessions : [];
    } catch (error) {
      console.error("Failed to get sessions:", error);
      return [];
    }
  }

  /**
   * Resume an existing session instead of creating new
   */
  async resumeSession(sessionDbId: string): Promise<boolean> {
    try {
      const loaded = await this.loadSession(sessionDbId);
      if (loaded) {
        await this.updateSession({ status: "connected" });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to resume session:", error);
      return false;
    }
  }

  /**
   * Create a new live session
   */
  async createSession(params: CreateSessionParams): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/live-sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error);

    this.sessionDbId = data.session.id;
    return data.session.id;
  }

  /**
   * Update session status
   */
  async updateSession(updates: SessionUpdateParams): Promise<void> {
    if (!this.sessionDbId) return;

    await fetch(`${this.baseUrl}/api/live-sessions/${this.sessionDbId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  }

  /**
   * Add a text message (no audio)
   */
  async addMessage(
    message: Omit<LiveMessage, "id" | "createdAt">
  ): Promise<LiveMessage | null> {
    if (!this.sessionDbId) return null;

    const response = await fetch(
      `${this.baseUrl}/api/live-sessions/${this.sessionDbId}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      }
    );

    const data = await response.json();
    return data.success ? data.message : null;
  }

  /**
   * Add a message with audio - uploads via API
   */
  async addMessageWithAudio(
    message: Omit<LiveMessage, "id" | "createdAt" | "audioUrl" | "audioKey" | "duration">,
    audioChunks: ArrayBuffer[],
    sampleRate: number = 24000
  ): Promise<LiveMessage | null> {
    if (!this.sessionDbId) return null;

    // If no audio chunks, just save text message
    if (!audioChunks || audioChunks.length === 0) {
      return this.addMessage(message);
    }

    try {
      // Combine all audio chunks
      const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
      const combinedBuffer = new ArrayBuffer(totalLength);
      const combinedView = new Uint8Array(combinedBuffer);

      let offset = 0;
      for (const chunk of audioChunks) {
        combinedView.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
      }

      // Convert PCM to WAV format in browser
      const wavBuffer = this.pcmToWav(new Int16Array(combinedBuffer), sampleRate);

      // Create form data for upload
      const formData = new FormData();
      const audioBlob = new Blob([wavBuffer], { type: "audio/wav" });
      formData.append("audio", audioBlob, "response.wav");
      formData.append("content", message.content);
      formData.append("role", message.role);
      formData.append("type", "audio");
      if (message.metadata) {
        formData.append("metadata", JSON.stringify(message.metadata));
      }

      // Upload via API
      const response = await fetch(
        `${this.baseUrl}/api/live-sessions/${this.sessionDbId}/audio`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!data.success) {
        console.error("Audio upload failed:", data.error);
        // Fallback to text-only message
        return this.addMessage(message);
      }

      return data.message;
    } catch (error) {
      console.error("Failed to upload audio:", error);
      // Fallback to text-only message
      return this.addMessage(message);
    }
  }

  /**
   * Convert PCM Int16 to WAV format (browser-compatible)
   */
  private pcmToWav(pcmData: Int16Array, sampleRate: number = 24000): ArrayBuffer {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = pcmData.length * 2;
    const headerSize = 44;
    const totalSize = headerSize + dataSize;

    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);

    // Write WAV header
    // "RIFF" chunk descriptor
    this.writeString(view, 0, "RIFF");
    view.setUint32(4, totalSize - 8, true);
    this.writeString(view, 8, "WAVE");

    // "fmt " sub-chunk
    this.writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // "data" sub-chunk
    this.writeString(view, 36, "data");
    view.setUint32(40, dataSize, true);

    // Write PCM data
    let offset = 44;
    for (let i = 0; i < pcmData.length; i++) {
      view.setInt16(offset, pcmData[i], true);
      offset += 2;
    }

    return buffer;
  }

  private writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  /**
   * Get all messages for the session
   */
  async getMessages(): Promise<LiveMessage[]> {
    if (!this.sessionDbId) return [];

    const response = await fetch(
      `${this.baseUrl}/api/live-sessions/${this.sessionDbId}/messages`
    );

    const data = await response.json();
    return data.success ? data.messages : [];
  }

  getSessionId(): string | null {
    return this.sessionDbId;
  }

  setSessionId(id: string): void {
    this.sessionDbId = id;
  }
}
