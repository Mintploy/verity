import { Nav } from '@/components/nav/Nav';
import { Hero } from '@/components/landing/Hero';
import { PressStrip } from '@/components/landing/PressStrip';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { WhatYouKnow } from '@/components/landing/WhatYouKnow';
import { Testimonial } from '@/components/landing/Testimonial';
import { FinalCTA } from '@/components/landing/FinalCTA';
import { Footer } from '@/components/landing/Footer';

export default function HomePage() {
  return (
    <main style={{ background: 'var(--ivory)', minHeight: '100vh' }}>
      <Nav showCompare />
      <Hero />
      <PressStrip />
      <HowItWorks />
      <WhatYouKnow />
      <Testimonial />
      <FinalCTA />
      <Footer />
    </main>
  );
}
