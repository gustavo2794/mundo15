'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { VISUAL_ASSETS } from '@/lib/visual-assets';
import {
  createAcademy,
  deleteQuoteRequest,
  getAcademyByCreator,
  listAcademyQuotes,
  listQuoteRequests,
  updateAcademy,
  updateQuoteRequestStatus,
  updateUserProfile,
  DEFAULT_CHECKLIST,
  DEFAULT_TIMELINE,
  DEFAULT_PLAYLIST,
  DEFAULT_BUDGET,
  DEFAULT_COURT,
} from '@/lib/firestore-service';
import type { Academy } from '@/lib/data';
import {
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
} from '@/lib/types';
import {
  inferCoordsFromLocation,
  reverseGeocodeCoords,
} from '@/lib/location-utils';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import {
  AvatarUploader,
  CoverImageUploader,
  MediaManager,
} from '@/components/media-manager';
import { GuestCsvImporter, exportGuestsToCsv } from '@/components/guest-csv-importer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Loader2,
  Edit,
  Save,
  Trash2,
  Plus,
  Building2,
  Crown,
  CheckCircle2,
  Users,
  LayoutGrid,
  FileText,
  Image as ImageIcon,
  Calendar,
  Clock,
  Sparkles,
  Music,
  DollarSign,
  Palette,
  Phone,
  Check,
  PartyPopper,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ListTodo,
  LocateFixed,
  MapPin,
  Video,
  Download,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

const musicGenresList = [
  'Vals Tradicional',
  'Vals Moderno / Pop',
  'Reggaeton',
  'Bachata',
  'Salsa',
  'Cumbia',
  'Regional Mexicano / Banda',
  'Pop en Español',
  'Pop en Inglés',
  'Electrónica / EDM',
  'K-Pop',
  'Rock Clásico',
];

const danceStylesList = [
  'Vals Clásico',
  'Vals con Mezcla Moderna',
  'Coreografía Urbana / Hip Hop',
  'Baile Sorpresa Mix',
  'Ritmos Latinos',
  'Contemporáneo',
  'Folklórico Mexicano',
  'K-Pop Dance Cover',
];

const eventThemesList = [
  'Princesa de Cuento de Hadas',
  'Hollywood Glam & Alfombra Roja',
  'Mascarada Veneciana',
  'Bosque Encantado / Fantasy',
  'Fiesta Neón & Glow in the Dark',
  'Cenicienta Moderna',
  'Gala de Medianoche (Azul Noche & Dorado)',
  'Vintage Rose & Champagne',
  'Viaje a París / Romance',
  'Boho Chic Floral',
];

const paletteOptions = [
  { name: 'Rose Gold & Champagne', colors: ['#E0A899', '#F7E7CE', '#FFFFFF'] },
  { name: 'Azul Real & Dorado', colors: ['#002366', '#FFD700', '#FFFFFF'] },
  { name: 'Lavanda & Plata', colors: ['#E6E6FA', '#C0C0C0', '#4A3B69'] },
  { name: 'Verde Esmeralda & Oro', colors: ['#50C878', '#D4AF37', '#1A3323'] },
  { name: 'Rojo Pasión & Negro', colors: ['#C41E3A', '#1C1C1C', '#D4AF37'] },
  { name: 'Rosa Pastel & Blanco Perla', colors: ['#FFD1DC', '#FDFBF7', '#E8D3D8'] },
  { name: 'Lila & Ceniza', colors: ['#C8A2C8', '#8A8694', '#FFFFFF'] },
];

const statusLabels: Record<QuoteRequest['status'], string> = {
  pending: 'Pendiente',
  contacted: 'Contactado',
  archived: 'Archivado',
};

