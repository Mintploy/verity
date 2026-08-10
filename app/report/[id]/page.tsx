<Section id="sec-3" eyebrow="03" title="Address history">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px 32px' }}>
          {report.addresses.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 0', borderTop: i >= 2 ? '1px solid var(--gold-pale)' : 'none' }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%', marginTop: 8, flexShrink: 0,
                background: a.flag ? 'var(--deeprose)' : a.current ? 'var(--rose)' : 'var(--mauve)',
                boxShadow: a.current ? '0 0 0 3px var(--blush-pale)' : 'none',
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 500, color: 'var(--mauve-deep)', letterSpacing: 0.3 }}>{a.years}</span>
                  {a.current && <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--gold)' }}>· current</span>}
                </div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--dark)', lineHeight: 1.2 }}>{a.addr}</div>
                <div style={{ fontFamily: 'var(--sans)', fontSize: 12.5, color: a.flag ? 'var(--deeprose-deep)' : 'var(--dark-soft)', marginTop: 4, fontWeight: a.flag ? 500 : 300 }}>{a.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Property Intelligence */}
      {report.propertyIntelligence && report.propertyIntelligence.length > 0 && (
        <Section id="sec-3b" eyebrow="03b" title="Property intelligence">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {report.propertyIntelligence.map((prop, i) => (
              <div key={i} style={{
                padding: '20px 24px',
