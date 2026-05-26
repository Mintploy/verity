export function PressStrip() {
  const press = ['Vogue', 'The Cut', 'Refinery29', 'Goop', 'New York Times', 'Bustle'];
  return (
    <section style={{
      borderTop: '1px solid var(--ivory-deep)', borderBottom: '1px solid var(--ivory-deep)',
      padding: '24px 56px', background: 'var(--ivory-warm)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 40, maxWidth: 1280, margin: '0 auto',
      }}>
        <span className="v-eyebrow" style={{ color: 'var(--plum-soft)' }}>As featured in</span>
        {press.map((p) => (
          <span key={p} style={{
            fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--plum)',
            opacity: 0.7, letterSpacing: 0.5,
          }}>{p}</span>
        ))}
      </div>
    </section>
  );
}
