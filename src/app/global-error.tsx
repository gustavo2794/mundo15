'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html lang="es">
      <body className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold">Algo salió mal</h2>
        <p className="mt-2 text-sm text-gray-600">
          Ocurrió un error inesperado en la aplicación.
        </p>
        <button
          onClick={() => reset()}
          className="mt-4 rounded-md bg-black px-4 py-2 text-sm text-white"
        >
          Intentar de nuevo
        </button>
      </body>
    </html>
  );
}
