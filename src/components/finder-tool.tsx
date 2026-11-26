'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { findMatchingAcademies } from '@/app/(authenticated)/academies/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';

const formSchema = z.object({
  danceStyles: z.string().min(2, {
    message: 'Por favor, introduce al menos un estilo de baile.',
  }),
  pricing: z.enum(['$', '$$', '$$$'], {
    required_error: 'Debes seleccionar un rango de precios.',
  }),
  location: z.string().min(2, {
    message: 'La ubicación debe tener al menos 2 caracteres.',
  }),
  popularity: z.enum(['Alta', 'Media', 'Nueva'], {
    required_error: 'Debes seleccionar un nivel de popularidad.',
  }),
});

type FinderToolProps = {
  onResults: (results: string[] | null) => void;
  onLoading: (loading: boolean) => void;
  hasFilteredResults: boolean;
};

export function FinderTool({ onResults, onLoading, hasFilteredResults }: FinderToolProps) {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      danceStyles: '',
      location: '',
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    onLoading(true);
    try {
      const result = await findMatchingAcademies(values);

      if (result.success) {
        onResults(result.data);
        if (result.data.length === 0) {
          toast({
            title: 'No se encontraron coincidencias',
            description: 'Intenta ajustar tus criterios de búsqueda.',
          });
        }
      } else {
        console.error('Error al buscar academias:', result.error);
        toast({
          variant: 'destructive',
          title: '¡Uy! Algo salió mal.',
          description: result.error ?? 'Ocurrió un error al buscar academias.',
        });
        onLoading(false);
      }
    } catch (error) {
      console.error('Error inesperado al buscar academias:', error);
      toast({
        variant: 'destructive',
        title: '¡Uy! Algo salió mal.',
        description: 'Ocurrió un error inesperado al buscar academias.',
      });
      onLoading(false);
    }
  }

  const handleClear = () => {
    form.reset();
    onResults(null);
  };

  return (
    <Card className="shadow-none border-none">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Encuentra tu Academia Perfecta</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 gap-6">
              <FormField
                control={form.control}
                name="danceStyles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estilos de Baile</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Vals, Salsa, Moderno" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ubicación</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Miami, FL" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-8">
                 <FormField
                  control={form.control}
                  name="pricing"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Rango de Precios</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex items-center space-x-6"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="$" />
                            </FormControl>
                            <FormLabel className="font-normal">$</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="$$" />
                            </FormControl>
                            <FormLabel className="font-normal">$$</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="$$$" />
                            </FormControl>
                            <FormLabel className="font-normal">$$$</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="popularity"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Popularidad</FormLabel>
                      <FormControl>
                         <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex items-center space-x-4"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Nueva" />
                            </FormControl>
                            <FormLabel className="font-normal">Nueva</FormLabel>
                          </FormItem>
                           <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Media" />
                            </FormControl>
                            <FormLabel className="font-normal">Media</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Alta" />
                            </FormControl>
                            <FormLabel className="font-normal">Alta</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            
            <div className="flex flex-col gap-4">
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Buscar Academias
                </Button>
                {hasFilteredResults && (
                    <Button type="button" variant="outline" onClick={handleClear}>
                        Limpiar Resultados
                    </Button>
                )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
