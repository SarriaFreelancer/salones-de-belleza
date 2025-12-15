import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/hooks/use-auth';
import { ServicesProvider } from '@/hooks/use-services';
import { StylistsProvider } from '@/hooks/use-stylists';
import { GalleryProvider } from '@/hooks/use-gallery';
import { FirebaseClientProvider } from '@/firebase';

export const metadata: Metadata = {
  title: 'Divas AyA',
  description: 'Gestión y agendamiento de citas en línea para el salón de belleza Divas AyA.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="!scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400..900;1,400..900&family=Belleza&display=swap" rel="stylesheet" />
      </head>
      <body className={cn('font-body antialiased', 'min-h-screen bg-background font-sans')}>
        <FirebaseClientProvider>
          <AuthProvider>
            <StylistsProvider>
              <ServicesProvider>
                <GalleryProvider>
                  {children}
                </GalleryProvider>
              </ServicesProvider>
            </StylistsProvider>
          </AuthProvider>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
