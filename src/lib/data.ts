
import type { MediaAsset } from '@/lib/types';

export type Academy = {
  id: string;
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
  contact: {
    phone: string;
    email: string;
    website: string;
  };
  logoImageId: string;
  coverImageUrl?: string;
  galleryImageIds: string[];
  galleryMedia?: MediaAsset[];
  createdBy?: string;
  isPublished?: boolean;
  displayOrder?: number;
};

export const academies: Academy[] = [
  {
    id: 'ritmo-latino',
    name: 'Academia de Baile Ritmo Latino',
    description: 'Especializados en bailes latinos vibrantes y energéticos para una Quinceañera inolvidable.',
    longDescription: 'En Ritmo Latino, traemos la pasión y energía de América Latina a tu día especial. Nuestros coreógrafos expertos trabajan contigo para crear impresionantes rutinas de Salsa, Bachata, Merengue y Cumbia. Ofrecemos paquetes para la quinceañera, su corte de honor e incluso el baile padre-hija.',
    cost: '$$',
    location: 'Miami, FL',
    latitude: 25.7617,
    longitude: -80.1918,
    popularity: 'Alta',
    danceStyles: ['Salsa', 'Bachata', 'Moderno', 'Cumbia'],
    contact: {
      phone: '305-555-1234',
      email: 'contacto@ritmolatino.com',
      website: 'www.ritmolatino.com',
    },
    logoImageId: 'academy-logo-1',
    galleryImageIds: ['gallery-1-1', 'gallery-1-2', 'gallery-1-3'],
  },
  {
    id: 'elegancia-choreography',
    name: 'Coreografía Elegancia',
    description: 'Creando valses sofisticados y elegantes y rutinas modernas.',
    longDescription: 'Coreografía Elegancia se enfoca en la elegancia y la gracia atemporales. Somos maestros del vals tradicional, pero también nos destacamos en la creación de piezas contemporáneas y modernas que reflejan tu personalidad única. Nuestra atención al detalle garantiza una actuación pulida y profesional.',
    cost: '$$$',
    location: 'Los Angeles, CA',
    latitude: 34.0522,
    longitude: -118.2437,
    popularity: 'Media',
    danceStyles: ['Vals', 'Tango', 'Contemporáneo', 'Lírico'],
    contact: {
      phone: '213-555-5678',
      email: 'info@eleganciachoreo.com',
      website: 'www.eleganciachoreo.com',
    },
    logoImageId: 'academy-logo-2',
    galleryImageIds: ['gallery-2-1', 'gallery-2-2', 'gallery-2-3'],
  },
  {
    id: 'suenos-de-vals',
    name: 'Sueños de Vals',
    description: 'Coreografía asequible y hermosa para el vals de tus sueños.',
    longDescription: 'Sueños de Vals cree que cada quinceañera merece un baile mágico. Ofrecemos servicios de coreografía accesibles y asequibles, especializándonos en el vals clásico. Nuestros pacientes instructores hacen que el aprendizaje sea divertido y fácil para todos, independientemente de la experiencia.',
    cost: '$',
    location: 'Houston, TX',
    latitude: 29.7604,
    longitude: -95.3698,
    popularity: 'Nueva',
    danceStyles: ['Vals', 'Tradicional', 'Baile Padre-Hija'],
    contact: {
      phone: '713-555-9012',
      email: 'hola@suenosdevals.com',
      website: 'www.suenosdevals.com',
    },
    logoImageId: 'academy-logo-3',
    galleryImageIds: ['gallery-3-1', 'gallery-3-2', 'gallery-3-3'],
  },
  {
    id: 'ecos-del-sur',
    name: 'Compañía de Danza Ecos del Sur',
    description: 'Tradición y vanguardia en cada paso. Expertos en folklórico, norteño, bailes de salón y danza contemporánea premiada.',
    longDescription: 'Bajo la dirección de Gustavo Morales, en Ecos del Sur fusionamos la riqueza del folklore y los ritmos norteños con la elegancia de los bailes de salón y la innovación de la danza contemporánea. Nuestro palmarés en concursos nacionales respalda nuestra excelencia. Creamos coreografías únicas que cuentan tu historia y hacen de tu evento un espectáculo inolvidable.',
    cost: '$$',
    location: 'Ecatepec de Morelos, MEX',
    locationLink: 'https://maps.app.goo.gl/hWqpNMh4bYb5GWJo9',
    latitude: 19.6018,
    longitude: -99.0507,
    popularity: 'Alta',
    danceStyles: ['Norteño', 'Folklórico', 'Bailes de Salón', 'Danza Contemporánea'],
    contact: {
        phone: '5528098448',
        email: 'gustavo.2794@hotmail.com',
        website: 'www.facebook.com/profile.php?id=100068861814273',
    },
    logoImageId: 'academy-logo-1',
    galleryImageIds: ['gallery-1-1', 'gallery-1-2', 'gallery-1-3'],
  },
];
