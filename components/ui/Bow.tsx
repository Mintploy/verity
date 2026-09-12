/**
 * A satin ribbon bow — the house mark, replacing the eight-petal floret.
 *
 * Deliberately drawn rather than an emoji or an icon-font glyph: it has to sit
 * next to Bodoni at 16px and at 80px without the strokes going muddy, and it
 * has to take a burgundy that matches a token exactly.
 *
 * Same props as the floret it replaces, so the call sites do not change:
 * `color` is the ribbon, `center` is the knot.
 */
export function Bow({
  size = 32,
  color = 'var(--primary)',
  center,
}: { size?: number; color?: string; center?: string }) {
  const knot = center ?? color;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {/* Tails first, so the loops and knot sit over them. */}
      <path
        d="M28 36 C24 44, 20 50, 14 57 C19 55, 23 52, 27 47 Z"
        fill={color}
        opacity={0.85}
      />
      <path
        d="M36 36 C40 44, 44 50, 50 57 C45 55, 41 52, 37 47 Z"
        fill={color}
        opacity={0.85}
      />

      {/* Left loop. */}
      <path
        d="M30 32 C22 22, 10 18, 6 24 C2 30, 10 38, 22 37 C26 36.5, 28.5 34.5, 30 32 Z"
        fill={color}
      />
      {/* Right loop, mirrored. */}
      <path
        d="M34 32 C42 22, 54 18, 58 24 C62 30, 54 38, 42 37 C38 36.5, 35.5 34.5, 34 32 Z"
        fill={color}
      />

      {/* Inner shadow on each loop, so the ribbon reads as folded, not flat. */}
      <path d="M30 32 C24 27, 16 24, 11 25 C17 27, 24 30, 30 32 Z" fill={knot} opacity={0.22} />
      <path d="M34 32 C40 27, 48 24, 53 25 C47 27, 40 30, 34 32 Z" fill={knot} opacity={0.22} />

      {/* Knot. */}
      <ellipse cx="32" cy="33" rx="5.2" ry="6.2" fill={knot} />
      <ellipse cx="32" cy="33" rx="5.2" ry="6.2" fill={color} opacity={0.35} />
    </svg>
  );
}
