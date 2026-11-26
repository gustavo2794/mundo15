'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <h2 className="font-headline text-2xl font-bold">Algo salió mal</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Ocurrió un error inesperado al cargar esta página.
      </p>
      <Button onClick={() => reset()} className="mt-4">
        Intentar de nuevo
      </Button>
    </div>
  );
}
