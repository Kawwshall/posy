// A little hand-built posy: six petals around a seed. Our one piece of
// iconography, drawn once and reused instead of an emoji. `bg` is the colour
// of the surface behind the mark so the centre negative space reads correctly
// on any background (paper, ink, claret, blush).
export function Mark({
  className = "h-6 w-6",
  color = "#8E2C3F",
  bg = "#F4EEE1",
}: {
  className?: string;
  color?: string;
  bg?: string;
}) {
  const petals = [0, 60, 120, 180, 240, 300];
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden>
      {petals.map((deg) => (
        <ellipse
          key={deg}
          cx="16"
          cy="9"
          rx="3.4"
          ry="6"
          fill={color}
          opacity="0.92"
          transform={`rotate(${deg} 16 16)`}
        />
      ))}
      <circle cx="16" cy="16" r="3.4" fill={bg} />
      <circle cx="16" cy="16" r="1.7" fill={color} />
    </svg>
  );
}

// A designed product thumbnail: a warm swatch tinted by category with a
// serif monogram. Replaces emoji thumbnails.
const TONES: Record<string, { bg: string; fg: string }> = {
  wellness: { bg: "#E7EFE7", fg: "#3C6E56" },
  fashion: { bg: "#F0DDCE", fg: "#8E2C3F" },
  food: { bg: "#F3E7D3", fg: "#9A6a2f" },
  tech: { bg: "#E3E2DA", fg: "#454036" },
  home: { bg: "#E7EFE7", fg: "#3C6E56" },
  stationery: { bg: "#EDE6D6", fg: "#6B6454" },
  fitness: { bg: "#E3E2DA", fg: "#454036" },
  personalized: { bg: "#F0DDCE", fg: "#8E2C3F" },
};

export function Swatch({
  title,
  category,
  className = "h-11 w-11 text-lg",
}: {
  title: string;
  category: string;
  className?: string;
}) {
  const t = TONES[category] || { bg: "#EDE6D6", fg: "#6B6454" };
  const letter = (title.trim()[0] || "P").toUpperCase();
  return (
    <div
      className={`grid shrink-0 place-items-center rounded-lg font-display ${className}`}
      style={{ background: t.bg, color: t.fg }}
    >
      {letter}
    </div>
  );
}
