import { GoogleGenAI, Modality } from "@google/genai";
import { LIVE_CONFIG, TUTOR_SYSTEM_PROMPT } from "./constants";
import { getToolsForGemini } from "./tools-config";
import { SessionConfig, LiveMessage } from "@/types/live.ts";

type LiveSession = Awaited<ReturnType<typeof GoogleGenAI.prototype.live.connect>>;
type LiveServerMessage = Parameters<Parameters<LiveSession['receive']>[0]>[0];

export interface GeminiLiveCallbacks {
  onConnected: () => void;
  onDisconnected: () => void;
  onError: (error: Error) => void;
  onAudioResponse: (audioData: ArrayBuffer) => void;
  onTextResponse: (text: string, isPartial: boolean) => void;
  onToolCall: (toolName: string, args: Record<string, any>) => void;
  onThinking: (thought: string) => void;
  onInterrupted: () => void;
  onTurnComplete: () => void;
}

export class GeminiLiveSession {
  private ai: GoogleGenAI;
  private session: LiveSession | null = null;
  private callbacks: GeminiLiveCallbacks;
  private config: SessionConfig;
  private isConnected: boolean = false;
  private audioContext: AudioContext | null = null;
  private audioQueue: ArrayBuffer[] = [];
  private isPlaying: boolean = false;
  private receiveLoop: Promise<void> | null = null;
  private shouldStop: boolean = false;

  constructor(apiKey: string, config: SessionConfig, callbacks: GeminiLiveCallbacks) {
    this.ai = new GoogleGenAI({ apiKey });
    this.config = config;
    this.callbacks = callbacks;
  }

  async connect(): Promise<void> {
    try {
      const systemPrompt = this.buildSystemPrompt();

      this.session = await this.ai.live.connect({
        model: LIVE_CONFIG.MODEL,
        callbacks: {
          onopen: () => {
            console.log("Gemini Live connection opened");
            this.isConnected = true;
            this.callbacks.onConnected();
          },
          onmessage: (message: LiveServerMessage) => {
            this.handleServerMessage(message);
          },
          onerror: (error: ErrorEvent) => {
            console.error("Gemini Live error:", error);
            this.callbacks.onError(new Error(error.message || "Connection error"));
          },
          onclose: (event: CloseEvent) => {
            console.log("Gemini Live connection closed:", event.code, event.reason);
            this.isConnected = false;
            this.callbacks.onDisconnected();
          },
        },
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

      // Start the receive loop
      this.startReceiveLoop();

    } catch (error) {
      console.error("Failed to connect to Gemini Live:", error);
      this.callbacks.onError(error instanceof Error ? error : new Error("Connection failed"));
      throw error;
    }
  }

  private buildSystemPrompt(): string {
    let prompt = TUTOR_SYSTEM_PROMPT;

    if (this.config.language && this.config.language !== "en") {
      const languageNames: Record<string, string> = {
        hi: "Hindi", ne: "Nepali", es: "Spanish", fr: "French",
        ar: "Arabic", zh: "Chinese", bn: "Bengali", pt: "Portuguese", id: "Indonesian"
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

    if (this.config.systemPrompt) {
      prompt += `\n\nAdditional instructions: ${this.config.systemPrompt}`;
    }

    return prompt;
  }

  private async startReceiveLoop(): Promise<void> {
    if (!this.session) return;

    this.shouldStop = false;

    try {
      // The Gemini Live SDK handles receiving via callbacks
      // This is just for any additional async processing if needed
      while (!this.shouldStop && this.isConnected) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      if (!this.shouldStop) {
        console.error("Receive loop error:", error);
        this.callbacks.onError(error instanceof Error ? error : new Error("Receive error"));
      }
    }
  }

  private handleServerMessage(message: LiveServerMessage): void {
    try {
      // Handle different message types from Gemini Live
      if ('serverContent' in message && message.serverContent) {
        const content = message.serverContent;

        // Handle model turn (AI is speaking)
        if ('modelTurn' in content && content.modelTurn) {
          const parts = content.modelTurn.parts || [];

          for (const part of parts) {
            if ('text' in part && part.text) {
              this.callbacks.onTextResponse(part.text, !content.turnComplete);
            }

            if ('inlineData' in part && part.inlineData) {
              // Audio data
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
      if ('toolCall' in message && message.toolCall) {
        const functionCalls = message.toolCall.functionCalls || [];
        for (const call of functionCalls) {
          this.callbacks.onToolCall(call.name, call.args || {});
        }
      }

    } catch (error) {
      console.error("Error handling server message:", error);
    }
  }

  async sendAudio(audioData: ArrayBuffer): Promise<void> {
    if (!this.session || !this.isConnected) {
      console.warn("Cannot send audio: not connected");
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

    try {
      // Remove data URL prefix if present
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
      console.warn("Cannot send text: not connected");
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
      console.warn("Cannot send tool result: not connected");
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
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioData = this.audioQueue.shift()!;

    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext({ sampleRate: 24000 });
      }

      // Convert PCM to AudioBuffer
      const audioBuffer = await this.pcmToAudioBuffer(audioData);
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);

      source.onended = () => {
        this.playNextAudio();
      };

      source.start();
    } catch (error) {
      console.error("Error playing audio:", error);
      this.playNextAudio();
    }
  }

  private clearAudioQueue(): void {
    this.audioQueue = [];
    this.isPlaying = false;
  }

  private async pcmToAudioBuffer(pcmData: ArrayBuffer): Promise<AudioBuffer> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 24000 });
    }

    const samples = new Int16Array(pcmData);
    const floatSamples = new Float32Array(samples.length);

    for (let i = 0; i < samples.length; i++) {
      floatSamples[i] = samples[i] / 32768;
    }

    const audioBuffer = this.audioContext.createBuffer(1, floatSamples.length, 24000);
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
    this.shouldStop = true;
    this.isConnected = false;

    if (this.session) {
      try {
        await this.session.close();
      } catch (error) {
        console.error("Error closing session:", error);
      }
      this.session = null;
    }

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    this.clearAudioQueue();
  }

  get connected(): boolean {
    return this.isConnected;
  }
}
