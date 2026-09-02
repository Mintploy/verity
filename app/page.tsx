import { Nav } from '@/components/nav/Nav';
import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { MarqueeColumns } from '@/components/landing/MarqueeColumns';
import { WhatYouKnow } from '@/components/landing/WhatYouKnow';
import { Testimonial } from '@/components/landing/Testimonial';
import { FinalCTA } from '@/components/landing/FinalCTA';
import { Footer } from '@/components/landing/Footer';

export default function HomePage() {
  return (
    <main style={{ background: 'var(--ivory)', minHeight: '100vh' }}>
      <Nav showCompare />
      <Hero />
      <HowItWorks />
      <MarqueeColumns />
      <WhatYouKnow />
      <Testimonial />
      <FinalCTA />
      <Footer />
    </main>
  );
}
