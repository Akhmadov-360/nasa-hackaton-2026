import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource-variable/martian-mono';
import 'sileo/styles.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Astronaut Health Monitor',
  description: 'Mission Control dashboard for crew health during space missions (NASA Space Apps Challenge, Tashkent).',
};

export const viewport: Viewport = { themeColor: '#0B1220', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
