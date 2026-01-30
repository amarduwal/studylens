import { GoogleGenAI, Modality } from "@google/genai";
import { LiveSessionService, LiveMessage } from "./live-session-service";
import { LIVE_CONFIG } from "./constants";
import { VOICE_SYSTEM_PROMPT } from "../voice-prompts";

export interface GeminiLiveCallbacks {
  onConnected: () => void;
  onDisconnected: (reason?: string) => void;
  onError: (error: Error) => void;
  onAudioResponse: (audioData: ArrayBuffer) => void;
  onTextResponse: (text: string, isPartial: boolean) => void;
  onTranscript: (text: string, role: "user" | "assistant") => void;
  onInterrupted: () => void;
  onTurnComplete: () => void;
  onMessageSaved: (message: LiveMessage) => void;
  onThinkingStart?: () => void;
  onThinkingEnd?: () => void;
  onAudioLevel?: (level: number) => void;
  onReconnecting?: (attempt: number) => void;
  onReconnected?: () => void;
  onContinuing?: (part: number) => void;
}

export interface SessionConfig {
  userId?: string;
  guestSessionId?: string;
  language?: string;
  educationLevel?: string;
  subject?: string;
  resumeSessionId?: string;
}

export class GeminiLiveSession {
  private ai: GoogleGenAI;
  private session: any = null;
  private callbacks: GeminiLiveCallbacks;
  private config: SessionConfig;
  private isConnected: boolean = false;
  private audioContext: AudioContext | null = null;
  private audioQueue: ArrayBuffer[] = [];
  private isPlaying: boolean = false;
  private currentSourceNode: AudioBufferSourceNode | null = null;

  // Database service
  private dbService: LiveSessionService;
  private clientSessionId: string;
  private startTime: Date | null = null;

  // Message accumulation
  private currentAssistantText: string = "";
  private messageCount: number = 0;

  // Audio collection for R2 storage
  private audioChunksForStorage: ArrayBuffer[] = [];
  private isCollectingAudio: boolean = false;

  // Track if we've already saved user transcript to avoid duplicates
  private lastUserTranscript: string = "";

  // Add to class properties:
  private responseStartTime: number = 0;
  private audioBufferQueue: { buffer: AudioBuffer; timestamp: number }[] = [];
  private nextPlayTime: number = 0;
  private isAudioScheduled: boolean = false;

  // Increase buffer settings for longer audio:
  private readonly BUFFER_AHEAD_TIME = 0.2; // 100ms buffer
  private readonly MIN_BUFFER_SIZE = 3; // Wait for 3 chunks before playing
  private readonly MAX_QUEUE_SIZE = 500; // Maximum chunks in queue

  private onAudioLevel?: (level: number) => void;

  private keepAliveInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private reconnectDelay: number = 2000;
  private lastActivityTime: number = 0;
  private inactivityTimeout: NodeJS.Timeout | null = null;
  private readonly KEEP_ALIVE_INTERVAL = 15000; // 15 seconds
  private readonly INACTIVITY_TIMEOUT = 300000; // 5 minutes
  private isManualDisconnect: boolean = false;

  private audioChunksForPlayback: ArrayBuffer[] = [];
  private totalAudioDuration: number = 0;
  private isResponseComplete: boolean = false;
  private audioSaveTimeout: NodeJS.Timeout | null = null;
  private lastAudioChunkTime: number = 0;
  private readonly AUDIO_CHUNK_TIMEOUT = 5000;
  private isGenerationComplete: boolean = false;

  private continuationCount: number = 0;
  private maxContinuations: number = 10; // Allow up to 10 continuations (~3 min total)
  private shouldRequestContinuation: boolean = false;
  private originalQuery: string = "";

  // Add chunked saving for very long responses:
  private readonly MAX_AUDIO_DURATION_PER_MESSAGE = 60; // 60 seconds per message
  private savedAudioDuration: number = 0;

