import { Floret } from '@/components/ui/Floret';

export function Testimonial() {
  return (
    <section className="v-section" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, var(--blush-pale) 0%, transparent 65%)', opacity: 0.55,
        pointerEvents: 'none',
      }} />
      <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <Floret size={32} color="var(--primary)" center="var(--ivory)" />
        </div>
        <blockquote className="v-display-md v-serif" style={{
          fontWeight: 400, color: 'var(--dark)', margin: 0, fontStyle: 'italic',
        }}>
          "He looked great on paper. Verity told me he'd been evicted twice and had filed for bankruptcy in 2019.
          I didn't go. I went out with my sister instead.{' '}
          <span style={{ fontStyle: 'normal', color: 'var(--primary)' }}>Best decision I've made all year.</span>"
        </blockquote>
        <div style={{ marginTop: 28, fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--gold-deep)', letterSpacing: 0.4 }}>
          ELENA M. · 24 · NEW YORK
        </div>
      </div>
    </section>
  );
}
