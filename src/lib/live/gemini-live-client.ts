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

      console.log("Gemini Live session created, starting receive loop...");
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

  private async startReceiveLoop(): Promise<void> {
    if (!this.session) return;

    try {
      // Use async iterator to receive messages
      for await (const message of this.session) {
        if (!this.isConnected) break;
        this.handleServerMessage(message);
      }
    } catch (error) {
      if (this.isConnected) {
        console.error("Receive loop error:", error);
        this.callbacks.onError(
          error instanceof Error ? error : new Error("Connection lost")
        );
      }
    } finally {
      this.isConnected = false;
      this.callbacks.onDisconnected("Session ended");
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
              const audioData = this.base64ToArrayBuffer(part.inlineData.data);
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

    // Gemini returns 24kHz 16-bit PCM
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
        await this.session.close();
      } catch (error) {
        console.error("Error closing session:", error);
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
  }

  get connected(): boolean {
    return this.isConnected;
  }
}
