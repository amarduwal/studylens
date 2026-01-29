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
  private readonly BUFFER_AHEAD_TIME = 0.1; // 100ms buffer
  private readonly MIN_BUFFER_SIZE = 3; // Wait for 3 chunks before playing

  private onAudioLevel?: (level: number) => void;

  constructor(apiKey: string, config: SessionConfig, callbacks: GeminiLiveCallbacks & { onAudioLevel?: (level: number) => void }) {
    this.ai = new GoogleGenAI({ apiKey });
    this.config = config;
    this.callbacks = callbacks;
    this.dbService = new LiveSessionService();
    this.clientSessionId = `live_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.onAudioLevel = callbacks.onAudioLevel;
  }

  async connect(): Promise<void> {
    try {
      console.log("Connecting to Gemini Live API...");

      this.audioContext = new AudioContext({ sampleRate: 24000 });
      this.startTime = new Date();

      if (this.config.resumeSessionId) {
        const resumed = await this.dbService.resumeSession(this.config.resumeSessionId);
        if (!resumed) {
          throw new Error("Failed to resume session");
        }
      } else {
        await this.dbService.createSession({
          userId: this.config.userId,
          sessionId: this.config.guestSessionId || this.clientSessionId,
          language: this.config.language,
          educationLevel: this.config.educationLevel,
          subject: this.config.subject,
        });
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
          },
          onmessage: (message: any) => {
            this.handleMessage(message);
          },
          onerror: (error: any) => {
            console.error("Connection error:", error);
            this.dbService.updateSession({ status: "error" });
            this.callbacks.onError(
              error instanceof Error ? error : new Error(String(error))
            );
          },
          onclose: (event: any) => {
            console.log("Connection closed:", event);
            this.handleDisconnect();
          },
        },
      });

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

  private async handleMessage(message: any): Promise<void> {
    try {
      // DEBUG: Log full message structure to find transcript location
      console.log("=== GEMINI MESSAGE ===", JSON.stringify(message, null, 2));

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
            this.audioChunksForStorage = [];
            this.responseStartTime = Date.now(); // Track when response started
            this.callbacks.onThinkingEnd?.();
          }

          for (const part of content.modelTurn.parts) {
            // Handle audio
            if (part.inlineData?.mimeType?.includes("audio")) {
              const audioData = this.base64ToArrayBuffer(part.inlineData.data || "");

              // Collect for R2 storage
              this.audioChunksForStorage.push(audioData);

              // Play and callback
              this.callbacks.onAudioResponse(audioData);
              this.queueAudio(audioData);
            }

            // Handle text
            if (part.text) {
              this.currentAssistantText += part.text;
              this.callbacks.onTextResponse(part.text, true);
              this.callbacks.onTranscript(part.text, "assistant");
            }
          }
        }

        // Handle turn complete - save the full message with audio
        if (content.turnComplete) {
          if (this.currentAssistantText || this.audioChunksForStorage.length > 0) {
            await this.saveAssistantMessageWithAudio();
          }
          this.callbacks.onTurnComplete();
          // Reset for next turn
          this.lastUserTranscript = "";
        }

        // Handle interruption
        if (content.interrupted) {
          this.clearAudioQueue();
          this.currentAssistantText = "";
          this.audioChunksForStorage = [];
          this.isCollectingAudio = false;
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
      prompt += `\n\nSTUDENT EDUCATION LEVEL: ${this.config.educationLevel}. Adjust your explanations accordingly.`;
    }

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
    }
  }

  async sendText(text: string): Promise<void> {
    if (!this.session || !this.isConnected) return;

    try {
      // Save user message
      await this.saveMessage({
        role: "user",
        type: "text",
        content: text,
      });

      this.callbacks.onTranscript(text, "user");

      // Start thinking state
      this.callbacks.onThinkingStart?.();

      await this.session.sendClientContent({
        turns: [{ role: "user", parts: [{ text }] }],
        turnComplete: true,
      });
    } catch (error) {
      console.error("Error sending text:", error);
      this.callbacks.onThinkingEnd?.();
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

    // Clear audio first
    this.clearAudioQueue();

    // Mark as disconnected before async operations
    const wasConnected = this.isConnected;
    this.isConnected = false;

    // Handle disconnect (update DB)
    if (wasConnected) {
      await this.handleDisconnect();
    }

    // Close session
    if (this.session) {
      try {
        await this.session.close();
      } catch {
        // Ignore errors
      }
      this.session = null;
    }

    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        await this.audioContext.close();
      } catch {
        // Ignore errors
      }
    }
    this.audioContext = null;
  }

  get connected(): boolean {
    return this.isConnected;
  }

  getSessionDbId(): string | null {
    return this.dbService.getSessionId();
  }
}