export default function ProfilePage() {
  const { user, profile, loading, refreshProfile, refreshUser } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('checklist');
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');

  // Business profile state
  const [businessNameInput, setBusinessNameInput] = useState('');
  const [businessCategoryInput, setBusinessCategoryInput] = useState('');
  const [businessDescInput, setBusinessDescInput] = useState('');
  const [businessCostInput, setBusinessCostInput] = useState<'$' | '$$' | '$$$'>('$$');
  const [businessLocationInput, setBusinessLocationInput] = useState('');
  const [businessWebsiteInput, setBusinessWebsiteInput] = useState('');
  const [businessPhoneInput, setBusinessPhoneInput] = useState('');
  const [businessLat, setBusinessLat] = useState<number | undefined>(undefined);
  const [businessLng, setBusinessLng] = useState<number | undefined>(undefined);
  const [businessCoverUrl, setBusinessCoverUrl] = useState('');
  const [businessGalleryMedia, setBusinessGalleryMedia] = useState<MediaAsset[]>([]);
  const [myAcademy, setMyAcademy] = useState<Academy | null>(null);
  const [businessQuotes, setBusinessQuotes] = useState<QuoteRequest[]>([]);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [businessTab, setBusinessTab] = useState<'info' | 'gallery' | 'quotes'>('info');

  // Quinceañera Event Overview & Countdown
  const [eventDateInput, setEventDateInput] = useState('');
  const [eventLocationInput, setEventLocationInput] = useState('');
  const [eventLat, setEventLat] = useState<number | undefined>(undefined);
  const [eventLng, setEventLng] = useState<number | undefined>(undefined);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('');
  const [selectedPalette, setSelectedPalette] = useState('');
  const [musicPrefs, setMusicPrefs] = useState<string[]>([]);
  const [dancePrefs, setDancePrefs] = useState<string[]>([]);
  const [mediaGallery, setMediaGallery] = useState<MediaAsset[]>([]);
  const [savingEventInfo, setSavingEventInfo] = useState(false);

  // Planning Tools state
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newChecklistCategory, setNewChecklistCategory] = useState('General');

  const [totalBudget, setTotalBudget] = useState<number>(100000);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [newExpenseConcept, setNewExpenseConcept] = useState('');
  const [newExpenseCategory, setNewExpenseCategory] = useState('Salón y Carpa');
  const [newExpenseEstimated, setNewExpenseEstimated] = useState('');
  const [newExpenseActual, setNewExpenseActual] = useState('');
  const [newExpenseStatus, setNewExpenseStatus] = useState<'pendiente' | 'anticipo' | 'pagado'>('pendiente');

  const [courtOfHonor, setCourtOfHonor] = useState<CourtMember[]>([]);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'chambelan' | 'dama' | 'chambelan_honor'>('chambelan');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberOutfit, setNewMemberOutfit] = useState('');
  const [newMemberStatus, setNewMemberStatus] = useState<'confirmado' | 'ensayando' | 'pendiente'>('ensayando');

  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [newTimelineTime, setNewTimelineTime] = useState('18:00');
  const [newTimelineTitle, setNewTimelineTitle] = useState('');
  const [newTimelineDesc, setNewTimelineDesc] = useState('');

  const [playlist, setPlaylist] = useState<SongItem[]>([]);
  const [newSongMoment, setNewSongMoment] = useState('Vals Principal');
  const [newSongTitle, setNewSongTitle] = useState('');
  const [newSongArtist, setNewSongArtist] = useState('');
  const [newSongNotes, setNewSongNotes] = useState('');

  const [godparents, setGodparents] = useState<GodparentItem[]>([]);
  const [newGodparentName, setNewGodparentName] = useState('');
  const [newGodparentRole, setNewGodparentRole] = useState('Madrina de Vestido');
  const [newGodparentPhone, setNewGodparentPhone] = useState('');

  const [tables, setTables] = useState<TableItem[]>([]);
  const [newTableName, setNewTableName] = useState('');
  const [newGuestName, setNewGuestName] = useState('');
  const [selectedTableId, setSelectedTableId] = useState('');

  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  const [switchingRole, setSwitchingRole] = useState(false);

  const isBusiness = profile?.userType === 'business';

  // Synchronize state with profile
  useEffect(() => {
    if (profile) {
      setNameInput(profile.displayName || user?.displayName || '');
      setPhoneInput(profile.phone || '');
      setBusinessNameInput(profile.businessName || '');
      setBusinessCategoryInput(profile.businessCategory || '');
      setBusinessDescInput(profile.businessDescription || '');
      setBusinessCostInput(profile.businessCost || '$$');
      setBusinessLocationInput(profile.businessLocation || '');
      setBusinessWebsiteInput(profile.businessWebsite || '');
      setBusinessPhoneInput(profile.businessPhone || '');
      setBusinessLat(profile.latitude);
      setBusinessLng(profile.longitude);

      setEventDateInput(profile.eventDate || '');
      setEventLocationInput(profile.eventLocation || '');
      setEventLat(profile.latitude);
      setEventLng(profile.longitude);
      setSelectedTheme(profile.themePreferences?.[0] || '');
      setSelectedPalette(profile.colorPalette?.[0] || 'Rose Gold & Champagne');
      setMusicPrefs(profile.musicPreferences || []);
      setDancePrefs(profile.dancePreferences || []);
      setMediaGallery(profile.mediaGallery || []);

      setChecklist(profile.checklist && profile.checklist.length > 0 ? profile.checklist : DEFAULT_CHECKLIST);
      setTotalBudget(profile.totalBudget ?? 100000);
      setBudgetItems(profile.budgetItems && profile.budgetItems.length > 0 ? profile.budgetItems : DEFAULT_BUDGET);
      setCourtOfHonor(profile.courtOfHonor && profile.courtOfHonor.length > 0 ? profile.courtOfHonor : DEFAULT_COURT);
      setTimeline(profile.timeline && profile.timeline.length > 0 ? profile.timeline : DEFAULT_TIMELINE);
      setPlaylist(profile.playlist && profile.playlist.length > 0 ? profile.playlist : DEFAULT_PLAYLIST);
      setGodparents(profile.godparents || []);
      setTables(profile.tables || []);
    } else if (user) {
      setNameInput(user.displayName || '');
      setPhoneInput(user.phoneNumber || '');
      setChecklist(DEFAULT_CHECKLIST);
      setBudgetItems(DEFAULT_BUDGET);
      setCourtOfHonor(DEFAULT_COURT);
      setTimeline(DEFAULT_TIMELINE);
      setPlaylist(DEFAULT_PLAYLIST);
    }
  }, [profile, user]);

  // Load quotes and academy details
  useEffect(() => {
    if (!user) return;
    let active = true;
    async function loadData() {
      setLoadingQuotes(true);
      try {
        if (isBusiness) {
          const academy = await getAcademyByCreator(user!.uid);
          if (active && academy) {
            setMyAcademy(academy);
            setBusinessCoverUrl(academy.coverImageUrl || '');
            setBusinessGalleryMedia(academy.galleryMedia || []);
            if (academy.latitude !== undefined) setBusinessLat(academy.latitude);
            if (academy.longitude !== undefined) setBusinessLng(academy.longitude);
            const inq = await listAcademyQuotes(academy.id);
            if (active) setBusinessQuotes(inq);
          }
        } else {
          const list = await listQuoteRequests(false, user!.uid);
          if (active) setQuotes(list);
        }
      } catch (error) {
        console.error('Error al cargar cotizaciones en perfil:', error);
      } finally {
        if (active) setLoadingQuotes(false);
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, [user, isBusiness]);

  // Real-time countdown calculation
  const countdown = useMemo(() => {
    if (!eventDateInput) return null;
    const target = new Date(eventDateInput).getTime();
    if (isNaN(target)) return null;
    const now = new Date().getTime();
    const diff = target - now;
    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, passed: true };
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { days, hours, minutes, passed: false };
  }, [eventDateInput]);

  // Planning stats calculation
  const stats = useMemo(() => {
    const totalTasks = checklist.length;
    const completedTasks = checklist.filter((i) => i.completed).length;
    const taskPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const totalEstimatedExpenses = budgetItems.reduce((acc, curr) => acc + (curr.estimatedAmount || 0), 0);
    const totalPaidExpenses = budgetItems.reduce((acc, curr) => acc + (curr.actualAmount || 0), 0);
    const budgetRemaining = Math.max(0, totalBudget - totalPaidExpenses);

    const totalGodparents = godparents.length;
    const totalCourt = courtOfHonor.length;

    let totalGuests = 0;
    tables.forEach((t) => {
      totalGuests += t.guests.length;
    });

    return {
      totalTasks,
      completedTasks,
      taskPercent,
      totalEstimatedExpenses,
      totalPaidExpenses,
      budgetRemaining,
      totalGodparents,
      totalCourt,
      totalGuests,
      totalTables: tables.length,
    };
  }, [checklist, budgetItems, totalBudget, godparents, courtOfHonor, tables]);

  const getInitials = (name: string | null | undefined, email?: string | null) => {
    if (name?.trim()) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
    }
    return email ? email[0].toUpperCase() : 'XV';
  };

  // Toggle user role between quinceanera and business
  const handleToggleUserType = async (newType: 'quinceanera' | 'business') => {
    if (!user || newType === profile?.userType) return;
    setSwitchingRole(true);
    try {
      await updateUserProfile(user.uid, { userType: newType });
      await refreshProfile();
      toast({
        title: 'Tipo de cuenta actualizado',
        description:
          newType === 'business'
            ? 'Ahora tienes un perfil de Empresa/Academia para publicar tus servicios.'
            : 'Bienvenida a tu Planeador de Quinceañera.',
      });
    } catch (error) {
      console.error('Error al cambiar rol:', error);
      toast({ variant: 'destructive', title: 'Error al cambiar cuenta' });
    } finally {
      setSwitchingRole(false);
    }
  };

  // Save personal profile details
  const savePersonalInfo = async () => {
    if (!user) return;
    setIsSavingInfo(true);
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: nameInput.trim() });
      }
      await updateUserProfile(user.uid, {
        displayName: nameInput.trim(),
        phone: phoneInput.trim(),
      });
      await refreshUser();
      await refreshProfile();
      setIsEditingInfo(false);
      toast({
        title: 'Perfil actualizado',
        description: 'Tus datos se guardaron correctamente.',
      });
    } catch (error) {
      console.error('Error al actualizar información:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la información.' });
    } finally {
      setIsSavingInfo(false);
    }
  };

  // Detect current GPS location for either profile mode
  const handleDetectLocation = (mode: 'quinceanera' | 'business') => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      toast({
        variant: 'destructive',
        title: 'Geolocalización no disponible',
        description: 'Escribe tu ciudad y estado manualmente.',
      });
      return;
    }

    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const geo = await reverseGeocodeCoords(latitude, longitude);
        if (mode === 'quinceanera') {
          setEventLocationInput(geo.label);
          setEventLat(latitude);
          setEventLng(longitude);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(
              'mundo15_user_location',
              JSON.stringify({
                city: geo.city,
                state: geo.state,
                country: geo.country,
                label: geo.label,
                latitude,
                longitude,
                source: 'gps',
              })
            );
          }
        } else {
          setBusinessLocationInput(geo.label);
          setBusinessLat(latitude);
          setBusinessLng(longitude);
        }
        setDetectingLocation(false);
        toast({
          title: 'Ubicación detectada',
          description: `Detectamos: ${geo.label}. Recuerda guardar los cambios.`,
        });
      },
      (err) => {
        console.error('Error al detectar GPS:', err);
        setDetectingLocation(false);
        toast({
          variant: 'destructive',
          title: 'Permiso de ubicación denegado',
          description: 'No pudimos acceder a tu GPS. Ingresa tu ciudad manualmente.',
        });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  // Save Quinceañera Event Setup
  const saveEventOverview = async () => {
    if (!user) return;
    setSavingEventInfo(true);
    try {
      const inferred =
        eventLat !== undefined && eventLng !== undefined
          ? { lat: eventLat, lng: eventLng }
          : inferCoordsFromLocation(eventLocationInput);

      await updateUserProfile(user.uid, {
        eventDate: eventDateInput.trim(),
        eventLocation: eventLocationInput.trim(),
        ...(inferred ? { latitude: inferred.lat, longitude: inferred.lng } : {}),
        themePreferences: selectedTheme ? [selectedTheme] : [],
        colorPalette: selectedPalette ? [selectedPalette] : [],
        musicPreferences: musicPrefs,
        dancePreferences: dancePrefs,
      });

      if (typeof window !== 'undefined' && eventLocationInput.trim()) {
        window.localStorage.setItem(
          'mundo15_user_location',
          JSON.stringify({
            label: eventLocationInput.trim(),
            latitude: inferred?.lat,
            longitude: inferred?.lng,
            source: 'profile',
          })
        );
      }

      await refreshProfile();
      toast({
        title: '¡Evento actualizado!',
        description: 'Los datos de tu fiesta, ubicación y cuenta regresiva han sido guardados.',
      });
    } catch (error) {
      console.error('Error al guardar datos del evento:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la información.' });
    } finally {
      setSavingEventInfo(false);
    }
  };

  // Quinceañera Media Gallery change handler
  const handleQuinceaneraMediaChange = async (updated: MediaAsset[]) => {
    if (!user) return;
    setMediaGallery(updated);
    try {
      await updateUserProfile(user.uid, { mediaGallery: updated });
      await refreshProfile();
    } catch (error) {
      console.error('Error al guardar galería de quinceañera:', error);
      toast({
        variant: 'destructive',
        title: 'Error al guardar galería',
        description: 'No se pudo actualizar tu galería en la base de datos.',
      });
    }
  };

  // Save or sync Business Profile & Academy record
  const syncBusinessAcademyRecord = async (overrides?: {
    coverImageUrl?: string;
    galleryMedia?: MediaAsset[];
  }) => {
    if (!user) return;
    const coverToSave = overrides?.coverImageUrl ?? businessCoverUrl;
    const galleryToSave = overrides?.galleryMedia ?? businessGalleryMedia;
    const locStr = businessLocationInput.trim() || 'Ciudad de México';
    const inferred =
      businessLat !== undefined && businessLng !== undefined
        ? { lat: businessLat, lng: businessLng }
        : inferCoordsFromLocation(locStr);

    await updateUserProfile(user.uid, {
      businessName: businessNameInput.trim(),
      businessCategory: businessCategoryInput.trim(),
      businessDescription: businessDescInput.trim(),
      businessCost: businessCostInput,
      businessLocation: locStr,
      businessWebsite: businessWebsiteInput.trim(),
      businessPhone: businessPhoneInput.trim(),
      ...(inferred ? { latitude: inferred.lat, longitude: inferred.lng } : {}),
    });

    if (myAcademy) {
      const styles = businessCategoryInput
        ? businessCategoryInput.split(',').map((s) => s.trim()).filter(Boolean)
        : myAcademy.danceStyles;
      await updateAcademy(myAcademy.id, {
        name: businessNameInput.trim() || myAcademy.name,
        description: businessDescInput.trim().slice(0, 400) || myAcademy.description,
        longDescription: businessDescInput.trim() || myAcademy.longDescription,
        cost: businessCostInput,
        location: locStr,
        ...(inferred ? { latitude: inferred.lat, longitude: inferred.lng } : {}),
        danceStyles: styles,
        phone: businessPhoneInput.trim() || myAcademy.contact.phone,
        website: businessWebsiteInput.trim() || myAcademy.contact.website,
        coverImageUrl: coverToSave,
        galleryMedia: galleryToSave,
      });
      setMyAcademy((prev) =>
        prev
          ? {
              ...prev,
              coverImageUrl: coverToSave || undefined,
              galleryMedia: galleryToSave,
              location: locStr,
              ...(inferred ? { latitude: inferred.lat, longitude: inferred.lng } : {}),
            }
          : prev
      );
    } else {
      const fallbackBizName =
        businessNameInput.trim() || profile?.displayName || user.displayName || 'Mi Empresa XV';
      const styles = businessCategoryInput
        ? businessCategoryInput.split(',').map((s) => s.trim()).filter(Boolean)
        : ['Vals'];
      await createAcademy(
        {
          name: fallbackBizName,
          description:
            businessDescInput.trim().slice(0, 400) ||
            'Servicios profesionales para tu Quinceañera.',
          longDescription:
            businessDescInput.trim() ||
            'Ofrecemos lo mejor para hacer de tu fiesta un evento inolvidable.',
          cost: businessCostInput,
          location: locStr,
          ...(inferred ? { latitude: inferred.lat, longitude: inferred.lng } : {}),
          popularity: 'Nueva',
          danceStyles: styles,
          phone: businessPhoneInput.trim() || '5500000000',
          email: user.email || '',
          website: businessWebsiteInput.trim() || 'www.mundo15.com',
          logoImageId: 'academy-logo-1',
          coverImageUrl: coverToSave || undefined,
          galleryImageIds: ['gallery-1-1', 'gallery-1-2', 'gallery-1-3'],
          galleryMedia: galleryToSave,
          isPublished: true,
        },
        user.uid
      );
      const created = await getAcademyByCreator(user.uid);
      setMyAcademy(created);
    }
  };

  // Save Business Profile button
  const saveBusinessProfile = async () => {
    if (!user) return;
    setSavingBusiness(true);
    try {
      await syncBusinessAcademyRecord();
      await refreshProfile();
      toast({
        title: 'Perfil de Empresa Publicado',
        description: 'Tus cambios ya están visibles en la página principal y el directorio.',
      });
    } catch (error) {
      console.error('Error al guardar perfil de empresa:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la información de la empresa.' });
    } finally {
      setSavingBusiness(false);
    }
  };

  const handleBusinessCoverChange = async (newUrl: string) => {
    setBusinessCoverUrl(newUrl);
    try {
      await syncBusinessAcademyRecord({ coverImageUrl: newUrl });
    } catch (error) {
      console.error('Error al actualizar portada de empresa:', error);
      toast({ variant: 'destructive', title: 'Error al guardar portada' });
    }
  };

  const handleBusinessGalleryChange = async (updated: MediaAsset[]) => {
    setBusinessGalleryMedia(updated);
    try {
      await syncBusinessAcademyRecord({ galleryMedia: updated });
    } catch (error) {
      console.error('Error al guardar galería de empresa:', error);
      toast({ variant: 'destructive', title: 'Error al guardar galería' });
    }
  };

  // Checklist handlers
  const handleToggleChecklist = async (id: string) => {
    if (!user) return;
    const updated = checklist.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item));
    setChecklist(updated);
    try {
      await updateUserProfile(user.uid, { checklist: updated });
    } catch (error) {
      console.error('Error al actualizar checklist:', error);
    }
  };

  const handleAddChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newChecklistTitle.trim()) return;
    const newItem: ChecklistItem = {
      id: Date.now().toString(),
      title: newChecklistTitle.trim(),
      completed: false,
      category: newChecklistCategory,
    };
    const updated = [newItem, ...checklist];
    setChecklist(updated);
    setNewChecklistTitle('');
    try {
      await updateUserProfile(user.uid, { checklist: updated });
      toast({ title: 'Pendiente añadido a tu lista' });
    } catch (error) {
      console.error('Error al añadir checklist:', error);
    }
  };

  const handleDeleteChecklistItem = async (id: string) => {
    if (!user) return;
    const updated = checklist.filter((item) => item.id !== id);
    setChecklist(updated);
    try {
      await updateUserProfile(user.uid, { checklist: updated });
    } catch (error) {
      console.error('Error al eliminar checklist:', error);
    }
  };

  // Budget Handlers
  const handleUpdateTotalBudget = async (newVal: number) => {
    if (!user) return;
    setTotalBudget(newVal);
    try {
      await updateUserProfile(user.uid, { totalBudget: newVal });
    } catch (error) {
      console.error('Error al guardar presupuesto:', error);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newExpenseConcept.trim()) return;
    const newItem: BudgetItem = {
      id: Date.now().toString(),
      concept: newExpenseConcept.trim(),
      category: newExpenseCategory,
      estimatedAmount: parseFloat(newExpenseEstimated) || 0,
      actualAmount: parseFloat(newExpenseActual) || 0,
      status: newExpenseStatus,
    };
    const updated = [...budgetItems, newItem];
    setBudgetItems(updated);
    setNewExpenseConcept('');
    setNewExpenseEstimated('');
    setNewExpenseActual('');
    try {
      await updateUserProfile(user.uid, { budgetItems: updated });
      toast({ title: 'Gasto agregado al presupuesto' });
    } catch (error) {
      console.error('Error al guardar gasto:', error);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!user) return;
    const updated = budgetItems.filter((b) => b.id !== id);
    setBudgetItems(updated);
    try {
      await updateUserProfile(user.uid, { budgetItems: updated });
    } catch (error) {
      console.error('Error al eliminar gasto:', error);
    }
  };

  // Court of Honor Handlers
  const handleAddCourtMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMemberName.trim()) return;
    const newItem: CourtMember = {
      id: Date.now().toString(),
      name: newMemberName.trim(),
      role: newMemberRole,
      phone: newMemberPhone.trim() || undefined,
      outfitDetails: newMemberOutfit.trim() || undefined,
      status: newMemberStatus,
    };
    const updated = [...courtOfHonor, newItem];
    setCourtOfHonor(updated);
    setNewMemberName('');
    setNewMemberPhone('');
    setNewMemberOutfit('');
    try {
      await updateUserProfile(user.uid, { courtOfHonor: updated });
      toast({ title: 'Miembro de la corte agregado' });
    } catch (error) {
      console.error('Error al guardar corte:', error);
    }
  };

  const handleDeleteCourtMember = async (id: string) => {
    if (!user) return;
    const updated = courtOfHonor.filter((m) => m.id !== id);
    setCourtOfHonor(updated);
    try {
      await updateUserProfile(user.uid, { courtOfHonor: updated });
    } catch (error) {
      console.error('Error al eliminar miembro:', error);
    }
  };

  // Timeline Handlers
  const handleAddTimelineItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTimelineTitle.trim()) return;
    const newItem: TimelineItem = {
      id: Date.now().toString(),
      time: newTimelineTime,
      title: newTimelineTitle.trim(),
      description: newTimelineDesc.trim() || undefined,
      completed: false,
    };
    const updated = [...timeline, newItem].sort((a, b) => a.time.localeCompare(b.time));
    setTimeline(updated);
    setNewTimelineTitle('');
    setNewTimelineDesc('');
    try {
      await updateUserProfile(user.uid, { timeline: updated });
      toast({ title: 'Momento agregado al itinerario' });
    } catch (error) {
      console.error('Error al guardar minuto a minuto:', error);
    }
  };

  const handleToggleTimelineItem = async (id: string) => {
    if (!user) return;
    const updated = timeline.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
    setTimeline(updated);
    try {
      await updateUserProfile(user.uid, { timeline: updated });
    } catch (error) {
      console.error('Error al actualizar itinerario:', error);
    }
  };

  const handleDeleteTimelineItem = async (id: string) => {
    if (!user) return;
    const updated = timeline.filter((t) => t.id !== id);
    setTimeline(updated);
    try {
      await updateUserProfile(user.uid, { timeline: updated });
    } catch (error) {
      console.error('Error al eliminar itinerario:', error);
    }
  };

  // Playlist Handlers
  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newSongTitle.trim()) return;
    const newItem: SongItem = {
      id: Date.now().toString(),
      moment: newSongMoment,
      title: newSongTitle.trim(),
      artist: newSongArtist.trim() || undefined,
      notes: newSongNotes.trim() || undefined,
    };
    const updated = [...playlist, newItem];
    setPlaylist(updated);
    setNewSongTitle('');
    setNewSongArtist('');
    setNewSongNotes('');
    try {
      await updateUserProfile(user.uid, { playlist: updated });
      toast({ title: 'Canción agregada a la lista' });
    } catch (error) {
      console.error('Error al guardar canción:', error);
    }
  };

  const handleDeleteSong = async (id: string) => {
    if (!user) return;
    const updated = playlist.filter((p) => p.id !== id);
    setPlaylist(updated);
    try {
      await updateUserProfile(user.uid, { playlist: updated });
    } catch (error) {
      console.error('Error al eliminar canción:', error);
    }
  };

  // Godparents handlers
  const handleAddGodparent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newGodparentName.trim()) return;
    const newItem: GodparentItem = {
      id: Date.now().toString(),
      name: newGodparentName.trim(),
      role: newGodparentRole,
      phone: newGodparentPhone.trim() || undefined,
      status: 'confirmado',
    };
    const updated = [...godparents, newItem];
    setGodparents(updated);
    setNewGodparentName('');
    setNewGodparentPhone('');
    try {
      await updateUserProfile(user.uid, { godparents: updated });
      toast({ title: 'Padrino / Madrina registrado(a)' });
    } catch (error) {
      console.error('Error al guardar madrina:', error);
    }
  };

  const handleDeleteGodparent = async (id: string) => {
    if (!user) return;
    const updated = godparents.filter((item) => item.id !== id);
    setGodparents(updated);
    try {
      await updateUserProfile(user.uid, { godparents: updated });
    } catch (error) {
      console.error('Error al eliminar madrina:', error);
    }
  };

  // Tables handlers
  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTableName.trim()) return;
    const newItem: TableItem = {
      id: Date.now().toString(),
      tableName: newTableName.trim(),
      guests: [],
    };
    const updated = [...tables, newItem];
    setTables(updated);
    setNewTableName('');
    try {
      await updateUserProfile(user.uid, { tables: updated });
      toast({ title: 'Mesa creada' });
    } catch (error) {
      console.error('Error al crear mesa:', error);
    }
  };

  const handleAddGuestToTable = async (tableId: string) => {
    if (!user || !newGuestName.trim()) return;
    const updated = tables.map((t) =>
      t.id === tableId ? { ...t, guests: [...t.guests, newGuestName.trim()] } : t
    );
    setTables(updated);
    setNewGuestName('');
    setSelectedTableId('');
    try {
      await updateUserProfile(user.uid, { tables: updated });
      toast({ title: 'Invitado asignado a mesa' });
    } catch (error) {
      console.error('Error al asignar invitado:', error);
    }
  };

  const handleDeleteTable = async (id: string) => {
    if (!user) return;
    const updated = tables.filter((t) => t.id !== id);
    setTables(updated);
    try {
      await updateUserProfile(user.uid, { tables: updated });
    } catch (error) {
      console.error('Error al eliminar mesa:', error);
    }
  };

  const handleRemoveGuest = async (tableId: string, guestIndex: number) => {
    if (!user) return;
    const updated = tables.map((t) => {
      if (t.id === tableId) {
        const copy = [...t.guests];
        copy.splice(guestIndex, 1);
        return { ...t, guests: copy };
      }
      return t;
    });
    setTables(updated);
    try {
      await updateUserProfile(user.uid, { tables: updated });
    } catch (error) {
      console.error('Error al quitar invitado:', error);
    }
  };

  const handleBulkImportTables = async (updatedTables: TableItem[]) => {
    if (!user) return;
    setTables(updatedTables);
    await updateUserProfile(user.uid, { tables: updatedTables });
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <p className="p-8 text-center">Por favor, inicia sesión para ver tu perfil.</p>;
  }

  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-10 space-y-8">
        {/* ================= HERO PROFILE BANNER ================= */}
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xl">
          <div className="h-36 sm:h-44 md:h-48 border-b relative overflow-hidden">
            <Image
              src={isBusiness ? VISUAL_ASSETS.businessStudioBanner : VISUAL_ASSETS.quinceProfileBanner}
              alt={isBusiness ? 'Estudio y academia de baile' : 'Decoración elegante de XV años'}
              fill
              priority
              sizes="(max-width: 1200px) 100vw, 1152px"
              className="object-cover object-center"
            />
            <div
              className={`absolute inset-0 ${
                isBusiness
                  ? 'bg-gradient-to-t from-black/65 via-black/25 to-black/15'
                  : 'bg-gradient-to-t from-[#2b0f18]/50 via-[#2b0f18]/15 to-transparent'
              }`}
            />
            <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background/92 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-sm border border-border/60">
                {isBusiness ? (
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Crown className="h-3.5 w-3.5 text-primary" />
                )}
                {isBusiness ? 'Estudio Empresa / Academia' : 'Quinceañera Soñada'}
              </span>
            </div>
          </div>

          <div className="px-5 sm:px-6 pb-6 pt-0 relative">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 -mt-16 mb-5">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
                <AvatarUploader
                  uid={user.uid}
                  currentPhotoUrl={profile?.photoURL || user.photoURL}
                  displayName={profile?.displayName || user.displayName}
                  initials={getInitials(profile?.displayName || user.displayName, user.email)}
                  onUploaded={async () => {
                    await refreshUser();
                    await refreshProfile();
                  }}
                />
                <div className="space-y-1 pt-2 sm:pt-0">
                  <h1 className="font-headline text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
                    {isBusiness && businessNameInput.trim()
                      ? businessNameInput.trim()
                      : profile?.displayName || user.displayName || 'Mi Fiesta de 15'}
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>

              {/* Role Toggle Switcher */}
              <div className="flex flex-wrap items-center justify-center sm:justify-end gap-1.5 bg-muted/50 p-1.5 rounded-xl border border-border/80">
                <span className="text-xs text-muted-foreground px-2 font-medium">Modo:</span>
                <Button
                  size="sm"
                  variant={!isBusiness ? 'default' : 'ghost'}
                  onClick={() => handleToggleUserType('quinceanera')}
                  disabled={switchingRole}
                  className="min-h-[38px] gap-1.5 text-xs"
                >
                  <Crown className="h-3.5 w-3.5" />
                  Quinceañera
                </Button>
                <Button
                  size="sm"
                  variant={isBusiness ? 'default' : 'ghost'}
                  onClick={() => handleToggleUserType('business')}
                  disabled={switchingRole}
                  className="min-h-[38px] gap-1.5 text-xs"
                >
                  <Building2 className="h-3.5 w-3.5" />
                  Empresa / Academia
                </Button>
              </div>
            </div>

            {/* Live Countdown & Event Location Card (Quinceañera Mode) */}
            {!isBusiness && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                <div className="md:col-span-2 rounded-xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-amber-500/10 p-4 border flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
                      <Sparkles className="h-4 w-4" />
                      Cuenta Regresiva para tus XV Años
                    </div>
                    <div className="flex items-center gap-2 justify-center sm:justify-start text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {eventDateInput ? (
                        <span>Fecha fijada: {new Date(eventDateInput).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      ) : (
                        <span>¡Configura la fecha de tu evento!</span>
                      )}
                    </div>
                  </div>

                  {countdown ? (
                    countdown.passed ? (
                      <Badge variant="outline" className="text-sm px-3 py-1 border-primary text-primary">
                        ¡Felicidades, el gran día ha llegado! 🎉
                      </Badge>
                    ) : (
                      <div className="flex items-center gap-2 tabular-nums">
                        <div className="bg-card px-3.5 py-2 rounded-lg border text-center shadow-sm min-w-[58px]">
                          <span className="block text-xl font-bold font-headline text-primary tabular-nums">{countdown.days}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Días</span>
                        </div>
                        <span className="font-bold text-primary">:</span>
                        <div className="bg-card px-3.5 py-2 rounded-lg border text-center shadow-sm min-w-[58px]">
                          <span className="block text-xl font-bold font-headline text-primary tabular-nums">{countdown.hours}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Horas</span>
                        </div>
                        <span className="font-bold text-primary">:</span>
                        <div className="bg-card px-3.5 py-2 rounded-lg border text-center shadow-sm min-w-[58px]">
                          <span className="block text-xl font-bold font-headline text-primary tabular-nums">{countdown.minutes}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Min</span>
                        </div>
                      </div>
                    )
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5 min-h-[40px]"
                      onClick={() => setActiveTab('overview')}
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      Elegir Fecha
                    </Button>
                  )}
                </div>

                <div className="rounded-xl border bg-card p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">Progreso de Planeación</span>
                    <span className="text-xs font-bold text-primary tabular-nums">{stats.taskPercent}%</span>
                  </div>
                  <Progress value={stats.taskPercent} className="h-2 my-2" />
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {stats.completedTasks} de {stats.totalTasks} pendientes listos.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================= QUINCEANERA SUITE ================= */}
        {!isBusiness && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="overflow-x-auto pb-2">
              <TabsList className="h-12 w-full justify-start md:justify-center bg-card border p-1 rounded-xl shadow-sm gap-1">
                <TabsTrigger value="checklist" className="gap-2 text-xs md:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <ListTodo className="h-4 w-4" />
                  Check-list ({stats.completedTasks}/{stats.totalTasks})
                </TabsTrigger>
                <TabsTrigger value="budget" className="gap-2 text-xs md:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <DollarSign className="h-4 w-4" />
                  Presupuesto
                </TabsTrigger>
                <TabsTrigger value="court" className="gap-2 text-xs md:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Crown className="h-4 w-4" />
                  Corte de Honor ({stats.totalCourt})
                </TabsTrigger>
                <TabsTrigger value="timeline" className="gap-2 text-xs md:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Clock className="h-4 w-4" />
                  Minuto a Minuto
                </TabsTrigger>
                <TabsTrigger value="music" className="gap-2 text-xs md:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Music className="h-4 w-4" />
                  Vals & Música
                </TabsTrigger>
                <TabsTrigger value="godparents" className="gap-2 text-xs md:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Users className="h-4 w-4" />
                  Padrinos ({stats.totalGodparents})
                </TabsTrigger>
                <TabsTrigger value="tables" className="gap-2 text-xs md:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <LayoutGrid className="h-4 w-4" />
                  Mesas ({stats.totalGuests} invitados)
                </TabsTrigger>
                <TabsTrigger value="overview" className="gap-2 text-xs md:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Palette className="h-4 w-4" />
                  Tema & Fecha
                </TabsTrigger>
                <TabsTrigger value="media" className="gap-2 text-xs md:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Video className="h-4 w-4" />
                  Fotos y Videos ({mediaGallery.length})
                </TabsTrigger>
                <TabsTrigger value="quotes" className="gap-2 text-xs md:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <FileText className="h-4 w-4" />
                  Cotizaciones ({quotes.length})
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB 1: CHECKLIST INTERACTIVO */}
            <TabsContent value="checklist" className="space-y-6">
              <Card className="shadow-md">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <CardTitle className="font-headline text-2xl flex items-center gap-2">
                        <CheckCircle2 className="h-6 w-6 text-primary" />
                        Check-list Maestro de Preparativos
                      </CardTitle>
                      <CardDescription>
                        Todo lo que una quinceañera necesita tener listo para su fiesta (Salón, coreógrafo, vestido, foto y video, banquete...).
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3 bg-muted/30 px-4 py-2 rounded-xl border">
                      <span className="text-xs font-semibold">Avance:</span>
                      <Progress value={stats.taskPercent} className="w-28 h-2.5" />
                      <span className="text-xs font-bold text-primary">{stats.taskPercent}%</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Add task form */}
                  <form onSubmit={handleAddChecklistItem} className="flex flex-col sm:flex-row gap-3 bg-muted/20 p-4 rounded-xl border">
                    <Input
                      placeholder="Escribe un nuevo pendiente (ej: Comprar zapatillas de cambio, coordinar mariachi...)"
                      value={newChecklistTitle}
                      onChange={(e) => setNewChecklistTitle(e.target.value)}
                      className="flex-1"
                    />
                    <Select value={newChecklistCategory} onValueChange={setNewChecklistCategory}>
                      <SelectTrigger className="w-full sm:w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Lugar">Lugar / Salón</SelectItem>
                        <SelectItem value="Baile">Baile / Coreógrafo</SelectItem>
                        <SelectItem value="Vestuario">Vestuario / Corona</SelectItem>
                        <SelectItem value="Recuerdos">Foto y Video</SelectItem>
                        <SelectItem value="Comida">Comida / Banquete</SelectItem>
                        <SelectItem value="Música">Música / DJ</SelectItem>
                        <SelectItem value="Corte">Corte & Padrinos</SelectItem>
                        <SelectItem value="Belleza">Belleza & Peinado</SelectItem>
                        <SelectItem value="Papelería">Invitaciones</SelectItem>
                        <SelectItem value="General">General</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button type="submit" className="gap-1.5 shrink-0">
                      <Plus className="h-4 w-4" /> Añadir
                    </Button>
                  </form>

                  {/* Task list */}
                  <div className="space-y-2.5">
                    {checklist.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between rounded-xl border p-3.5 transition-all ${
                          item.completed
                            ? 'bg-muted/40 border-dashed border-border'
                            : 'bg-card shadow-sm hover:border-primary/40'
                        }`}
                      >
                        <div className="flex items-center space-x-3.5 flex-1 min-w-0 pr-3">
                          <Checkbox
                            id={`check-${item.id}`}
                            checked={item.completed}
                            onCheckedChange={() => handleToggleChecklist(item.id)}
                            className="h-5 w-5 rounded-md"
                          />
                          <label
                            htmlFor={`check-${item.id}`}
                            className={`text-sm font-medium cursor-pointer truncate ${
                              item.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                            }`}
                          >
                            {item.title}
                          </label>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="text-[11px] font-normal">
                            {item.category}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteChecklistItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: PRESUPUESTO & FINANZAS */}
            <TabsContent value="budget" className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-5 editorial-surface">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      Presupuesto Estimado
                    </span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <DollarSign className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl sm:text-3xl font-bold font-headline tabular-nums text-foreground">
                      ${stats.totalEstimatedExpenses.toLocaleString()}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1 block">
                    Total planeado para el evento
                  </span>
                </Card>
                <Card className="p-5 editorial-surface">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      Total Pagado / Anticipos
                    </span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl sm:text-3xl font-bold font-headline tabular-nums text-emerald-700 dark:text-emerald-400">
                      ${stats.totalPaidExpenses.toLocaleString()}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1 block">
                    Dinero ya desembolsado
                  </span>
                </Card>
                <Card className="p-5 editorial-surface">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      Saldo Pendiente
                    </span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <AlertCircle className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl sm:text-3xl font-bold font-headline tabular-nums text-amber-700 dark:text-amber-400">
                      ${Math.max(0, stats.totalEstimatedExpenses - stats.totalPaidExpenses).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1 block">
                    Restante por liquidar a proveedores
                  </span>
                </Card>
              </div>

              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="font-headline text-2xl flex items-center gap-2">
                    <DollarSign className="h-6 w-6 text-primary" />
                    Calculadora de Gastos y Presupuesto
                  </CardTitle>
                  <CardDescription>
                    Lleva el control exacto de tus pagos a academias, salones, fotógrafos y vestidos.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Add expense form */}
                  <form onSubmit={handleAddExpense} className="grid grid-cols-1 sm:grid-cols-6 gap-3 bg-muted/20 p-4 rounded-xl border">
                    <div className="sm:col-span-2">
                      <Label className="text-xs mb-1 block">Concepto del gasto</Label>
                      <Input
                        placeholder="Ej: Depósito de Coreografía"
                        value={newExpenseConcept}
                        onChange={(e) => setNewExpenseConcept(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Categoría</Label>
                      <Select value={newExpenseCategory} onValueChange={setNewExpenseCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Salón y Carpa">Salón y Carpa</SelectItem>
                          <SelectItem value="Vestuario y Corona">Vestuario y Corona</SelectItem>
                          <SelectItem value="Coreógrafo y Baile">Coreógrafo y Baile</SelectItem>
                          <SelectItem value="Foto y Video">Foto y Video</SelectItem>
                          <SelectItem value="Banquete y Pastel">Banquete y Pastel</SelectItem>
                          <SelectItem value="Música y DJ">Música y DJ</SelectItem>
                          <SelectItem value="Decoración y Flores">Decoración y Flores</SelectItem>
                          <SelectItem value="Invitaciones y Recuerdos">Invitaciones</SelectItem>
                          <SelectItem value="Otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Monto Estimado ($)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={newExpenseEstimated}
                        onChange={(e) => setNewExpenseEstimated(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Monto Pagado ($)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={newExpenseActual}
                        onChange={(e) => setNewExpenseActual(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button type="submit" className="w-full gap-1">
                        <Plus className="h-4 w-4" /> Agregar
                      </Button>
                    </div>
                  </form>

                  {/* Expenses table */}
                  <div className="space-y-2">
                    {budgetItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border bg-card gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm">{item.concept}</h4>
                            <Badge variant="secondary" className="text-[10px]">
                              {item.category}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-4">
                          <div className="text-right">
                            <span className="text-xs text-muted-foreground block">
                              Estimado: ${item.estimatedAmount.toLocaleString()}
                            </span>
                            <span className="text-sm font-bold text-green-600 dark:text-green-400">
                              Pagado: ${item.actualAmount.toLocaleString()}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteExpense(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: CORTE DE HONOR */}
            <TabsContent value="court" className="space-y-6">
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="font-headline text-2xl flex items-center gap-2">
                    <Crown className="h-6 w-6 text-primary" />
                    Corte de Honor (Chambelanes y Damas)
                  </CardTitle>
                  <CardDescription>
                    Organiza a tu Chambelán de Honor, tus chambelanes de vals y tus damas de honor, con estatus de ensayo y vestuario.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Add court member */}
                  <form onSubmit={handleAddCourtMember} className="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-muted/20 p-4 rounded-xl border">
                    <div>
                      <Label className="text-xs mb-1 block">Nombre completo</Label>
                      <Input
                        placeholder="Nombre"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Rol en la corte</Label>
                      <Select value={newMemberRole} onValueChange={(v: any) => setNewMemberRole(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="chambelan_honor">Chambelán de Honor</SelectItem>
                          <SelectItem value="chambelan">Chambelán</SelectItem>
                          <SelectItem value="dama">Dama de Honor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Teléfono / WhatsApp</Label>
                      <Input
                        placeholder="Teléfono"
                        value={newMemberPhone}
                        onChange={(e) => setNewMemberPhone(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Detalle de vestuario</Label>
                      <Input
                        placeholder="Ej: Moño azul, traje gris"
                        value={newMemberOutfit}
                        onChange={(e) => setNewMemberOutfit(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button type="submit" className="w-full gap-1">
                        <Plus className="h-4 w-4" /> Agregar
                      </Button>
                    </div>
                  </form>

                  {/* Court list */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {courtOfHonor.map((member) => (
                      <div
                        key={member.id}
                        className={`rounded-xl border p-4 bg-card flex flex-col justify-between shadow-sm ${
                          member.role === 'chambelan_honor' ? 'ring-2 ring-primary/40 bg-primary/5' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-headline font-bold text-base">{member.name}</h4>
                              <Badge
                                variant={member.role === 'chambelan_honor' ? 'default' : 'secondary'}
                                className="text-[11px]"
                              >
                                {member.role === 'chambelan_honor'
                                  ? 'Chambelán de Honor'
                                  : member.role === 'chambelan'
                                  ? 'Chambelán'
                                  : 'Dama de Honor'}
                              </Badge>
                            </div>
                            {member.phone && <p className="text-xs text-muted-foreground">Tel: {member.phone}</p>}
                            {member.outfitDetails && (
                              <p className="text-xs text-muted-foreground italic">Vestuario: {member.outfitDetails}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteCourtMember(member.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 4: MINUTO A MINUTO (TIMELINE) */}
            <TabsContent value="timeline" className="space-y-6">
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="font-headline text-2xl flex items-center gap-2">
                    <Clock className="h-6 w-6 text-primary" />
                    Itinerario Minuto a Minuto del Gran Día
                  </CardTitle>
                  <CardDescription>
                    Cronograma de la celebración (Arreglo personal, fotos, misa, entrada triunfal, vals, brindis y baile sorpresa).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Add timeline item */}
                  <form onSubmit={handleAddTimelineItem} className="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-muted/20 p-4 rounded-xl border">
                    <div>
                      <Label className="text-xs mb-1 block">Hora</Label>
                      <Input
                        type="time"
                        value={newTimelineTime}
                        onChange={(e) => setNewTimelineTime(e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs mb-1 block">Momento / Actividad</Label>
                      <Input
                        placeholder="Ej: Cambio de zapatilla y último juguete"
                        value={newTimelineTitle}
                        onChange={(e) => setNewTimelineTitle(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Detalles (Opcional)</Label>
                      <Input
                        placeholder="Ej: En la pista principal"
                        value={newTimelineDesc}
                        onChange={(e) => setNewTimelineDesc(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button type="submit" className="w-full gap-1">
                        <Plus className="h-4 w-4" /> Agregar
                      </Button>
                    </div>
                  </form>

                  {/* Timeline listing */}
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-primary/30">
                    {timeline.map((item) => (
                      <div key={item.id} className="relative flex items-center justify-between rounded-xl border p-3.5 bg-card shadow-sm">
                        <div className="absolute -left-[23px] top-4 h-3.5 w-3.5 rounded-full border-2 border-primary bg-background" />
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id={`time-${item.id}`}
                            checked={item.completed}
                            onCheckedChange={() => handleToggleTimelineItem(item.id)}
                            className="h-5 w-5 rounded-md"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-xs font-bold text-primary">
                                {item.time}
                              </Badge>
                              <h4 className={`text-sm font-semibold ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                                {item.title}
                              </h4>
                            </div>
                            {item.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteTimelineItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 5: VALS & MÚSICA */}
            <TabsContent value="music" className="space-y-6">
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="font-headline text-2xl flex items-center gap-2">
                    <Music className="h-6 w-6 text-primary" />
                    Playlist y Canciones para Momentos Especiales
                  </CardTitle>
                  <CardDescription>
                    Define las canciones oficiales para el vals tradicional, la entrada triunfal, el baile con papá y el baile sorpresa.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Add song */}
                  <form onSubmit={handleAddSong} className="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-muted/20 p-4 rounded-xl border">
                    <div>
                      <Label className="text-xs mb-1 block">Momento clave</Label>
                      <Select value={newSongMoment} onValueChange={setNewSongMoment}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Entrada Triunfal">Entrada Triunfal</SelectItem>
                          <SelectItem value="Vals Principal">Vals Principal</SelectItem>
                          <SelectItem value="Baile con Papá">Baile con Papá</SelectItem>
                          <SelectItem value="Baile Sorpresa">Baile Sorpresa</SelectItem>
                          <SelectItem value="Brindis">Brindis</SelectItem>
                          <SelectItem value="Corte de Pastel">Corte de Pastel</SelectItem>
                          <SelectItem value="Otro">Otro Momento</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Título de la canción</Label>
                      <Input
                        placeholder="Ej: A Thousand Years"
                        value={newSongTitle}
                        onChange={(e) => setNewSongTitle(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Artista / Grupo</Label>
                      <Input
                        placeholder="Ej: Christina Perri"
                        value={newSongArtist}
                        onChange={(e) => setNewSongArtist(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Notas para el DJ</Label>
                      <Input
                        placeholder="Ej: Entrar en el minuto 0:35"
                        value={newSongNotes}
                        onChange={(e) => setNewSongNotes(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button type="submit" className="w-full gap-1">
                        <Plus className="h-4 w-4" /> Agregar
                      </Button>
                    </div>
                  </form>

                  {/* Songs list */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {playlist.map((song) => (
                      <div key={song.id} className="rounded-xl border p-4 bg-card flex flex-col justify-between shadow-sm">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <Badge variant="secondary" className="text-xs font-semibold">
                              {song.moment}
                            </Badge>
                            <h4 className="font-bold text-base text-foreground mt-1">{song.title}</h4>
                            {song.artist && <p className="text-xs text-muted-foreground">{song.artist}</p>}
                            {song.notes && (
                              <p className="text-xs text-primary/80 font-medium italic mt-1">Nota: {song.notes}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteSong(song.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 6: MADRINAS Y PADRINOS */}
            <TabsContent value="godparents" className="space-y-6">
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="font-headline text-2xl flex items-center gap-2">
                    <Users className="h-6 w-6 text-primary" />
                    Lista de Madrinas y Padrinos
                  </CardTitle>
                  <CardDescription>
                    Asigna a tus familiares y padrinos lo que van a patrocinar (Vestido, salón o carpa, ramo, zapatillas, pastel, brindis...).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Add form */}
                  <form onSubmit={handleAddGodparent} className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-muted/20 p-4 rounded-xl border">
                    <Input
                      placeholder="Nombre del Padrino/Madrina"
                      value={newGodparentName}
                      onChange={(e) => setNewGodparentName(e.target.value)}
                    />
                    <Select value={newGodparentRole} onValueChange={setNewGodparentRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Madrina de Vestido">Madrina de Vestido</SelectItem>
                        <SelectItem value="Padrino de Salón o Carpa">Padrino de Salón / Carpa</SelectItem>
                        <SelectItem value="Madrina de Corona y Tiara">Madrina de Corona y Tiara</SelectItem>
                        <SelectItem value="Madrina de Zapatillas">Madrina de Zapatillas</SelectItem>
                        <SelectItem value="Madrina de Ramo">Madrina de Ramo</SelectItem>
                        <SelectItem value="Padrino de Pastel">Padrino de Pastel</SelectItem>
                        <SelectItem value="Padrino de Brindis">Padrino de Brindis</SelectItem>
                        <SelectItem value="Padrino de Foto y Video">Padrino de Foto y Video</SelectItem>
                        <SelectItem value="Padrino de Música / DJ">Padrino de Música / DJ</SelectItem>
                        <SelectItem value="Padrino General">Padrino de Honor</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Teléfono / Celular (Opcional)"
                      value={newGodparentPhone}
                      onChange={(e) => setNewGodparentPhone(e.target.value)}
                    />
                    <Button type="submit" className="gap-1">
                      <Plus className="h-4 w-4" /> Agregar Padrino
                    </Button>
                  </form>

                  {/* List */}
                  {godparents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Aún no has agregado padrinos o madrinas. ¡Agrega a tus tíos, amigos o familiares!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {godparents.map((g) => (
                        <div key={g.id} className="rounded-xl border p-4 bg-card flex items-start justify-between shadow-sm">
                          <div className="space-y-1">
                            <h4 className="font-semibold text-sm">{g.name}</h4>
                            <Badge variant="secondary" className="text-xs">
                              {g.role}
                            </Badge>
                            {g.phone && <p className="text-xs text-muted-foreground mt-1">Tel: {g.phone}</p>}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteGodparent(g.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 7: MESAS E INVITADOS */}
            <TabsContent value="tables" className="space-y-6">
              <Card className="shadow-md">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="font-headline text-2xl flex items-center gap-2">
                      <LayoutGrid className="h-6 w-6 text-primary" />
                      Organización de Mesas e Invitados
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Distribuye a tus invitados por mesa o importa tu lista completa desde un archivo CSV de Excel o Google Sheets.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <GuestCsvImporter
                      tables={tables}
                      onImportTables={handleBulkImportTables}
                    />
                    {stats.totalGuests > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => exportGuestsToCsv(tables)}
                        className="gap-1.5 min-h-[40px] whitespace-nowrap shrink-0"
                      >
                        <Download className="h-4 w-4" />
                        Exportar CSV
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Create table form */}
                  <form onSubmit={handleAddTable} className="flex gap-3 bg-muted/20 p-4 rounded-xl border">
                    <Input
                      placeholder="Nombre de la nueva mesa (ej: Mesa de Honor, Familia García, Amigos...)"
                      value={newTableName}
                      onChange={(e) => setNewTableName(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" className="gap-1 shrink-0">
                      <Plus className="h-4 w-4" /> Crear Mesa
                    </Button>
                  </form>

                  {/* Tables grid */}
                  {tables.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No has creado mesas todavía. Comienza creando una mesa y agregando invitados.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {tables.map((t) => (
                        <div key={t.id} className="rounded-xl border p-4 space-y-3 bg-card shadow-sm">
                          <div className="flex items-center justify-between border-b pb-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-headline text-lg font-bold">{t.tableName}</h4>
                              <Badge variant="outline" className="text-xs">
                                {t.guests.length} invitados
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteTable(t.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="space-y-1.5 min-h-[60px]">
                            {t.guests.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic py-2">
                                Sin invitados asignados a esta mesa.
                              </p>
                            ) : (
                              t.guests.map((guest, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between text-xs py-1 px-2 rounded-md bg-muted/30 hover:bg-muted/60"
                                >
                                  <span>• {guest}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 px-1.5 text-[10px] text-destructive hover:bg-destructive/10"
                                    onClick={() => handleRemoveGuest(t.id, idx)}
                                  >
                                    Quitar
                                  </Button>
                                </div>
                              ))
                            )}
                          </div>

                          <div className="flex gap-2 pt-2 border-t">
                            <Input
                              placeholder="Nombre del invitado"
                              value={selectedTableId === t.id ? newGuestName : ''}
                              onChange={(e) => {
                                setSelectedTableId(t.id);
                                setNewGuestName(e.target.value);
                              }}
                              className="h-8 text-xs"
                            />
                            <Button
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => {
                                if (selectedTableId === t.id) {
                                  handleAddGuestToTable(t.id);
                                }
                              }}
                            >
                              Añadir
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 8: FECHA, TEMA Y PREFERENCIAS */}
            <TabsContent value="overview" className="space-y-6">
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="font-headline text-2xl flex items-center gap-2">
                    <Palette className="h-6 w-6 text-primary" />
                    Fecha, Temática y Estilo de la Quinceañera
                  </CardTitle>
                  <CardDescription>
                    Personaliza la fecha de tus XV años para la cuenta regresiva, tu paleta de colores y el tema de ensueño.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="eventDate" className="font-semibold text-sm">
                        Fecha del Evento (Gran Día de XV Años) *
                      </Label>
                      <Input
                        id="eventDate"
                        type="date"
                        value={eventDateInput}
                        onChange={(e) => setEventDateInput(e.target.value)}
                        className="text-base"
                      />
                      <p className="text-xs text-muted-foreground">
                        Esta fecha activa la cuenta regresiva en vivo en la parte superior.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="eventLoc" className="font-semibold text-sm">
                        Ciudad / Estado de la Fiesta (Para recomendaciones cercanas)
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="eventLoc"
                          placeholder="Ej: Ecatepec de Morelos, MEX o Monterrey, NL"
                          value={eventLocationInput}
                          onChange={(e) => {
                            setEventLocationInput(e.target.value);
                            setEventLat(undefined);
                            setEventLng(undefined);
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleDetectLocation('quinceanera')}
                          disabled={detectingLocation}
                          className="gap-1.5 shrink-0"
                        >
                          {detectingLocation ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <LocateFixed className="h-4 w-4 text-primary" />
                          )}
                          <span className="hidden sm:inline">Detectar GPS</span>
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Usaremos esta ciudad para mostrarte primero academias y empresas cerca de ti.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="font-semibold text-sm">Temática Principal de la Fiesta</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {eventThemesList.map((theme) => (
                        <button
                          key={theme}
                          type="button"
                          onClick={() => setSelectedTheme(theme)}
                          className={`text-left text-xs p-3 rounded-xl border flex items-center justify-between transition-all ${
                            selectedTheme === theme
                              ? 'border-primary bg-primary/10 font-bold text-primary ring-1 ring-primary'
                              : 'border-border bg-card hover:bg-muted/30'
                          }`}
                        >
                          <span>{theme}</span>
                          {selectedTheme === theme && <Check className="h-4 w-4" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="font-semibold text-sm">Paleta de Colores Favorita</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {paletteOptions.map((palette) => (
                        <button
                          key={palette.name}
                          type="button"
                          onClick={() => setSelectedPalette(palette.name)}
                          className={`text-left text-xs p-3 rounded-xl border transition-all ${
                            selectedPalette === palette.name
                              ? 'border-primary bg-primary/10 ring-1 ring-primary font-bold'
                              : 'border-border bg-card hover:bg-muted/30'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-2">
                            {palette.colors.map((c, i) => (
                              <div
                                key={i}
                                className="h-5 w-5 rounded-full border shadow-sm"
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                          <span>{palette.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={saveEventOverview} disabled={savingEventInfo} className="gap-2">
                      {savingEventInfo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Guardar Configuración de Fiesta
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 8B: FOTOS Y VIDEOS DE INSPIRACIÓN / ENSAYOS */}
            <TabsContent value="media" className="space-y-6">
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="font-headline text-2xl flex items-center gap-2">
                    <Video className="h-6 w-6 text-primary" />
                    Mi Álbum Multimedia (Fotos y Videos)
                  </CardTitle>
                  <CardDescription>
                    Guarda inspiración de vestidos, fotos de visitas a salones, pruebas de maquillaje o videos de tus ensayos de vals y chambelanes.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MediaManager
                    items={mediaGallery}
                    folderPath={`users/${user.uid}/gallery`}
                    maxItems={30}
                    allowVideos={true}
                    onChange={handleQuinceaneraMediaChange}
                    emptyTitle="Aún no has subido fotos o videos de tus XV"
                    emptyDescription="Sube fotos de tu vestido, bocetos del salón o videos de ensayos para tener todo en un solo lugar."
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 9: MIS COTIZACIONES */}
            <TabsContent value="quotes" className="space-y-6">
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="font-headline text-2xl flex items-center gap-2">
                    <FileText className="h-6 w-6 text-primary" />
                    Mis Solicitudes de Cotización Enviadas
                  </CardTitle>
                  <CardDescription>
                    Historial de mensajes y cotizaciones que has solicitado a las academias y empresas del directorio.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingQuotes ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : quotes.length === 0 ? (
                    <div className="text-center py-10 space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Aún no has solicitado cotizaciones a ninguna empresa o academia.
                      </p>
                      <Button asChild variant="outline">
                        <Link href="/academies">Explorar Academias y Negocios</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {quotes.map((q) => (
                        <div
                          key={q.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-card gap-3 shadow-sm"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-headline font-bold text-base">{q.academyName}</span>
                              <Badge variant="secondary">{statusLabels[q.status]}</Badge>
                            </div>
                            {q.eventDate && (
                              <p className="text-xs text-muted-foreground">Fecha estimada: {q.eventDate}</p>
                            )}
                            <p className="text-sm text-muted-foreground">{q.message}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={async () => {
                              try {
                                await deleteQuoteRequest(q.id);
                                setQuotes((prev) => prev.filter((item) => item.id !== q.id));
                                toast({ title: 'Cotización eliminada' });
                              } catch (err) {
                                toast({ variant: 'destructive', title: 'Error' });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* ================= BUSINESS / ACADEMY STUDIO ================= */}
        {isBusiness && (
          <div className="space-y-6">
            {/* Executive Business Summary Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-5 editorial-surface">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Estado en Directorio
                </span>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-headline text-xl font-semibold text-foreground">
                    {myAcademy ? 'Publicado' : 'Sin publicar'}
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {businessLocationInput || 'Agrega tu ciudad para posicionarte'}
                </p>
              </Card>

              <Card className="p-5 editorial-surface">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Portafolio Multimedia
                </span>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-headline text-2xl font-bold tabular-nums text-foreground">
                    {businessGalleryMedia.length}
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ImageIcon className="h-4 w-4" />
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 tabular-nums">
                  {businessGalleryMedia.filter((m) => m.type === 'image').length} fotos ·{' '}
                  {businessGalleryMedia.filter((m) => m.type === 'video').length} videos
                </p>
              </Card>

              <Card className="p-5 editorial-surface">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Cotizaciones
                </span>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-headline text-2xl font-bold tabular-nums text-foreground">
                    {businessQuotes.length}
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                    <FileText className="h-4 w-4" />
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 tabular-nums">
                  {businessQuotes.filter((q) => q.status === 'pending').length} pendientes por responder
                </p>
              </Card>

              <Card className="p-5 editorial-surface flex flex-col justify-between">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Escaparate Público
                </span>
                <div className="mt-2">
                  {myAcademy ? (
                    <Button asChild variant="outline" size="sm" className="w-full gap-1.5 min-h-[40px]">
                      <Link href={`/academies/${myAcademy.id}`}>
                        <ExternalLink className="h-3.5 w-3.5 text-primary" />
                        Ver publicación en vivo
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setBusinessTab('info')}
                      className="w-full gap-1.5 min-h-[40px]"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Completar y Publicar
                    </Button>
                  )}
                </div>
              </Card>
            </div>

            <Tabs
              value={businessTab}
              onValueChange={(v) => setBusinessTab(v as 'info' | 'gallery' | 'quotes')}
              className="space-y-6"
            >
              <div className="overflow-x-auto pb-1">
                <TabsList className="h-12 w-full justify-start sm:justify-center bg-card border border-border/80 p-1 rounded-xl shadow-sm gap-1">
                  <TabsTrigger
                    value="info"
                    className="gap-2 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <Building2 className="h-4 w-4" />
                    Información y Publicación
                  </TabsTrigger>
                  <TabsTrigger
                    value="gallery"
                    className="gap-2 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <ImageIcon className="h-4 w-4" />
                    Portada, Fotos y Videos ({businessGalleryMedia.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="quotes"
                    className="gap-2 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <FileText className="h-4 w-4" />
                    Cotizaciones Recibidas ({businessQuotes.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="info" className="space-y-6">
                <Card className="editorial-surface">
                  <CardHeader className="border-b border-border/60 bg-secondary/20">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <CardTitle className="font-headline text-2xl flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-primary" />
                          Perfil Comercial de tu Empresa o Academia
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Esta información se publica en la página principal para que las Quinceañeras cercanas te encuentren y soliciten cotizaciones.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="bName" className="font-semibold text-sm">
                          Nombre Comercial de la Empresa / Academia *
                        </Label>
                        <Input
                          id="bName"
                          value={businessNameInput}
                          onChange={(e) => setBusinessNameInput(e.target.value)}
                          placeholder="Ej: Coreografía Elite & Vals"
                          className="min-h-[42px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bCat" className="font-semibold text-sm">
                          Giro Comercial / Estilos / Servicios (separados por comas) *
                        </Label>
                        <Input
                          id="bCat"
                          value={businessCategoryInput}
                          onChange={(e) => setBusinessCategoryInput(e.target.value)}
                          placeholder="Ej: Vals, Coreografía, Salón de Fiestas, Foto y Video"
                          className="min-h-[42px]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="bCost" className="font-semibold text-sm">
                          Rango de Precios
                        </Label>
                        <Select value={businessCostInput} onValueChange={(v: any) => setBusinessCostInput(v)}>
                          <SelectTrigger id="bCost" className="min-h-[42px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="$">$ (Asequible)</SelectItem>
                            <SelectItem value="$$">$$ (Intermedio)</SelectItem>
                            <SelectItem value="$$$">$$$ (Premium)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bLoc" className="font-semibold text-sm">
                          Ubicación (Ciudad / Estado) *
                        </Label>
                        <div className="flex gap-1.5">
                          <Input
                            id="bLoc"
                            value={businessLocationInput}
                            onChange={(e) => {
                              setBusinessLocationInput(e.target.value);
                              setBusinessLat(undefined);
                              setBusinessLng(undefined);
                            }}
                            placeholder="Ej: Ecatepec de Morelos, MEX"
                            className="min-h-[42px]"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="min-h-[42px] min-w-[42px]"
                            onClick={() => handleDetectLocation('business')}
                            disabled={detectingLocation}
                            title="Usar mi ubicación GPS"
                          >
                            {detectingLocation ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <LocateFixed className="h-4 w-4 text-primary" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bPhone" className="font-semibold text-sm">
                          Teléfono / WhatsApp de Contacto
                        </Label>
                        <Input
                          id="bPhone"
                          value={businessPhoneInput}
                          onChange={(e) => setBusinessPhoneInput(e.target.value)}
                          placeholder="Ej: 5512345678"
                          className="min-h-[42px]"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bWeb" className="font-semibold text-sm">
                        Sitio Web o Enlace de Redes Sociales (Instagram, TikTok, Facebook)
                      </Label>
                      <Input
                        id="bWeb"
                        value={businessWebsiteInput}
                        onChange={(e) => setBusinessWebsiteInput(e.target.value)}
                        placeholder="https://instagram.com/tuacademia"
                        className="min-h-[42px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bDesc" className="font-semibold text-sm">
                        Descripción de tus servicios, paquetes y experiencia
                      </Label>
                      <Textarea
                        id="bDesc"
                        rows={4}
                        value={businessDescInput}
                        onChange={(e) => setBusinessDescInput(e.target.value)}
                        placeholder="Cuéntales a las quinceañeras sobre tus coreografías, paquetes con chambelanes, montajes, vestuarios y por qué deben elegirte..."
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 border-t border-border/60">
                      <p className="text-xs text-muted-foreground">
                        ¿Quieres subir fotos o videos de tus eventos? Usa la pestaña <strong>Portada, Fotos y Videos</strong>.
                      </p>
                      <Button onClick={saveBusinessProfile} disabled={savingBusiness} className="gap-2 min-h-[44px] w-full sm:w-auto">
                        {savingBusiness ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Guardar y Publicar en Menú Principal
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="gallery" className="space-y-6">
                <Card className="editorial-surface">
                  <CardHeader className="border-b border-border/60 bg-secondary/20">
                    <CardTitle className="font-headline text-2xl flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-primary" />
                      Portada y Galería de Trabajos (Cloudinary / Storage)
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Sube tu foto principal de portada y un portafolio con fotos y videos de tus eventos, ensayos o salones.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-8">
                    <CoverImageUploader
                      currentUrl={businessCoverUrl}
                      fallbackUrl={
                        PlaceHolderImages.find(
                          (p) => p.id === (myAcademy?.logoImageId || 'academy-logo-1')
                        )?.imageUrl || VISUAL_ASSETS.businessStudioBanner.src
                      }
                      folderPath={`users/${user.uid}/business_cover`}
                      onUploaded={handleBusinessCoverChange}
                    />

                    <div className="border-t border-border/60 pt-6">
                      <MediaManager
                        items={businessGalleryMedia}
                        folderPath={`users/${user.uid}/business_gallery`}
                        maxItems={30}
                        allowVideos={true}
                        onChange={handleBusinessGalleryChange}
                        emptyTitle="Aún no has subido fotos o videos de tu trabajo"
                        emptyDescription="Las quinceañeras podrán ver y reproducir directamente tus fotos y videos en tu página del directorio."
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="quotes" className="space-y-6">
                <Card className="editorial-surface">
                  <CardHeader className="border-b border-border/60 bg-secondary/20">
                    <CardTitle className="font-headline text-2xl flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Cotizaciones Recibidas de Quinceañeras ({businessQuotes.length})
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Mensajes de clientas interesadas en tus servicios de coreografía, salón o eventos.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    {loadingQuotes ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : businessQuotes.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground text-sm">
                        Aún no has recibido solicitudes de cotización. Mantén tu perfil completo y tu galería actualizada para atraer más clientas.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {businessQuotes.map((q) => (
                          <div
                            key={q.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-card gap-4 shadow-sm"
                          >
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-headline font-bold text-base">{q.userName}</span>
                                <span className="text-xs text-muted-foreground">({q.userEmail})</span>
                                <Badge variant="secondary">{statusLabels[q.status]}</Badge>
                              </div>
                              {q.eventDate && (
                                <p className="text-xs text-muted-foreground tabular-nums">
                                  Fecha del evento: {q.eventDate}
                                </p>
                              )}
                              <p className="text-sm text-foreground mt-1">{q.message}</p>
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              <Select
                                value={q.status}
                                onValueChange={async (val) => {
                                  try {
                                    await updateQuoteRequestStatus(q.id, val as QuoteRequestStatus);
                                    setBusinessQuotes((prev) =>
                                      prev.map((item) => (item.id === q.id ? { ...item, status: val as QuoteRequestStatus } : item))
                                    );
                                    toast({ title: 'Estado actualizado' });
                                  } catch {
                                    toast({ variant: 'destructive', title: 'Error al actualizar' });
                                  }
                                }}
                              >
                                <SelectTrigger className="w-36 min-h-[40px]">
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
                                className="min-h-[40px] min-w-[40px]"
                                onClick={async () => {
                                  try {
                                    await deleteQuoteRequest(q.id);
                                    setBusinessQuotes((prev) => prev.filter((item) => item.id !== q.id));
                                    toast({ title: 'Solicitud eliminada' });
                                  } catch {
                                    toast({ variant: 'destructive', title: 'Error' });
                                  }
                                }}
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
            </Tabs>
          </div>
        )}

        {/* ================= PERSONAL CONTACT INFO MODAL / SECTION ================= */}
        <Card className="shadow-sm border-dashed">
          <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="font-headline font-bold text-base">Datos Personales y Teléfono</h3>
              <p className="text-xs text-muted-foreground">
                Nombre: <span className="font-medium text-foreground">{nameInput || 'Sin nombre'}</span> | Teléfono:{' '}
                <span className="font-medium text-foreground">{phoneInput || 'No configurado'}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingInfo(!isEditingInfo)}
                className="gap-1.5 text-xs"
              >
                <Edit className="h-3.5 w-3.5" />
                {isEditingInfo ? 'Cancelar' : 'Modificar Datos'}
              </Button>
            </div>
          </CardContent>
          {isEditingInfo && (
            <div className="p-6 pt-0 border-t mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="infoName" className="text-xs">Nombre Completo</Label>
                  <Input
                    id="infoName"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Tu nombre"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="infoPhone" className="text-xs">Teléfono Móvil</Label>
                  <Input
                    id="infoPhone"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="Tu teléfono"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={savePersonalInfo} disabled={isSavingInfo} className="gap-1.5">
                  {isSavingInfo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Guardar
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
