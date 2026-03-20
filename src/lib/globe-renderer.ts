import { geoOrthographic, geoPath, geoGraticule10, geoDistance, geoContains } from 'd3-geo';
import type { Pin } from './globe-locations';
import type { StateCategory } from './globe-locations';
import { GlobeTextureRenderer } from './globe-texture-renderer';

export interface GlobeTheme {
  ocean: string;
  land: string;
  border: string;
  accent: string;
  pinWork: string;
  pinEducation: string;
  pinTravel: string;
  pinPhoto: string;
  pinLived: string;
  pinVisited: string;
  countryVisited: string;
}

interface PinSize {
  dotR: number;
  ringR: number;
  ringAlpha: number;
}

export interface ProjectedPin {
  pin: Pin;
  x: number;
  y: number;
  visible: boolean;
}

interface StateFeature {
  feature: GeoJSON.Feature;
  category: StateCategory;
  name: string;
}

export interface CountryFeature {
  feature: GeoJSON.Feature;
  name: string;
  centroid: [number, number];
  angularRadius: number;
}

export type ZoomState = 'default' | 'zooming' | 'zoomed';

const lightTheme: GlobeTheme = {
  ocean: '#dbe9ee',
  land: '#c0d6df',
  border: '#9cb8c8',
  accent: '#166088',
  pinWork: '#1f363d',
  pinEducation: '#4a6fa5',
  pinTravel: '#40798c',
  pinPhoto: '#d4956b',
  pinLived: '#70a9a1',
  pinVisited: '#9ec1a3',
  countryVisited: '#cfe0c3',
};

const darkTheme: GlobeTheme = {
  ocean: '#0c171c',
  land: '#1f363d',
  border: '#2d4a55',
  accent: '#5ba4c8',
  pinWork: '#5ba4c8',
  pinEducation: '#7bb5d4',
  pinTravel: '#68b0c4',
  pinPhoto: '#e8a97e',
  pinLived: '#8ec8be',
  pinVisited: '#b4d8c0',
  countryVisited: '#8aac92',
};

