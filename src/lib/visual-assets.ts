import type { StaticImageData } from 'next/image';
import quinceHeroBallroom from '@/assets/images/quince_hero_ballroom_1795498283737.jpg';
import quinceProfileBanner from '@/assets/images/quince_profile_banner_1795498283690.jpg';
import businessStudioBanner from '@/assets/images/business_studio_banner_1795498284972.jpg';
import academyCardShowcase from '@/assets/images/academy_card_showcase_1795498283934.jpg';

export const VISUAL_ASSETS = {
  quinceHeroBallroom,
  quinceProfileBanner,
  businessStudioBanner,
  academyCardShowcase,
} satisfies Record<string, StaticImageData>;
