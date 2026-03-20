import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import exifr from 'exifr';

const PHOTOS_DIR = 'public/images/travels';
const THUMBS_DIR = path.join(PHOTOS_DIR, 'thumbs');
const MANIFEST_PATH = 'src/data/photo-manifest.json';
const MAX_MATCH_KM = 500;

// Known locations from globe-locations.ts
const knownLocations = [
  { city: 'Sydney', country: 'Australia', state: 'New South Wales', lat: -33.8688, lng: 151.2093 },
  { city: 'Santiago', country: 'Chile', state: null, lat: -33.4489, lng: -70.6693 },
  { city: 'Antarctic Peninsula', country: 'Antarctica', state: null, lat: -65.0, lng: -64.0 },
  { city: 'London', country: 'United Kingdom', state: null, lat: 51.5074, lng: -0.1278 },
  { city: 'Amsterdam', country: 'Netherlands', state: null, lat: 52.3676, lng: 4.9041 },
  { city: 'Munich', country: 'Germany', state: 'Bavaria', lat: 48.1351, lng: 11.582 },
  { city: 'Vienna', country: 'Austria', state: null, lat: 48.2082, lng: 16.3738 },
  { city: 'Madrid', country: 'Spain', state: null, lat: 40.4168, lng: -3.7038 },
  { city: 'Istanbul', country: 'Turkey', state: null, lat: 41.0082, lng: 28.9784 },
  { city: 'Masai Mara', country: 'Kenya', state: null, lat: -1.5, lng: 35.15 },
  { city: 'Jinja', country: 'Uganda', state: null, lat: 0.4244, lng: 33.2041 },
  { city: 'Kigali', country: 'Rwanda', state: null, lat: -1.9403, lng: 29.8739 },
  { city: 'Zanzibar', country: 'Tanzania', state: null, lat: -6.1659, lng: 39.2026 },
  { city: 'Doha', country: 'Qatar', state: null, lat: 25.2854, lng: 51.531 },
  { city: 'Singapore', country: 'Singapore', state: null, lat: 1.3521, lng: 103.8198 },
  { city: 'Saigon', country: 'Vietnam', state: null, lat: 10.8231, lng: 106.6297 },
  { city: 'Tokyo', country: 'Japan', state: null, lat: 35.6762, lng: 139.6503 },
  { city: 'Seoul', country: 'South Korea', state: null, lat: 37.5665, lng: 126.978 },
  { city: 'San Juan', country: 'Puerto Rico', state: null, lat: 18.4655, lng: -66.1057 },
  { city: 'Havana', country: 'Cuba', state: null, lat: 23.1136, lng: -82.3666 },
  { city: 'Fortuna', country: 'Costa Rica', state: 'Alajuela', lat: 10.4678, lng: -84.6427 },
  { city: 'Guadalajara', country: 'Mexico', state: 'Jalisco', lat: 20.6597, lng: -103.3496 },
  { city: 'Minneapolis', country: 'United States', state: 'Minnesota', lat: 44.98, lng: -93.27 },
];

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function findClosestLocation(lat, lng) {
  let best = null;
  let bestDist = Infinity;
  for (const loc of knownLocations) {
    const d = haversineKm(lat, lng, loc.lat, loc.lng);
    if (d < bestDist) {
      bestDist = d;
      best = loc;
    }
  }
  return bestDist <= MAX_MATCH_KM ? best : null;
}

async function main() {
  // Ensure thumbs directory exists
  fs.mkdirSync(THUMBS_DIR, { recursive: true });

  const files = fs.readdirSync(PHOTOS_DIR).filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return ['.jpeg', '.jpg', '.png'].includes(ext) && !f.startsWith('.');
  });

  console.log(`Found ${files.length} photos to process`);

  // Load existing manifest to preserve description and state values
  const existingDescriptions = {};
  const existingStates = {};
  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      const oldManifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
      for (const p of oldManifest.photos) {
        if (p.description) existingDescriptions[p.id] = p.description;
        if (p.state) existingStates[p.id] = p.state;
      }
    } catch {
      // ignore parse errors
    }
  }

  const photos = [];
  const nameCounters = {};
  let unknownCounter = 0;

  for (const file of files) {
    const filepath = path.join(PHOTOS_DIR, file);
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) continue;

    // Extract GPS
    let gps = null;
    try {
      gps = await exifr.gps(filepath);
    } catch {
      // no EXIF data
    }

    let city = null;
    let country = null;
    let state = null;
    let lat = null;
    let lng = null;
    let id;

    if (gps && gps.latitude != null && gps.longitude != null) {
      lat = gps.latitude;
      lng = gps.longitude;
      const match = findClosestLocation(lat, lng);
      if (match) {
        city = match.city;
        country = match.country;
        state = match.state || null;
      }
    }

    // Determine slug/ID
    if (city && country) {
      const base = `${slugify(city)}-${slugify(country)}`;
      nameCounters[base] = (nameCounters[base] || 0) + 1;
      id = `${base}-${nameCounters[base]}`;
    } else {
      unknownCounter++;
      id = `unknown-${unknownCounter}`;
    }

    const outFilename = `${id}.jpeg`;

    // Get image dimensions for orientation
    const metadata = await sharp(filepath).metadata();
    const orientation = metadata.width > metadata.height ? 'h' : 'v';

    // Generate thumbnail
    await sharp(filepath)
      .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toFile(path.join(THUMBS_DIR, outFilename));

    // Copy/rename full-size image
    const fullDest = path.join(PHOTOS_DIR, outFilename);
    if (filepath !== fullDest) {
      fs.copyFileSync(filepath, fullDest);
    }

    photos.push({
      id,
      thumb: `/images/travels/thumbs/${outFilename}`,
      full: `/images/travels/${outFilename}`,
      orientation,
      description: existingDescriptions[id] || null,
      state: existingStates[id] || state,
      city,
      country,
      lat,
      lng,
    });

    console.log(`  ${file} → ${outFilename} (${city || 'unknown'}, ${orientation})`);
  }

  // Remove original files that were renamed
  const newNames = new Set(photos.map((p) => `${p.id}.jpeg`));
  for (const file of files) {
    if (!newNames.has(file)) {
      const filepath = path.join(PHOTOS_DIR, file);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        console.log(`  Removed original: ${file}`);
      }
    }
  }

  // Write manifest
  const manifest = { photos };
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\nManifest written: ${MANIFEST_PATH} (${photos.length} photos)`);
  console.log(
    `  With GPS: ${photos.filter((p) => p.lat !== null).length}`,
  );
  console.log(
    `  Without GPS: ${photos.filter((p) => p.lat === null).length}`,
  );
}

main().catch(console.error);
