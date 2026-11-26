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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { VISUAL_ASSETS } from '@/lib/visual-assets';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Loader2, MailCheck, Crown, Sparkles, MapPin, Camera } from 'lucide-react';
import { Icons } from '@/components/icons';
import { GoogleRoleDialog } from '@/components/google-role-dialog';
import type { LoginFormValues } from '@/lib/types';

const formSchema = z.object({
  email: z.string().email({ message: 'Por favor, introduce un correo electrónico válido.' }),
  password: z.string().min(1, { message: 'La contraseña no puede estar vacía.' }),
});

const resetSchema = z.object({
  email: z.string().email({ message: 'Introduce un correo electrónico válido.' }),
});

export default function LoginPage() {
  const { user, loading, login, loginWithGoogle, sendPasswordReset } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [googleRoleOpen, setGoogleRoleOpen] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push('/academies');
    }
  }, [user, loading, router]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const resetForm = useForm<{ email: string }>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true);
    try {
      const result = await login(values);
      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Error al iniciar sesión',
          description: result.error,
        });
      } else {
        router.push('/academies');
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error al iniciar sesión',
        description: 'Ocurrió un error inesperado. Por favor, intenta de nuevo.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleLoginWithOptions(options: import('@/hooks/use-auth').GoogleAuthOptions) {
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
        description: 'No se pudo completar el inicio de sesión con Google.',
      });
    } finally {
      setIsGoogleLoading(false);
    }
  }

  async function onResetSubmit(values: { email: string }) {
    setIsResetLoading(true);
    try {
      const result = await sendPasswordReset(values.email);
      if (result.success) {
        setResetSent(true);
        toast({
          title: 'Correo enviado',
          description: 'Revisa tu bandeja de entrada o spam para restablecer tu contraseña.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'No se pudo enviar el correo',
          description: result.error,
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Ocurrió un error inesperado al enviar el correo.',
      });
    } finally {
      setIsResetLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <Image
        src={VISUAL_ASSETS.quinceHeroBallroom}
        alt="Salón de gala para Quinceañeras con flores y candelabros"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#240d15]/82 via-[#1d0b12]/65 to-[#3d1624]/78" />

      <div className="relative z-10 container mx-auto flex min-h-screen flex-col lg:flex-row items-center justify-center lg:justify-between gap-10 px-4 py-10 md:px-8">
        {/* Editorial Intro (desktop & tablet prominence) */}
        <div className="max-w-xl text-center lg:text-left text-white space-y-5">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-amber-200/90 font-semibold">
            <Crown className="h-4 w-4 text-amber-300" />
            Mundo 15 · Portal &amp; Atelier
          </div>
          <h1 className="font-headline text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.08] text-balance">
            El escenario perfecto para tus XV años
          </h1>
          <p className="text-sm sm:text-base text-rose-100/85 leading-relaxed max-w-lg mx-auto lg:mx-0">
            Organiza cada detalle de tu fiesta en un planeador elegante y descubre academias de baile, salones y proveedores cerca de tu ciudad.
          </p>
          <div className="hidden sm:grid grid-cols-3 gap-4 pt-3 text-left text-xs text-rose-100/80 border-t border-white/15">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-300 shrink-0" />
              <span>Planeador integral de XV</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-amber-300 shrink-0" />
              <span>Empresas cerca de ti</span>
            </div>
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-amber-300 shrink-0" />
              <span>Portafolio foto &amp; video</span>
            </div>
          </div>
        </div>

        {/* Auth Card */}
        <Card className="w-full max-w-md luxury-glass border-white/25 shadow-2xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="font-headline text-3xl tracking-tight text-foreground">
              Bienvenida de Nuevo
            </CardTitle>
            <CardDescription className="pt-1 text-muted-foreground">
              Elige si ingresas como Quinceañera o Empresa al entrar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
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
              Continuar con Google
            </Button>

            <GoogleRoleDialog
              open={googleRoleOpen}
              onOpenChange={setGoogleRoleOpen}
              onSelect={handleGoogleLoginWithOptions}
              isLoading={isGoogleLoading}
            />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/80" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                <span className="bg-card px-2.5 text-muted-foreground rounded">
                  O con tu correo
                </span>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Contraseña</FormLabel>
                        <Dialog
                          open={resetOpen}
                          onOpenChange={(open) => {
                            setResetOpen(open);
                            if (open) {
                              setResetSent(false);
                              const typedEmail = form.getValues('email');
                              if (typedEmail) {
                                resetForm.setValue('email', typedEmail);
                              }
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <button
                              type="button"
                              className="text-xs font-medium text-primary hover:underline py-1"
                            >
                              ¿Olvidaste tu contraseña?
                            </button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle className="font-headline text-2xl">
                                Recuperar Contraseña
                              </DialogTitle>
                              <DialogDescription>
                                Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                              </DialogDescription>
                            </DialogHeader>
                            {resetSent ? (
                              <div className="flex flex-col items-center space-y-3 py-4 text-center">
                                <MailCheck className="h-10 w-10 text-primary" />
                                <p className="text-sm font-medium">
                                  ¡Listo! Enviamos las instrucciones a tu correo.
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Si no lo ves en unos minutos, revisa tu carpeta de spam.
                                </p>
                                <Button
                                  type="button"
                                  onClick={() => setResetOpen(false)}
                                  className="mt-2 min-h-[44px]"
                                >
                                  Volver al inicio de sesión
                                </Button>
                              </div>
                            ) : (
                              <Form {...resetForm}>
                                <form
                                  onSubmit={resetForm.handleSubmit(onResetSubmit)}
                                  className="space-y-4"
                                >
                                  <FormField
                                    control={resetForm.control}
                                    name="email"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Correo Electrónico</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="email"
                                            placeholder="tu@correo.com"
                                            className="min-h-[44px]"
                                            {...field}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <Button
                                    type="submit"
                                    className="w-full min-h-[44px]"
                                    disabled={isResetLoading}
                                  >
                                    {isResetLoading && (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    Enviar enlace de recuperación
                                  </Button>
                                </form>
                              </Form>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" className="min-h-[44px] bg-background/80" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full min-h-[44px] font-semibold"
                  disabled={isLoading || isGoogleLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Iniciar Sesión
                </Button>
              </form>
            </Form>
            <p className="text-center text-sm text-muted-foreground">
              ¿No tienes una cuenta?{' '}
              <Link href="/signup" className="font-semibold text-primary hover:underline">
                Regístrate aquí
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
