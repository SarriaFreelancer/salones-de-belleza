import { Logo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';
import Link from 'next/link';

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
        <Link
            href="/book"
            className="flex items-center gap-2 font-semibold"
          >
            <Logo />
            <div className="flex flex-col">
              <h2 className="font-headline text-lg font-semibold leading-tight tracking-tight">
                Divas AyA
              </h2>
              <p className="text-xs text-muted-foreground">Reservas en Línea</p>
            </div>
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard">
                <User className="mr-2 h-4 w-4" />
                Admin
            </Link>
          </Button>
      </header>
      <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
        <div className="mx-auto w-full max-w-2xl">
          {children}
        </div>
      </main>
    </div>
  );
}
