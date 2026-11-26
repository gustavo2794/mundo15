'use client';

import { useEffect, useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import Image from 'next/image';
import { academies as defaultAcademies, type Academy } from '@/lib/data';
import { PlaceHolderImages, type ImagePlaceholder } from '@/lib/placeholder-images';
import { createQuoteRequest, getAcademyFromFirestore } from '@/lib/firestore-service';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import Link from 'next/link';
import { Mail, Phone, Globe, MapPin, Loader2, Send, Edit, Star } from 'lucide-react';
import { VISUAL_ASSETS } from '@/lib/visual-assets';
import { GalleryTabs } from '@/components/gallery-tabs';
import { EditAcademyButton } from '@/components/edit-academy-button';
import { TestimonialsSection } from '@/components/testimonials-section';

export default function AcademyDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [academy, setAcademy] = useState<Academy | null>(null);
  const [loading, setLoading] = useState(true);
  const [existsInFirestore, setExistsInFirestore] = useState(false);
  const [useHeroFallback, setUseHeroFallback] = useState(false);

  const [quoteOpen, setQuoteOpen] = useState(false);
  const [eventDate, setEventDate] = useState('');
  const [message, setMessage] = useState('');
  const [submittingQuote, setSubmittingQuote] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const fsAcademy = await getAcademyFromFirestore(id);
        if (!active) return;
        if (fsAcademy) {
          setAcademy(fsAcademy);
          setExistsInFirestore(true);
        } else {
          const fallback = defaultAcademies.find((a) => a.id === id) ?? null;
          setAcademy(fallback);
          setExistsInFirestore(false);
        }
      } catch (error) {
        console.error('Error al cargar detalle de academia:', error);
        if (!active) return;
        const fallback = defaultAcademies.find((a) => a.id === id) ?? null;
        setAcademy(fallback);
        setExistsInFirestore(false);
      } finally {
        if (active) setLoading(false);
      }
    }
    if (id) {
      load();
    }
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!academy) {
    notFound();
  }

  const heroImage =
    PlaceHolderImages.find((p) => p.id === academy.logoImageId) ||
    PlaceHolderImages.find((p) => p.id === academy.galleryImageIds[0]);
  const initialHeroSrc =
    academy.coverImageUrl || heroImage?.imageUrl || VISUAL_ASSETS.academyCardShowcase;
  const heroSrc = useHeroFallback ? VISUAL_ASSETS.academyCardShowcase : initialHeroSrc;

  const galleryImages = academy.galleryImageIds
    .map((imgId) => PlaceHolderImages.find((p) => p.id === imgId))
    .filter((img): img is ImagePlaceholder => !!img);
  const isBusinessOwner = !!user?.uid && academy.createdBy === user.uid;

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!user.emailVerified) {
      toast({
        variant: 'destructive',
        title: 'Correo no verificado',
        description: 'Por favor verifica tu correo electrónico antes de solicitar una cotización.',
      });
      return;
    }
    if (!existsInFirestore) {
      toast({
        variant: 'destructive',
        title: 'Academia pendiente de sincronización',
        description:
          'Un administrador debe sincronizar el catálogo primero para habilitar cotizaciones en línea.',
      });
      return;
    }
    if (message.trim().length < 5) {
      toast({
        variant: 'destructive',
        title: 'Mensaje demasiado corto',
        description: 'Escribe al menos 5 caracteres explicando lo que buscas para tu evento.',
      });
      return;
    }

    setSubmittingQuote(true);
    try {
      await createQuoteRequest({
        academyId: academy.id,
        academyName: academy.name,
        userId: user.uid,
        userName: profile?.displayName || user.displayName || user.email || 'Usuario',
        userEmail: user.email || '',
        eventDate: eventDate.trim() || undefined,
        message: message.trim(),
      });

      toast({
        title: '¡Cotización enviada!',
        description: `Tu solicitud para ${academy.name} se ha registrado. Puedes verla en tu perfil.`,
      });
      setMessage('');
      setEventDate('');
      setQuoteOpen(false);
    } catch (error) {
      console.error('Error al enviar solicitud de cotización:', error);
      toast({
        variant: 'destructive',
        title: 'Error al enviar cotización',
        description: 'No pudimos guardar tu solicitud. Intenta de nuevo.',
      });
    } finally {
      setSubmittingQuote(false);
    }
  };

  return (
    <div className="flex-1 pb-12">
      <div>
        {/* Hero Section */}
        <div className="relative h-[44vh] min-h-[320px] max-h-[480px] w-full overflow-hidden">
          <Image
            src={heroSrc}
            alt={academy.name}
            data-ai-hint={heroImage?.imageHint}
            fill
            priority
            sizes="100vw"
            referrerPolicy="no-referrer"
            onError={() => setUseHeroFallback(true)}
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1e0b12]/88 via-[#1e0b12]/40 to-transparent" />
          <div className="container relative mx-auto flex h-full items-end p-4 text-white md:p-6">
            <div className="flex max-w-3xl flex-wrap items-center gap-4 pb-10">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
                    {academy.location} · {academy.cost} · Popularidad {academy.popularity}
                  </p>
                  <div className="inline-flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-md px-2.5 py-0.5 text-xs text-amber-300 font-semibold border border-amber-300/30">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span>5.0</span>
                    <span className="text-white/80 font-normal">· Reseñas de Quinceañeras</span>
                  </div>
                </div>
                <h1 className="font-headline text-3xl sm:text-4xl font-bold md:text-5xl text-balance">
                  {academy.name}
                </h1>
                <p className="text-sm sm:text-base text-rose-100/90 max-w-2xl leading-relaxed">
                  {academy.description}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <EditAcademyButton academyId={academy.id} />
                {isBusinessOwner && (
                  <Button asChild size="sm" variant="secondary" className="gap-1.5 min-h-[40px]">
                    <Link href="/profile">
                      <Edit className="h-3.5 w-3.5" />
                      Administrar mi empresa y galería
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto -mt-16 grid grid-cols-1 gap-8 px-4 pb-16 md:grid-cols-3 md:px-6">
          {/* Left Column */}
          <div className="md:col-span-2">
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <h2 className="font-headline text-2xl font-semibold">Sobre la Academia</h2>
                <p className="mt-4 leading-relaxed text-muted-foreground">
                  {academy.longDescription}
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {academy.danceStyles.map((style) => (
                    <Badge key={style} variant="secondary">
                      {style}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <GalleryTabs
              galleryImages={galleryImages}
              uploadedMedia={academy.galleryMedia || []}
            />

            <TestimonialsSection
              academyId={academy.id}
              academyName={academy.name}
            />
          </div>

          {/* Right Column (Sidebar) */}
          <div className="space-y-8">
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <h2 className="font-headline text-2xl font-semibold">Detalles</h2>
                <ul className="mt-4 space-y-4 text-sm">
                  <li className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                      <span className="font-bold text-secondary-foreground">{academy.cost}</span>
                    </span>
                    <span>Rango de Precios</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                      <MapPin className="h-4 w-4" />
                    </span>
                    {academy.locationLink ? (
                      <a
                        href={academy.locationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary hover:underline"
                      >
                        {academy.location}
                      </a>
                    ) : (
                      <span>{academy.location}</span>
                    )}
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardContent className="p-6">
                <h2 className="font-headline text-2xl font-semibold">Contáctanos</h2>
                <ul className="mt-4 space-y-3 text-sm">
                  {academy.contact.phone && (
                    <li className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${academy.contact.phone}`} className="hover:text-primary">
                        {academy.contact.phone}
                      </a>
                    </li>
                  )}
                  {academy.contact.email && (
                    <li className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${academy.contact.email}`} className="hover:text-primary">
                        {academy.contact.email}
                      </a>
                    </li>
                  )}
                  {academy.contact.website && (
                    <li className="flex items-center gap-3">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={
                          academy.contact.website.startsWith('http')
                            ? academy.contact.website
                            : `https://${academy.contact.website}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary"
                      >
                        {academy.contact.website}
                      </a>
                    </li>
                  )}
                </ul>

                <Dialog open={quoteOpen} onOpenChange={setQuoteOpen}>
                  <DialogTrigger asChild>
                    <Button className="mt-6 w-full bg-accent text-accent-foreground hover:bg-accent/90">
                      Solicitar una Cotización
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="font-headline text-2xl">
                        Solicitar Cotización
                      </DialogTitle>
                      <DialogDescription>
                        Envía tu consulta a <strong>{academy.name}</strong>.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleQuoteSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="eventDate">Fecha estimada del evento (Opcional)</Label>
                        <Input
                          id="eventDate"
                          type="date"
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="quoteMessage">Detalles de tu evento</Label>
                        <Textarea
                          id="quoteMessage"
                          rows={4}
                          placeholder="Cuéntanos qué ritmos te interesan, número de chambelanes, horarios..."
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={submittingQuote}>
                        {submittingQuote ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="mr-2 h-4 w-4" />
                        )}
                        Enviar Solicitud
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
