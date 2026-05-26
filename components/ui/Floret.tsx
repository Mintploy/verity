export function Floret({ size = 32, color = 'var(--rose)', center = 'var(--ivory)' }: { size?: number; color?: string; center?: string }) {
  const r = size / 2;
  const petalR = size * 0.28;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const cx = r + Math.cos(rad) * r * 0.38;
        const cy = r + Math.sin(rad) * r * 0.38;
        return <ellipse key={i} cx={cx} cy={cy} rx={petalR * 0.55} ry={petalR} transform={`rotate(${deg}, ${cx}, ${cy})`} fill={color} opacity={0.7} />;
      })}
      <circle cx={r} cy={r} r={r * 0.22} fill={center} />
    </svg>
  );
}
