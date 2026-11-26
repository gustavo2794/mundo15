'use server';

import { academies as defaultAcademies } from '@/lib/data';

export type FindAcademiesInput = {
  danceStyles: string;
  pricing: string;
  location: string;
  popularity: string;
};

type FindMatchingAcademiesResult =
  | { success: true; data: string[] }
  | { success: false; error: string };

export async function findMatchingAcademies(
  input: FindAcademiesInput
): Promise<FindMatchingAcademiesResult> {
  try {
    const stylesLower = input.danceStyles.toLowerCase().trim();
    const locLower = input.location.toLowerCase().trim();

    const matches = defaultAcademies
      .filter((academy) => {
        const matchesStyle =
          !stylesLower ||
          academy.danceStyles.some((s) => s.toLowerCase().includes(stylesLower)) ||
          academy.description.toLowerCase().includes(stylesLower);
        const matchesLocation =
          !locLower || academy.location.toLowerCase().includes(locLower);
        const matchesPricing = !input.pricing || academy.cost === input.pricing;
        const matchesPopularity =
          !input.popularity || academy.popularity === input.popularity;
        return matchesStyle && (matchesLocation || matchesPricing || matchesPopularity);
      })
      .map((a) => a.name);

    return {
      success: true,
      data: matches.length > 0 ? matches : defaultAcademies.map((a) => a.name),
    };
  } catch (error) {
    console.error('Error in findMatchingAcademies action:', error);
    return { success: false, error: 'Ocurrió un error al buscar academias.' };
  }
}
