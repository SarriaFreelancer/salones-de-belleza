import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import { cn } from '@/lib/utils';
import { FirebaseClientProvider } from '@/firebase';
import { AuthProvider } from '@/hooks/use-auth';
import { Alegreya, Belleza } from 'next/font/google';

export const metadata: Metadata = {
  title: 'Divas A&A',
  description: 'Gestión y agendamiento de citas en línea para el salón de belleza Divas A&A.',
};

const fontBody = Alegreya({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
});

const fontHeadline = Belleza({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-headline',
  weight: '400',
});


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="!scroll-smooth">
      <body className={cn(fontBody.variable, fontHeadline.variable, 'font-body antialiased', 'min-h-screen bg-background font-sans')} suppressHydrationWarning>
        <FirebaseClientProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
