'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  createAcademyReview,
  deleteAcademyReview,
  listAcademyReviews,
} from '@/lib/firestore-service';
import type { AcademyReview } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  CheckCircle2,
  Heart,
  Loader2,
  MessageSquarePlus,
  Sparkles,
  Star,
  Trash2,
  User,
} from 'lucide-react';

interface TestimonialsSectionProps {
  academyId: string;
  academyName: string;
}

const ROLE_OPTIONS = [
  'Quinceañera',
  'Mamá de la Quinceañera',
  'Papá de la Quinceañera',
  'Hermana / Familiar',
  'Madrina / Padrino',
  'Chambelán / Amigo',
];

const SERVICE_OPTIONS = [
  'Vals Principal & Baile con Papá',
  'Baile Sorpresa Urbano / Moderno',
  'Entrada Triunfal & Cambio de Zapatilla',
  'Paquete Integral (Vals + Baile Sorpresa)',
  'Asesoría de Pista y Ensayos en Salón',
];

export function TestimonialsSection({ academyId, academyName }: TestimonialsSectionProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [reviews, setReviews] = useState<AcademyReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [userRole, setUserRole] = useState(
    profile?.userType === 'quinceanera' ? 'Quinceañera' : 'Quinceañera'
  );
  const [serviceHired, setServiceHired] = useState('Paquete Integral (Vals + Baile Sorpresa)');
  const [eventDate, setEventDate] = useState('');
  const [verifiedBooking, setVerifiedBooking] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | '5' | '4' | 'recent'>('all');

  useEffect(() => {
    let active = true;
    async function loadReviews() {
      setLoading(true);
      try {
        const data = await listAcademyReviews(academyId);
        if (active) setReviews(data);
      } catch (err) {
        console.error('Error al cargar testimonios:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadReviews();
    return () => {
      active = false;
    };
  }, [academyId]);

  // Statistics calculation
  const stats = useMemo(() => {
    if (reviews.length === 0) {
      return { average: 5.0, total: 0, counts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
    }
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;
    for (const r of reviews) {
      const rounded = Math.round(r.rating || 5);
      if (counts[rounded] !== undefined) {
        counts[rounded] += 1;
      }
      sum += r.rating || 5;
    }
    return {
      average: Number((sum / reviews.length).toFixed(1)),
      total: reviews.length,
      counts,
    };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    if (selectedFilter === '5') return reviews.filter((r) => Math.round(r.rating) === 5);
    if (selectedFilter === '4') return reviews.filter((r) => Math.round(r.rating) === 4);
    return reviews;
  }, [reviews, selectedFilter]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Inicia sesión',
        description: 'Debes tener una cuenta activa para publicar una reseña.',
      });
      return;
    }
    if (!title.trim() || title.trim().length < 3) {
      toast({
        variant: 'destructive',
        title: 'Título requerido',
        description: 'Escribe un título breve para tu opinión.',
      });
      return;
    }
    if (!comment.trim() || comment.trim().length < 8) {
      toast({
        variant: 'destructive',
        title: 'Reseña demasiado corta',
        description: 'Por favor comparte más detalles sobre tu experiencia (al menos 8 caracteres).',
      });
      return;
    }

    setSubmitting(true);
    try {
      const authorName =
        profile?.displayName || user.displayName || user.email?.split('@')[0] || 'Quinceañera';

      const newReview = await createAcademyReview({
        academyId,
        userId: user.uid,
        userName: authorName,
        userRole,
        rating,
        title: title.trim(),
        comment: comment.trim(),
        serviceHired,
        eventDate: eventDate.trim() || undefined,
        verifiedBooking,
      });

      setReviews((prev) => [newReview, ...prev]);
      toast({
        title: '¡Muchas gracias por tu reseña!',
        description: `Tu testimonio para ${academyName} fue publicado con éxito.`,
      });

      setTitle('');
      setComment('');
      setEventDate('');
      setDialogOpen(false);
    } catch (error) {
      console.error('Error al guardar reseña:', error);
      toast({
        variant: 'destructive',
        title: 'Error al enviar reseña',
        description: error instanceof Error ? error.message : 'No se pudo guardar tu testimonio.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('¿Estás segura de eliminar esta reseña?')) return;
    setDeletingId(reviewId);
    try {
      await deleteAcademyReview(reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      toast({
        title: 'Reseña eliminada',
        description: 'El testimonio fue removido de la academia.',
      });
    } catch (error) {
      console.error('Error al eliminar reseña:', error);
      toast({
        variant: 'destructive',
        title: 'No se pudo eliminar',
        description: 'Ocurrió un error al intentar borrar la reseña.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mt-8 space-y-6">
      {/* Title & Headline */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
            <Heart className="h-3.5 w-3.5 fill-primary text-primary" />
            Experiencias Reales
          </div>
          <h2 className="font-headline text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
            Reseñas de Quinceañeras y Familias
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Conoce cómo vivieron su vals, baile sorpresa y ensayos otras quinceañeras con {academyName}.
          </p>
        </div>

        {/* CTA Button to Add Review */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="gap-2 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 text-white shadow-md hover:opacity-95 text-xs sm:text-sm font-medium self-start sm:self-auto min-h-[42px]"
            >
              <MessageSquarePlus className="h-4 w-4" />
              Escribir mi Reseña
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-headline text-xl sm:text-2xl flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Tu Opinión para {academyName}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Comparte tu experiencia para ayudar a otras quinceañeras a elegir la coreografía de sus sueños.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmitReview} className="space-y-4 pt-2">
              {/* Star Rating Picker */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Calificación General *
                </Label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const active = (hoverRating ?? rating) >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(null)}
                          onClick={() => setRating(star)}
                          className="p-1 text-2xl transition-transform hover:scale-125 focus:outline-none"
                          aria-label={`${star} estrellas`}
                        >
                          <Star
                            className={`h-7 w-7 transition-colors ${
                              active
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-muted-foreground/40'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                    {rating === 5 && '★★★★★ Excelente'}
                    {rating === 4 && '★★★★☆ Muy buena'}
                    {rating === 3 && '★★★☆☆ Buena'}
                    {rating === 2 && '★★☆☆☆ Regular'}
                    {rating === 1 && '★☆☆☆☆ Insatisfecha'}
                  </span>
                </div>
              </div>

              {/* Role & Service */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="reviewRole" className="text-xs font-semibold">
                    ¿Quién escribe la reseña? *
                  </Label>
                  <select
                    id="reviewRole"
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reviewService" className="text-xs font-semibold">
                    Servicio Contratado *
                  </Label>
                  <select
                    id="reviewService"
                    value={serviceHired}
                    onChange={(e) => setServiceHired(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {SERVICE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Approximate Event Date */}
              <div className="space-y-1.5">
                <Label htmlFor="revEventDate" className="text-xs font-semibold">
                  Fecha o Mes de los Quince Años (Opcional)
                </Label>
                <Input
                  id="revEventDate"
                  placeholder="Ej: Noviembre 2025 o Primavera 2026"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* Review Title */}
              <div className="space-y-1.5">
                <Label htmlFor="revTitle" className="text-xs font-semibold">
                  Título de tu reseña *
                </Label>
                <Input
                  id="revTitle"
                  placeholder="Ej: ¡Los chambelanes bailaron increíble gracias a ellos!"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>

              {/* Review Comment */}
              <div className="space-y-1.5">
                <Label htmlFor="revComment" className="text-xs font-semibold">
                  Tu testimonio detallado *
                </Label>
                <Textarea
                  id="revComment"
                  rows={4}
                  placeholder="Cuéntanos cómo fue el trato de los coreógrafos, la puntualidad en los ensayos, si adaptaron los pasos a tu gusto, cómo reaccionaron tus invitados..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  required
                  className="text-xs leading-relaxed"
                />
              </div>

              {/* Verified celebration badge switch */}
              <div className="flex items-center gap-2 rounded-lg bg-pink-500/10 p-2.5 text-xs text-foreground">
                <input
                  type="checkbox"
                  id="verifiedCheck"
                  checked={verifiedBooking}
                  onChange={(e) => setVerifiedBooking(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary"
                />
                <label htmlFor="verifiedCheck" className="cursor-pointer text-[11px] leading-tight text-muted-foreground">
                  Confirmo que esta reseña refleja una experiencia real de preparación o festejo de XV años con esta academia.
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="gap-2 bg-primary text-primary-foreground min-h-[40px]"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Publicar Testimonio
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Score Card */}
      <Card className="border border-border/80 bg-gradient-to-br from-card via-card/95 to-primary/5 shadow-md overflow-hidden">
        <CardContent className="p-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Score Big Display */}
            <div className="md:col-span-4 flex flex-col items-center justify-center text-center p-3 border-b md:border-b-0 md:border-r border-border/60">
              <span className="font-headline text-5xl font-black tracking-tight text-foreground">
                {stats.average.toFixed(1)}
              </span>
              <div className="flex items-center gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`h-5 w-5 ${
                      s <= Math.round(stats.average)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">
                Basado en {stats.total} {stats.total === 1 ? 'opinión' : 'opiniones verificadas'}
              </p>
              <Badge variant="outline" className="mt-2.5 gap-1 text-[11px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                <CheckCircle2 className="h-3 w-3" />
                100% Recomendada
              </Badge>
            </div>

            {/* Distribution Bars */}
            <div className="md:col-span-8 space-y-2">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                Desglose de Calificaciones
              </p>
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = stats.counts[stars] || 0;
                const percent = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <div key={stars} className="flex items-center gap-3 text-xs">
                    <span className="w-12 font-medium flex items-center gap-1 shrink-0">
                      {stars} <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    </span>
                    <Progress value={percent} className="h-2 flex-1" />
                    <span className="w-10 text-right text-muted-foreground font-mono text-[11px]">
                      {count} ({percent}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            size="sm"
            variant={selectedFilter === 'all' ? 'default' : 'ghost'}
            className="text-xs h-8"
            onClick={() => setSelectedFilter('all')}
          >
            Todas ({reviews.length})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={selectedFilter === '5' ? 'default' : 'ghost'}
            className="text-xs h-8 gap-1"
            onClick={() => setSelectedFilter('5')}
          >
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> 5 Estrellas ({stats.counts[5] || 0})
          </Button>
          {stats.counts[4] > 0 && (
            <Button
              type="button"
              size="sm"
              variant={selectedFilter === '4' ? 'default' : 'ghost'}
              className="text-xs h-8 gap-1"
              onClick={() => setSelectedFilter('4')}
            >
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> 4 Estrellas ({stats.counts[4]})
            </Button>
          )}
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredReviews.length === 0 ? (
        <Card className="border-dashed p-8 text-center bg-card/40">
          <MessageSquarePlus className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
          <h3 className="font-headline text-lg font-semibold text-foreground">
            Aún no hay reseñas en este filtro
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            ¿Trabajaste con {academyName}? Sé la primera en compartir tu experiencia con el vals y los chambelanes.
          </p>
          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="mt-4 gap-1.5 bg-primary text-xs"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Escribir primera reseña
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredReviews.map((rev) => {
            const isOwner = user?.uid && rev.userId === user.uid;
            const authorInitials = rev.userName
              ? rev.userName
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()
              : 'Q';

            return (
              <Card
                key={rev.id}
                className="border border-border/70 bg-card hover:border-primary/40 transition-colors shadow-sm"
              >
                <CardContent className="p-5 sm:p-6 space-y-3">
                  {/* Top Bar: Stars + Date + Delete */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((st) => (
                          <Star
                            key={st}
                            className={`h-4 w-4 ${
                              st <= rev.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-muted-foreground/30'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-foreground ml-1">
                        {rev.rating}.0
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {rev.eventDate && (
                        <span className="text-[11px] text-muted-foreground hidden sm:inline">
                          Evento: {rev.eventDate}
                        </span>
                      )}
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deletingId === rev.id}
                          onClick={() => handleDeleteReview(rev.id)}
                          className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs gap-1"
                        >
                          {deletingId === rev.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          <span className="hidden sm:inline">Eliminar</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Review Headline & Content */}
                  <div>
                    <h4 className="font-headline text-base sm:text-lg font-bold text-foreground">
                      &quot;{rev.title}&quot;
                    </h4>
                    <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed mt-2 whitespace-pre-line">
                      {rev.comment}
                    </p>
                  </div>

                  {/* Badges: Service Hired */}
                  {rev.serviceHired && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-normal bg-secondary/60 text-secondary-foreground"
                      >
                        {rev.serviceHired}
                      </Badge>
                      {rev.verifiedBooking && (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-normal border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 gap-1"
                        >
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          Experiencia Verificada
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Author Profile Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500/30 via-purple-500/30 to-amber-500/30 text-primary font-bold text-xs ring-1 ring-primary/20">
                        {authorInitials}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground leading-tight">
                          {rev.userName}
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-tight">
                          {rev.userRole || 'Quinceañera'}
                        </p>
                      </div>
                    </div>

                    <span className="text-[11px] text-muted-foreground">
                      {rev.createdAt
                        ? new Date(rev.createdAt as string).toLocaleDateString('es-MX', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'Reciente'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
