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

  private readonly MAX_CHUNK_SIZE = 4 * 1024 * 1024; // 4MB chunks for upload
  private readonly MAX_AUDIO_DURATION = 120; // 2 minutes max per message

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
    console.log("📤 addMessage called, sessionDbId:", this.sessionDbId);

    if (!this.sessionDbId) {
      console.error("❌ addMessage: No sessionDbId set!");
      return null;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/api/live-sessions/${this.sessionDbId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(message),
        }
      );

      const data = await response.json();

      console.log("📥 addMessage response:", data.success, data.message?.id);

      return data.success ? data.message : null;
    } catch (error) {
      console.error("❌ addMessage error:", error);
      return null;
    }
  }

  /**
   * Add a message with audio - uploads via API
   */
  // async addMessageWithAudio(
  //   message: Omit<LiveMessage, "id" | "createdAt" | "audioUrl" | "audioKey" | "duration">,
  //   audioChunks: ArrayBuffer[],
  //   sampleRate: number = 24000
  // ): Promise<LiveMessage | null> {
  //   if (!this.sessionDbId) return null;

  //   // If no audio chunks, just save text message
  //   if (!audioChunks || audioChunks.length === 0) {
  //     return this.addMessage(message);
  //   }

  //   try {
  //     console.log(`🔧 Combining ${audioChunks.length} audio chunks...`);

  //     // Combine all audio chunks
  //     const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  //     const combinedBuffer = new ArrayBuffer(totalLength);
  //     const combinedView = new Uint8Array(combinedBuffer);

  //     let offset = 0;
  //     for (const chunk of audioChunks) {
  //       combinedView.set(new Uint8Array(chunk), offset);
  //       offset += chunk.byteLength;
  //     }

  //     // Convert PCM to WAV format in browser
  //     const wavBuffer = this.pcmToWav(new Int16Array(combinedBuffer), sampleRate);
  //     console.log(`🎵 WAV size: ${(wavBuffer.byteLength / 1024).toFixed(2)} KB`);

  //     // Calculate actual duration
  //     const duration = totalLength / (sampleRate * 2); // 16-bit = 2 bytes per sample
  //     console.log(`⏱️ Audio duration: ${duration.toFixed(2)} seconds`);

  //     // Create form data for upload
  //     const formData = new FormData();
  //     const audioBlob = new Blob([wavBuffer], { type: "audio/wav" });
  //     formData.append("audio", audioBlob, "response.wav");
  //     formData.append("content", message.content);
  //     formData.append("role", message.role);
  //     formData.append("type", "audio");
  //     formData.append("duration", duration.toString());
  //     if (message.metadata) {
  //       formData.append("metadata", JSON.stringify({
  //         ...message.metadata,
  //         chunkCount: audioChunks.length,
  //         totalBytes: totalLength,
  //         wavBytes: wavBuffer.byteLength,
  //       }));
  //     }

  //     console.log("📤 Uploading audio to server...");

  //     // Upload via API
  //     const response = await fetch(
  //       `${this.baseUrl}/api/live-sessions/${this.sessionDbId}/audio`,
  //       {
  //         method: "POST",
  //         body: formData,
  //       }
  //     );

  //     const data = await response.json();

  //     if (!data.success) {
  //       console.error("Audio upload failed:", data.error);
  //       // Fallback to text-only message
  //       return this.addMessage(message);
  //     }

  //     console.log("✅ Audio saved successfully:", data.message?.id);
  //     return data.message;
  //   } catch (error) {
  //     console.error("Failed to upload audio:", error);
  //     // Fallback to text-only message
  //     return this.addMessage(message);
  //   }
  // }

  /**
   * Add a message with audio - handles large files with chunking
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
      const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
      const duration = totalLength / (sampleRate * 2); // 16-bit = 2 bytes per sample

      console.log(`🔧 Processing ${audioChunks.length} chunks, ${(totalLength / 1024 / 1024).toFixed(2)}MB, ${duration.toFixed(2)}s`);

      // For very long audio (>2 min), split into multiple messages
      if (duration > this.MAX_AUDIO_DURATION) {
        console.log(`⚠️ Audio too long (${duration.toFixed(0)}s), splitting into parts`);
        return await this.saveAudioInParts(message, audioChunks, sampleRate);
      }

      // Combine chunks efficiently using typed arrays
      const combinedBuffer = this.combineChunksEfficiently(audioChunks);

      // Convert PCM to WAV
      const wavBuffer = this.pcmToWav(new Int16Array(combinedBuffer), sampleRate);
      console.log(`🎵 WAV size: ${(wavBuffer.byteLength / 1024 / 1024).toFixed(2)}MB`);

      // Upload with retry
      return await this.uploadWithRetry(message, wavBuffer, duration, 3);

    } catch (error) {
      console.error("Failed to process audio:", error);
      // Fallback to text-only message
      return this.addMessage({
        ...message,
        content: message.content + " [Audio failed to save]",
      });
    }
  }

  /**
 * Transcribe audio file to text
 */
  async transcribeAudio(audioUrl: string): Promise<string | null> {
    try {
      // Fetch the audio file
      const audioResponse = await fetch(audioUrl);
      const audioBlob = await audioResponse.blob();

      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.wav");

      const response = await fetch(`${this.baseUrl}/api/transcribe-audio`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        console.error("Transcription failed:", data.error);
        return null;
      }

      return data.transcript;
    } catch (error) {
      console.error("Failed to transcribe audio:", error);
      return null;
    }
  }

  /**
   * Analyze audio response text and get structured format
   */
  async analyzeResponse(
    responseText: string,
    options: {
      language?: string;
      subject?: string;
      userQuestion?: string;
    } = {}
  ): Promise<any | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/analyze-audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responseText,
          language: options.language || "en",
          subject: options.subject,
          userQuestion: options.userQuestion,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        console.error("Analysis failed:", data.error);
        return null;
      }

      return data.analysis;
    } catch (error) {
      console.error("Failed to analyze response:", error);
      return null;
    }
  }

  /**
   * Update message metadata (for adding analysis after save)
   */
  async updateMessageMetadata(
    messageId: string,
    metadata: Record<string, unknown>
  ): Promise<boolean> {
    if (!this.sessionDbId) return false;

    try {
      const response = await fetch(
        `${this.baseUrl}/api/live-sessions/${this.sessionDbId}/messages/${messageId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ metadata }),
        }
      );

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error("Failed to update message metadata:", error);
      return false;
    }
  }

  /**
   * Combine ArrayBuffers efficiently to avoid memory issues
   */
  private combineChunksEfficiently(chunks: ArrayBuffer[]): ArrayBuffer {
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);

    // Use Uint8Array for efficient copying
    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
      result.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    }

    return result.buffer;
  }

  /**
   * Upload with retry logic
   */
  private async uploadWithRetry(
    message: Omit<LiveMessage, "id" | "createdAt" | "audioUrl" | "audioKey" | "duration">,
    wavBuffer: ArrayBuffer,
    duration: number,
    maxRetries: number
  ): Promise<LiveMessage | null> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📤 Upload attempt ${attempt}/${maxRetries}...`);

        const formData = new FormData();
        const audioBlob = new Blob([wavBuffer], { type: "audio/wav" });
        formData.append("audio", audioBlob, "response.wav");
        formData.append("content", message.content);
        formData.append("role", message.role);
        formData.append("type", "audio");
        formData.append("duration", duration.toString());
        if (message.metadata) {
          formData.append("metadata", JSON.stringify({
            ...message.metadata,
            wavBytes: wavBuffer.byteLength,
            uploadAttempt: attempt,
          }));
        }

        const controller = new AbortController();
        // Increase timeout for large files (1 minute base + 30s per MB)
        const timeoutMs = 60000 + (wavBuffer.byteLength / 1024 / 1024) * 30000;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(
          `${this.baseUrl}/api/live-sessions/${this.sessionDbId}/audio`,
          {
            method: "POST",
            body: formData,
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Upload failed");
        }

        console.log("✅ Audio saved successfully:", data.message?.id);
        return data.message;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`❌ Upload attempt ${attempt} failed:`, lastError.message);

        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error("❌ All upload attempts failed");
    // Fallback to text-only
    return this.addMessage({
      ...message,
      content: message.content + " [Audio upload failed after retries]",
      metadata: {
        ...message.metadata,
        audioError: lastError?.message,
      },
    });
  }

  /**
   * Save very long audio as multiple messages
   */
  private async saveAudioInParts(
    message: Omit<LiveMessage, "id" | "createdAt" | "audioUrl" | "audioKey" | "duration">,
    audioChunks: ArrayBuffer[],
    sampleRate: number
  ): Promise<LiveMessage | null> {
    const bytesPerSecond = sampleRate * 2; // 16-bit
    const maxBytesPerPart = this.MAX_AUDIO_DURATION * bytesPerSecond;

    let currentPartChunks: ArrayBuffer[] = [];
    let currentPartBytes = 0;
    let partNumber = 1;
    let lastMessage: LiveMessage | null = null;

    for (const chunk of audioChunks) {
      currentPartChunks.push(chunk);
      currentPartBytes += chunk.byteLength;

      if (currentPartBytes >= maxBytesPerPart) {
        // Save this part
        const partContent = partNumber === 1
          ? message.content
          : `[Continued from part ${partNumber - 1}]`;

        console.log(`💾 Saving part ${partNumber} (${(currentPartBytes / 1024 / 1024).toFixed(2)}MB)`);

        const combinedBuffer = this.combineChunksEfficiently(currentPartChunks);
        const wavBuffer = this.pcmToWav(new Int16Array(combinedBuffer), sampleRate);
        const duration = currentPartBytes / bytesPerSecond;

        lastMessage = await this.uploadWithRetry(
          {
            ...message,
            content: partContent,
            metadata: {
              ...message.metadata,
              partNumber,
              isPartial: true,
            },
          },
          wavBuffer,
          duration,
          3
        );

        // Reset for next part
        currentPartChunks = [];
        currentPartBytes = 0;
        partNumber++;
      }
    }

    // Save remaining chunks
    if (currentPartChunks.length > 0) {
      const combinedBuffer = this.combineChunksEfficiently(currentPartChunks);
      const wavBuffer = this.pcmToWav(new Int16Array(combinedBuffer), sampleRate);
      const duration = currentPartBytes / bytesPerSecond;

      lastMessage = await this.uploadWithRetry(
        {
          ...message,
          content: partNumber === 1 ? message.content : `[Final part ${partNumber}]`,
          metadata: {
            ...message.metadata,
            partNumber,
            isPartial: partNumber > 1,
            isFinal: true,
          },
        },
        wavBuffer,
        duration,
        3
      );
    }

    return lastMessage;
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
