import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { academies as defaultAcademies, type Academy } from '@/lib/data';
import { inferCoordsFromLocation } from '@/lib/location-utils';
import type {
  AcademyReview,
  AdminRole,
  BudgetItem,
  ChecklistItem,
  CourtMember,
  GodparentItem,
  MediaAsset,
  QuoteRequest,
  QuoteRequestStatus,
  SongItem,
  TableItem,
  TimelineItem,
  UserProfile,
} from '@/lib/types';

export const BOOTSTRAPPED_ADMIN_EMAIL = 'gusanito2794@gmail.com';

function clampString(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

function clampStringList(values: string[], maxItems: number, maxItemLength = 100): string[] {
  return values
    .map((v) => v.trim().slice(0, maxItemLength))
    .filter((v) => v.length > 0)
    .slice(0, maxItems);
}

export function slugifyAcademyId(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  const suffix = Math.random().toString(36).slice(2, 7);
  return base ? `${base}-${suffix}` : `academy-${suffix}`;
}

function mapAcademyDoc(id: string, data: Record<string, unknown>): Academy {
  return {
    id,
    name: String(data.name ?? ''),
    description: String(data.description ?? ''),
    longDescription: String(data.longDescription ?? ''),
    cost: (data.cost as Academy['cost']) ?? '$$',
    location: String(data.location ?? ''),
    locationLink: typeof data.locationLink === 'string' ? data.locationLink : undefined,
    latitude: typeof data.latitude === 'number' ? data.latitude : undefined,
    longitude: typeof data.longitude === 'number' ? data.longitude : undefined,
    popularity: (data.popularity as Academy['popularity']) ?? 'Media',
    danceStyles: Array.isArray(data.danceStyles) ? data.danceStyles.map(String) : [],
    contact: {
      phone: String(data.phone ?? ''),
      email: String(data.email ?? ''),
      website: String(data.website ?? ''),
    },
    logoImageId: String(data.logoImageId ?? 'academy-logo-1'),
    coverImageUrl: typeof data.coverImageUrl === 'string' && data.coverImageUrl.trim()
      ? data.coverImageUrl
      : undefined,
    galleryImageIds: Array.isArray(data.galleryImageIds)
      ? data.galleryImageIds.map(String)
      : ['gallery-1-1', 'gallery-1-2', 'gallery-1-3'],
    galleryMedia: Array.isArray(data.galleryMedia)
      ? (data.galleryMedia as MediaAsset[])
      : [],
    createdBy: typeof data.createdBy === 'string' ? data.createdBy : undefined,
    isPublished: typeof data.isPublished === 'boolean' ? data.isPublished : true,
    displayOrder: typeof data.displayOrder === 'number' ? data.displayOrder : 0,
  };
}

export async function checkIsAdmin(user: User | null): Promise<boolean> {
  if (!user || !user.emailVerified) {
    return false;
  }
  if (user.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL) {
    return true;
  }
  try {
    const snap = await getDoc(doc(db, 'admins', user.uid));
    return snap.exists();
  } catch (error) {
    console.error('Error al verificar rol de administrador:', error);
    return false;
  }
}

export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: 'c1', title: 'Reservar salón de fiestas o carpa', completed: false, category: 'Lugar' },
  { id: 'c2', title: 'Contratar coreógrafo para vals y baile sorpresa', completed: false, category: 'Baile' },
  { id: 'c3', title: 'Elegir y apartar vestido de quinceañera', completed: false, category: 'Vestuario' },
  { id: 'c4', title: 'Contratar servicio de fotografía y video', completed: false, category: 'Recuerdos' },
  { id: 'c5', title: 'Definir banquete, barra de postres y pastel', completed: false, category: 'Comida' },
  { id: 'c6', title: 'Diseñar y enviar invitaciones', completed: false, category: 'Papelería' },
  { id: 'c7', title: 'Contratar DJ, sonido e iluminación', completed: false, category: 'Música' },
  { id: 'c8', title: 'Confirmar lista de madrinas y padrinos', completed: false, category: 'Corte' },
  { id: 'c9', title: 'Seleccionar damas y chambelanes', completed: false, category: 'Corte' },
  { id: 'c10', title: 'Comprar tiara, ramo y zapatillas', completed: false, category: 'Vestuario' },
  { id: 'c11', title: 'Prueba de peinado y maquillaje', completed: false, category: 'Belleza' },
];

