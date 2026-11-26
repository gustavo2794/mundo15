import type { Academy } from '@/lib/data';

export type UserLocationContext = {
  city?: string;
  state?: string;
  country?: string;
  label: string;
  latitude?: number;
  longitude?: number;
  source: 'gps' | 'profile' | 'manual';
};

export type ProximityEvaluation = {
  tier: 1 | 2 | 3; // 1 = same city / <=35km, 2 = same state / <=120km, 3 = other
  distanceKm: number | null;
  matchLabel: string | null;
};

const STATE_ALIASES: Record<string, string[]> = {
  'estado de mexico': ['mex', 'edomex', 'estado de mexico', 'edo mex', 'edo. de mex', 'ecatepec', 'naucalpan', 'tlalnepantla', 'nezahualcoyotl', 'toluca'],
  'ciudad de mexico': ['cdmx', 'ciudad de mexico', 'df', 'distrito federal', 'coyoacan', 'polanco', 'roma', 'condesa', 'iztapalapa', 'gustavo a madero'],
  'nuevo leon': ['nl', 'nuevo leon', 'monterrey', 'san pedro', 'guadalupe', 'apodaca'],
  'jalisco': ['jal', 'jalisco', 'guadalajara', 'zapopan', 'tlaquepaque'],
  'puebla': ['pue', 'puebla', 'cholula'],
  'queretaro': ['qro', 'queretaro'],
  'guanajuato': ['gto', 'guanajuato', 'leon', 'irapuato', 'celaya'],
  'yucatan': ['yuc', 'yucatan', 'merida'],
  'quintana roo': ['qroo', 'quintana roo', 'cancun', 'playa del carmen'],
  'baja california': ['bc', 'baja california', 'tijuana', 'mexicali'],
  'veracruz': ['ver', 'veracruz', 'xalapa', 'boca del rio'],
  'florida': ['fl', 'florida', 'miami', 'orlando', 'tampa'],
  'california': ['ca', 'california', 'los angeles', 'san diego', 'san francisco'],
  'texas': ['tx', 'texas', 'houston', 'dallas', 'austin', 'san antonio'],
  'illinois': ['il', 'illinois', 'chicago'],
  'new york': ['ny', 'new york', 'nueva york'],
};

const KNOWN_CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'ecatepec': { lat: 19.6018, lng: -99.0507 },
  'ecatepec de morelos': { lat: 19.6018, lng: -99.0507 },
  'ciudad de mexico': { lat: 19.4326, lng: -99.1332 },
  'cdmx': { lat: 19.4326, lng: -99.1332 },
  'estado de mexico': { lat: 19.4969, lng: -99.7233 },
  'toluca': { lat: 19.2826, lng: -99.6557 },
  'naucalpan': { lat: 19.4752, lng: -99.2375 },
  'nezahualcoyotl': { lat: 19.4006, lng: -99.0148 },
  'tlalnepantla': { lat: 19.5367, lng: -99.1947 },
  'monterrey': { lat: 25.6866, lng: -100.3161 },
  'guadalajara': { lat: 20.6597, lng: -103.3496 },
  'puebla': { lat: 19.0414, lng: -98.2063 },
  'queretaro': { lat: 20.5888, lng: -100.3899 },
  'leon': { lat: 21.125, lng: -101.686 },
  'merida': { lat: 20.9674, lng: -89.5926 },
  'cancun': { lat: 21.1619, lng: -86.8515 },
  'tijuana': { lat: 32.5149, lng: -117.0382 },
  'miami': { lat: 25.7617, lng: -80.1918 },
  'los angeles': { lat: 34.0522, lng: -118.2437 },
  'houston': { lat: 29.7604, lng: -95.3698 },
  'dallas': { lat: 32.7767, lng: -96.797 },
  'chicago': { lat: 41.8781, lng: -87.6298 },
  'new york': { lat: 40.7128, lng: -74.006 },
};

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function resolveCanonicalState(normalizedLocation: string): string | null {
  const padded = ` ${normalizedLocation} `;
  for (const [canonical, aliases] of Object.entries(STATE_ALIASES)) {
    for (const alias of aliases) {
      if (padded.includes(` ${alias} `) || normalizedLocation.includes(alias)) {
        return canonical;
      }
    }
  }
  return null;
}

