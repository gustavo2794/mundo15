import { z } from 'zod';

const signUpSchema = z
  .object({
    name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
    email: z.string().email({ message: 'Por favor, introduce un correo válido.' }),
    phone: z.string().optional(),
    password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres.' }),
    userType: z.enum(['quinceanera', 'business']),
    businessName: z.string().optional(),
    businessCategory: z.string().optional(),
    location: z.string().optional(),
    cost: z.enum(['$', '$$', '$$$']).optional(),
  })
  .refine(
    (data) => {
      if (data.userType === 'business') {
        return !!data.businessName?.trim() && !!data.businessCategory?.trim() && !!data.location?.trim();
      }
      return true;
    },
    {
      message: 'Por favor, introduce el nombre de la empresa, el giro comercial y la ubicación.',
      path: ['businessName'],
    }
  );

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type SignUpFormValues = z.infer<typeof signUpSchema>;
export type LoginFormValues = z.infer<typeof loginSchema>;

export type ChecklistItem = {
  id: string;
  title: string;
  completed: boolean;
  category: string;
};

export type GodparentItem = {
  id: string;
  name: string;
  role: string;
  phone?: string;
  contribution?: string;
  status?: 'confirmado' | 'pendiente';
};

export type TableItem = {
  id: string;
  tableName: string;
  capacity?: number;
  guests: string[];
  confirmedGuests?: string[];
};

export type BudgetItem = {
  id: string;
  concept: string;
  category: string;
  estimatedAmount: number;
  actualAmount: number;
  status: 'pendiente' | 'anticipo' | 'pagado';
  notes?: string;
};

export type CourtMember = {
  id: string;
  name: string;
  role: 'chambelan_honor' | 'chambelan' | 'dama';
  phone?: string;
  outfitDetails?: string;
  status: 'confirmado' | 'ensayando' | 'pendiente';
  notes?: string;
};

export type TimelineItem = {
  id: string;
  time: string;
  title: string;
  description?: string;
  completed: boolean;
};

export type SongItem = {
  id: string;
  moment: string;
  title: string;
  artist?: string;
  notes?: string;
};

export type MediaAsset = {
  id: string;
  url: string;
  type: 'image' | 'video';
  title?: string;
  storagePath?: string;
  createdAt?: string;
};

export type UserProfile = {
  uid: string;
  displayName: string;
  email: string;
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
  // Geolocation coordinates
  latitude?: number;
  longitude?: number;
  // Quinceañera Planning Fields
  eventDate?: string;
  eventLocation?: string;
  colorPalette?: string[];
  totalBudget?: number;
  musicPreferences: string[];
  dancePreferences: string[];
  themePreferences: string[];
  mediaGallery?: MediaAsset[];
  budgetItems?: BudgetItem[];
  courtOfHonor?: CourtMember[];
  timeline?: TimelineItem[];
  playlist?: SongItem[];
  checklist?: ChecklistItem[];
  godparents?: GodparentItem[];
  tables?: TableItem[];
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type AdminRole = {
  uid: string;
  email: string;
  grantedBy: string;
  createdAt?: unknown;
};

export type QuoteRequestStatus = 'pending' | 'contacted' | 'archived';

export type QuoteRequest = {
  id: string;
  academyId: string;
  academyName: string;
  userId: string;
  userName: string;
  userEmail: string;
  eventDate?: string;
  message: string;
  status: QuoteRequestStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type AcademyReview = {
  id: string;
  academyId: string;
  userId: string;
  userName: string;
  userRole?: string;
  rating: number; // 1 to 5
  title: string;
  comment: string;
  serviceHired?: string;
  eventDate?: string;
  verifiedBooking?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
};


