'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Academy } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { VISUAL_ASSETS } from '@/lib/visual-assets';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Navigation, ArrowUpRight } from 'lucide-react';

type AcademyCardProps = {
  academy: Academy;
  proximityLabel?: string | null;
  isNearbyHighlight?: boolean;
};

export function AcademyCard({ academy, proximityLabel, isNearbyHighlight }: AcademyCardProps) {
  const logo = PlaceHolderImages.find((p) => p.id === academy.logoImageId);
  const initialSrc = academy.coverImageUrl || logo?.imageUrl || VISUAL_ASSETS.academyCardShowcase;
  const [useLocalFallback, setUseLocalFallback] = useState(false);

  const imageSrc = useLocalFallback ? VISUAL_ASSETS.academyCardShowcase : initialSrc;

  return (
    <Link href={`/academies/${academy.id}`} className="group block h-full">
      <Card
        className={`royal-card flex h-full flex-col overflow-hidden bg-card border-border/80 ${
          isNearbyHighlight ? 'ring-1 ring-primary/35 border-primary/40' : ''
        }`}
      >
        <CardHeader className="relative aspect-[4/3] w-full p-0 overflow-hidden bg-muted">
          <Image
            src={imageSrc}
            alt={academy.name}
            data-ai-hint={logo?.imageHint}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            referrerPolicy="no-referrer"
            onError={() => setUseLocalFallback(true)}
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />

          {proximityLabel && (
            <div className="absolute top-3 left-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background/95 px-3 py-1 text-[11px] font-semibold text-primary shadow-sm backdrop-blur-sm">
                <Navigation className="h-3 w-3 shrink-0" />
                {proximityLabel}
              </span>
            </div>
          )}

          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between text-white">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/90 truncate pr-2">
              {academy.danceStyles.slice(0, 2).join(' · ') || 'Servicios XV'}
            </span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur-md text-white transition-transform duration-300 group-hover:bg-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
        </CardHeader>

        <CardContent className="flex-grow p-5 sm:p-6">
          <CardTitle className="font-headline text-xl sm:text-2xl font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">
            {academy.name}
          </CardTitle>
          <CardDescription className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {academy.description}
          </CardDescription>
        </CardContent>

        <CardFooter className="flex items-center justify-between border-t border-border/60 px-5 py-3.5 sm:px-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 min-w-0 pr-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="truncate">{academy.location}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 tabular-nums font-medium">
            <span className="text-foreground font-semibold">{academy.cost}</span>
            <span aria-hidden="true" className="text-border">·</span>
            <span>{academy.popularity}</span>
            {academy.isPublished === false && (
              <>
                <span aria-hidden="true" className="text-border">·</span>
                <span className="text-destructive font-semibold">Oculta</span>
              </>
            )}
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}

export function AcademyCardSkeleton() {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader className="relative aspect-[4/3] w-full bg-muted animate-pulse p-0" />
      <CardContent className="flex-grow p-6 space-y-3">
        <div className="h-6 w-3/4 rounded-md bg-muted animate-pulse" />
        <div className="h-4 w-full rounded-md bg-muted animate-pulse" />
        <div className="h-4 w-4/5 rounded-md bg-muted animate-pulse" />
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t px-6 py-4">
        <div className="h-4 w-1/3 rounded-md bg-muted animate-pulse" />
        <div className="h-4 w-16 rounded-md bg-muted animate-pulse" />
      </CardFooter>
    </Card>
  );
}
