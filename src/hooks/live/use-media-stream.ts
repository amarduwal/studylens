"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { LIVE_CONFIG } from "@/lib/live/constants";
import { MediaState } from "@/types/live.ts";

interface UseMediaStreamOptions {
  enableAudio?: boolean;
  enableVideo?: boolean;
  onAudioData?: (audioData: ArrayBuffer) => void;
}

interface UseMediaStreamReturn extends MediaState {
  startMedia: () => Promise<void>;
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
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize canvas for frame capture
  useEffect(() => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
      canvasRef.current.width = LIVE_CONFIG.VIDEO.WIDTH;
      canvasRef.current.height = LIVE_CONFIG.VIDEO.HEIGHT;
    }
  }, []);

  const startMedia = useCallback(async () => {
    try {
      const constraints: MediaStreamConstraints = {};

      if (enableAudio) {
        constraints.audio = {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: LIVE_CONFIG.AUDIO.SAMPLE_RATE,
          channelCount: LIVE_CONFIG.AUDIO.CHANNELS,
        };
      }

      if (enableVideo) {
        constraints.video = {
          width: { ideal: LIVE_CONFIG.VIDEO.WIDTH },
          height: { ideal: LIVE_CONFIG.VIDEO.HEIGHT },
          frameRate: { ideal: 30 },
        };
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      const audioTracks = stream.getAudioTracks();
      const videoTracks = stream.getVideoTracks();

      setState(prev => ({
        ...prev,
        hasAudioPermission: audioTracks.length > 0,
        hasVideoPermission: videoTracks.length > 0,
        isAudioEnabled: audioTracks.length > 0,
        isVideoEnabled: videoTracks.length > 0,
        audioStream: audioTracks.length > 0 ? new MediaStream(audioTracks) : null,
        videoStream: videoTracks.length > 0 ? new MediaStream(videoTracks) : null,
      }));

      // Set up audio processing
      if (audioTracks.length > 0 && onAudioData) {
        await setupAudioProcessing(new MediaStream(audioTracks));
      }

    } catch (error) {
      console.error("Error accessing media devices:", error);
      throw error;
    }
  }, [enableAudio, enableVideo, onAudioData]);

  const setupAudioProcessing = async (audioStream: MediaStream) => {
    try {
      audioContextRef.current = new AudioContext({
        sampleRate: LIVE_CONFIG.AUDIO.SAMPLE_RATE,
      });

      const source = audioContextRef.current.createMediaStreamSource(audioStream);

      // Create analyser for audio level visualization
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Use ScriptProcessorNode for audio data extraction
      // (AudioWorklet would be better but requires more setup)
      const bufferSize = LIVE_CONFIG.AUDIO.CHUNK_SIZE;
      processorRef.current = audioContextRef.current.createScriptProcessor(
        bufferSize,
        LIVE_CONFIG.AUDIO.CHANNELS,
        LIVE_CONFIG.AUDIO.CHANNELS
      );

      processorRef.current.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer.getChannelData(0);

        // Convert Float32Array to Int16Array (PCM)
        const pcmData = new Int16Array(inputBuffer.length);
        for (let i = 0; i < inputBuffer.length; i++) {
          const sample = Math.max(-1, Math.min(1, inputBuffer[i]));
          pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        }

        if (onAudioData) {
          onAudioData(pcmData.buffer);
        }
      };

      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      // Start audio level monitoring
      startAudioLevelMonitoring();

    } catch (error) {
      console.error("Error setting up audio processing:", error);
    }
  };

  const startAudioLevelMonitoring = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

    const updateLevel = () => {
      if (!analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);

      // Calculate average level
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length / 255;

      setState(prev => ({
        ...prev,
        audioLevel: average,
      }));

      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();
  };

  const stopMedia = useCallback(() => {
    // Stop all tracks
    if (state.audioStream) {
      state.audioStream.getTracks().forEach(track => track.stop());
    }
    if (state.videoStream) {
      state.videoStream.getTracks().forEach(track => track.stop());
    }

    // Clean up audio processing
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setState({
      hasAudioPermission: false,
      hasVideoPermission: false,
      isAudioEnabled: false,
      isVideoEnabled: false,
      audioLevel: 0,
      videoStream: null,
      audioStream: null,
    });
  }, [state.audioStream, state.videoStream]);

  const toggleAudio = useCallback(() => {
    if (state.audioStream) {
      const audioTrack = state.audioStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setState(prev => ({
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
        setState(prev => ({
          ...prev,
          isVideoEnabled: videoTrack.enabled,
        }));
      }
    }
  }, [state.videoStream]);

  const captureFrame = useCallback((): string | null => {
    if (!state.videoStream || !canvasRef.current) return null;

    const video = document.createElement("video");
    video.srcObject = state.videoStream;
    video.play();

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvasRef.current.width, canvasRef.current.height);

    return canvasRef.current.toDataURL("image/jpeg", LIVE_CONFIG.VIDEO.QUALITY);
  }, [state.videoStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMedia();
    };
  }, []);

  return {
    ...state,
    startMedia,
    stopMedia,
    toggleAudio,
    toggleVideo,
    captureFrame,
  };
}
