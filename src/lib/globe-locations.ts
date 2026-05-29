export type PinCategory = 'home' | 'travel' | 'studyAbroad' | 'photo';

interface PinBase {
  lat: number;
  lng: number;
  category: PinCategory;
}

export interface HomePin extends PinBase {
  category: 'home';
  location: string;
}

export interface TravelPin extends PinBase {
  category: 'travel';
  location: string;
  country: string;
  countryCode: string;
}

export interface StudyAbroadPin extends PinBase {
  category: 'studyAbroad';
  location: string;
}

export interface PhotoPin extends PinBase {
  category: 'photo';
  photoId: string;
  thumbUrl: string;
  city: string | null;
  state: string | null;
  country: string;
  countryCode: string;
}

export type Pin = HomePin | TravelPin | StudyAbroadPin | PhotoPin;

export type StateCategory = 'lived' | 'visited';

export const stateHighlights = new Map<string, StateCategory>([
  // US — Lived
  ['California', 'lived'],
  ['Virginia', 'lived'],
  ['Colorado', 'lived'],
  ['Maryland', 'lived'],
  ['Idaho', 'lived'],
  ['Minnesota', 'lived'],
  // US — Visited
  ['Washington', 'visited'],
  ['Oregon', 'visited'],
  ['Nevada', 'visited'],
  ['Arizona', 'visited'],
  ['Utah', 'visited'],
  ['New Mexico', 'visited'],
  ['Texas', 'visited'],
  ['Oklahoma', 'visited'],
  ['Kansas', 'visited'],
  ['Nebraska', 'visited'],
  ['South Dakota', 'visited'],
  ['North Dakota', 'visited'],
  ['Montana', 'visited'],
  ['Wyoming', 'visited'],
  ['Missouri', 'visited'],
  ['Illinois', 'visited'],
  ['Iowa', 'visited'],
  ['Wisconsin', 'visited'],
  ['Pennsylvania', 'visited'],
  ['New York', 'visited'],
  ['Massachusetts', 'visited'],
  ['Florida', 'visited'],
  ['North Carolina', 'visited'],
  ['South Carolina', 'visited'],
  ['Tennessee', 'visited'],
  ['Kentucky', 'visited'],
  ['West Virginia', 'visited'],
  // Canada
  ['British Columbia', 'visited'],
  ['Alberta', 'visited'],
  // Mexico
  ['Jalisco', 'lived'],
  ['Guanajuato', 'visited'],
  ['Distrito Federal', 'visited'],
]);

export const visitedCountries = new Map<string, Map<string, { lat: number; lng: number }>>([
  ['Australia', new Map([['Sydney', { lat: -33.8688, lng: 151.2093 }]])],
  ['Chile', new Map([['Santiago', { lat: -33.4489, lng: -70.6693 }]])],
  ['Antarctica', new Map([['Antarctic Peninsula', { lat: -65.0, lng: -64.0 }]])],
  ['United Kingdom', new Map([['London', { lat: 51.5074, lng: -0.1278 }]])],
  ['Netherlands', new Map([['Amsterdam', { lat: 52.3676, lng: 4.9041 }]])],
  ['Germany', new Map([['Munich', { lat: 48.1351, lng: 11.582 }]])],
  ['Austria', new Map([['Vienna', { lat: 48.2082, lng: 16.3738 }]])],
  ['Spain', new Map([['Madrid', { lat: 40.4168, lng: -3.7038 }]])],
  ['Turkey', new Map([['Istanbul', { lat: 41.0082, lng: 28.9784 }]])],
  ['Kenya', new Map([['Masai Mara', { lat: -1.5, lng: 35.15 }]])],
  ['Uganda', new Map([['Jinja', { lat: 0.4244, lng: 33.2041 }]])],
  ['Rwanda', new Map([['Kigali', { lat: -1.9403, lng: 29.8739 }]])],
  ['Tanzania', new Map([['Zanzibar', { lat: -6.1659, lng: 39.2026 }]])],
  ['Qatar', new Map([['Doha', { lat: 25.2854, lng: 51.531 }]])],
  ['Singapore', new Map([['Singapore', { lat: 1.3521, lng: 103.8198 }]])],
  ['Vietnam', new Map([['Saigon', { lat: 10.8231, lng: 106.6297 }]])],
  ['Japan', new Map([['Tokyo', { lat: 35.6762, lng: 139.6503 }]])],
  ['South Korea', new Map([['Seoul', { lat: 37.5665, lng: 126.978 }]])],
  ['Puerto Rico', new Map([['San Juan', { lat: 18.4655, lng: -66.1057 }]])],
  ['Cuba', new Map([['Havana', { lat: 23.1136, lng: -82.3666 }]])],
  ['Costa Rica', new Map([['Fortuna', { lat: 10.4678, lng: -84.6427 }]])],
  ['El Salvador', new Map([['San Salvador', { lat: 13.6929, lng: -89.2182 }]])],
]);

export const visitedCountryNames = new Set<string>(visitedCountries.keys());

export const countryCodeToName = new Map<string, string>([
  ['AU', 'Australia'],
  ['CL', 'Chile'],
  ['AQ', 'Antarctica'],
  ['GB', 'United Kingdom'],
  ['NL', 'Netherlands'],
  ['DE', 'Germany'],
  ['AT', 'Austria'],
  ['ES', 'Spain'],
  ['TR', 'Turkey'],
  ['KE', 'Kenya'],
  ['UG', 'Uganda'],
  ['RW', 'Rwanda'],
  ['TZ', 'Tanzania'],
  ['QA', 'Qatar'],
  ['SG', 'Singapore'],
  ['VN', 'Vietnam'],
  ['JP', 'Japan'],
  ['KR', 'South Korea'],
  ['PR', 'Puerto Rico'],
  ['CU', 'Cuba'],
  ['CR', 'Costa Rica'],
  ['SV', 'El Salvador'],
]);

export const nameToCode = new Map([...countryCodeToName].map(([c, n]) => [n, c]));

const standalonePins: Pin[] = [
  { lat: 44.98, lng: -93.27, category: 'home', location: 'Minneapolis, MN' },
  { lat: 20.6597, lng: -103.3496, category: 'studyAbroad', location: 'Guadalajara, Mexico' },
];

export function getAllPins(): Pin[] {
  const travelPins: TravelPin[] = [];
  for (const [country, places] of visitedCountries) {
    for (const [location, coords] of places) {
      travelPins.push({
        lat: coords.lat,
        lng: coords.lng,
        category: 'travel' as const,
        location,
        country,
        countryCode: nameToCode.get(country) ?? '',
      });
    }
  }
  return [...standalonePins, ...travelPins];
}

// D3 orthographic rotation: [longitude, -latitude] to center a point
export const sectionRotations: Record<string, [number, number, number]> = {
  about: [93.27, -44.98, 0],
};

export function getPhotoPins(manifest: { photos: Array<{ id: string; thumb: string; city: string | null; state: string | null; country: string | null; countryCode?: string | null; lat: number | null; lng: number | null }> }): PhotoPin[] {
  return manifest.photos
    .filter((p) => p.lat != null && p.lng != null && p.country != null)
    .map((p) => ({
      lat: p.lat!,
      lng: p.lng!,
      category: 'photo' as const,
      photoId: p.id,
      thumbUrl: p.thumb,
      city: p.city ?? null,
      state: p.state ?? null,
      country: p.country!,
      countryCode: p.countryCode ?? nameToCode.get(p.country!) ?? '',
    }));
}