export const DEFAULT_TIMELINE: TimelineItem[] = [
  { id: 't1', time: '10:00', title: 'Sesión de Peinado y Maquillaje', description: 'Arreglo de la quinceañera y familia', completed: false },
  { id: 't2', time: '13:00', title: 'Sesión de Fotos en Locación / Jardín', description: 'Fotos oficiales con vestido y accesorios', completed: false },
  { id: 't3', time: '16:00', title: 'Misa de Acción de Gracias', description: 'Ceremonia religiosa', completed: false },
  { id: 't4', time: '18:00', title: 'Llegada al Salón y Recepción', description: 'Cóctel y bienvenida a invitados', completed: false },
  { id: 't5', time: '19:30', title: 'Entrada Triunfal de la Quinceañera', description: 'Presentación oficial', completed: false },
  { id: 't6', time: '20:00', title: 'Cambio de Zapatilla, Corona y Muñeca', description: 'Tradición familiar', completed: false },
  { id: 't7', time: '20:30', title: 'Vals Principal & Baile con Papá', description: 'Vals emotivo con papá y chambelanes', completed: false },
  { id: 't8', time: '21:00', title: 'Brindis de Honor y Palabras', description: 'Brindis con familiares y padrinos', completed: false },
  { id: 't9', time: '21:30', title: 'Cena y Banquete', description: 'Servicio de comida', completed: false },
  { id: 't10', time: '22:45', title: 'Baile Sorpresa con Chambelanes', description: 'Coreografía moderna', completed: false },
  { id: 't11', time: '23:15', title: 'Apertura de Pista y Fiesta con DJ', description: 'Baile general', completed: false },
  { id: 't12', time: '00:30', title: 'Corte de Pastel y Fotos de Despedida', description: 'Cierre del evento', completed: false },
];

export const DEFAULT_PLAYLIST: SongItem[] = [
  { id: 'p1', moment: 'Entrada Triunfal', title: 'A Thousand Years', artist: 'Christina Perri', notes: 'Entrada elegante' },
  { id: 'p2', moment: 'Vals Principal', title: 'Tiempo de Vals', artist: 'Chayanne', notes: 'Vals oficial con chambelanes' },
  { id: 'p3', moment: 'Baile con Papá', title: 'No Crezcas Más', artist: 'Tercer Cielo', notes: 'Momento emotivo familiar' },
  { id: 'p4', moment: 'Baile Sorpresa', title: 'Mix Urbano & Pop Latino', artist: 'Varios Artistas', notes: 'Coreografía enérgica' },
  { id: 'p5', moment: 'Brindis', title: 'Can\'t Help Falling in Love', artist: 'Haley Reinhart', notes: 'Fondo suave' },
  { id: 'p6', moment: 'Corte de Pastel', title: 'Sugar', artist: 'Maroon 5', notes: 'Momento alegre' },
];

export const DEFAULT_BUDGET: BudgetItem[] = [
  { id: 'b1', concept: 'Renta del Salón de Fiestas / Carpa', category: 'Salón y Carpa', estimatedAmount: 25000, actualAmount: 0, status: 'pendiente' },
  { id: 'b2', concept: 'Vestido de Quinceañera y Tiara', category: 'Vestuario y Corona', estimatedAmount: 12000, actualAmount: 0, status: 'pendiente' },
  { id: 'b3', concept: 'Coreógrafo y Ensayos de Vals', category: 'Coreógrafo y Baile', estimatedAmount: 6000, actualAmount: 0, status: 'pendiente' },
  { id: 'b4', concept: 'Fotografía y Video Profesional', category: 'Foto y Video', estimatedAmount: 10000, actualAmount: 0, status: 'pendiente' },
  { id: 'b5', concept: 'Banquete para 150 personas y Bebidas', category: 'Banquete y Pastel', estimatedAmount: 30000, actualAmount: 0, status: 'pendiente' },
  { id: 'b6', concept: 'Pastel de Quinceañera y Mesa de Dulces', category: 'Banquete y Pastel', estimatedAmount: 4500, actualAmount: 0, status: 'pendiente' },
  { id: 'b7', concept: 'DJ, Audio Profesional e Iluminación', category: 'Música y DJ', estimatedAmount: 8000, actualAmount: 0, status: 'pendiente' },
  { id: 'b8', concept: 'Decoración Floral y Centros de Mesa', category: 'Decoración y Flores', estimatedAmount: 6500, actualAmount: 0, status: 'pendiente' },
  { id: 'b9', concept: 'Invitaciones Impresas y Digitales', category: 'Invitaciones y Recuerdos', estimatedAmount: 2500, actualAmount: 0, status: 'pendiente' },
];

