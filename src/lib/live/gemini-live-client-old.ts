import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { LIVE_CONFIG, TUTOR_SYSTEM_PROMPT } from "./constants";
import { getToolsForGemini } from "./tools-config";
import { SessionConfig } from "@/types/live";

export interface GeminiLiveCallbacks {
  onConnected: () => void;
  onDisconnected: (reason?: string) => void;
  onError: (error: Error) => void;
  onAudioResponse: (audioData: ArrayBuffer) => void;
  onTextResponse: (text: string, isPartial: boolean) => void;
  onToolCall: (toolName: string, args: Record<string, any>, id: string) => void;
  onInterrupted: () => void;
  onTurnComplete: () => void;
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

  constructor(apiKey: string, config: SessionConfig, callbacks: GeminiLiveCallbacks) {
    this.ai = new GoogleGenAI({ apiKey });
    this.config = config;
    this.callbacks = callbacks;
  }

  async connect(): Promise<void> {
    try {
      console.log("Connecting to Gemini Live API...");
      const systemPrompt = this.buildSystemPrompt();

      // Initialize audio context
      this.audioContext = new AudioContext({ sampleRate: 24000 });

      this.session = await this.ai.live.connect({
        model: LIVE_CONFIG.MODEL,
        config: {
          responseModalities: [Modality.AUDIO, Modality.TEXT],
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
          tools: getToolsForGemini(),
        },
      });

      // Check WebSocket is actually open
      const ws = this.session?.conn?.ws as WebSocket;
      if (ws) {
        console.log("Initial WebSocket state:", ws.readyState);

        if (ws.readyState !== WebSocket.OPEN) {
          // Wait for it to open
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("WebSocket connection timeout"));
            }, 5000);

            if (ws.readyState === WebSocket.OPEN) {
              clearTimeout(timeout);
              resolve();
              return;
            }

            ws.addEventListener('open', () => {
              clearTimeout(timeout);
              console.log("WebSocket opened");
              resolve();
            }, { once: true });

            ws.addEventListener('error', (e) => {
              clearTimeout(timeout);
              reject(new Error("WebSocket connection failed"));
            }, { once: true });

            ws.addEventListener('close', (e) => {
              clearTimeout(timeout);
              reject(new Error(`WebSocket closed: ${e.code} ${e.reason}`));
            }, { once: true });
          });
        }

        console.log("WebSocket confirmed open, state:", ws.readyState);
      }

      console.log("WebSocket immediately after connect:", ws?.readyState);

      // Keep connection alive with a small delay before starting receive loop
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log("WebSocket after delay:", ws?.readyState);

      // 🔍 DEBUG: Log session structure
      // Comprehensive session debugging
      console.log("=== FULL SESSION DEBUG ===");
      console.log("Session value:", this.session);
      console.log("Type:", typeof this.session);
      console.log("Constructor:", this.session?.constructor?.name);
      console.log("Is Promise:", this.session instanceof Promise);

      // Get ALL properties including inherited
      const getAllProps = (obj: any): string[] => {
        const props: string[] = [];
        while (obj && obj !== Object.prototype) {
          props.push(...Object.getOwnPropertyNames(obj));
          obj = Object.getPrototypeOf(obj);
        }
        return [...new Set(props)];
      };
      console.log("All properties:", getAllProps(this.session));

      // Check for async iterator
      console.log("Symbol.asyncIterator:", this.session?.[Symbol.asyncIterator]);
      console.log("Symbol.iterator:", this.session?.[Symbol.iterator]);

      // Check for common streaming props
      ['_ws', 'ws', 'socket', 'stream', 'readable', 'next', 'receive'].forEach(prop => {
        console.log(`Has ${prop}:`, prop in (this.session || {}), typeof this.session?.[prop]);
      });
      console.log("=========================");

      this.isConnected = true;
      this.callbacks.onConnected();

      // Start receiving messages
      this.startReceiveLoop();
    } catch (error) {
      console.error("Failed to connect to Gemini Live:", error);
      this.isConnected = false;
      this.callbacks.onError(
        error instanceof Error ? error : new Error("Connection failed")
      );
      throw error;
    }
  }

  private buildSystemPrompt(): string {
    let prompt = TUTOR_SYSTEM_PROMPT;

    if (this.config.language && this.config.language !== "en") {
      const languageNames: Record<string, string> = {
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
      const langName = languageNames[this.config.language] || this.config.language;
      prompt += `\n\nIMPORTANT: Communicate with the student in ${langName}. Speak and respond in ${langName}.`;
    }

    if (this.config.educationLevel) {
      prompt += `\n\nThe student is at ${this.config.educationLevel} level. Adjust your explanations accordingly.`;
    }

    if (this.config.subject) {
      prompt += `\n\nThe current subject focus is: ${this.config.subject}.`;
    }

    return prompt;
  }

  private async startReceiveLoop(): Promise<void> {
    if (!this.session) {
      console.error("No session available");
      return;
    }

    try {
      console.log("Starting receive loop...");

      const browserWs = this.session.conn;
      const ws = browserWs?.ws as WebSocket;

      if (!ws) {
        console.error("No WebSocket found");
        return;
      }

      console.log("WebSocket state:", ws.readyState, "(0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED)");

      // Use addEventListener - this WON'T interfere with SDK's internal handlers
      ws.addEventListener('message', (event: MessageEvent) => {
        if (!this.isConnected) return;

        try {
          let data;
          if (typeof event.data === 'string') {
            data = JSON.parse(event.data);
          } else if (event.data instanceof Blob) {
            event.data.text().then(text => {
              try {
                this.handleServerMessage(JSON.parse(text));
              } catch (e) {
                console.error("Error parsing blob message:", e);
              }
            });
            return;
          } else if (event.data instanceof ArrayBuffer) {
            const decoder = new TextDecoder();
            data = JSON.parse(decoder.decode(event.data));
          } else {
            console.log("Unknown message type:", typeof event.data);
            return;
          }

          this.handleServerMessage(data);
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
        }
      });

      ws.addEventListener('close', (event: CloseEvent) => {
        console.log("WebSocket closed:", event.code, event.reason);
        this.handleLoopEnd();
      });

      ws.addEventListener('error', (event: Event) => {
        console.error("WebSocket error:", event);
        this.callbacks.onError(new Error("WebSocket connection error"));
      });

      console.log("WebSocket listeners attached successfully");

    } catch (error) {
      console.error("Receive loop error:", error);
      this.callbacks.onError(error instanceof Error ? error : new Error("Receive loop failed"));
    }
  }

  private handleLoopEnd(): void {
    if (this.isConnected) {
      this.isConnected = false;
      this.callbacks.onDisconnected("Session ended");
    }
  }

  private handleServerMessage(message: LiveServerMessage): void {
    try {
      // Handle server content (audio/text responses)
      if (message.serverContent) {
        const content = message.serverContent;

        if (content.modelTurn) {
          const parts = content.modelTurn.parts || [];

          for (const part of parts) {
            // Handle text
            if (part.text) {
              this.callbacks.onTextResponse(part.text, !content.turnComplete);
            }

            // Handle audio
            if (part.inlineData && part.inlineData.mimeType?.includes("audio")) {
              const audioData = this.base64ToArrayBuffer(part.inlineData.data || '');
              this.callbacks.onAudioResponse(audioData);
              this.queueAudio(audioData);
            }
          }
        }

        // Handle turn complete
        if (content.turnComplete) {
          this.callbacks.onTurnComplete();
        }

        // Handle interruption
        if (content.interrupted) {
          this.clearAudioQueue();
          this.callbacks.onInterrupted();
        }
      }

      // Handle tool calls
      if (message.toolCall) {
        const functionCalls = message.toolCall.functionCalls || [];
        for (const call of functionCalls) {
          this.callbacks.onToolCall(call.name, call.args || {}, call.id);
        }
      }
    } catch (error) {
      console.error("Error handling server message:", error, message);
    }
  }

  async sendAudio(audioData: ArrayBuffer): Promise<void> {
    if (!this.session || !this.isConnected) {
      console.warn("Cannot send audio: not connected");
      return;
    }

    // Check WebSocket state before sending
    const ws = this.session?.conn?.ws as WebSocket;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn("Cannot send audio: WebSocket not open, state:", ws?.readyState);
      return;
    }

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

  async sendImage(imageData: string, mimeType: string = "image/jpeg"): Promise<void> {
    if (!this.session || !this.isConnected) {
      console.warn("Cannot send image: not connected");
      return;
    }

    const ws = this.session?.conn?.ws as WebSocket;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn("Cannot send image: WebSocket not open, state:", ws?.readyState);
      return;
    }

    try {
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");

      await this.session.sendRealtimeInput({
        video: {
          data: base64Data,
          mimeType,
        },
      });
    } catch (error) {
      console.error("Error sending image:", error);
    }
  }

  async sendText(text: string): Promise<void> {
    if (!this.session || !this.isConnected) {
      return;
    }

    try {
      await this.session.sendClientContent({
        turns: [
          {
            role: "user",
            parts: [{ text }],
          },
        ],
        turnComplete: true,
      });
    } catch (error) {
      console.error("Error sending text:", error);
    }
  }

  async sendToolResult(toolCallId: string, result: any): Promise<void> {
    if (!this.session || !this.isConnected) {
      return;
    }

    try {
      await this.session.sendToolResponse({
        functionResponses: [
          {
            id: toolCallId,
            response: result,
          },
        ],
      });
    } catch (error) {
      console.error("Error sending tool result:", error);
    }
  }

  private queueAudio(audioData: ArrayBuffer): void {
    this.audioQueue.push(audioData);
    if (!this.isPlaying) {
      this.playNextAudio();
    }
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

      const audioBuffer = await this.pcmToAudioBuffer(audioData);
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

  private clearAudioQueue(): void {
    this.audioQueue = [];
    if (this.currentSourceNode) {
      try {
        this.currentSourceNode.stop();
      } catch (e) {
        // Ignore if already stopped
      }
      this.currentSourceNode = null;
    }
    this.isPlaying = false;
  }

  private async pcmToAudioBuffer(pcmData: ArrayBuffer): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error("AudioContext not initialized");
    }

    const samples = new Int16Array(pcmData);
    const floatSamples = new Float32Array(samples.length);

    for (let i = 0; i < samples.length; i++) {
      floatSamples[i] = samples[i] / 32768;
    }

    const audioBuffer = this.audioContext.createBuffer(
      1,
      floatSamples.length,
      24000
    );
    audioBuffer.getChannelData(0).set(floatSamples);

    return audioBuffer;
  }

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
    console.log("Disconnecting from Gemini Live...");
    this.isConnected = false;
    this.clearAudioQueue();

    if (this.session) {
      try {
        const ws = this.session?.conn?.ws as WebSocket;
        // Only close if not already closed
        if (ws && ws.readyState === WebSocket.OPEN) {
          await this.session.close();
        } else {
          console.log("WebSocket already closed, skipping close()");
        }
      } catch (error) {
        // Ignore close errors - connection might already be closed
        console.log("Session close handled:", error);
      }
      this.session = null;
    }

    if (this.audioContext) {
      try {
        await this.audioContext.close();
      } catch (error) {
        console.error("Error closing audio context:", error);
      }
      this.audioContext = null;
    }

    this.callbacks.onDisconnected();
  }

  get connected(): boolean {
    return this.isConnected;
  }
}
