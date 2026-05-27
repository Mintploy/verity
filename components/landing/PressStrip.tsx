export function PressStrip() {
  const press = ['Vogue', 'The Cut', 'Refinery29', 'Goop', 'New York Times', 'Bustle'];
  return (
    <section style={{
      borderTop: '1px solid var(--gold-pale)', borderBottom: '1px solid var(--gold-pale)',
      padding: '24px 20px', background: 'var(--ivory-warm)',
      overflowX: 'auto',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 24, maxWidth: 1280, margin: '0 auto',
      }}>
        <span className="v-eyebrow">As featured in</span>
        {press.map((p) => (
          <span key={p} style={{
            fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--primary-deep)',
            opacity: 0.7, letterSpacing: 0.5,
          }}>{p}</span>
        ))}
      </div>
    </section>
  );
}
