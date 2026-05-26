export function Wordmark({ size = 24, color = 'var(--plum)' }: { size?: number; color?: string }) {
  return (
    <span style={{
      fontFamily: 'var(--logo)',
      fontSize: size,
      color,
      letterSpacing: '0.06em',
      fontWeight: 400,
    }}>
      Verity
    </span>
  );
}
