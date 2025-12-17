'use client';

import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Opcional: Registrar el error en un servicio de monitoreo
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
          <div className="mx-auto mb-8">
            <Logo />
          </div>
          <h1 className="font-headline text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            ¡Ups! Algo no salió como esperábamos.
          </h1>
          <p className="mt-4 max-w-lg text-lg text-muted-foreground">
            Parece que ha ocurrido un error inesperado en la aplicación. Nuestro equipo técnico ha sido notificado, pero puedes intentar recargar la página.
          </p>
          <Button
            size="lg"
            onClick={
              // Intenta recuperar el estado de la aplicación
              () => reset()
            }
            className="mt-8"
          >
            Intentar de Nuevo
          </Button>
        </div>
      </body>
    </html>
  );
}
