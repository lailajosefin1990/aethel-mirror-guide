import { useState, useCallback, useRef } from "react";
import { Volume2, Loader2, Square } from "lucide-react";
import { toast } from "sonner";

interface VoicePlayerProps {
  text: string;
  disabled?: boolean;
}

const VoicePlayer = ({ text, disabled }: VoicePlayerProps) => {
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback(async () => {
    if (playing && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-voice`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text, voice: "nova" }),
        }
      );

      if (!resp.ok) throw new Error("TTS failed");

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setPlaying(false);
        URL.revokeObjectURL(url);
      };

      await audio.play();
      setPlaying(true);
    } catch {
      toast.error("Could not play reading");
    } finally {
      setLoading(false);
    }
  }, [text, playing]);

  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={play}
      className="w-full h-[48px] rounded-sm border border-border text-foreground/70 font-body text-[14px] hover:border-primary hover:text-primary transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
      ) : playing ? (
        <Square className="w-4 h-4" strokeWidth={1.5} />
      ) : (
        <Volume2 className="w-4 h-4" strokeWidth={1.5} />
      )}
      {loading ? "Generating audio..." : playing ? "Stop listening" : "Listen to reading"}
    </button>
  );
};

export default VoicePlayer;