  private healthCheckInterval: NodeJS.Timeout | null = null;

  private textToAudioData(text: string): ArrayBuffer {
    // Create a simple audio representation of silence
    // The API will see activity and the text content in the message
    const sampleRate = 16000;
    const duration = 0.1; // 100ms of silence
    const samples = sampleRate * duration;
    const buffer = new ArrayBuffer(samples * 2); // 16-bit = 2 bytes
    return buffer;
  }

  private startHealthCheck(): void {
    this.stopHealthCheck();

    this.healthCheckInterval = setInterval(() => {
      if (!this.isConnected || this.isManualDisconnect) {
        return;
      }

      // Check if session is still responsive
      const timeSinceActivity = Date.now() - this.lastActivityTime;

      // If no activity for 30 seconds during an active session, verify connection
      if (timeSinceActivity > 30000) {
        console.log("Health check: No recent activity, verifying connection...");

        // Try to send a ping
        if (this.session) {
          try {
            // Check WebSocket state if accessible
            const ws = (this.session as any)._ws || (this.session as any).ws;
            if (ws && (ws.readyState === WebSocket.CLOSING || ws.readyState === WebSocket.CLOSED)) {
              console.log("Health check: WebSocket is closed, attempting reconnect");
              this.isConnected = false;
              this.attemptReconnect();
            }
          } catch (err) {
            console.warn("Health check error:", err);
          }
        }
      }
    }, 10000); // Check every 10 seconds
  }

  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  constructor(apiKey: string, config: SessionConfig, callbacks: GeminiLiveCallbacks & { onAudioLevel?: (level: number) => void }) {
    this.ai = new GoogleGenAI({ apiKey });
    this.config = config;
    this.callbacks = callbacks;
    this.dbService = new LiveSessionService();
    this.clientSessionId = `live_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.onAudioLevel = callbacks.onAudioLevel;
  }

  private resetAudioSaveTimeout(): void {
    this.clearAudioSaveTimeout();

    // If no new audio chunk for AUDIO_CHUNK_TIMEOUT, consider response complete
    this.audioSaveTimeout = setTimeout(() => {
      if (this.isCollectingAudio && !this.isResponseComplete) {
        console.log("⏰ Audio chunk timeout - saving response");
        this.finalizeAndSaveResponse();
      }
    }, this.AUDIO_CHUNK_TIMEOUT);
  }

  private clearAudioSaveTimeout(): void {
    if (this.audioSaveTimeout) {
      clearTimeout(this.audioSaveTimeout);
      this.audioSaveTimeout = null;
    }
  }

  private scheduleAudioSave(delay: number): void {
    this.clearAudioSaveTimeout();

    this.audioSaveTimeout = setTimeout(() => {
      this.finalizeAndSaveResponse();
    }, delay);
  }

  private async finalizeAndSaveResponse(): Promise<void> {
    if (this.isResponseComplete) return;
    this.isResponseComplete = true;

    console.log("💾 Finalizing response...");
    console.log(`📊 Final: ${this.audioChunksForStorage.length} chunks, ${this.totalAudioDuration.toFixed(2)}s audio`);

    if (this.audioChunksForStorage.length > 0 || this.currentAssistantText) {
      await this.saveAssistantMessageWithAudio();
    }

    // Check if we should request continuation
    // If response was cut off (ended with incomplete sentence, or user asked for long content)
    const shouldContinue = this.shouldRequestContinuation &&
      this.continuationCount < this.maxContinuations;

    this.resetResponseState();
    this.callbacks.onTurnComplete();

    if (shouldContinue) {
      await this.requestContinuation();
    }
  }

  // method to request continuation:
  private async requestContinuation(): Promise<void> {
    this.continuationCount++;
    console.log(`🔄 Requesting continuation ${this.continuationCount}/${this.maxContinuations}`);

    this.callbacks.onContinuing?.(this.continuationCount);

    try {
      const continuationPrompt = "Please continue from where you left off. Continue explaining.";

      // Don't save this as a user message - it's automatic
      this.callbacks.onThinkingStart?.();
      await this.session.send(continuationPrompt);
    } catch (error) {
      console.error("Continuation request failed:", error);
    }
  }

  // method to enable continuation mode:
  enableContinuation(): void {
    this.shouldRequestContinuation = true;
    console.log("📝 Continuation mode enabled");
  }

  disableContinuation(): void {
    this.shouldRequestContinuation = false;
    console.log("📝 Continuation mode disabled");
  }

  // intermediate save method:
  private async saveIntermediateAudio(): Promise<void> {
    if (this.audioChunksForStorage.length === 0) return;

    const chunksToSave = [...this.audioChunksForStorage];
    const textToSave = this.currentAssistantText;

    // Reset for next chunk
    this.audioChunksForStorage = [];
    this.savedAudioDuration = this.totalAudioDuration;

    // Save in background
    this.messageCount++;
    const savedMessage = await this.dbService.addMessageWithAudio(
      {
        role: "assistant",
        type: "audio",
        content: textToSave || "[Audio response - continued]",
        metadata: {
          isPartial: true,
          partDuration: this.totalAudioDuration,
          processingTime: Date.now() - this.responseStartTime,
        },
      },
      chunksToSave,
      24000
    );

    if (savedMessage) {
      this.callbacks.onMessageSaved(savedMessage);
    }

    // Clear text after saving
    this.currentAssistantText = "";
  }

  private resetResponseState(): void {
    this.isCollectingAudio = false;
    this.audioChunksForStorage = [];
    this.currentAssistantText = "";
    this.totalAudioDuration = 0;
    this.lastAudioChunkTime = 0;
    this.lastUserTranscript = "";
  }

  private calculateAudioLevel(audioData: ArrayBuffer): number {
    const samples = new Int16Array(audioData);
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += Math.abs(samples[i]);
    }
    const average = sum / samples.length;
    // Normalize to 0-1 range
    return Math.min(1, average / 16384);
  }

  private async createNewSession(): Promise<void> {
    await this.dbService.createSession({
      userId: this.config.userId,
      sessionId: this.config.guestSessionId || this.clientSessionId,
      language: this.config.language,
      educationLevel: this.config.educationLevel,
      subject: this.config.subject,
    });
  }

  async connect(): Promise<void> {
    try {
      console.log("Connecting to Gemini Live API...");

      this.audioContext = new AudioContext({ sampleRate: 24000 });
      this.startTime = new Date();

      this.isManualDisconnect = false;
      this.reconnectAttempts = 0;

      // if (this.config.resumeSessionId) {
      //   const resumed = await this.dbService.resumeSession(this.config.resumeSessionId);
      //   if (!resumed) {
      //     throw new Error("Failed to resume session");
      //   }
      // } else {
      //   await this.dbService.createSession({
      //     userId: this.config.userId,
      //     sessionId: this.config.guestSessionId || this.clientSessionId,
      //     language: this.config.language,
      //     educationLevel: this.config.educationLevel,
      //     subject: this.config.subject,
      //   });
      // }
      // Resume existing session or create new one
      if (this.config.resumeSessionId) {
        console.log("Resuming session:", this.config.resumeSessionId);
        const resumed = await this.dbService.resumeSession(this.config.resumeSessionId);
        if (resumed) {
          // Load existing messages count
          const messages = await this.dbService.getMessages();
          this.messageCount = messages.length;
        } else {
          console.log("Failed to resume, creating new session");
          await this.createNewSession();
        }
      } else {
        await this.createNewSession();
      }

      const systemPrompt = this.buildSystemPrompt();

      this.session = await this.ai.live.connect({
        model: LIVE_CONFIG.MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: LIVE_CONFIG.DEFAULT_VOICE,
              },
            },
          },
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
        },
        callbacks: {
          onopen: () => {
            console.log("Connection opened");
            this.isConnected = true;
            this.dbService.updateSession({ status: "connected" });
            this.callbacks.onConnected();
            this.startHealthCheck();
          },
          onmessage: (message: any) => {
            this.handleMessage(message);
          },
          onerror: (error: any) => {
            console.error("Connection error:", error);

            // Don't immediately fail - try to recover
            const errorMessage = error?.message || String(error);

            // Check if it's a recoverable error
            if (errorMessage.includes('WebSocket') ||
              errorMessage.includes('network') ||
              errorMessage.includes('timeout')) {
              console.log("Recoverable error detected, will attempt reconnect");
              this.isConnected = false;
              // onclose will handle reconnection
            } else {
              // Non-recoverable error
              this.dbService.updateSession({ status: "error" });
              this.callbacks.onError(
                error instanceof Error ? error : new Error(String(error))
              );
            }
          },
          onclose: (event: any) => {
            console.log("Connection closed:", event);
            this.isConnected = false;
            this.stopKeepAlive();
            this.clearInactivityTimer();
            this.stopHealthCheck();

            // Only attempt reconnect if not manual disconnect
            if (!this.isManualDisconnect) {
              this.attemptReconnect();
            } else {
              this.handleDisconnect();
            }
          },
        },
      });
      this.startKeepAlive();
      this.resetInactivityTimer();
      this.lastActivityTime = Date.now();

      console.log("Session created successfully");
    } catch (error) {
      console.error("Failed to connect:", error);
      this.isConnected = false;
      this.dbService.updateSession({ status: "error" });
      this.callbacks.onError(
        error instanceof Error ? error : new Error("Connection failed")
      );
      throw error;
    }
  }

  // keep-alive method:
  private startKeepAlive(): void {
    this.stopKeepAlive();

    this.keepAliveInterval = setInterval(() => {
      if (this.session && this.isConnected) {
        try {
          // Send empty audio to keep connection alive
          // Gemini expects activity to keep the connection open
          const silentAudio = new ArrayBuffer(320); // Small silent audio chunk
          const base64 = this.arrayBufferToBase64(silentAudio);

          if (typeof this.session.sendRealtimeInput === 'function') {
            this.session.sendRealtimeInput({
              audio: {
                data: base64,
                mimeType: "audio/pcm;rate=16000",
              },
            }).catch((err: Error) => {
              console.warn("Keep-alive failed:", err);
            });
          }

          console.log("Keep-alive sent");
        } catch (err) {
          console.warn("Keep-alive error:", err);
        }
      }
    }, this.KEEP_ALIVE_INTERVAL);
  }

  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  // inactivity timer:
  private resetInactivityTimer(): void {
    this.clearInactivityTimer();
    this.lastActivityTime = Date.now();

    this.inactivityTimeout = setTimeout(() => {
      console.log("Inactivity timeout - disconnecting");
      this.disconnect();
    }, this.INACTIVITY_TIMEOUT);
  }

  private clearInactivityTimer(): void {
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
      this.inactivityTimeout = null;
    }
  }

  private async handleMessage(message: any): Promise<void> {
    this.lastActivityTime = Date.now(); // Track activity
    this.resetInactivityTimer();

    try {
      // DEBUG: Log full message structure to find transcript location
      console.log("=== GEMINI MESSAGE ===", JSON.stringify(message, null, 2).substring(0, 500));


      // Check for user speech transcription in ALL possible locations
      const possibleTranscripts = [
        message?.serverContent?.inputTranscript,
        message?.serverContent?.outputTranscript,
        message?.inputTranscript,
        message?.transcript,
        message?.speechResults?.[0]?.alternatives?.[0]?.transcript,
        message?.results?.[0]?.alternatives?.[0]?.transcript,
        message?.serverContent?.modelTurn?.parts?.find((p: any) => p.transcript)?.transcript,
      ];

      const userTranscript = possibleTranscripts.find(t => t && typeof t === 'string' && t.trim());

      if (userTranscript && userTranscript !== this.lastUserTranscript) {
        console.log("✅ USER TRANSCRIPT FOUND:", userTranscript);
        this.lastUserTranscript = userTranscript;
        this.callbacks.onTranscript(userTranscript, "user");

        await this.saveMessage({
          role: "user",
          type: "text",
          content: userTranscript,
        });

        this.callbacks.onThinkingStart?.();
      }

      if (message.serverContent) {
        const content = message.serverContent;

        // Handle model turn (audio/text)
        if (content.modelTurn?.parts) {
          // Start collecting audio if not already
          if (!this.isCollectingAudio) {
            this.isCollectingAudio = true;
            this.isResponseComplete = false;
            this.isGenerationComplete = false;
            this.audioChunksForStorage = [];
            this.audioChunksForPlayback = [];
            this.currentAssistantText = "";
            this.totalAudioDuration = 0;
            this.responseStartTime = Date.now();
            this.callbacks.onThinkingEnd?.();
            console.log("🎙️ Started collecting audio response");
          }

          this.lastAudioChunkTime = Date.now();
          // Only reset timeout if generation not complete
          if (!this.isGenerationComplete) {
            this.resetAudioSaveTimeout();
          }

          for (const part of content.modelTurn.parts) {
            // Handle audio chunks
            if (part.inlineData?.mimeType?.includes("audio")) {
              const audioData = this.base64ToArrayBuffer(part.inlineData.data || "");

              // Calculate chunk duration (24kHz, 16-bit mono)
              const chunkDuration = audioData.byteLength / (24000 * 2);
              this.totalAudioDuration += chunkDuration;

              console.log(`🔊 Audio chunk: ${audioData.byteLength} bytes, ~${chunkDuration.toFixed(2)}s, total: ${this.totalAudioDuration.toFixed(2)}s`);

              // Store for later saving
              this.audioChunksForStorage.push(audioData);

              // Check if we should save intermediate chunk (for very long responses)
              // const unsavedDuration = this.totalAudioDuration - this.savedAudioDuration;
              // if (unsavedDuration >= this.MAX_AUDIO_DURATION_PER_MESSAGE) {
              //   console.log(`💾 Saving intermediate chunk at ${this.totalAudioDuration.toFixed(2)}s`);
              //   await this.saveIntermediateAudio();
              // }

              // Calculate and emit audio level
              const level = this.calculateAudioLevel(audioData);
              this.callbacks.onAudioLevel?.(level);

              // Queue for playback
              this.callbacks.onAudioResponse(audioData);
              this.queueAudio(audioData);
            }

            // Handle text chunks
            if (part.text) {
              this.currentAssistantText += part.text;
              this.callbacks.onTextResponse(part.text, true);
              this.callbacks.onTranscript(part.text, "assistant");
            }
          }
        }

        // Handle generation complete - this comes before turnComplete
        if (content.generationComplete) {
          console.log("✅ Generation complete signal received");
          this.isGenerationComplete = true;
          // Wait a bit for any final chunks, then save
          this.scheduleAudioSave(1000);
        }

        // Handle turn complete
        if (content.turnComplete) {
          console.log("🏁 Turn complete signal received");
          console.log(`📊 Audio: ${this.audioChunksForStorage.length} chunks, ~${this.totalAudioDuration.toFixed(2)}s`);

          // If we haven't saved yet (no generationComplete), save now
          if (!this.isResponseComplete && this.audioChunksForStorage.length > 0) {
            this.clearAudioSaveTimeout();
            await this.finalizeAndSaveResponse();
          }
        }

        // Handle interruption
        if (content.interrupted) {
          console.log("⚠️ Response interrupted");
          this.clearAudioSaveTimeout();
          this.clearAudioQueue();

          if (this.audioChunksForStorage.length > 0 || this.currentAssistantText) {
            await this.saveAssistantMessageWithAudio();
          }

          this.resetResponseState();
          this.callbacks.onInterrupted();
        }
      }
    } catch (error) {
      console.error("Error handling message:", error);
    }
  }

  /**
   * Save assistant message with audio to R2 via API
   */
  private async saveAssistantMessageWithAudio(): Promise<void> {
    try {
      this.messageCount++;

      const messageContent = this.currentAssistantText || "[Audio response]";
      const processingTime = this.responseStartTime ? Date.now() - this.responseStartTime : undefined;

      // Use the service method that handles audio upload
      const savedMessage = await this.dbService.addMessageWithAudio(
        {
          role: "assistant",
          type: this.audioChunksForStorage.length > 0 ? "audio" : "text",
          content: messageContent,
          metadata: {
            processingTime,
            thinkingContext: `Analyzed input and generated ${this.audioChunksForStorage.length > 0 ? 'audio' : 'text'} response`,
          },
        },
        this.audioChunksForStorage,
        24000
      );

      if (savedMessage) {
        this.callbacks.onMessageSaved(savedMessage);
        this.callbacks.onTextResponse(messageContent, false);
      }

      // Reset accumulators
      this.currentAssistantText = "";
      this.audioChunksForStorage = [];
      this.isCollectingAudio = false;
    } catch (error) {
      console.error("Error saving assistant message:", error);
    }
  }
  private async saveMessage(message: Omit<LiveMessage, "id" | "createdAt">): Promise<void> {
    try {
      this.messageCount++;
      const savedMessage = await this.dbService.addMessage(message);
      if (savedMessage) {
        this.callbacks.onMessageSaved(savedMessage);
      }
    } catch (error) {
      console.error("Error saving message:", error);
    }
  }

  private async handleDisconnect(): Promise<void> {
    if (!this.isConnected) return; // Already disconnected

    const duration = this.startTime
      ? Math.round((Date.now() - this.startTime.getTime()) / 1000)
      : 0;

    try {
      await this.dbService.updateSession({
        status: "ended",
        endedAt: new Date(),
        duration,
        messageCount: this.messageCount,
      });
    } catch (error) {
      console.error("Error updating session on disconnect:", error);
    }

    this.isConnected = false;
    this.callbacks.onDisconnected("Session ended");
  }
  private buildSystemPrompt(): string {
    let prompt = VOICE_SYSTEM_PROMPT;

    if (this.config.subject) {
      prompt += `\n\nCURRENT SUBJECT: ${this.config.subject}`;
    }

    if (this.config.language && this.config.language !== "en") {
      prompt += `\n\nIMPORTANT: Respond in ${this.getLanguageName(this.config.language)} language.`;
    }

    if (this.config.educationLevel) {
      prompt += `\n\nSTUDENT EDUCATION LEVEL: ${this.config.educationLevel}`;
    }

    // Add instruction for comprehensive responses
    prompt += `

      RESPONSE LENGTH GUIDELINES:
      - For simple questions: Give concise 15-30 second responses
      - For complex topics: Provide detailed explanations up to 2-3 minutes
      - For "explain in detail" or "comprehensive" requests: Give thorough coverage
      - If you need more time to fully explain, say "Let me continue..." at the end
      - Break complex topics into clear sections`;

    return prompt;
  }

  private getLanguageName(code: string): string {
    const names: Record<string, string> = {
      en: "English",
      hi: "Hindi",
      ne: "Nepali",
      es: "Spanish",
      fr: "French",
      ar: "Arabic",
      zh: "Chinese",
      bn: "Bengali",
      pt: "Portuguese",
      id: "Indonesian",
    };
    return names[code] || "English";
  }

  async sendAudio(audioData: ArrayBuffer): Promise<void> {
    if (!this.session || !this.isConnected) return;

    this.resetInactivityTimer(); // Add this

    try {
      const base64Audio = this.arrayBufferToBase64(audioData);

      await this.session.sendRealtimeInput({
        audio: {
          data: base64Audio,
          mimeType: "audio/pcm;rate=16000",
        },
      });
    } catch (error) {
      console.error("Error sending audio:", error);
      // Check if connection is still valid
      if (!this.isConnected) {
        this.attemptReconnect();
      }
    }
  }

  async sendText(text: string): Promise<void> {
    if (!this.session || !this.isConnected) {
      console.error("Cannot send text: not connected");
      return;
    }

    this.resetInactivityTimer();
    this.lastActivityTime = Date.now();

    // Track original query for continuations
    this.originalQuery = text;
    this.continuationCount = 0;
    this.shouldRequestContinuation = false;

    try {
      // Save user message first
      await this.saveMessage({
        role: "user",
        type: "text",
        content: text,
      });

      this.callbacks.onTranscript(text, "user");
      this.callbacks.onThinkingStart?.();

      console.log("Sending text via session.sendClientContent()");
      await this.session.sendClientContent({
        turns: [{ role: "user", parts: [{ text }] }],
        turnComplete: true,
      });

      console.log("Text sent successfully:", text);
    } catch (error) {
      console.error("Error sending text:", error);
      this.callbacks.onThinkingEnd?.();
      this.callbacks.onError(error instanceof Error ? error : new Error("Failed to send message"));
    }
  }

  // reconnection logic:
  private async attemptReconnect(): Promise<void> {
    if (this.isManualDisconnect) {
      console.log("Manual disconnect - not reconnecting");
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnect attempts reached");
      this.isConnected = false;
      this.callbacks.onDisconnected?.("Max reconnect attempts reached");
      this.callbacks.onError(new Error("Connection lost. Please try again."));
      return;
    }

    this.reconnectAttempts++;

    // Exponential backoff: 2s, 4s, 8s
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    this.callbacks.onReconnecting?.(this.reconnectAttempts);

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      // Clean up old connection
      this.stopKeepAlive();
      this.clearInactivityTimer();

      if (this.session) {
        try { await this.session.close(); } catch {}
        this.session = null;
      }

      // Reconnect
      const systemPrompt = this.buildSystemPrompt();

      this.session = await this.ai.live.connect({
        model: LIVE_CONFIG.MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: LIVE_CONFIG.DEFAULT_VOICE,
              },
            },
          },
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
        },
        callbacks: {
          onopen: () => {
            console.log("Reconnected successfully");
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.startKeepAlive();
            this.resetInactivityTimer();
            this.dbService.updateSession({ status: "connected" });
            this.callbacks.onReconnected?.();
          },
          onmessage: (message: any) => {
            this.handleMessage(message);
          },
          onerror: (error: any) => {
            console.error("Reconnection error:", error);
            this.attemptReconnect();
          },
          onclose: (event: any) => {
            console.log("Connection closed during reconnect:", event);
            if (!this.isManualDisconnect) {
              this.attemptReconnect();
            }
          },
        },
      });
    } catch (error) {
      console.error("Reconnect failed:", error);
      this.attemptReconnect();
    }
  }

  // Audio playback methods
  private queueAudio(audioData: ArrayBuffer): void {
    if (!this.audioContext) return;

    try {
      const samples = new Int16Array(audioData);
      const floatSamples = new Float32Array(samples.length);
      for (let i = 0; i < samples.length; i++) {
        floatSamples[i] = samples[i] / 32768;
      }

      const audioBuffer = this.audioContext.createBuffer(1, floatSamples.length, 24000);
      audioBuffer.getChannelData(0).set(floatSamples);

      // Limit queue size to prevent memory issues
      if (this.audioBufferQueue.length >= this.MAX_QUEUE_SIZE) {
        console.warn(`Audio queue large: ${this.audioBufferQueue.length} chunks`);
      }

      this.audioBufferQueue.push({
        buffer: audioBuffer,
        timestamp: Date.now(),
      });

      // Start scheduling once we have enough buffer
      if (!this.isAudioScheduled && this.audioBufferQueue.length >= this.MIN_BUFFER_SIZE) {
        this.scheduleBufferedAudio();
      }
    } catch (error) {
      console.error("Error queuing audio:", error);
    }
  }

  // Add new method for scheduled playback:
  private scheduleBufferedAudio(): void {
    if (!this.audioContext || this.audioBufferQueue.length === 0) {
      this.isAudioScheduled = false;
      this.isPlaying = false;
      return;
    }

    this.isAudioScheduled = true;
    this.isPlaying = true;

    // Resume context if suspended
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }

    const currentTime = this.audioContext.currentTime;

    // Initialize next play time if needed
    if (this.nextPlayTime < currentTime) {
      this.nextPlayTime = currentTime + this.BUFFER_AHEAD_TIME;
    }

    // Schedule all buffered chunks
    while (this.audioBufferQueue.length > 0) {
      const { buffer } = this.audioBufferQueue.shift()!;

      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);

      source.start(this.nextPlayTime);
      this.nextPlayTime += buffer.duration;

      // Track the last source for cleanup
      this.currentSourceNode = source;
    }

    // Check for more audio after current batch finishes
    const timeUntilEnd = this.nextPlayTime - this.audioContext.currentTime;
    setTimeout(() => {
      if (this.audioBufferQueue.length > 0) {
        this.scheduleBufferedAudio();
      } else {
        this.isAudioScheduled = false;
        this.isPlaying = false;
      }
    }, Math.max(0, (timeUntilEnd - 0.1) * 1000));
  }

  // Update clearAudioQueue:
  private clearAudioQueue(): void {
    this.audioBufferQueue = [];
    this.nextPlayTime = 0;
    this.isAudioScheduled = false;

    if (this.currentSourceNode) {
      try {
        this.currentSourceNode.stop();
      } catch {
        // Ignore
      }
      this.currentSourceNode = null;
    }
    this.isPlaying = false;
  }

  private async playNextAudio(): Promise<void> {
    if (this.audioQueue.length === 0 || !this.audioContext) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioData = this.audioQueue.shift()!;

    try {
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      const samples = new Int16Array(audioData);
      const floatSamples = new Float32Array(samples.length);
      for (let i = 0; i < samples.length; i++) {
        floatSamples[i] = samples[i] / 32768;
      }

      const audioBuffer = this.audioContext.createBuffer(1, floatSamples.length, 24000);
      audioBuffer.getChannelData(0).set(floatSamples);

      this.currentSourceNode = this.audioContext.createBufferSource();
      this.currentSourceNode.buffer = audioBuffer;
      this.currentSourceNode.connect(this.audioContext.destination);
      this.currentSourceNode.onended = () => {
        this.currentSourceNode = null;
        this.playNextAudio();
      };
      this.currentSourceNode.start();
    } catch (error) {
      console.error("Error playing audio:", error);
      this.playNextAudio();
    }
  }

  // Utility methods
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  async disconnect(): Promise<void> {
    console.log("Disconnecting...");

    // Mark as manual disconnect to prevent reconnection
    this.isManualDisconnect = true;
    this.isConnected = false;

    // Clear timers
    this.stopKeepAlive();
    this.clearInactivityTimer();
    this.clearAudioQueue();

    await this.handleDisconnect();

    if (this.session) {
      try {
        await this.session.close();
      } catch {}
      this.session = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        await this.audioContext.close();
      } catch {}
    }
    this.audioContext = null;
  }

  get connected(): boolean {
    // Also check if session exists and is open
    if (!this.session) return false;

    try {
      // Check WebSocket state if accessible
      const ws = (this.session as any)._ws ||
        (this.session as any).ws ||
        (this.session as any)._websocket;
      if (ws && ws.readyState !== WebSocket.OPEN) {
        this.isConnected = false;
      }
    } catch (e) {
      // Ignore
    }

    return this.isConnected;
  }

  getSessionDbId(): string | null {
    return this.dbService.getSessionId();
  }
}
