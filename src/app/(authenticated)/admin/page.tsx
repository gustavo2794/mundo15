'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import type { Academy } from '@/lib/data';
import type { AdminRole, QuoteRequest, QuoteRequestStatus, UserProfile } from '@/lib/types';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  createAcademy,
  deleteAcademy,
  deleteQuoteRequest,
  grantAdminRole,
  listAdmins,
  listAllUsers,
  listQuoteRequests,
  revokeAdminRole,
  seedInitialAcademies,
  subscribeAcademies,
  updateAcademy,
  updateQuoteRequestStatus,
} from '@/lib/firestore-service';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  ArrowDown,
  ArrowUp,
  Database,
  Edit,
  Eye,
  EyeOff,
  Loader2,
  PlusCircle,
  Shield,
  ShieldOff,
  Trash2,
} from 'lucide-react';

const academySchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.').max(120),
  description: z.string().min(10, 'La descripción corta debe tener al menos 10 caracteres.').max(400),
  longDescription: z.string().min(20, 'La descripción larga debe tener al menos 20 caracteres.').max(4000),
  cost: z.enum(['$', '$$', '$$$']),
  location: z.string().min(3, 'La ubicación es requerida.').max(200),
  locationLink: z.string().url('Debe ser una URL válida.').optional().or(z.literal('')),
  popularity: z.enum(['Nueva', 'Media', 'Alta']),
  danceStyles: z.string().min(3, 'Menciona al menos un estilo de baile.'),
  phone: z.string().min(7, 'El teléfono debe tener al menos 7 dígitos.').max(30),
  email: z.string().email('El correo no es válido.').max(200),
  website: z.string().min(4, 'El sitio web es requerido.').max(300),
  logoImageId: z.string().min(1),
});

type AcademyFormValues = z.infer<typeof academySchema>;

