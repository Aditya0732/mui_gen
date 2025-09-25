import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeRegistry } from '@/components/ThemeRegistry';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'MUI Component Generator',
  description: 'AI-powered React component generator with Material-UI',
  keywords: ['React', 'Material-UI', 'Component Generator', 'AI', 'TypeScript'],
  authors: [{ name: 'MUI Gen Team' }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <body className={inter.variable}>
        <ThemeRegistry>
          <ErrorBoundary>{children}</ErrorBoundary>
        </ThemeRegistry>
      </body>
    </html>
  );
}
