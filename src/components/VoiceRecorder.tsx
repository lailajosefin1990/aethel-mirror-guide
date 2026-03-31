import { useState, useRef, useCallback } from "react";
import { Mic, Square } from "lucide-react";
import { toast } from "sonner";

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

const VoiceRecorder = ({ onTranscription, disabled }: VoiceRecorderProps) => {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size < 100) {
          toast.error("Recording too short");
          return;
        }
        setTranscribing(true);
        try {
          const formData = new FormData();
          formData.append("audio", blob, "recording.webm");

          const resp = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-to-text`,
            {
              method: "POST",
              headers: {
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: formData,
            }
          );

          if (!resp.ok) throw new Error("Transcription failed");
          const data = await resp.json();
          if (data.text) onTranscription(data.text);
          else toast.error("No speech detected");
        } catch {
          toast.error("Could not transcribe audio");
        } finally {
          setTranscribing(false);
        }
      };

      mediaRecorder.start();
      setRecording(true);
    } catch {
      toast.error("Microphone access denied");
    }
  }, [onTranscription]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }, []);

  return (
    <button
      type="button"
      disabled={disabled || transcribing}
      onClick={recording ? stopRecording : startRecording}
      className={`shrink-0 w-10 h-10 rounded-sm flex items-center justify-center border transition-all duration-300 ${
        recording
          ? "bg-destructive/10 border-destructive text-destructive animate-pulse"
          : transcribing
          ? "bg-muted border-border text-muted-foreground opacity-50"
          : "bg-card border-border text-foreground/60 hover:border-primary hover:text-primary"
      }`}
      title={recording ? "Stop recording" : transcribing ? "Transcribing..." : "Speak your question"}
    >
      {recording ? (
        <Square className="w-4 h-4" strokeWidth={1.5} />
      ) : (
        <Mic className="w-4 h-4" strokeWidth={1.5} />
      )}
    </button>
  );
};

export default VoiceRecorder;