export default function AdminPage() {
  const { toast } = useToast();
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  const [isCreating, setIsCreating] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [academiesList, setAcademiesList] = useState<Academy[]>([]);
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [adminsList, setAdminsList] = useState<AdminRole[]>([]);
  const [loadingAdminData, setLoadingAdminData] = useState(true);

  const form = useForm<AcademyFormValues>({
    resolver: zodResolver(academySchema),
    defaultValues: {
      name: '',
      description: '',
      longDescription: '',
      cost: '$$',
      popularity: 'Media',
      location: '',
      locationLink: '',
      danceStyles: '',
      phone: '',
      email: '',
      website: '',
      logoImageId: 'academy-logo-1',
    },
  });

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/academies');
    }
  }, [loading, isAdmin, router]);

  const loadAdminCollections = useCallback(async () => {
    if (!user || !isAdmin) return;
    setLoadingAdminData(true);
    try {
      const [fetchedQuotes, fetchedUsers, fetchedAdmins] = await Promise.all([
        listQuoteRequests(true, user.uid),
        listAllUsers(),
        listAdmins(),
      ]);
      setQuotes(fetchedQuotes);
      setUsersList(fetchedUsers);
      setAdminsList(fetchedAdmins);
    } catch (error) {
      console.error('Error al cargar datos del panel de administrador:', error);
      toast({
        variant: 'destructive',
        title: 'Error de carga',
        description: 'No se pudieron cargar algunos datos del panel de administrador.',
      });
    } finally {
      setLoadingAdminData(false);
    }
  }, [user, isAdmin, toast]);

  useEffect(() => {
    if (!user || !isAdmin) return;
    const unsubscribe = subscribeAcademies(
      true,
      (list) => setAcademiesList(list),
      (err) => {
        console.error('Error al escuchar academias en admin:', err);
      }
    );
    loadAdminCollections();
    return () => unsubscribe();
  }, [user, isAdmin, loadAdminCollections]);

  if (loading || !isAdmin || !user) {
    return null;
  }

  async function onSubmit(values: AcademyFormValues) {
    if (!user) return;
    setIsCreating(true);
    try {
      const styles = values.danceStyles
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await createAcademy(
        {
          name: values.name,
          description: values.description,
          longDescription: values.longDescription,
          cost: values.cost,
          location: values.location,
          locationLink: values.locationLink || undefined,
          popularity: values.popularity,
          danceStyles: styles,
          phone: values.phone,
          email: values.email,
          website: values.website,
          logoImageId: values.logoImageId,
          galleryImageIds: ['gallery-1-1', 'gallery-1-2', 'gallery-1-3'],
          isPublished: true,
          displayOrder: academiesList.length,
        },
        user.uid
      );

      toast({
        title: 'Academia creada',
        description: `"${values.name}" ya está publicada en el directorio.`,
      });

      form.reset();
    } catch (error) {
      console.error('Error al guardar la academia:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo guardar la academia en la base de datos.',
      });
    } finally {
      setIsCreating(false);
    }
  }

  const handleSeedInitial = async () => {
    setIsSeeding(true);
    try {
      const count = await seedInitialAcademies(user.uid);
      toast({
        title: 'Catálogo sincronizado',
        description:
          count > 0
            ? `Se cargaron ${count} academias iniciales en Firestore.`
            : 'Todas las academias iniciales ya estaban cargadas.',
      });
    } catch (error) {
      console.error('Error al sincronizar academias iniciales:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar las academias iniciales.',
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleTogglePublished = async (academy: Academy) => {
    try {
      await updateAcademy(academy.id, { isPublished: !(academy.isPublished ?? true) });
      toast({
        title: academy.isPublished === false ? 'Academia publicada' : 'Academia ocultada',
      });
    } catch (error) {
      console.error('Error al cambiar visibilidad:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar la visibilidad.',
      });
    }
  };

  const handleMoveOrder = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= academiesList.length) return;

    const current = academiesList[index];
    const swapWith = academiesList[targetIndex];
    try {
      await Promise.all([
        updateAcademy(current.id, { displayOrder: targetIndex }),
        updateAcademy(swapWith.id, { displayOrder: index }),
      ]);
    } catch (error) {
      console.error('Error al reordenar academias:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo cambiar el orden.',
      });
    }
  };

  const handleDeleteAcademy = async (academy: Academy) => {
    try {
      await deleteAcademy(academy.id);
      toast({
        title: 'Academia eliminada',
        description: `"${academy.name}" fue eliminada del directorio.`,
      });
    } catch (error) {
      console.error('Error al eliminar academia:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo eliminar la academia.',
      });
    }
  };

  const handleQuoteStatusChange = async (quoteId: string, status: QuoteRequestStatus) => {
    try {
      await updateQuoteRequestStatus(quoteId, status);
      setQuotes((prev) => prev.map((q) => (q.id === quoteId ? { ...q, status } : q)));
      toast({ title: 'Estado actualizado' });
    } catch (error) {
      console.error('Error al actualizar estado de cotización:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar el estado.',
      });
    }
  };

  const handleDeleteQuote = async (quoteId: string) => {
    try {
      await deleteQuoteRequest(quoteId);
      setQuotes((prev) => prev.filter((q) => q.id !== quoteId));
      toast({ title: 'Cotización eliminada' });
    } catch (error) {
      console.error('Error al eliminar cotización:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo eliminar la cotización.',
      });
    }
  };

  const adminUidSet = new Set(adminsList.map((a) => a.uid));

  const handleToggleAdmin = async (targetUser: UserProfile) => {
    if (targetUser.email.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL) {
      toast({
        title: 'Administrador principal',
        description: 'La cuenta principal siempre conserva permisos de administrador.',
      });
      return;
    }
    const currentlyAdmin = adminUidSet.has(targetUser.uid);
    try {
      if (currentlyAdmin) {
        await revokeAdminRole(targetUser.uid);
        setAdminsList((prev) => prev.filter((a) => a.uid !== targetUser.uid));
        toast({ title: 'Permisos de admin revocados' });
      } else {
        await grantAdminRole(targetUser.uid, targetUser.email, user.uid);
        setAdminsList((prev) => [
          ...prev,
          { uid: targetUser.uid, email: targetUser.email, grantedBy: user.uid },
        ]);
        toast({ title: 'Permisos de admin otorgados' });
      }
    } catch (error) {
      console.error('Error al actualizar rol de administrador:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar el rol del usuario.',
      });
    }
  };

  return (
    <div className="flex-1 bg-muted/20">
      <div className="container mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-headline text-3xl md:text-4xl font-bold">
              Panel de Administrador
            </h1>
            <p className="text-muted-foreground">
              Organiza academias, revisa cotizaciones y administra usuarios.
            </p>
          </div>
          <Button variant="outline" onClick={handleSeedInitial} disabled={isSeeding}>
            {isSeeding ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Database className="mr-2 h-4 w-4" />
            )}
            Cargar Academias Iniciales
          </Button>
        </div>

        <Tabs defaultValue="organize">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="organize">Academias ({academiesList.length})</TabsTrigger>
            <TabsTrigger value="create">Nueva Academia</TabsTrigger>
            <TabsTrigger value="quotes">Cotizaciones ({quotes.length})</TabsTrigger>
            <TabsTrigger value="users">Usuarios ({usersList.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="organize" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Organizar Academias</CardTitle>
                <CardDescription>
                  Cambia el orden de aparición, oculta/publica o edita cualquier academia.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {academiesList.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    Aún no hay academias en Firestore. Usa el botón &quot;Cargar Academias Iniciales&quot; o crea una nueva.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {academiesList.map((academy, index) => (
                      <div
                        key={academy.id}
                        className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">{academy.name}</span>
                            <Badge variant="outline">{academy.cost}</Badge>
                            <Badge variant="secondary">{academy.popularity}</Badge>
                            {academy.isPublished === false && (
                              <Badge variant="destructive">Oculta</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{academy.location}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleMoveOrder(index, -1)}
                            disabled={index === 0}
                            title="Subir orden"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleMoveOrder(index, 1)}
                            disabled={index === academiesList.length - 1}
                            title="Bajar orden"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleTogglePublished(academy)}
                            title={academy.isPublished === false ? 'Publicar' : 'Ocultar'}
                          >
                            {academy.isPublished === false ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </Button>
                          <Button variant="outline" size="icon" asChild title="Editar">
                            <Link href={`/admin/academies/${academy.id}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDeleteAcademy(academy)}
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Añadir Nueva Academia</CardTitle>
                <CardDescription>
                  Publica una nueva academia en el directorio de Mundo 15.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre de la Academia</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Academia de Baile Fusión" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descripción Corta</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Una descripción breve para la tarjeta de la academia."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="longDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descripción Larga</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Una descripción detallada para la página de la academia."
                              rows={4}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="cost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rango de Precios</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona un rango" />
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
                      <FormField
                        control={form.control}
                        name="popularity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Popularidad</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona la popularidad" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Nueva">Nueva</SelectItem>
                                <SelectItem value="Media">Media</SelectItem>
                                <SelectItem value="Alta">Alta</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="logoImageId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Imagen de Portada</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona portada" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="academy-logo-1">Estudio Latino</SelectItem>
                                <SelectItem value="academy-logo-2">Danza Elegante</SelectItem>
                                <SelectItem value="academy-logo-3">Vals Clásico</SelectItem>
                                <SelectItem value="academy-logo-4">Folklórico</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="danceStyles"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estilos de Baile (separados por comas)</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Vals, Cumbia, Hip Hop" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 gap-4 rounded-md border p-4 md:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Teléfono</FormLabel>
                            <FormControl>
                              <Input type="tel" placeholder="5512345678" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Correo Electrónico</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="contacto@academia.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sitio Web o Red Social</FormLabel>
                            <FormControl>
                              <Input placeholder="www.academia.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 rounded-md border p-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dirección o Ciudad</FormLabel>
                            <FormControl>
                              <Input placeholder="Ej: Ecatepec de Morelos, MEX" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="locationLink"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Enlace de Google Maps (Opcional)</FormLabel>
                            <FormControl>
                              <Input placeholder="https://maps.app.goo.gl/..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={isCreating}>
                      {isCreating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <PlusCircle className="mr-2 h-4 w-4" />
                      )}
                      Añadir Academia
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quotes" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-headline text-2xl">
                  Solicitudes de Cotización
                </CardTitle>
                <CardDescription>
                  Da seguimiento a las consultas enviadas por los usuarios.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAdminData ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : quotes.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    No hay solicitudes de cotización registradas todavía.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {quotes.map((q) => (
                      <div
                        key={q.id}
                        className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">{q.academyName}</span>
                            <span className="text-xs text-muted-foreground">
                              por {q.userName} ({q.userEmail})
                            </span>
                          </div>
                          {q.eventDate && (
                            <p className="text-xs text-muted-foreground">
                              Fecha del evento: {q.eventDate}
                            </p>
                          )}
                          <p className="text-sm">{q.message}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={q.status}
                            onValueChange={(val) =>
                              handleQuoteStatusChange(q.id, val as QuoteRequestStatus)
                            }
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pendiente</SelectItem>
                              <SelectItem value="contacted">Contactado</SelectItem>
                              <SelectItem value="archived">Archivado</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDeleteQuote(q.id)}
                            title="Eliminar cotización"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-headline text-2xl">
                  Usuarios y Administradores
                </CardTitle>
                <CardDescription>
                  Consulta usuarios registrados y otorga o revoca permisos de administrador.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAdminData ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : usersList.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    Aún no hay usuarios registrados con correo verificado en Firestore.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {usersList.map((u) => {
                      const isPrimary = u.email.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL;
                      const hasRole = isPrimary || adminUidSet.has(u.uid);
                      return (
                        <div
                          key={u.uid}
                          className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{u.displayName}</span>
                              {hasRole && (
                                <Badge variant="default">
                                  {isPrimary ? 'Admin Principal' : 'Admin'}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {u.email}
                              {u.phone ? ` · ${u.phone}` : ''}
                            </p>
                          </div>
                          {!isPrimary && (
                            <Button
                              variant={hasRole ? 'outline' : 'secondary'}
                              size="sm"
                              onClick={() => handleToggleAdmin(u)}
                            >
                              {hasRole ? (
                                <>
                                  <ShieldOff className="mr-2 h-4 w-4" />
                                  Quitar Admin
                                </>
                              ) : (
                                <>
                                  <Shield className="mr-2 h-4 w-4" />
                                  Hacer Admin
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
