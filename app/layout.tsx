import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Verity — Private intelligence, for her',
  description: 'Know him before you meet him. Private background intelligence exclusively for women. Verified, quiet, and in seconds.',
  openGraph: {
    title: 'Verity — Private intelligence, for her',
    description: 'Know him before you meet him. Verified background reports, privately.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