export class GlobeRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private projection: ReturnType<typeof geoOrthographic>;
  private path: ReturnType<typeof geoPath>;
  private graticule = geoGraticule10();
  private land: GeoJSON.MultiPolygon | null = null;
  private borders: GeoJSON.MultiLineString | null = null;
  private pins: Pin[] = [];
  private theme: GlobeTheme = lightTheme;
  private size = 420;
  private dpr = 1;
  private highlightedPin: Pin | null = null;

  // State highlight data
  private livedStates: GeoJSON.MultiPolygon | null = null;
  private visitedStates: GeoJSON.MultiPolygon | null = null;
  private stateFeatures: StateFeature[] = [];
  private highlightedState: StateFeature | null = null;

  // Unvisited land overlay (grayed out)
  private unvisitedLand: GeoJSON.MultiPolygon | null = null;

  // Country highlight data
  private visitedCountriesMerged: GeoJSON.MultiPolygon | null = null;
  private countryFeatures: CountryFeature[] = [];
  private highlightedCountry: CountryFeature | null = null;

  // Scale management
  private baseScale = 420 / 2.15;
  private currentScale = 420 / 2.15;

  // Raster earth texture
  private earthTextureData: ImageData | null = null;
  private earthTextureWidth = 0;
  private earthTextureHeight = 0;
  private rasterCanvas: OffscreenCanvas | null = null;
  private rasterCtx: OffscreenCanvasRenderingContext2D | null = null;
  private textureRenderer: GlobeTextureRenderer | null = null;
  isDark = false;

  // Zoom-aware pin rendering
  private zoomState: ZoomState = 'default';
  private zoomProgress = 0;
  private zoomedCountryName = '';
  private zoomedCountryCode = '';
  private countryCentroidMap = new Map<string, [number, number]>();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.dpr = window.devicePixelRatio || 1;
    this.projection = geoOrthographic()
      .precision(0.5)
      .clipAngle(90);
    this.path = geoPath(this.projection, this.ctx);
    this.resize(this.size);
  }

  setWorldData(land: GeoJSON.MultiPolygon, borders: GeoJSON.MultiLineString) {
    this.land = land;
    this.borders = borders;
  }

  setPins(pins: Pin[]) {
    this.pins = pins;
  }

  setTheme(dark: boolean) {
    this.isDark = dark;
    this.theme = dark ? darkTheme : lightTheme;
  }

  setRotation(rotation: [number, number, number]) {
    this.projection.rotate(rotation);
  }

  getRotation(): [number, number, number] {
    return this.projection.rotate() as [number, number, number];
  }

  setHighlightedPin(pin: Pin | null) {
    this.highlightedPin = pin;
  }

  setStateData(
    lived: GeoJSON.MultiPolygon | null,
    visited: GeoJSON.MultiPolygon | null,
    features: StateFeature[],
  ) {
    this.livedStates = lived;
    this.visitedStates = visited;
    this.stateFeatures = features;
  }

  setHighlightedState(state: StateFeature | null) {
    this.highlightedState = state;
  }

  hitTestState(screenX: number, screenY: number): StateFeature | null {
    const coords = this.projection.invert?.([screenX, screenY]);
    if (!coords) return null;

    for (const sf of this.stateFeatures) {
      if (geoContains(sf.feature, coords)) {
        return sf;
      }
    }
    return null;
  }

  // Country data methods
  setCountryData(merged: GeoJSON.MultiPolygon | null, features: CountryFeature[]) {
    this.visitedCountriesMerged = merged;
    this.countryFeatures = features;
    // Populate centroid map for zoom-aware pin placement
    this.countryCentroidMap.clear();
    for (const cf of features) {
      this.countryCentroidMap.set(cf.name, cf.centroid);
    }
  }

  setUnvisitedData(unvisited: GeoJSON.MultiPolygon | null) {
    this.unvisitedLand = unvisited;
  }

  setHighlightedCountry(country: CountryFeature | null) {
    this.highlightedCountry = country;
  }

  hitTestCountry(screenX: number, screenY: number): CountryFeature | null {
    const coords = this.projection.invert?.([screenX, screenY]);
    if (!coords) return null;

    for (const cf of this.countryFeatures) {
      if (geoContains(cf.feature, coords)) {
        return cf;
      }
    }
    return null;
  }

  hitTestOcean(screenX: number, screenY: number): boolean {
    const coords = this.projection.invert?.([screenX, screenY]);
    if (!coords) return false;
    // Within the sphere but not on land
    if (this.land && geoContains(this.land, coords)) return false;
    return true;
  }

  // Scale management
  getBaseScale(): number {
    return this.baseScale;
  }

  getScale(): number {
    return this.currentScale;
  }

  setScale(scale: number) {
    this.currentScale = scale;
    this.projection.scale(scale);
  }

  computeZoomScale(country: CountryFeature): number {
    const ratio = 35 / Math.max(country.angularRadius, 0.1);
    const clamped = Math.max(1.5, Math.min(10, ratio));
    return this.baseScale * clamped;
  }

  resize(size: number) {
    this.size = size;
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = size * this.dpr;
    this.canvas.height = size * this.dpr;
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    this.baseScale = size / 2.15;
    this.currentScale = this.baseScale;
    this.projection
      .scale(this.baseScale)
      .translate([size / 2, size / 2]);
    this.textureRenderer?.resize(size, this.dpr);
    // Recreate raster offscreen canvas at new quarter-resolution
    if (this.earthTextureData) {
      const qs = Math.ceil(size / 4);
      this.rasterCanvas = new OffscreenCanvas(qs, qs);
      this.rasterCtx = this.rasterCanvas.getContext('2d')!;
    }
  }

  // --- Raster earth texture ---

  setEarthTexture(img: HTMLImageElement) {
    // Try WebGL renderer first for full-res GPU projection
    if (GlobeTextureRenderer.isSupported()) {
      try {
        this.textureRenderer = new GlobeTextureRenderer();
        this.textureRenderer.resize(this.size, this.dpr);
        this.textureRenderer.setTexture(img);
      } catch {
        this.textureRenderer = null;
      }
    }

    // Always extract CPU data as fallback
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = img.naturalWidth;
    tmpCanvas.height = img.naturalHeight;
    const tmpCtx = tmpCanvas.getContext('2d')!;
    tmpCtx.drawImage(img, 0, 0);
    this.earthTextureData = tmpCtx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
    this.earthTextureWidth = img.naturalWidth;
    this.earthTextureHeight = img.naturalHeight;
    // Create quarter-resolution offscreen canvas
    const qs = Math.ceil(this.size / 4);
    this.rasterCanvas = new OffscreenCanvas(qs, qs);
    this.rasterCtx = this.rasterCanvas.getContext('2d')!;
  }

  private projectRaster() {
    if (!this.earthTextureData || !this.rasterCanvas || !this.rasterCtx) return;

    const qs = this.rasterCanvas.width;
    const rCtx = this.rasterCtx;
    const srcData = this.earthTextureData.data;
    const srcW = this.earthTextureWidth;
    const srcH = this.earthTextureHeight;

    // Create a temporary projection at quarter scale
    const rot = this.projection.rotate();
    const scale = this.currentScale;
    const qScale = scale * (qs / this.size);
    const qCenter = qs / 2;

    const tempProj = geoOrthographic()
      .scale(qScale)
      .translate([qCenter, qCenter])
      .rotate(rot)
      .clipAngle(90);

    const output = rCtx.createImageData(qs, qs);
    const outData = output.data;

    const r = qScale; // sphere radius in quarter-res pixels
    const r2 = r * r;

    for (let y = 0; y < qs; y++) {
      for (let x = 0; x < qs; x++) {
        const dx = x - qCenter;
        const dy = y - qCenter;
        if (dx * dx + dy * dy > r2) continue;

        const lonlat = tempProj.invert?.([x, y]);
        if (!lonlat) continue;

        const [lon, lat] = lonlat;
        // Map to source image pixel
        const sx = ((lon + 180) / 360) * srcW;
        const sy = ((90 - lat) / 180) * srcH;
        const si = ((sy | 0) * srcW + (sx | 0)) * 4;

        const oi = (y * qs + x) * 4;
        outData[oi] = srcData[si];
        outData[oi + 1] = srcData[si + 1];
        outData[oi + 2] = srcData[si + 2];
        outData[oi + 3] = 255;
      }
    }

    rCtx.putImageData(output, 0, 0);
  }

  // --- Zoom-aware pin methods ---

  setZoomState(state: ZoomState, progress: number, countryName: string, countryCode = '') {
    this.zoomState = state;
    this.zoomProgress = progress;
    this.zoomedCountryName = countryName;
    this.zoomedCountryCode = countryCode;
  }

  private getEffectiveCoords(pin: Pin): [number, number] {
    // Photo pins and non-travel pins always use actual coords
    if (pin.category !== 'travel') return [pin.lng, pin.lat];

    const centroid = this.countryCentroidMap.get((pin as any).country);
    if (!centroid) return [pin.lng, pin.lat];

    if (this.zoomState === 'default') {
      return centroid;
    }
    if (this.zoomState === 'zoomed') {
      return [pin.lng, pin.lat];
    }
    // zooming: interpolate between centroid and actual
    const t = this.zoomProgress;
    return [
      centroid[0] + (pin.lng - centroid[0]) * t,
      centroid[1] + (pin.lat - centroid[1]) * t,
    ];
  }

  private pinBelongsToZoomedCountry(pin: Pin): boolean {
    if (pin.category === 'travel' || pin.category === 'photo') {
      const code = (pin as any).countryCode;
      if (code && this.zoomedCountryCode) {
        return code === this.zoomedCountryCode;
      }
      return (pin as any).country === this.zoomedCountryName;
    }
    return false;
  }

  private getPinOpacity(pin: Pin): number {
    // Photo pins: hidden in default view, visible only when zoomed into their country
    if (pin.category === 'photo') {
      if (this.zoomState === 'default') return 0;
      if (this.zoomState === 'zoomed') {
        return this.pinBelongsToZoomedCountry(pin) ? 1 : 0;
      }
      // zooming in: fade in photo pins for target country
      if (this.pinBelongsToZoomedCountry(pin)) {
        return Math.min(1, this.zoomProgress * 2); // appear in second half
      }
      return 0;
    }

    if (this.zoomState === 'default') return 1;
    if (this.zoomState === 'zoomed') {
      return this.pinBelongsToZoomedCountry(pin) ? 1 : 0;
    }
    // zooming: fade non-target pins during transition
    if (!this.pinBelongsToZoomedCountry(pin)) {
      return Math.max(0, 1 - this.zoomProgress * 2); // gone by halfway
    }
    return 1;
  }

  private getPinColor(pin: Pin): string {
    switch (pin.category) {
      case 'home': return this.theme.pinWork;
      case 'studyAbroad': return this.theme.pinEducation;
      case 'travel': return this.theme.pinTravel;
      case 'photo': return this.theme.pinPhoto;
    }
  }

  private getPinSize(pin: Pin, highlighted: boolean): PinSize {
    if (highlighted) {
      switch (pin.category) {
        case 'home':
          return { dotR: 7, ringR: 12, ringAlpha: 0.7 };
        case 'studyAbroad':
          return { dotR: 5, ringR: 9, ringAlpha: 0.6 };
        case 'travel':
          return { dotR: 4, ringR: 7, ringAlpha: 0.5 };
        case 'photo':
          return { dotR: 4, ringR: 7, ringAlpha: 0.5 };
      }
    }
    switch (pin.category) {
      case 'home':
        return { dotR: 6, ringR: 10, ringAlpha: 0.5 };
      case 'studyAbroad':
        return { dotR: 4, ringR: 7, ringAlpha: 0.4 };
      case 'travel':
        return { dotR: 2.5, ringR: 4.5, ringAlpha: 0.25 };
      case 'photo':
        return { dotR: 3, ringR: 5, ringAlpha: 0.3 };
    }
  }

  getProjectedPins(): ProjectedPin[] {
    const center = this.projection.rotate();
    const result: ProjectedPin[] = [];

    for (const pin of this.pins) {
      // Filter pins when zoomed
      const opacity = this.getPinOpacity(pin);
      if (opacity <= 0) {
        result.push({ pin, x: 0, y: 0, visible: false });
        continue;
      }

      const coords = this.getEffectiveCoords(pin);
      const dist = geoDistance(coords, [-center[0], -center[1]]);
      const visible = dist <= Math.PI / 2;

      if (!visible) {
        result.push({ pin, x: 0, y: 0, visible: false });
        continue;
      }

      const projected = this.projection(coords);
      if (!projected) {
        result.push({ pin, x: 0, y: 0, visible: false });
        continue;
      }

      result.push({ pin, x: projected[0], y: projected[1], visible: true });
    }

    return result;
  }

  render() {
    const { ctx, dpr, size, theme, projection } = this;
    const w = size * dpr;

    ctx.clearRect(0, 0, w, w);
    ctx.save();
    ctx.scale(dpr, dpr);

    // Ocean (sphere fill)
    ctx.beginPath();
    this.path({ type: 'Sphere' } as any);
    ctx.fillStyle = theme.ocean;
    ctx.fill();

    // Graticule lines
    ctx.beginPath();
    this.path(this.graticule);
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 0.3;
    ctx.globalAlpha = 0.4;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Land fill — WebGL texture, CPU raster fallback, or flat color
    const rot = this.projection.rotate();
    const translate: [number, number] = [size / 2, size / 2];

    if (this.textureRenderer?.isReady() && this.land) {
      // WebGL path: full-res GPU projection with dark mode in shader
      this.textureRenderer.render(rot as [number, number, number], this.currentScale, translate, this.isDark, this.dpr);
      ctx.save();
      ctx.beginPath();
      this.path(this.land);
      ctx.clip();
      ctx.drawImage(this.textureRenderer.getCanvas(), 0, 0, size, size);
      ctx.restore();
    } else if (this.earthTextureData && this.land && this.rasterCanvas) {
      // CPU fallback: quarter-res raster projection
      this.projectRaster();
      ctx.save();
      ctx.beginPath();
      this.path(this.land);
      ctx.clip();
      ctx.drawImage(this.rasterCanvas, 0, 0, size, size);
      ctx.restore();

      if (this.isDark) {
        ctx.save();
        ctx.beginPath();
        this.path(this.land);
        ctx.clip();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fill();
        ctx.restore();
      }
    } else if (this.land) {
      ctx.beginPath();
      this.path(this.land);
      ctx.fillStyle = theme.land;
      ctx.fill();
    }

    // Gray overlay on unvisited land
    if (this.unvisitedLand) {
      ctx.save();
      ctx.beginPath();
      this.path(this.unvisitedLand);
      ctx.fillStyle = this.isDark ? 'rgba(0, 0, 0, 0.35)' : 'rgba(128, 128, 128, 0.4)';
      ctx.fill();
      ctx.restore();
    }

    // Hovered country highlight
    if (this.highlightedCountry) {
      ctx.beginPath();
      this.path(this.highlightedCountry.feature);
      ctx.fillStyle = theme.countryVisited;
      ctx.globalAlpha = 0.6;
      ctx.fill();
      ctx.strokeStyle = theme.countryVisited;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.8;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Hovered state highlight
    if (this.highlightedState) {
      ctx.beginPath();
      this.path(this.highlightedState.feature);
      ctx.fillStyle = this.highlightedState.category === 'lived'
        ? theme.pinLived
        : theme.pinVisited;
      ctx.globalAlpha = 0.65;
      ctx.fill();
      ctx.strokeStyle = this.highlightedState.category === 'lived'
        ? theme.pinLived
        : theme.pinVisited;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.8;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Country borders
    if (this.borders) {
      ctx.beginPath();
      this.path(this.borders);
      ctx.strokeStyle = theme.border;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Atmospheric limb gradient (edge darkening for 3D effect)
    ctx.save();
    ctx.beginPath();
    this.path({ type: 'Sphere' } as any);
    ctx.clip();
    const cx = size / 2;
    const cy = size / 2;
    const sphereR = this.currentScale;
    const gradient = ctx.createRadialGradient(cx, cy, sphereR * 0.6, cx, cy, sphereR);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.18)');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();

    // Pins
    const center = projection.rotate();
    for (const pin of this.pins) {
      const opacity = this.getPinOpacity(pin);
      if (opacity <= 0) continue;

      const coords = this.getEffectiveCoords(pin);
      const dist = geoDistance(coords, [-center[0], -center[1]]);
      if (dist > Math.PI / 2) continue;

      const projected = projection(coords);
      if (!projected) continue;

      const [px, py] = projected;
      const color = this.getPinColor(pin);
      const isHighlighted = this.highlightedPin === pin;
      const { dotR, ringR, ringAlpha } = this.getPinSize(pin, isHighlighted);

      const savedAlpha = ctx.globalAlpha;

      if (pin.category === 'photo') {
        // Photo pins: small square marker
        ctx.globalAlpha = opacity;
        const half = dotR;
        ctx.fillStyle = color;
        ctx.fillRect(px - half, py - half, half * 2, half * 2);

        // Outer ring as rounded square
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = ringAlpha * opacity;
        ctx.strokeRect(px - ringR, py - ringR, ringR * 2, ringR * 2);
        ctx.globalAlpha = savedAlpha;
      } else {
        // Standard pins: circle
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.arc(px, py, dotR, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();

        // Outer ring
        ctx.beginPath();
        ctx.arc(px, py, ringR, 0, 2 * Math.PI);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = ringAlpha * opacity;
        ctx.stroke();
        ctx.globalAlpha = savedAlpha;
      }
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  dispose() {
    this.textureRenderer?.dispose();
  }
}
