// ── VoiceMicButton — inline mic icon for any input field ─────────────────────
import { Mic, MicOff, AlertCircle } from "lucide-react";
import { useVoiceInput, UseVoiceInputOptions } from "@/hooks/useVoiceInput";

interface Props extends UseVoiceInputOptions {
  className?: string;
}

const VoiceMicButton = ({ onResult, transform, className = "" }: Props) => {
  const { status, errorMsg, isSupported, start, stop } = useVoiceInput({ onResult, transform });

  if (!isSupported) return null;

  const isListening = status === "listening";
  const isError = status === "error";

  return (
    <div className={`flex flex-col items-end gap-1 ${className}`}>
      <button
        type="button"
        onClick={isListening ? stop : start}
        title={isListening ? "Stop listening" : "Tap to speak"}
        className={`p-1.5 rounded-lg transition-all duration-200 ${
          isListening
            ? "bg-red-500 text-white animate-pulse"
            : isError
            ? "text-amber-500 hover:bg-amber-50"
            : "text-muted-foreground hover:text-primary hover:bg-primary/10"
        }`}
      >
        {isListening ? <MicOff size={15} /> : isError ? <AlertCircle size={15} /> : <Mic size={15} />}
      </button>
      {isError && errorMsg && (
        <p className="text-xs text-amber-600 text-right max-w-[160px] leading-tight">{errorMsg}</p>
      )}
    </div>
  );
};

export default VoiceMicButton;
