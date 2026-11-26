'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { VISUAL_ASSETS } from '@/lib/visual-assets';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Loader2, Building2, Crown } from 'lucide-react';
import { Icons } from '@/components/icons';
import { GoogleRoleDialog } from '@/components/google-role-dialog';
import type { GoogleAuthOptions } from '@/hooks/use-auth';

const formSchema = z
  .object({
    userType: z.enum(['quinceanera', 'business']),
    name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
    email: z.string().email({ message: 'Por favor, introduce un correo válido.' }),
    phone: z.string().optional(),
    password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres.' }),
    confirmPassword: z.string().min(6, { message: 'Confirma tu contraseña.' }),
    businessName: z.string().optional(),
    businessCategory: z.string().optional(),
    location: z.string().optional(),
    cost: z.enum(['$', '$$', '$$$']).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  })
  .refine(
    (data) => {
      if (data.userType === 'business') {
        return (
          !!data.businessName?.trim() &&
          !!data.businessCategory?.trim() &&
          !!data.location?.trim()
        );
      }
      return true;
    },
    {
      message: 'Por favor, completa el nombre de la empresa, giro comercial y ubicación.',
      path: ['businessName'],
    }
  );

type SignUpInput = z.infer<typeof formSchema>;

export default function SignUpPage() {
  const { user, loading, signUp, loginWithGoogle } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleRoleOpen, setGoogleRoleOpen] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push('/academies');
    }
  }, [user, loading, router]);

  const form = useForm<SignUpInput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userType: 'quinceanera',
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      businessName: '',
      businessCategory: '',
      location: '',
      cost: '$$',
    },
  });

  const selectedUserType = form.watch('userType');

  async function onSubmit(values: SignUpInput) {
    setIsLoading(true);
    try {
      const result = await signUp({
        name: values.name,
        email: values.email,
        phone: values.phone,
        password: values.password,
        userType: values.userType,
        businessName: values.businessName,
        businessCategory: values.businessCategory,
        location: values.location,
        cost: values.cost,
      });

      if (result.success) {
        toast({
          title: '¡Registro exitoso!',
          description:
            values.userType === 'business'
              ? 'Tu empresa/academia ha sido registrada y publicada en el directorio de Mundo 15.'
              : 'Bienvenida a Mundo 15. Te hemos enviado un correo de verificación.',
        });
        router.push('/academies');
      } else {
        toast({
          variant: 'destructive',
          title: 'Error en el registro',
          description: result.error,
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error en el registro',
        description: 'Ocurrió un error inesperado. Por favor, intenta de nuevo.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignUpWithOptions(options: GoogleAuthOptions) {
    setIsGoogleLoading(true);
    try {
      const result = await loginWithGoogle(options);
      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Error con Google',
          description: result.error,
        });
      } else {
        setGoogleRoleOpen(false);
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error con Google',
        description: 'No se pudo completar el registro con Google.',
      });
    } finally {
      setIsGoogleLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <Image
        src={VISUAL_ASSETS.quinceHeroBallroom}
        alt="Salón elegante de Quinceañera con decoración floral"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#240d15]/82 via-[#1d0b12]/65 to-[#3d1624]/78" />
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 py-10">
        <Card className="w-full max-w-xl luxury-glass border-white/25 shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="inline-flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-primary font-semibold mb-1">
              <Crown className="h-3.5 w-3.5" />
              Mundo 15
            </div>
            <CardTitle className="font-headline text-3xl md:text-4xl tracking-tight">
              Crea tu Cuenta
            </CardTitle>
            <CardDescription className="pt-1">
              Únete como Quinceañera para planear tu fiesta o como Empresa para anunciarte.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-xl border border-border/80 p-3.5 bg-background/60 space-y-2.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                ¿Cómo deseas registrarte?
              </label>
              <FormField
                control={form.control}
                name="userType"
                render={({ field }) => (
                  <FormItem>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Button
                        type="button"
                        variant={field.value === 'quinceanera' ? 'default' : 'outline'}
                        className="flex items-center gap-2.5 min-h-[56px] h-auto py-2.5 justify-start px-4"
                        onClick={() => field.onChange('quinceanera')}
                      >
                        <Crown className="h-5 w-5 shrink-0" />
                        <div className="text-left">
                          <p className="font-semibold text-sm leading-tight">Quinceañera</p>
                          <p className="text-xs opacity-80">Planeador de mi fiesta</p>
                        </div>
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === 'business' ? 'default' : 'outline'}
                        className="flex items-center gap-2.5 min-h-[56px] h-auto py-2.5 justify-start px-4"
                        onClick={() => field.onChange('business')}
                      >
                        <Building2 className="h-5 w-5 shrink-0" />
                        <div className="text-left">
                          <p className="font-semibold text-sm leading-tight">Empresa / Academia</p>
                          <p className="text-xs opacity-80">Promocionar servicios</p>
                        </div>
                      </Button>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full min-h-[44px] bg-card hover:bg-muted/60 font-medium"
              onClick={() => setGoogleRoleOpen(true)}
              disabled={isLoading || isGoogleLoading}
            >
              {isGoogleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Icons.google className="mr-2 h-4 w-4" />
              )}
              Registrarse con Google
            </Button>

            <GoogleRoleDialog
              open={googleRoleOpen}
              onOpenChange={setGoogleRoleOpen}
              onSelect={handleGoogleSignUpWithOptions}
              isLoading={isGoogleLoading}
            />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/80" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                <span className="bg-card px-2.5 text-muted-foreground rounded">
                  O con correo electrónico
                </span>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {selectedUserType === 'business' && (
                  <div className="rounded-xl border border-primary/25 p-4 space-y-4 bg-secondary/25">
                    <h3 className="font-headline text-lg font-semibold text-primary">
                      Datos de tu Empresa o Academia
                    </h3>
                    <FormField
                      control={form.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre de la Empresa / Academia</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Coreografía & Danza Elite" className="min-h-[44px] bg-card" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="businessCategory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Giro Comercial / Estilos / Servicios</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ej: Vals, Salsa, Coreografías, Salón de Fiestas"
                              className="min-h-[44px] bg-card"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ubicación (Ciudad / Estado)</FormLabel>
                            <FormControl>
                              <Input placeholder="Ej: Ciudad de México" className="min-h-[44px] bg-card" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="cost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rango de Precios</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="min-h-[44px] bg-card">
                                  <SelectValue placeholder="Selecciona rango" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="$">$ (Asequible)</SelectItem>
                                <SelectItem value="$$">$$ (Intermedio)</SelectItem>
                                <SelectItem value="$$$">$$$ (Premium)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {selectedUserType === 'business'
                          ? 'Nombre del Representante'
                          : 'Nombre Completo'}
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Tu nombre" className="min-h-[44px] bg-background/80" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Correo Electrónico</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="tu@correo.com" className="min-h-[44px] bg-background/80" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono de Contacto</FormLabel>
                        <FormControl>
                          <Input placeholder="Opcional" className="min-h-[44px] bg-background/80" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contraseña</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Mínimo 6 caracteres" className="min-h-[44px] bg-background/80" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar Contraseña</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Repite tu contraseña" className="min-h-[44px] bg-background/80" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full min-h-[44px] font-semibold"
                  disabled={isLoading || isGoogleLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {selectedUserType === 'business' ? 'Registrar Empresa y Publicar' : 'Crear Cuenta'}
                </Button>
              </form>
            </Form>
            <p className="text-center text-sm text-muted-foreground">
              ¿Ya tienes una cuenta?{' '}
              <Link href="/login" className="font-semibold text-primary hover:underline">
                Inicia Sesión
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
