"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, MicOff, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { API_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface VoiceInputProps {
  token: string;
  value: string;
  onChange: (text: string) => void;
  onSubmit?: (text: string) => void;
  disabled?: boolean;
  /** When true, transcribed text is submitted automatically */
  autoSubmit?: boolean;
  compact?: boolean;
}

export function VoiceInput({
  token,
  value,
  onChange,
  onSubmit,
  disabled,
  autoSubmit = true,
  compact = false,
}: VoiceInputProps) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      recordingRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      mediaRef.current?.stop();
      cleanupStream();
    };
  }, [cleanupStream]);

  const transcribeBlob = useCallback(
    async (blob: Blob) => {
      setTranscribing(true);
      setError(null);
      try {
        const form = new FormData();
        form.append("file", blob, "voice.webm");
        const res = await fetch(`${API_URL}/api/v1/ai/speech-to-text`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
        if (!res.ok) {
          const detail = await res.text();
          throw new Error(detail || "Transcription failed");
        }
        const data = (await res.json()) as { text: string };
        const text = data.text.trim();
        if (!text) {
          setError("No speech detected. Try again and speak clearly.");
          return;
        }
        onChange(text);
        if (autoSubmit) {
          onSubmit?.(text);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Transcription failed");
      } finally {
        setTranscribing(false);
      }
    },
    [autoSubmit, onChange, onSubmit, token],
  );

  const stopRecording = useCallback(() => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    setRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRef.current?.state === "recording") {
      mediaRef.current.stop();
    } else {
      cleanupStream();
    }
  }, [cleanupStream]);

  const startRecording = useCallback(async () => {
    setError(null);
    setElapsed(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        cleanupStream();
        const blob = new Blob(chunksRef.current, { type: mimeType.split(";")[0] });
        if (blob.size < 500) {
          setError("Recording too short. Click Speak and talk for a few seconds.");
          return;
        }
        void transcribeBlob(blob);
      };

      mediaRef.current = recorder;
      recorder.start(200);
      recordingRef.current = true;
      setRecording(true);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch {
      setError("Microphone access denied. Allow mic permission in your browser.");
      recordingRef.current = false;
      setRecording(false);
    }
  }, [cleanupStream, transcribeBlob]);

  const handleMic = () => {
    if (recording) {
      stopRecording();
    } else {
      void startRecording();
    }
  };

  const speakResponse = async () => {
    if (!value || speaking) return;
    setSpeaking(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/ai/text-to-speech`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: value.slice(0, 500) }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { audio_base64: string };
      const audio = new Audio(`data:audio/mpeg;base64,${data.audio_base64}`);
      await audio.play();
    } finally {
      setSpeaking(false);
    }
  };

  return (
    <div className={cn("space-y-2", compact && "space-y-1")}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={recording ? "destructive" : "outline"}
          size={compact ? "icon" : "sm"}
          disabled={disabled || transcribing}
          onClick={handleMic}
          className={cn(recording && "animate-pulse")}
          aria-pressed={recording}
        >
          {transcribing ? (
            <Loader2 className={cn("size-4 animate-spin", !compact && "mr-1.5")} />
          ) : recording ? (
            <MicOff className={cn("size-4", !compact && "mr-1.5")} />
          ) : (
            <Mic className={cn("size-4", !compact && "mr-1.5")} />
          )}
          {!compact &&
            (recording
              ? `Stop (${elapsed}s)`
              : transcribing
                ? "Transcribing…"
                : "Speak")}
        </Button>
        {value && !compact && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={speaking}
            onClick={() => void speakResponse()}
          >
            {speaking ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <Volume2 className="mr-1.5 size-4" />
            )}
            Listen
          </Button>
        )}
        {!compact && (
          <span className="text-xs text-muted-foreground">
            {recording
              ? "Listening… click Stop when finished."
              : "Click Speak, say your request, then click Stop."}
          </span>
        )}
      </div>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
