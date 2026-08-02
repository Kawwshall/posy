// A little hand-built posy — six petals around a seed. Our one piece of
// iconography, drawn once, used everywhere instead of an emoji.
export function Mark({ className = "h-6 w-6", color = "#8E2C3F" }: { className?: string; color?: string }) {
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
          opacity="0.9"
          transform={`rotate(${deg} 16 16)`}
        />
      ))}
      <circle cx="16" cy="16" r="3.1" fill="#F4EEE1" />
      <circle cx="16" cy="16" r="1.6" fill={color} />
    </svg>
  );
}
