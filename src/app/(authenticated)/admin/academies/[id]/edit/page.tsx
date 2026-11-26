'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter, useParams } from 'next/navigation';
import { academies as defaultAcademies, type Academy } from '@/lib/data';
import {
  createAcademy,
  getAcademyFromFirestore,
  updateAcademy,
} from '@/lib/firestore-service';
import type { MediaAsset } from '@/lib/types';
import { CoverImageUploader, MediaManager } from '@/components/media-manager';
import { PlaceHolderImages } from '@/lib/placeholder-images';

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
  isPublished: z.boolean(),
});

type AcademyFormValues = z.infer<typeof academySchema>;

export default function EditAcademyPage() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [loadingAcademy, setLoadingAcademy] = useState(true);
  const [academyToEdit, setAcademyToEdit] = useState<Academy | null>(null);
  const [existsInFirestore, setExistsInFirestore] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [galleryMedia, setGalleryMedia] = useState<MediaAsset[]>([]);

  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const academyId = params.id as string;

  const form = useForm<AcademyFormValues>({
    resolver: zodResolver(academySchema),
    defaultValues: {
      name: '',
      description: '',
      longDescription: '',
      cost: '$$',
      location: '',
      locationLink: '',
      popularity: 'Media',
      danceStyles: '',
      phone: '',
      email: '',
      website: '',
      logoImageId: 'academy-logo-1',
      isPublished: true,
    },
  });

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/academies');
    }
  }, [loading, isAdmin, router]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoadingAcademy(true);
      try {
        const fsAcademy = await getAcademyFromFirestore(academyId);
        if (!active) return;
        const found = fsAcademy ?? defaultAcademies.find((a) => a.id === academyId) ?? null;
        setExistsInFirestore(!!fsAcademy);
        setAcademyToEdit(found);
        if (found) {
          setCoverImageUrl(found.coverImageUrl || '');
          setGalleryMedia(found.galleryMedia || []);
          form.reset({
            name: found.name,
            description: found.description,
            longDescription: found.longDescription,
            cost: found.cost,
            location: found.location,
            locationLink: found.locationLink || '',
            popularity: found.popularity,
            danceStyles: found.danceStyles.join(', '),
            phone: found.contact.phone,
            email: found.contact.email,
            website: found.contact.website,
            logoImageId: found.logoImageId || 'academy-logo-1',
            isPublished: found.isPublished ?? true,
          });
        }
      } catch (error) {
        console.error('Error al cargar academia para editar:', error);
      } finally {
        if (active) setLoadingAcademy(false);
      }
    }
    if (academyId && isAdmin) {
      load();
    }
    return () => {
      active = false;
    };
  }, [academyId, isAdmin, form]);

  if (loading || !isAdmin || !user) {
    return null;
  }

  if (loadingAcademy) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!academyToEdit) {
    return (
      <div className="flex-1 bg-muted/20">
        <div className="container mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
          <Card>
            <CardHeader>
              <CardTitle>Academia no encontrada</CardTitle>
              <CardDescription>La academia que intentas editar no existe.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  async function onSubmit(values: AcademyFormValues) {
    if (!user || !academyToEdit) return;
    setIsSaving(true);
    try {
      const styles = values.danceStyles
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      if (existsInFirestore) {
        await updateAcademy(academyId, {
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
          coverImageUrl,
          galleryMedia,
          isPublished: values.isPublished,
        });
      } else {
        await createAcademy(
          {
            id: academyId,
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
            coverImageUrl: coverImageUrl || undefined,
            galleryImageIds: academyToEdit.galleryImageIds,
            galleryMedia,
            isPublished: values.isPublished,
            displayOrder: academyToEdit.displayOrder ?? 0,
          },
          user.uid
        );
      }

      toast({
        title: 'Academia actualizada',
        description: `Los cambios de "${values.name}" se guardaron en Firestore.`,
      });

      router.push(`/academies/${academyId}`);
    } catch (error) {
      console.error('Error al actualizar la academia:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Ocurrió un error al guardar los cambios de la academia.',
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex-1 bg-muted/20">
      <div className="container mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-3xl">Editar Academia</CardTitle>
            <CardDescription>
              Modifica los detalles de &quot;{academyToEdit.name}&quot;.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                  control={form.control}
                  name="isPublished"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <FormLabel className="text-base">Publicada en el directorio</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Si la desactivas, solo los administradores podrán verla.
                        </p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la Academia</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Textarea {...field} />
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
                        <Textarea rows={5} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
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
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4 rounded-md border p-4">
                  <h3 className="font-medium">Información de Contacto</h3>
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input type="tel" {...field} />
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
                          <Input type="email" {...field} />
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
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="space-y-4 rounded-md border p-4">
                  <h3 className="font-medium">Ubicación</h3>
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dirección o Ciudad</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-6 rounded-md border p-4">
                  <h3 className="font-medium">Portada y Galería Multimedia (Fotos y Videos)</h3>
                  <CoverImageUploader
                    currentUrl={coverImageUrl}
                    fallbackUrl={
                      PlaceHolderImages.find(
                        (p) => p.id === (form.watch('logoImageId') || 'academy-logo-1')
                      )?.imageUrl
                    }
                    folderPath={`academies/${academyId}/cover`}
                    onUploaded={(url) => setCoverImageUrl(url)}
                  />
                  <div className="border-t pt-4">
                    <MediaManager
                      items={galleryMedia}
                      folderPath={`academies/${academyId}/gallery`}
                      maxItems={30}
                      allowVideos={true}
                      onChange={(updated) => setGalleryMedia(updated)}
                      emptyTitle="Sin archivos multimedia personalizados"
                      emptyDescription="Sube fotos y videos de muestra para esta academia y haz clic en Guardar Cambios."
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    className="w-full"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="w-full" disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Guardar Cambios
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
