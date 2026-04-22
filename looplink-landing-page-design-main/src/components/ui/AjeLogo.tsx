/**
 * Aje Logo — Premium serif wordmark
 * Matches reference: elegant display font, j in deep blue with blue dot
 * A uppercase bold, j drops with blue accent, e lowercase
 */

interface AjeLogoProps {
  variant?: "dark" | "light" | "blue";
  size?: number;
  showTagline?: boolean;
  className?: string;
}

// Deep navy + rich blue — matches reference exactly
const NAVY = "#0D1B3E";
const BLUE = "#1A56DB";
const WHITE = "#FFFFFF";
const LIGHT_BLUE = "#60A5FA";

const AjeLogo = ({ variant = "dark", size = 48, showTagline = false, className = "" }: AjeLogoProps) => {
  const mainColor = variant === "light" ? WHITE : NAVY;
  const jColor = variant === "light" ? LIGHT_BLUE : BLUE;
  const taglineColor = variant === "light" ? "rgba(255,255,255,0.45)" : "rgba(13,27,62,0.4)";
  const jDrop = size * 0.16;
  const fontSize = size;
  const eFontSize = size * 0.82;

  return (
    <div
      className={className}
      style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: size * 0.22 }}
      aria-label="Aje"
    >
      {/* Wordmark */}
      <div style={{ display: "inline-flex", alignItems: "baseline", lineHeight: 1 }}>
        {/* A — uppercase, bold serif */}
        <span style={{
          fontFamily: "'Playfair Display', 'Georgia', 'Times New Roman', serif",
          fontSize,
          fontWeight: 700,
          color: mainColor,
          letterSpacing: "-0.02em",
          lineHeight: 1,
          userSelect: "none",
        }}>A</span>

        {/* j — drops, blue, light weight */}
        <span style={{
          fontFamily: "'Playfair Display', 'Georgia', 'Times New Roman', serif",
          fontSize: size * 0.92,
          fontWeight: 400,
          color: jColor,
          letterSpacing: "-0.02em",
          lineHeight: 1,
          position: "relative",
          top: jDrop,
          userSelect: "none",
        }}>j</span>

        {/* e — lowercase, regular */}
        <span style={{
          fontFamily: "'Playfair Display', 'Georgia', 'Times New Roman', serif",
          fontSize: eFontSize,
          fontWeight: 400,
          color: mainColor,
          letterSpacing: "-0.02em",
          lineHeight: 1,
          userSelect: "none",
        }}>e</span>
      </div>

      {/* Tagline */}
      {showTagline && (
        <span style={{
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: size * 0.115,
          fontWeight: 500,
          color: taglineColor,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          userSelect: "none",
          whiteSpace: "nowrap",
        }}>
          Smarter Business. Better Future.
        </span>
      )}
    </div>
  );
};

/**
 * AjeIcon — rounded square app icon
 */
export const AjeIcon = ({
  size = 40,
  variant = "dark",
}: {
  size?: number;
  variant?: "dark" | "light" | "blue";
}) => {
  const bg = variant === "blue" ? BLUE : variant === "light" ? WHITE : NAVY;
  const mainColor = variant === "light" ? NAVY : WHITE;
  const jColor = variant === "light" ? BLUE : LIGHT_BLUE;
  const fontSize = size * 0.42;
  const jDrop = fontSize * 0.14;
  const radius = size * 0.22;

  return (
    <div
      aria-label="Aje"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: bg,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "inline-flex", alignItems: "baseline", lineHeight: 1 }}>
        <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize, fontWeight: 700, color: mainColor, letterSpacing: "-0.02em", lineHeight: 1, userSelect: "none" }}>A</span>
        <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: fontSize * 0.92, fontWeight: 400, color: jColor, letterSpacing: "-0.02em", lineHeight: 1, position: "relative", top: jDrop, userSelect: "none" }}>j</span>
        <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: fontSize * 0.82, fontWeight: 400, color: mainColor, letterSpacing: "-0.02em", lineHeight: 1, userSelect: "none" }}>e</span>
      </div>
    </div>
  );
};

export default AjeLogo;
