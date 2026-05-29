import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import exifr from 'exifr';

const PHOTOS_DIR = 'public/images/travels';
const THUMBS_DIR = path.join(PHOTOS_DIR, 'thumbs');
const MANIFEST_PATH = 'src/data/photo-manifest.json';
const MAX_MATCH_KM = 500;

// Canonical key order for manifest entries (normalizes any drift).
const KEY_ORDER = [
  'id', 'thumb', 'full', 'orientation', 'description',
  'city', 'state', 'country', 'countryCode', 'lat', 'lng',
];

// Maps country name -> ISO code, mirroring countryCodeToName in
// src/lib/globe-locations.ts. Used to write/backfill `countryCode`.
const countryNameToCode = {
  Australia: 'AU', Chile: 'CL', Antarctica: 'AQ', 'United Kingdom': 'GB',
  Netherlands: 'NL', Germany: 'DE', Austria: 'AT', Spain: 'ES', Turkey: 'TR',
  Kenya: 'KE', Uganda: 'UG', Rwanda: 'RW', Tanzania: 'TZ', Qatar: 'QA',
  Singapore: 'SG', Vietnam: 'VN', Japan: 'JP', 'South Korea': 'KR',
  'Puerto Rico': 'PR', Cuba: 'CU', 'Costa Rica': 'CR', 'El Salvador': 'SV',
};

// NON-AUTHORITATIVE convenience copy of `visitedCountries` in
// src/lib/globe-locations.ts, used ONLY to autofill brand-new photo stubs from
// GPS. The committed src/data/photo-manifest.json is the source of truth — this
// script preserves existing curated entries and never renames or deletes files.
// If you add a country here, add it to globe-locations.ts (and vice versa).
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
  { city: 'San Salvador', country: 'El Salvador', state: null, lat: 13.6929, lng: -89.2182 },
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

function orderKeys(entry) {
  const ordered = {};
  for (const key of KEY_ORDER) ordered[key] = entry[key] ?? null;
  return ordered;
}

async function main() {
  // Ensure thumbs directory exists
  fs.mkdirSync(THUMBS_DIR, { recursive: true });

  // Index image files by their canonical id (filename without extension).
  // The filename IS the id — it is never derived from GPS or renamed.
  const fileById = new Map();
  for (const file of fs.readdirSync(PHOTOS_DIR)) {
    const ext = path.extname(file).toLowerCase();
    if (!['.jpeg', '.jpg', '.png'].includes(ext) || file.startsWith('.')) continue;
    if (fs.statSync(path.join(PHOTOS_DIR, file)).isDirectory()) continue;
    const id = path.basename(file, path.extname(file));
    if (fileById.has(id)) {
      console.warn(`  WARNING: id collision "${id}" (${fileById.get(id)} vs ${file}); keeping ${fileById.get(id)}`);
      continue;
    }
    fileById.set(id, file);
  }

  // Load existing manifest — the source of truth for curated fields.
  const existing = new Map();
  const manifestOrder = [];
  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      const oldManifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
      for (const p of oldManifest.photos) {
        existing.set(p.id, p);
        manifestOrder.push(p.id);
      }
    } catch {
      // ignore parse errors — treat as empty (every file becomes a stub)
    }
  }

  // Preserve existing manifest order (keeping only ids that still have a file),
  // then append new files (sorted) — minimizes the manifest diff. One entry per
  // file id: dedupe in case the manifest carried duplicate ids.
  const newIds = [...fileById.keys()].filter((id) => !existing.has(id)).sort();
  const seen = new Set();
  const orderedIds = [...manifestOrder.filter((id) => fileById.has(id)), ...newIds]
    .filter((id) => (seen.has(id) ? false : seen.add(id)));

  const photos = [];
  let newStubs = 0;

  for (const id of orderedIds) {
    const filename = fileById.get(id);
    const filepath = path.join(PHOTOS_DIR, filename);

    // Generate the thumbnail only if it's missing (idempotent, no binary churn).
    const thumbPath = path.join(THUMBS_DIR, `${id}.jpeg`);
    if (!fs.existsSync(thumbPath)) {
      await sharp(filepath)
        .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 75 })
        .toFile(thumbPath);
    }

    let entry;
    if (existing.has(id)) {
      // Preserve all curated fields; only refresh the derived paths.
      entry = { ...existing.get(id) };
      entry.thumb = `/images/travels/thumbs/${id}.jpeg`;
      entry.full = `/images/travels/${filename}`;
      if (entry.countryCode == null && entry.country) {
        entry.countryCode = countryNameToCode[entry.country] ?? null;
      }
    } else {
      // New file → build a stub. GPS autofill is best-effort.
      const metadata = await sharp(filepath).metadata();
      const orientation = metadata.width > metadata.height ? 'h' : 'v';

      let gps = null;
      try {
        gps = await exifr.gps(filepath);
      } catch {
        // no EXIF data
      }
      const hasGps = gps && gps.latitude != null && gps.longitude != null;
      const loc = hasGps ? findClosestLocation(gps.latitude, gps.longitude) : null;

      entry = {
        id,
        thumb: `/images/travels/thumbs/${id}.jpeg`,
        full: `/images/travels/${filename}`,
        orientation,
        description: null,
        city: loc?.city ?? null,
        state: loc?.state ?? null,
        country: loc?.country ?? null,
        countryCode: loc ? countryNameToCode[loc.country] ?? null : null,
        lat: hasGps ? gps.latitude : null,
        lng: hasGps ? gps.longitude : null,
      };
      newStubs++;
      console.log(
        `  NEW STUB: ${id}` +
          (loc ? ` (autofilled ${loc.city})` : ' (no GPS match — fill in by hand)'),
      );
    }

    photos.push(orderKeys(entry));
  }

  // Report manifest entries whose image file no longer exists (pruned).
  let pruned = 0;
  for (const id of manifestOrder) {
    if (!fileById.has(id)) {
      console.log(`  PRUNED (no image file): ${id}`);
      pruned++;
    }
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify({ photos }, null, 2) + '\n');
  console.log(`\nManifest written: ${MANIFEST_PATH} (${photos.length} photos)`);
  console.log(`  New stubs: ${newStubs}`);
  console.log(`  Pruned: ${pruned}`);
  console.log(`  With GPS: ${photos.filter((p) => p.lat !== null).length}`);
  console.log(`  Without GPS: ${photos.filter((p) => p.lat === null).length}`);
}

main().catch(console.error);
