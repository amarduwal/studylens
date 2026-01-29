"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { MediaState } from "@/types/live";
import { LIVE_CONFIG } from "@/lib/live/constants";

interface UseMediaStreamOptions {
  enableAudio?: boolean;
  enableVideo?: boolean;
  onAudioData?: (audioData: ArrayBuffer) => void;
}

interface UseMediaStreamReturn extends MediaState {
  startMedia: () => Promise<boolean>;
  stopMedia: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  captureFrame: () => string | null;
}

export function useMediaStream(options: UseMediaStreamOptions = {}): UseMediaStreamReturn {
  const { enableAudio = true, enableVideo = true, onAudioData } = options;

  const [state, setState] = useState<MediaState>({
    hasAudioPermission: false,
    hasVideoPermission: false,
    isAudioEnabled: false,
    isVideoEnabled: false,
    audioLevel: 0,
    videoStream: null,
    audioStream: null,
    error: null,
  });

  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const onAudioDataRef = useRef(onAudioData);

  // Keep onAudioData ref updated
  useEffect(() => {
    onAudioDataRef.current = onAudioData;
  }, [onAudioData]);


  const stopMedia = useCallback(() => {
    console.log("Stopping media streams...");

    // Stop audio processing
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }

    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop media tracks
    if (state.audioStream) {
      state.audioStream.getTracks().forEach((track) => track.stop());
    }
    if (state.videoStream) {
      state.videoStream.getTracks().forEach((track) => track.stop());
    }

    setState({
      hasAudioPermission: false,
      hasVideoPermission: false,
      isAudioEnabled: false,
      isVideoEnabled: false,
      audioLevel: 0,
      videoStream: null,
      audioStream: null,
      error: null,
    });
  }, [state.audioStream, state.videoStream]);

  // Initialize elements
  useEffect(() => {
    canvasRef.current = document.createElement("canvas");
    canvasRef.current.width = LIVE_CONFIG.VIDEO.WIDTH;
    canvasRef.current.height = LIVE_CONFIG.VIDEO.HEIGHT;

    videoElementRef.current = document.createElement("video");
    videoElementRef.current.autoplay = true;
    videoElementRef.current.muted = true;
    videoElementRef.current.playsInline = true;

    return () => {
      stopMedia();
    };
  }, []);

  const setupAudioProcessing = useCallback(async (audioStream: MediaStream) => {
    try {
      console.log("Setting up audio processing...");

      // Create audio context
      audioContextRef.current = new AudioContext({
        sampleRate: LIVE_CONFIG.AUDIO.SAMPLE_RATE,
      });

      // Resume if suspended (browser autoplay policy)
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }

      const source = audioContextRef.current.createMediaStreamSource(audioStream);

      // Create analyser for visualizing audio level
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Create script processor for capturing audio data
      const bufferSize = 4096;
      processorRef.current = audioContextRef.current.createScriptProcessor(
        bufferSize,
        1,
        1
      );

      let audioBuffer: Int16Array[] = [];
      let sampleCount = 0;
      const targetSamples = LIVE_CONFIG.AUDIO.SAMPLE_RATE / 4; // Send 4 times per second

      processorRef.current.onaudioprocess = (event) => {
        if (!onAudioDataRef.current) return;

        const inputBuffer = event.inputBuffer.getChannelData(0);

        // Convert Float32Array to Int16Array (PCM)
        const pcmData = new Int16Array(inputBuffer.length);
        for (let i = 0; i < inputBuffer.length; i++) {
          const sample = Math.max(-1, Math.min(1, inputBuffer[i]));
          pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        }

        audioBuffer.push(pcmData);
        sampleCount += pcmData.length;

        // Send when we have enough samples
        if (sampleCount >= targetSamples) {
          const totalLength = audioBuffer.reduce((sum, arr) => sum + arr.length, 0);
          const combined = new Int16Array(totalLength);
          let offset = 0;
          for (const arr of audioBuffer) {
            combined.set(arr, offset);
            offset += arr.length;
          }

          onAudioDataRef.current(combined.buffer);
          audioBuffer = [];
          sampleCount = 0;
        }
      };

      source.connect(processorRef.current);
      // Connect to destination to keep the processor running
      processorRef.current.connect(audioContextRef.current.destination);

      // Start audio level monitoring
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length / 255;

        setState((prev) => ({ ...prev, audioLevel: average }));
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
      console.log("Audio processing setup complete");
    } catch (error) {
      console.error("Error setting up audio processing:", error);
      throw error;
    }
  }, []);

  const startMedia = useCallback(async (): Promise<boolean> => {
    try {
      console.log("Starting media with options:", { enableAudio, enableVideo });
      setState((prev) => ({ ...prev, error: null }));

      const constraints: MediaStreamConstraints = {};

      if (enableAudio) {
        constraints.audio = {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: LIVE_CONFIG.AUDIO.SAMPLE_RATE,
          channelCount: 1,
        };
      }

      if (enableVideo) {
        constraints.video = {
          width: { ideal: LIVE_CONFIG.VIDEO.WIDTH },
          height: { ideal: LIVE_CONFIG.VIDEO.HEIGHT },
          frameRate: { ideal: 30 },
          facingMode: "user",
        };
      }

      console.log("Requesting media with constraints:", constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("Got media stream:", stream.getTracks().map((t) => t.kind));

      const audioTracks = stream.getAudioTracks();
      const videoTracks = stream.getVideoTracks();

      const audioStream = audioTracks.length > 0 ? new MediaStream(audioTracks) : null;
      const videoStream = videoTracks.length > 0 ? new MediaStream(videoTracks) : null;

      // Connect video to element for frame capture
      if (videoStream && videoElementRef.current) {
        videoElementRef.current.srcObject = videoStream;
        await videoElementRef.current.play().catch(console.error);
      }

      setState((prev) => ({
        ...prev,
        hasAudioPermission: audioTracks.length > 0,
        hasVideoPermission: videoTracks.length > 0,
        isAudioEnabled: audioTracks.length > 0,
        isVideoEnabled: videoTracks.length > 0,
        audioStream,
        videoStream,
      }));

      // Setup audio processing
      if (audioStream && onAudioDataRef.current) {
        await setupAudioProcessing(audioStream);
      }

      console.log("Media started successfully");
      return true;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to access camera/microphone";

      setState((prev) => ({
        ...prev,
        error: errorMessage,
      }));

      return false;
    }
  }, [enableAudio, enableVideo, setupAudioProcessing]);

  const toggleAudio = useCallback(() => {
    if (state.audioStream) {
      const audioTrack = state.audioStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setState((prev) => ({
          ...prev,
          isAudioEnabled: audioTrack.enabled,
        }));
      }
    }
  }, [state.audioStream]);

  const toggleVideo = useCallback(() => {
    if (state.videoStream) {
      const videoTrack = state.videoStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setState((prev) => ({
          ...prev,
          isVideoEnabled: videoTrack.enabled,
        }));
      }
    }
  }, [state.videoStream]);

  const captureFrame = useCallback((): string | null => {
    if (!state.videoStream || !canvasRef.current || !videoElementRef.current) {
      return null;
    }

    if (videoElementRef.current.readyState < 2) {
      return null;
    }

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(
      videoElementRef.current,
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );

    return canvasRef.current.toDataURL("image/jpeg", LIVE_CONFIG.VIDEO.QUALITY);
  }, [state.videoStream]);

  return {
    ...state,
    startMedia,
    stopMedia,
    toggleAudio,
    toggleVideo,
    captureFrame,
  };
}
