'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { academies as defaultAcademies, type Academy } from '@/lib/data';
import {
  subscribeAcademies,
  seedInitialAcademies,
  updateUserProfile,
} from '@/lib/firestore-service';
import {
  evaluateAcademyProximity,
  inferCoordsFromLocation,
  reverseGeocodeCoords,
  type UserLocationContext,
} from '@/lib/location-utils';
import { VISUAL_ASSETS } from '@/lib/visual-assets';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { AcademyCard, AcademyCardSkeleton } from '@/components/academy-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  PartyPopper,
  Loader2,
  MapPin,
  LocateFixed,
  Navigation,
  X,
  Search,
  Sparkles,
  Crown,
  Building2,
} from 'lucide-react';

const popularityOrder: Record<Academy['popularity'], number> = {
  Alta: 1,
  Media: 2,
  Nueva: 3,
};

const LOCATION_STORAGE_KEY = 'mundo15_user_location';

const QUICK_CITIES = [
  'Ecatepec de Morelos, MEX',
  'Ciudad de México',
  'Guadalajara, JAL',
  'Monterrey, NL',
  'Puebla, PUE',
  'Miami, FL',
  'Los Angeles, CA',
  'Houston, TX',
];

function AcademiesView() {
  const searchParams = useSearchParams();
  const { user, profile, isAdmin, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [academiesList, setAcademiesList] = useState<Academy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const seededRef = useRef(false);

  const [userLocation, setUserLocation] = useState<UserLocationContext | null>(null);
  const [manualLocationInput, setManualLocationInput] = useState('');
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [strictLocalFilter, setStrictLocalFilter] = useState(false);

  const filteredAcademyNames = useMemo(() => {
    const names = searchParams.get('academyNames');
    if (names === null) return null;
    try {
      return JSON.parse(decodeURIComponent(names)) as string[];
    } catch (error) {
      console.error('Failed to parse academy names from URL:', error);
      return [];
    }
  }, [searchParams]);

  // Initialize location context from localStorage or saved user profile
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem(LOCATION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as UserLocationContext;
        if (parsed && parsed.label) {
          setUserLocation(parsed);
          setManualLocationInput(parsed.label);
          return;
        }
      }
    } catch (err) {
      console.error('Error al leer ubicación guardada:', err);
    }

    const profileLocLabel =
      profile?.eventLocation?.trim() || profile?.businessLocation?.trim() || '';
    if (profileLocLabel || (profile?.latitude !== undefined && profile?.longitude !== undefined)) {
      const inferred =
        profile?.latitude !== undefined && profile?.longitude !== undefined
          ? { lat: profile.latitude, lng: profile.longitude }
          : inferCoordsFromLocation(profileLocLabel);
      const nextLoc: UserLocationContext = {
        label: profileLocLabel || 'Ubicación de perfil',
        latitude: inferred?.lat,
        longitude: inferred?.lng,
        source: 'profile',
      };
      setUserLocation(nextLoc);
      setManualLocationInput(profileLocLabel);
    }
  }, [profile?.eventLocation, profile?.businessLocation, profile?.latitude, profile?.longitude]);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    const unsubscribe = subscribeAcademies(
      isAdmin,
      async (docs) => {
        if (docs.length === 0 && isAdmin && !seededRef.current) {
          seededRef.current = true;
          try {
            await seedInitialAcademies(user.uid);
          } catch (seedError) {
            console.error('Error al cargar academias iniciales:', seedError);
            setAcademiesList(defaultAcademies);
            setIsLoading(false);
          }
          return;
        }
        setAcademiesList(docs.length > 0 ? docs : defaultAcademies);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error al cargar academias:', error);
        setAcademiesList(defaultAcademies);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, isAdmin]);

  const applyLocationContext = async (next: UserLocationContext | null) => {
    setUserLocation(next);
    if (typeof window !== 'undefined') {
      if (next) {
        window.localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(next));
      } else {
        window.localStorage.removeItem(LOCATION_STORAGE_KEY);
      }
    }
    if (!next) {
      setManualLocationInput('');
      setStrictLocalFilter(false);
      return;
    }
    setManualLocationInput(next.label);

    if (user && profile?.userType === 'quinceanera') {
      try {
        await updateUserProfile(user.uid, {
          eventLocation: next.label,
          ...(next.latitude !== undefined ? { latitude: next.latitude } : {}),
          ...(next.longitude !== undefined ? { longitude: next.longitude } : {}),
        });
        await refreshProfile();
      } catch (err) {
        console.error('No se pudo sincronizar ubicación en perfil:', err);
      }
    }
  };

  const handleDetectLocation = () => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      toast({
        variant: 'destructive',
        title: 'Geolocalización no disponible',
        description: 'Tu navegador no soporta detección de ubicación. Escribe tu ciudad o estado manualmente.',
      });
      return;
    }

    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const geo = await reverseGeocodeCoords(latitude, longitude);
        const ctx: UserLocationContext = {
          city: geo.city,
          state: geo.state,
          country: geo.country,
          label: geo.label,
          latitude,
          longitude,
          source: 'gps',
        };
        await applyLocationContext(ctx);
        setDetectingLocation(false);
        toast({
          title: 'Ubicación detectada',
          description: `Mostrando primero las empresas y academias cerca de ${geo.label}.`,
        });
      },
      (error) => {
        console.error('Error en geolocation:', error);
        setDetectingLocation(false);
        toast({
          variant: 'destructive',
          title: 'No se pudo obtener tu ubicación',
          description: 'Asegúrate de dar permiso de ubicación o selecciona tu ciudad manualmente.',
        });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  const handleManualLocationApply = async (labelToUse: string) => {
    const trimmed = labelToUse.trim();
    if (!trimmed) {
      await applyLocationContext(null);
      return;
    }
    const inferred = inferCoordsFromLocation(trimmed);
    const parts = trimmed.split(',').map((s) => s.trim());
    const ctx: UserLocationContext = {
      city: parts[0] || trimmed,
      state: parts[1] || '',
      label: trimmed,
      latitude: inferred?.lat,
      longitude: inferred?.lng,
      source: 'manual',
    };
    await applyLocationContext(ctx);
  };

  const availableCities = useMemo(() => {
    const set = new Set<string>(QUICK_CITIES);
    for (const a of academiesList) {
      if (a.location?.trim()) set.add(a.location.trim());
    }
    return Array.from(set).slice(0, 10);
  }, [academiesList]);

  const evaluatedAcademies = useMemo(() => {
    const withProximity = academiesList.map((academy) => ({
      academy,
      proximity: evaluateAcademyProximity(academy, userLocation),
    }));

    withProximity.sort((a, b) => {
      if (userLocation) {
        if (a.proximity.tier !== b.proximity.tier) {
          return a.proximity.tier - b.proximity.tier;
        }
        if (a.proximity.distanceKm !== null && b.proximity.distanceKm !== null) {
          if (a.proximity.distanceKm !== b.proximity.distanceKm) {
            return a.proximity.distanceKm - b.proximity.distanceKm;
          }
        } else if (a.proximity.distanceKm !== null) {
          return -1;
        } else if (b.proximity.distanceKm !== null) {
          return 1;
        }
      }

      const orderDiff = (a.academy.displayOrder ?? 999) - (b.academy.displayOrder ?? 999);
      if (orderDiff !== 0) return orderDiff;
      return popularityOrder[a.academy.popularity] - popularityOrder[b.academy.popularity];
    });

    return withProximity;
  }, [academiesList, userLocation]);

  const displayedItems = useMemo(() => {
    let items = evaluatedAcademies;
    if (filteredAcademyNames !== null) {
      items = items.filter((item) => filteredAcademyNames.includes(item.academy.name));
    }
    if (strictLocalFilter && userLocation) {
      items = items.filter((item) => item.proximity.tier <= 2);
    }
    return items;
  }, [evaluatedAcademies, filteredAcademyNames, strictLocalFilter, userLocation]);

  const nearbyCount = useMemo(() => {
    if (!userLocation) return 0;
    return evaluatedAcademies.filter((item) => item.proximity.tier <= 2).length;
  }, [evaluatedAcademies, userLocation]);

  const isBusiness = profile?.userType === 'business';

  return (
    <div className="flex-1 pb-12">
      {/* ================= EDITORIAL HERO BANNER ================= */}
      <section className="relative overflow-hidden border-b border-border/60">
        <Image
          src={VISUAL_ASSETS.quinceHeroBallroom}
          alt="Salón de gala para Quinceañeras"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#260e16]/88 via-[#260e16]/70 to-[#260e16]/45" />
        <div className="container relative z-10 mx-auto px-4 py-10 md:px-6 md:py-14">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl space-y-3 text-white">
              <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200/95">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                Directorio Curado · XV Años
              </div>
              <h1 className="font-headline text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1] text-balance">
                {filteredAcademyNames !== null
                  ? 'Resultados de tu Búsqueda'
                  : 'Academias, Coreógrafos & Proveedores'}
              </h1>
              <p className="text-sm sm:text-base text-rose-100/85 max-w-xl leading-relaxed">
                Explora portafolios con fotos y videos reales de coreografías, salones, foto y música cerca de tu ciudad.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                variant="secondary"
                className="min-h-[44px] bg-white/95 text-foreground hover:bg-white shadow-md gap-2"
              >
                <Link href="/profile">
                  {isBusiness ? (
                    <>
                      <Building2 className="h-4 w-4 text-primary" />
                      Administrar mi Empresa
                    </>
                  ) : (
                    <>
                      <Crown className="h-4 w-4 text-primary" />
                      Ir a Mi Planeador XV
                    </>
                  )}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8 md:px-6 md:py-10 space-y-8">
        {/* ================= LOCATION & PROXIMITY PANEL ================= */}
        <div className="editorial-surface rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/15">
                <Navigation className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-headline text-lg font-semibold text-foreground">
                  {userLocation
                    ? `Ubicación activa: ${userLocation.label}`
                    : 'Encuentra empresas cerca de ti'}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {userLocation
                    ? nearbyCount > 0
                      ? `${nearbyCount} ${nearbyCount === 1 ? 'opción recomendada' : 'opciones recomendadas'} en tu ciudad o estado aparecen primero.`
                      : 'No encontramos negocios exactamente en tu ciudad aún; mostramos las opciones más cercanas.'
                    : 'Activa tu GPS o elige una ciudad para priorizar negocios dentro de tu estado.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="default"
                onClick={handleDetectLocation}
                disabled={detectingLocation}
                className="gap-2 min-h-[44px]"
              >
                {detectingLocation ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LocateFixed className="h-4 w-4" />
                )}
                Detectar mi ubicación
              </Button>

              {userLocation && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => applyLocationContext(null)}
                  className="gap-1.5 min-h-[44px] text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                  Ver todas
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between pt-3 border-t border-border/60">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleManualLocationApply(manualLocationInput);
              }}
              className="flex flex-1 max-w-md gap-2"
            >
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={manualLocationInput}
                  onChange={(e) => setManualLocationInput(e.target.value)}
                  placeholder="Tu ciudad o estado (ej: Ecatepec, CDMX...)"
                  className="pl-9 min-h-[42px] text-sm"
                />
              </div>
              <Button type="submit" variant="secondary" className="gap-1.5 min-h-[42px] shrink-0">
                <Search className="h-4 w-4" />
                Aplicar
              </Button>
            </form>

            {userLocation && (
              <div className="flex items-center space-x-2.5">
                <Switch
                  id="strict-local"
                  checked={strictLocalFilter}
                  onCheckedChange={setStrictLocalFilter}
                />
                <Label htmlFor="strict-local" className="text-xs sm:text-sm font-medium cursor-pointer">
                  Solo en mi ciudad / estado
                </Label>
              </div>
            )}
          </div>

          {/* Quick city buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-medium text-muted-foreground mr-1">
              Ciudades frecuentes:
            </span>
            {availableCities.map((city) => {
              const isSelected =
                userLocation?.label.toLowerCase() === city.toLowerCase();
              return (
                <button
                  key={city}
                  type="button"
                  onClick={() => handleManualLocationApply(city)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/10 font-semibold text-primary'
                      : 'border-border bg-background/80 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  }`}
                >
                  {city}
                </button>
              );
            })}
          </div>
        </div>

        {/* ================= ACADEMIES GRID ================= */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <AcademyCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <>
            {userLocation && nearbyCount > 0 && (
              <div className="flex items-center gap-2 text-xs font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                <span>
                  Ordenado por cercanía a <strong>{userLocation.label}</strong>
                </span>
              </div>
            )}

            {displayedItems.length > 0 ? (
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                {displayedItems.map(({ academy, proximity }) => (
                  <AcademyCard
                    key={academy.id}
                    academy={academy}
                    proximityLabel={userLocation ? proximity.matchLabel : null}
                    isNearbyHighlight={!!userLocation && proximity.tier <= 2}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-card p-12 text-center space-y-4">
                <PartyPopper className="h-12 w-12 text-muted-foreground" />
                <div>
                  <h3 className="font-headline text-xl font-semibold">
                    No se Encontraron Academias
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {strictLocalFilter
                      ? `No hay empresas registradas exactamente en "${userLocation?.label}" por ahora.`
                      : 'Tu búsqueda no coincidió con ninguna academia. Intenta ajustar tus criterios.'}
                  </p>
                </div>
                {strictLocalFilter && (
                  <Button
                    variant="outline"
                    onClick={() => setStrictLocalFilter(false)}
                  >
                    Ver todas las academias disponibles
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function AcademiesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      }
    >
      <AcademiesView />
    </Suspense>
  );
}
