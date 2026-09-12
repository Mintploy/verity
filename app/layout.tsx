import type { Metadata } from 'next';
import { Bodoni_Moda, Cormorant_Garamond, Outfit, Pinyon_Script } from 'next/font/google';
import { SmoothScroll } from '@/components/SmoothScroll';
import './globals.css';

// The @import in globals.css never loaded: Next does not inline a remote CSS
// @import, so every face silently fell back to the platform serif and none of
// the brand type had ever actually rendered. next/font self-hosts the files
// and exposes each as a CSS variable that globals.css consumes.
const display = Bodoni_Moda({
  subsets: ['latin'], style: ['normal', 'italic'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-display', display: 'swap',
});
const serif = Cormorant_Garamond({
  subsets: ['latin'], style: ['normal', 'italic'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-serif', display: 'swap',
});
const sans = Outfit({
  subsets: ['latin'], weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans', display: 'swap',
});
const script = Pinyon_Script({
  subsets: ['latin'], weight: '400',
  variable: '--font-script', display: 'swap',
});

export const metadata: Metadata = {
  title: 'Verity, Private intelligence, for her',
  description: 'Know him before you meet him. Private background intelligence exclusively for women. Verified, quiet, and in seconds.',
  openGraph: {
    title: 'Verity, Private intelligence, for her',
    description: 'Know him before you meet him. Verified background reports, privately.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${serif.variable} ${sans.variable} ${script.variable}`}>
      <body style={{ margin: 0, padding: 0 }}>
        <SmoothScroll>
          {children}
        </SmoothScroll>
      </body>
    </html>
  );
}
