import { Wordmark } from '@/components/ui/Wordmark';
import Link from 'next/link';

export function Footer() {
  const links: [string, [string, string][]][] = [
    ['Product', [
      ['How it works', '/#how-it-works'],
      ["What you'll know", '/#what-youll-know'],
      ['Pricing', '/verify'],
      ['For brands', '/help#brands'],
    ]],
    ['Trust', [
      ['ID verification', '/#how-it-works'],
      ['Privacy promise', '/privacy'],
      ['How we score', '/help#scoring'],
      ['Sources', '/help#sources'],
    ]],
    ['Help', [
      ['Get in touch', '/help'],
      ['Story library', '/stories'],
      ['Press', '/help#press'],
    ]],
    ['Legal', [
      ['Privacy policy', '/privacy'],
      ['Terms', '/terms'],
      ['FCRA notice', '/fcra'],
      ['Do not sell', '/privacy#do-not-sell'],
    ]],
  ];

  return (
    <footer style={{ padding: '60px 20px 40px', background: 'var(--ivory-warm)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 40, marginBottom: 48 }}>
          <div>
            <Wordmark size={28} color="var(--primary-deep)" />
            <p style={{
              fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 16,
              color: 'var(--dark-soft)', margin: '20px 0 0', lineHeight: 1.5, maxWidth: 280,
            }}>
              Quietly built for the woman who's done taking unnecessary risks.
            </p>
          </div>
          {links.map(([title, items]) => (
            <div key={title}>
              <div className="v-eyebrow" style={{ marginBottom: 16 }}>{title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {items.map(([label, href]) => (
                  <Link key={label} href={href} style={{
                    fontFamily: 'var(--sans)', fontSize: 13.5, color: 'var(--dark-soft)',
                    textDecoration: 'none',
                  }}>{label}</Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          padding: '24px 0', borderTop: '1px solid var(--gold-pale)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 16,
        }}>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--gold-deep)', letterSpacing: 0.3 }}>
            © 2026 Mintploy, Inc. · Made quietly in Los Angeles · For women only
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 16px', background: 'var(--sage-pale)', borderRadius: 'var(--r-pill)',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--sage-deep)' }} />
            <span style={{ fontFamily: 'var(--sans)', fontSize: 11.5, color: 'var(--sage-deep)', fontWeight: 500, letterSpacing: 0.3 }}>
              ID-verified female access · powered by Stripe
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