export function inferCoordsFromLocation(location: string): { lat: number; lng: number } | null {
  const norm = normalizeText(location);
  for (const [cityKey, coords] of Object.entries(KNOWN_CITY_COORDS)) {
    if (norm.includes(cityKey)) {
      return coords;
    }
  }
  return null;
}

export function evaluateAcademyProximity(
  academy: Academy,
  userLoc: UserLocationContext | null
): ProximityEvaluation {
  if (!userLoc || (!userLoc.label.trim() && userLoc.latitude === undefined)) {
    return { tier: 3, distanceKm: null, matchLabel: null };
  }

  let distanceKm: number | null = null;
  const academyLat = academy.latitude;
  const academyLng = academy.longitude;
  const inferredAcademyCoords =
    academyLat !== undefined && academyLng !== undefined
      ? { lat: academyLat, lng: academyLng }
      : inferCoordsFromLocation(academy.location);

  if (
    userLoc.latitude !== undefined &&
    userLoc.longitude !== undefined &&
    inferredAcademyCoords
  ) {
    distanceKm = calculateDistanceKm(
      userLoc.latitude,
      userLoc.longitude,
      inferredAcademyCoords.lat,
      inferredAcademyCoords.lng
    );
  }

  const normAcademy = normalizeText(academy.location);
  const normUserLabel = normalizeText(userLoc.label || '');
  const normUserCity = normalizeText(userLoc.city || '');
  const normUserState = normalizeText(userLoc.state || '');

  const userTokens = normUserLabel
    .split(' ')
    .filter((w) => w.length >= 3 && !['estado', 'ciudad', 'del', 'los', 'las', 'municipio'].includes(w));

  const cityMatches =
    (normUserCity.length >= 3 && normAcademy.includes(normUserCity)) ||
    userTokens.some((tok) => normAcademy.includes(tok));

  if (cityMatches || (distanceKm !== null && distanceKm <= 35)) {
    return {
      tier: 1,
      distanceKm,
      matchLabel: distanceKm !== null ? `Cerca de ti · ${distanceKm} km` : 'En tu ciudad',
    };
  }

  const academyState = resolveCanonicalState(normAcademy);
  const userStateCanonical =
    resolveCanonicalState(normUserState) || resolveCanonicalState(normUserLabel);

  const stateMatches =
    (academyState !== null && userStateCanonical !== null && academyState === userStateCanonical) ||
    (normUserState.length >= 3 && normAcademy.includes(normUserState));

  if (stateMatches || (distanceKm !== null && distanceKm <= 120)) {
    return {
      tier: 2,
      distanceKm,
      matchLabel: distanceKm !== null ? `En tu zona · ${distanceKm} km` : 'En tu estado',
    };
  }

  return {
    tier: 3,
    distanceKm,
    matchLabel: distanceKm !== null ? `A ${distanceKm} km` : null,
  };
}

export async function reverseGeocodeCoords(
  latitude: number,
  longitude: number
): Promise<{ city: string; state: string; country: string; label: string }> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(
        latitude
      )}&longitude=${encodeURIComponent(longitude)}&localityLanguage=es`
    );
    if (!res.ok) {
      throw new Error(`Reverse geocode HTTP ${res.status}`);
    }
    const data = (await res.json()) as {
      city?: string;
      locality?: string;
      principalSubdivision?: string;
      countryName?: string;
    };
    const city = data.city?.trim() || data.locality?.trim() || '';
    const state = data.principalSubdivision?.trim() || '';
    const country = data.countryName?.trim() || '';
    const parts = [city, state].filter(Boolean);
    const label = parts.length > 0 ? parts.join(', ') : country || 'Mi ubicación actual';
    return { city, state, country, label };
  } catch (error) {
    console.error('Error al obtener nombre de ubicación por coordenadas:', error);
    return {
      city: '',
      state: '',
      country: '',
      label: 'Ubicación GPS detectada',
    };
  }
}