export const DEFAULT_COURT: CourtMember[] = [
  { id: 'ch1', name: 'Chambelán de Honor', role: 'chambelan_honor', status: 'confirmado', outfitDetails: 'Traje formal negro con corbata combinada al vestido' },
];

export async function syncUserProfile(
  user: User,
  extra?: {
    phone?: string;
    userType?: 'quinceanera' | 'business';
    businessName?: string;
    businessCategory?: string;
    location?: string;
    cost?: '$' | '$$' | '$$$';
  }
): Promise<UserProfile | null> {
  if (!user.emailVerified || !user.email) {
    return null;
  }
  const path = `users/${user.uid}`;
  try {
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    const fallbackName = user.displayName?.trim() || user.email.split('@')[0] || 'Usuario';

    if (snap.exists()) {
      const existing = snap.data() as UserProfile;
      const updates: Record<string, any> = {
        updatedAt: serverTimestamp(),
      };
      if (extra?.userType && !existing.userType) {
        updates.userType = extra.userType;
      }
      if (extra?.businessName && !existing.businessName) {
        updates.businessName = clampString(extra.businessName, 120);
      }
      if (extra?.businessCategory && !existing.businessCategory) {
        updates.businessCategory = clampString(extra.businessCategory, 200);
      }
      if (Object.keys(updates).length > 1) {
        await updateDoc(ref, updates as any);
      }
      return (await getDoc(ref)).data() as UserProfile;
    }

    const payload: Record<string, unknown> = {
      uid: user.uid,
      displayName: clampString(fallbackName, 100),
      email: clampString(user.email, 200),
      userType: extra?.userType || 'quinceanera',
      musicPreferences: [],
      dancePreferences: [],
      themePreferences: [],
      checklist: DEFAULT_CHECKLIST,
      godparents: [],
      tables: [],
      budgetItems: DEFAULT_BUDGET,
      courtOfHonor: DEFAULT_COURT,
      timeline: DEFAULT_TIMELINE,
      playlist: DEFAULT_PLAYLIST,
      totalBudget: 104500,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (extra?.businessName) {
      payload.businessName = clampString(extra.businessName, 120);
    }
    if (extra?.businessCategory) {
      payload.businessCategory = clampString(extra.businessCategory, 200);
    }
    if (extra?.userType === 'business' && extra?.location) {
      payload.businessLocation = clampString(extra.location, 200);
    }

    const inferredSignupCoords = extra?.location
      ? inferCoordsFromLocation(extra.location)
      : null;
    if (inferredSignupCoords) {
      payload.latitude = inferredSignupCoords.lat;
      payload.longitude = inferredSignupCoords.lng;
    }

    const phoneValue = extra?.phone?.trim() || user.phoneNumber?.trim();
    if (phoneValue) {
      payload.phone = clampString(phoneValue, 30);
    }
    if (user.photoURL?.trim()) {
      payload.photoURL = clampString(user.photoURL, 500);
    }

    await setDoc(ref, payload);

    if (extra?.userType === 'business' && extra?.businessName) {
      const academyId = slugifyAcademyId(extra.businessName);
      const academyRef = doc(db, 'academies', academyId);
      const academySnap = await getDoc(academyRef);
      if (!academySnap.exists()) {
        const styles = extra.businessCategory
          ? extra.businessCategory.split(',').map((s) => s.trim()).filter(Boolean)
          : ['Vals', 'Coreografía'];
        const locValue = clampString(extra.location || 'Ciudad de México', 200);
        const academyCoords = inferCoordsFromLocation(locValue);

        await setDoc(academyRef, {
          id: academyId,
          name: clampString(extra.businessName, 120),
          description: `Empresa / Academia especializada en ${clampString(extra.businessCategory || 'servicios para Quinceañera', 300)}.`,
          longDescription: `Bienvenidos a ${extra.businessName}. Ofrecemos servicios profesionales de alta calidad para tu Quinceañera, destacando en: ${extra.businessCategory || 'Coreografía y eventos'}. ¡Contáctanos y haz de tu fecha un día inolvidable!`,
          cost: extra.cost || '$$',
          location: locValue,
          ...(academyCoords ? { latitude: academyCoords.lat, longitude: academyCoords.lng } : {}),
          popularity: 'Nueva',
          danceStyles: styles.length > 0 ? styles : ['Vals'],
          phone: clampString(phoneValue || '5500000000', 30),
          email: clampString(user.email, 200),
          website: 'www.mundo15.com',
          logoImageId: 'academy-logo-1',
          galleryImageIds: ['gallery-1-1', 'gallery-1-2', 'gallery-1-3'],
          isPublished: true,
          displayOrder: 10,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    const created = await getDoc(ref);
    return created.exists() ? (created.data() as UserProfile) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data() as UserProfile) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function updateUserProfile(
  uid: string,
  updates: {
    displayName?: string;
    phone?: string;
    photoURL?: string;
    userType?: 'quinceanera' | 'business';
    businessName?: string;
    businessCategory?: string;
    businessDescription?: string;
    businessCost?: '$' | '$$' | '$$$';
    businessLocation?: string;
    businessWebsite?: string;
    businessPhone?: string;
    latitude?: number;
    longitude?: number;
    eventDate?: string;
    eventLocation?: string;
    colorPalette?: string[];
    totalBudget?: number;
    musicPreferences?: string[];
    dancePreferences?: string[];
    themePreferences?: string[];
    mediaGallery?: MediaAsset[];
    checklist?: ChecklistItem[];
    godparents?: GodparentItem[];
    tables?: TableItem[];
    budgetItems?: BudgetItem[];
    courtOfHonor?: CourtMember[];
    timeline?: TimelineItem[];
    playlist?: SongItem[];
  }
): Promise<void> {
  const path = `users/${uid}`;
  try {
    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (updates.displayName !== undefined) {
      const cleanName = clampString(updates.displayName, 100);
      if (cleanName.length >= 1) payload.displayName = cleanName;
    }
    if (updates.phone !== undefined) payload.phone = clampString(updates.phone, 30);
    if (updates.photoURL !== undefined) payload.photoURL = clampString(updates.photoURL, 1000);
    if (updates.userType !== undefined) payload.userType = updates.userType;
    if (updates.businessName !== undefined) {
      payload.businessName = clampString(updates.businessName, 120);
    }
    if (updates.businessCategory !== undefined) {
      payload.businessCategory = clampString(updates.businessCategory, 200);
    }
    if (updates.businessDescription !== undefined) {
      payload.businessDescription = clampString(updates.businessDescription, 4000);
    }
    if (updates.businessCost !== undefined) payload.businessCost = updates.businessCost;
    if (updates.businessLocation !== undefined) {
      payload.businessLocation = clampString(updates.businessLocation, 200);
    }
    if (updates.businessWebsite !== undefined) {
      payload.businessWebsite = clampString(updates.businessWebsite, 300);
    }
    if (updates.businessPhone !== undefined) {
      payload.businessPhone = clampString(updates.businessPhone, 30);
    }
    if (updates.latitude !== undefined && Number.isFinite(updates.latitude)) {
      payload.latitude = updates.latitude;
    }
    if (updates.longitude !== undefined && Number.isFinite(updates.longitude)) {
      payload.longitude = updates.longitude;
    }
    if (updates.eventDate !== undefined) {
      payload.eventDate = clampString(updates.eventDate, 50);
    }
    if (updates.eventLocation !== undefined) {
      payload.eventLocation = clampString(updates.eventLocation, 200);
    }
    if (updates.colorPalette !== undefined) {
      payload.colorPalette = clampStringList(updates.colorPalette, 10);
    }
    if (updates.totalBudget !== undefined) {
      payload.totalBudget = Math.max(0, Math.floor(updates.totalBudget));
    }
    if (updates.musicPreferences !== undefined) {
      payload.musicPreferences = clampStringList(updates.musicPreferences, 20);
    }
    if (updates.dancePreferences !== undefined) {
      payload.dancePreferences = clampStringList(updates.dancePreferences, 20);
    }
    if (updates.themePreferences !== undefined) {
      payload.themePreferences = clampStringList(updates.themePreferences, 20);
    }
    if (updates.mediaGallery !== undefined) {
      payload.mediaGallery = updates.mediaGallery.slice(0, 30);
    }
    if (updates.checklist !== undefined) payload.checklist = updates.checklist;
    if (updates.godparents !== undefined) payload.godparents = updates.godparents;
    if (updates.tables !== undefined) payload.tables = updates.tables;
    if (updates.budgetItems !== undefined) payload.budgetItems = updates.budgetItems;
    if (updates.courtOfHonor !== undefined) payload.courtOfHonor = updates.courtOfHonor;
    if (updates.timeline !== undefined) payload.timeline = updates.timeline;
    if (updates.playlist !== undefined) payload.playlist = updates.playlist;

    await updateDoc(doc(db, 'users', uid), payload as any);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function listAllUsers(): Promise<UserProfile[]> {
  const path = 'users';
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map((d) => d.data() as UserProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function listAdmins(): Promise<AdminRole[]> {
  const path = 'admins';
  try {
    const snap = await getDocs(collection(db, 'admins'));
    return snap.docs.map((d) => d.data() as AdminRole);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function grantAdminRole(
  targetUid: string,
  targetEmail: string,
  grantedByUid: string
): Promise<void> {
  const path = `admins/${targetUid}`;
  try {
    await setDoc(doc(db, 'admins', targetUid), {
      uid: clampString(targetUid, 128),
      email: clampString(targetEmail, 200),
      grantedBy: clampString(grantedByUid, 128),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function revokeAdminRole(targetUid: string): Promise<void> {
  const path = `admins/${targetUid}`;
  try {
    await deleteDoc(doc(db, 'admins', targetUid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeAcademies(
  isAdminUser: boolean,
  onData: (academies: Academy[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const path = 'academies';
  const academiesQuery = isAdminUser
    ? collection(db, 'academies')
    : query(collection(db, 'academies'), where('isPublished', '==', true));

  return onSnapshot(
    academiesQuery,
    (snapshot) => {
      const list = snapshot.docs.map((d) =>
        mapAcademyDoc(d.id, d.data() as Record<string, unknown>)
      );
      list.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError) {
          onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
        }
      }
    }
  );
}

export async function getAcademyFromFirestore(id: string): Promise<Academy | null> {
  const path = `academies/${id}`;
  try {
    const snap = await getDoc(doc(db, 'academies', id));
    if (!snap.exists()) return null;
    return mapAcademyDoc(snap.id, snap.data() as Record<string, unknown>);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function getAcademyByCreator(uid: string): Promise<Academy | null> {
  const path = 'academies';
  try {
    const q = query(collection(db, 'academies'), where('createdBy', '==', uid));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return mapAcademyDoc(d.id, d.data() as Record<string, unknown>);
  } catch (error) {
    console.error('Error al buscar academia por creador:', error);
    return null;
  }
}

export type AcademyMutationInput = {
  id?: string;
  name: string;
  description: string;
  longDescription: string;
  cost: '$' | '$$' | '$$$';
  location: string;
  locationLink?: string;
  latitude?: number;
  longitude?: number;
  popularity: 'Alta' | 'Media' | 'Nueva';
  danceStyles: string[];
  phone: string;
  email: string;
  website: string;
  logoImageId?: string;
  coverImageUrl?: string;
  galleryImageIds?: string[];
  galleryMedia?: MediaAsset[];
  isPublished?: boolean;
  displayOrder?: number;
};

export async function createAcademy(
  input: AcademyMutationInput,
  creatorUid: string
): Promise<string> {
  const id = input.id && /^[a-zA-Z0-9_-]+$/.test(input.id)
    ? clampString(input.id, 128)
    : slugifyAcademyId(input.name);
  const path = `academies/${id}`;

  try {
    const danceStyles = clampStringList(input.danceStyles, 20);
    const payload: Record<string, unknown> = {
      id,
      name: clampString(input.name, 120),
      description: clampString(input.description, 400),
      longDescription: clampString(input.longDescription, 4000),
      cost: input.cost,
      location: clampString(input.location, 200),
      popularity: input.popularity,
      danceStyles: danceStyles.length > 0 ? danceStyles : ['Vals'],
      phone: clampString(input.phone, 30),
      email: clampString(input.email, 200),
      website: clampString(input.website, 300),
      logoImageId: clampString(input.logoImageId || 'academy-logo-1', 100),
      galleryImageIds: clampStringList(
        input.galleryImageIds || ['gallery-1-1', 'gallery-1-2', 'gallery-1-3'],
        20
      ),
      isPublished: input.isPublished ?? true,
      displayOrder: Math.max(0, Math.floor(input.displayOrder ?? 0)),
      createdBy: clampString(creatorUid, 128),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (input.locationLink?.trim()) {
      payload.locationLink = clampString(input.locationLink, 500);
    }
    const resolvedCreateCoords =
      input.latitude !== undefined &&
      input.longitude !== undefined &&
      Number.isFinite(input.latitude) &&
      Number.isFinite(input.longitude)
        ? { lat: input.latitude, lng: input.longitude }
        : inferCoordsFromLocation(input.location);
    if (resolvedCreateCoords) {
      payload.latitude = resolvedCreateCoords.lat;
      payload.longitude = resolvedCreateCoords.lng;
    }
    if (input.coverImageUrl?.trim()) {
      payload.coverImageUrl = clampString(input.coverImageUrl, 1000);
    }
    if (input.galleryMedia && input.galleryMedia.length > 0) {
      payload.galleryMedia = input.galleryMedia.slice(0, 30);
    }

    await setDoc(doc(db, 'academies', id), payload);
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateAcademy(
  id: string,
  input: Partial<AcademyMutationInput>
): Promise<void> {
  const path = `academies/${id}`;
  try {
    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (input.name !== undefined) payload.name = clampString(input.name, 120);
    if (input.description !== undefined) payload.description = clampString(input.description, 400);
    if (input.longDescription !== undefined) {
      payload.longDescription = clampString(input.longDescription, 4000);
    }
    if (input.cost !== undefined) payload.cost = input.cost;
    if (input.location !== undefined) payload.location = clampString(input.location, 200);
    if (input.locationLink !== undefined && input.locationLink.trim()) {
      payload.locationLink = clampString(input.locationLink, 500);
    }
    if (input.latitude !== undefined && Number.isFinite(input.latitude)) {
      payload.latitude = input.latitude;
    } else if (input.location !== undefined) {
      const inferred = inferCoordsFromLocation(input.location);
      if (inferred) payload.latitude = inferred.lat;
    }
    if (input.longitude !== undefined && Number.isFinite(input.longitude)) {
      payload.longitude = input.longitude;
    } else if (input.location !== undefined) {
      const inferred = inferCoordsFromLocation(input.location);
      if (inferred) payload.longitude = inferred.lng;
    }
    if (input.popularity !== undefined) payload.popularity = input.popularity;
    if (input.danceStyles !== undefined) {
      const styles = clampStringList(input.danceStyles, 20);
      payload.danceStyles = styles.length > 0 ? styles : ['Vals'];
    }
    if (input.phone !== undefined) payload.phone = clampString(input.phone, 30);
    if (input.email !== undefined) payload.email = clampString(input.email, 200);
    if (input.website !== undefined) payload.website = clampString(input.website, 300);
    if (input.logoImageId !== undefined) payload.logoImageId = clampString(input.logoImageId, 100);
    if (input.coverImageUrl !== undefined) {
      payload.coverImageUrl = clampString(input.coverImageUrl, 1000);
    }
    if (input.galleryImageIds !== undefined) {
      payload.galleryImageIds = clampStringList(input.galleryImageIds, 20);
    }
    if (input.galleryMedia !== undefined) {
      payload.galleryMedia = input.galleryMedia.slice(0, 30);
    }
    if (input.isPublished !== undefined) payload.isPublished = input.isPublished;
    if (input.displayOrder !== undefined) {
      payload.displayOrder = Math.max(0, Math.floor(input.displayOrder));
    }

    await updateDoc(doc(db, 'academies', id), payload as any);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteAcademy(id: string): Promise<void> {
  const path = `academies/${id}`;
  try {
    await deleteDoc(doc(db, 'academies', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function seedInitialAcademies(adminUid: string): Promise<number> {
  let createdCount = 0;
  for (let i = 0; i < defaultAcademies.length; i++) {
    const academy = defaultAcademies[i];
    const path = `academies/${academy.id}`;
    try {
      const existingSnap = await getDoc(doc(db, 'academies', academy.id));
      if (!existingSnap.exists()) {
        await createAcademy(
          {
            id: academy.id,
            name: academy.name,
            description: academy.description,
            longDescription: academy.longDescription,
            cost: academy.cost,
            location: academy.location,
            locationLink: academy.locationLink,
            latitude: academy.latitude,
            longitude: academy.longitude,
            popularity: academy.popularity,
            danceStyles: academy.danceStyles,
            phone: academy.contact.phone,
            email: academy.contact.email,
            website: academy.contact.website,
            logoImageId: academy.logoImageId,
            galleryImageIds: academy.galleryImageIds,
            isPublished: true,
            displayOrder: i,
          },
          adminUid
        );
        createdCount++;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
  return createdCount;
}

export async function createQuoteRequest(input: {
  academyId: string;
  academyName: string;
  userId: string;
  userName: string;
  userEmail: string;
  eventDate?: string;
  message: string;
}): Promise<string> {
  const ref = doc(collection(db, 'quoteRequests'));
  const path = `quoteRequests/${ref.id}`;
  try {
    const payload: Record<string, unknown> = {
      id: ref.id,
      academyId: clampString(input.academyId, 128),
      academyName: clampString(input.academyName, 120),
      userId: clampString(input.userId, 128),
      userName: clampString(input.userName, 100),
      userEmail: clampString(input.userEmail, 200),
      message: clampString(input.message, 1000),
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (input.eventDate?.trim()) {
      payload.eventDate = clampString(input.eventDate, 50);
    }
    await setDoc(ref, payload);
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function listQuoteRequests(
  isAdminUser: boolean,
  uid: string
): Promise<QuoteRequest[]> {
  const path = 'quoteRequests';
  try {
    const q = isAdminUser
      ? collection(db, 'quoteRequests')
      : query(collection(db, 'quoteRequests'), where('userId', '==', uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as QuoteRequest);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function listAcademyQuotes(academyId: string): Promise<QuoteRequest[]> {
  const path = 'quoteRequests';
  try {
    const q = query(collection(db, 'quoteRequests'), where('academyId', '==', academyId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as QuoteRequest);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function updateQuoteRequestStatus(
  id: string,
  status: QuoteRequestStatus
): Promise<void> {
  const path = `quoteRequests/${id}`;
  try {
    await updateDoc(doc(db, 'quoteRequests', id), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteQuoteRequest(id: string): Promise<void> {
  const path = `quoteRequests/${id}`;
  try {
    await deleteDoc(doc(db, 'quoteRequests', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export const SEED_ACADEMY_REVIEWS: AcademyReview[] = [
  {
    id: 'seed-rev-1',
    academyId: 'ritmo-latino',
    userId: 'seed-user-1',
    userName: 'Sofía Montemayor',
    userRole: 'Quinceañera',
    rating: 5,
    title: '¡El mejor vals y baile sorpresa de mi vida!',
    comment:
      'Tenía muchísimo miedo porque mis chambelanes nunca habían bailado en su vida, pero los maestros tuvieron una paciencia infinita. Nuestro baile sorpresa de merengue y bachata dejó a todos los invitados boquiabiertos. ¡Totalmente recomendados!',
    serviceHired: 'Paquete Vals Principal & Baile Sorpresa',
    eventDate: 'Octubre 2025',
    verifiedBooking: true,
    createdAt: '2025-10-18T20:00:00.000Z',
    updatedAt: '2025-10-18T20:00:00.000Z',
  },
  {
    id: 'seed-rev-2',
    academyId: 'ritmo-latino',
    userId: 'seed-user-2',
    userName: 'Mariana Garza V.',
    userRole: 'Mamá de la Quinceañera',
    rating: 5,
    title: 'Profesionales, puntuales y muy amables',
    comment:
      'Como mamá estaba muy estresada con los tiempos y ensayos. El equipo de Ritmo Latino coordinó todo perfecto, desde la entrada triunfal hasta el vals con su papá. Nos ayudaron a editar la música y asistieron al ensayo general en el salón.',
    serviceHired: 'Coreografía Integral & Asesoría',
    eventDate: 'Diciembre 2025',
    verifiedBooking: true,
    createdAt: '2025-12-05T18:30:00.000Z',
    updatedAt: '2025-12-05T18:30:00.000Z',
  },
  {
    id: 'seed-rev-3',
    academyId: 'elegancia-choreography',
    userId: 'seed-user-3',
    userName: 'Valeria Cárdenas',
    userRole: 'Quinceañera',
    rating: 5,
    title: 'Parecía una coreografía de cuento de hadas',
    comment:
      'El vals clásico con las tiaras y el cambio de zapatillas fue súper emotivo. Lograron que los 6 chambelanes se vieran como caballeros de honor súper coordinados. Gracias profesor Carlos por creer en mí.',
    serviceHired: 'Vals Clásico & Entrada Solemne',
    eventDate: 'Noviembre 2025',
    verifiedBooking: true,
    createdAt: '2025-11-22T15:00:00.000Z',
    updatedAt: '2025-11-22T15:00:00.000Z',
  },
  {
    id: 'seed-rev-4',
    academyId: 'elegancia-choreography',
    userId: 'seed-user-4',
    userName: 'Patricia Del Bosque',
    userRole: 'Mamá de la Quinceañera',
    rating: 5,
    title: 'Excelente disciplina y respeto',
    comment:
      'Un ambiente sumamente respetuoso y seguro para las chicas y jóvenes. Muy detallistas en la postura, la elegancia de los vestidos y los tiempos de la música.',
    serviceHired: 'Paquete Diamante Quince Años',
    eventDate: 'Enero 2026',
    verifiedBooking: true,
    createdAt: '2026-01-14T19:00:00.000Z',
    updatedAt: '2026-01-14T19:00:00.000Z',
  },
  {
    id: 'seed-rev-5',
    academyId: 'suenos-de-vals',
    userId: 'seed-user-5',
    userName: 'Camila Villalobos',
    userRole: 'Quinceañera',
    rating: 5,
    title: '¡El mix de reggaetón y vals fue una locura!',
    comment:
      'Todos mis amigos de la secundaria me dijeron que fue la mejor fiesta a la que han ido. Los maestros crearon una mezcla musical única solo para mí y nos enseñaron trucos acrobáticos sencillos pero súper vistosos.',
    serviceHired: 'Baile Sorpresa Urbano + Vals',
    eventDate: 'Septiembre 2025',
    verifiedBooking: true,
    createdAt: '2025-09-30T17:00:00.000Z',
    updatedAt: '2025-09-30T17:00:00.000Z',
  },
  {
    id: 'seed-rev-6',
    academyId: 'ecos-del-sur',
    userId: 'seed-user-6',
    userName: 'Andrea Treviño',
    userRole: 'Quinceañera',
    rating: 5,
    title: 'El zapateado folklórico con vestido charro fue inolvidable',
    comment:
      'Queríamos una temática mexicana moderna con mariachi en vivo. La academia montó el huapango y la transición al vals de manera impecable. Mi abuelita lloró de la emoción.',
    serviceHired: 'Vals Tradicional & Danza Regional',
    eventDate: 'Febrero 2026',
    verifiedBooking: true,
    createdAt: '2026-02-08T21:00:00.000Z',
    updatedAt: '2026-02-08T21:00:00.000Z',
  },
];

export async function listAcademyReviews(academyId: string): Promise<AcademyReview[]> {
  const path = 'academyReviews';
  try {
    const q = query(collection(db, 'academyReviews'), where('academyId', '==', academyId));
    const snap = await getDocs(q);
    const firestoreReviews = snap.docs.map((d) => d.data() as AcademyReview);

    // Merge with seed reviews matching academyId (ensuring no duplicate IDs)
    const seedMatching = SEED_ACADEMY_REVIEWS.filter((r) => r.academyId === academyId);
    const existingIds = new Set(firestoreReviews.map((r) => r.id));
    const combined = [...firestoreReviews];

    for (const seed of seedMatching) {
      if (!existingIds.has(seed.id)) {
        combined.push(seed);
      }
    }

    // Sort newest first
    return combined.sort((a, b) => {
      const timeA = new Date((a.createdAt as string) || 0).getTime();
      const timeB = new Date((b.createdAt as string) || 0).getTime();
      return timeB - timeA;
    });
  } catch (error) {
    console.warn('Error al leer reseñas de Firestore, cargando testimonios de respaldo:', error);
    return SEED_ACADEMY_REVIEWS.filter((r) => r.academyId === academyId);
  }
}

export async function createAcademyReview(
  data: Omit<AcademyReview, 'id' | 'createdAt' | 'updatedAt'>
): Promise<AcademyReview> {
  const randomSuffix = Math.random().toString(36).slice(2, 9);
  const id = `rev_${Date.now()}_${randomSuffix}`;
  const path = `academyReviews/${id}`;

  const reviewDoc: Record<string, unknown> = {
    id,
    academyId: clampString(data.academyId, 128),
    userId: clampString(data.userId, 128),
    userName: clampString(data.userName, 100),
    rating: Math.min(5, Math.max(1, Number(data.rating) || 5)),
    title: clampString(data.title, 120),
    comment: clampString(data.comment, 2000),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (data.userRole) {
    reviewDoc.userRole = clampString(data.userRole, 80);
  }
  if (data.serviceHired) {
    reviewDoc.serviceHired = clampString(data.serviceHired, 120);
  }
  if (data.eventDate) {
    reviewDoc.eventDate = clampString(data.eventDate, 60);
  }
  if (typeof data.verifiedBooking === 'boolean') {
    reviewDoc.verifiedBooking = data.verifiedBooking;
  }

  try {
    await setDoc(doc(db, 'academyReviews', id), reviewDoc);
    return {
      id,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteAcademyReview(id: string): Promise<void> {
  const path = `academyReviews/${id}`;
  try {
    await deleteDoc(doc(db, 'academyReviews', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

