import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-background">
      <h1 className="font-headline text-4xl font-bold text-foreground">Página no encontrada</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        La ruta que buscas no existe o fue movida dentro de Mundo 15.
      </p>
      <Button asChild className="mt-6">
        <Link href="/academies">Ir al inicio</Link>
      </Button>
    </div>
  );
}
