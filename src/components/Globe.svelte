<script>
  import { onMount } from 'svelte';
  import { select } from 'd3-selection';
  import { drag } from 'd3-drag';
  import { interpolate } from 'd3-interpolate';
  import { timer } from 'd3-timer';
  import { geoCentroid, geoBounds, geoDistance } from 'd3-geo';
  import { GlobeRenderer } from '../lib/globe-renderer';
  import { getAllPins, getPhotoPins, sectionRotations, stateHighlights, visitedCountryNames, nameToCode } from '../lib/globe-locations';
  import photoManifest from '../data/photo-manifest.json';
  import * as topojson from 'topojson-client';
  import Lightbox from './Lightbox.svelte';

  let { size = 440 } = $props();

  const photoPins = getPhotoPins(photoManifest);
  const pins = [...getAllPins(), ...photoPins];

  // Lookup map from photoId → full manifest entry (for lightbox)
  const photoById = new Map(photoManifest.photos.map((p) => [p.id, p]));
  let globeLightboxPhoto = $state(null);

  let canvasEl;
  let renderer;
  let activeSection = 'about';
  let isDragging = false;
  let dragResumeTimer = null;
  let idleTimer = null;
  let animTimer = null;
  let prefersReducedMotion = false;

  // Tooltip state
  let tooltipX = $state(0);
  let tooltipY = $state(0);
  let hoveredPinIndex = $state(-1);
  let hoveredStateName = $state('');
  let hoveredStateCategory = $state('');
  let lastMouseX = 0;
  let lastMouseY = 0;

  // Country hover tooltip (default view)
  let hoveredCountryName = $state('');

  // Zoom state
  let isZoomed = $state(false);
  let zoomedCountryName = $state('');
  let zoomedCountryCode = $state('');
  let zoomAnimating = $state(false);
  let expandedPinIndex = $state(-1);
  let cardX = $state(0);
  let cardY = $state(0);

  // Country features (stored for zoom-back)
  let countryFeaturesMap = new Map();
  let zoomedCountryFeature = null;

  // Drag displacement tracking for click disambiguation
  let dragDisplacement = 0;

  onMount(() => {
    renderer = new GlobeRenderer(canvasEl);
    renderer.setPins(pins);
    renderer.setRotation(sectionRotations.about);

    // Check reduced motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion = motionQuery.matches;
    const handleMotionChange = (e) => {
      prefersReducedMotion = e.matches;
      if (prefersReducedMotion) stopIdle();
    };
    motionQuery.addEventListener('change', handleMotionChange);

    // Theme detection
    updateTheme();
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkQuery.addEventListener('change', () => updateTheme());
    const observer = new MutationObserver(() => updateTheme());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // Load image helper (resolves null on error for graceful fallback)
    function loadImage(src) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      });
    }

    // Fetch world data + state data + international provinces + earth texture in parallel
    Promise.all([
      fetch('/data/countries-110m.json').then((r) => r.json()),
      fetch('/data/states-10m.json').then((r) => r.json()),
      fetch('/data/intl-provinces.json').then((r) => r.json()),
      loadImage('/data/earth-texture.jpg'),
    ]).then(([countryTopo, stateTopo, intlTopo, earthTexture]) => {
      // Country data
      const land = topojson.feature(countryTopo, countryTopo.objects.land);
      const borders = topojson.mesh(countryTopo, countryTopo.objects.countries, (a, b) => a !== b);
      renderer.setWorldData(land.geometry || land, borders);

      // State data — filter to highlighted states, merge into lived/visited groups
      const allStateGeoms = stateTopo.objects.states.geometries;

      // International provinces — filter to highlighted entries
      const intlObjKey = Object.keys(intlTopo.objects)[0];
      const intlGeoms = intlTopo.objects[intlObjKey].geometries;
      const intlHighlighted = intlGeoms.filter(
        (g) => stateHighlights.has(g.properties.name),
      );

      // Combine US + international geometries
      const combinedLivedGeoms = [
        ...allStateGeoms.filter((g) => stateHighlights.get(g.properties.name) === 'lived'),
      ];
      const combinedVisitedGeoms = [
        ...allStateGeoms.filter((g) => stateHighlights.get(g.properties.name) === 'visited'),
      ];

      // Add international provinces to respective category arrays
      for (const g of intlHighlighted) {
        const cat = stateHighlights.get(g.properties.name);
        if (cat === 'lived') combinedLivedGeoms.push(g);
        else if (cat === 'visited') combinedVisitedGeoms.push(g);
      }

      // Merge US geometries using US topology
      const usLivedGeoms = allStateGeoms.filter(
        (g) => stateHighlights.get(g.properties.name) === 'lived',
      );
      const usVisitedGeoms = allStateGeoms.filter(
        (g) => stateHighlights.get(g.properties.name) === 'visited',
      );
      const usLivedMerged = usLivedGeoms.length > 0
        ? topojson.merge(stateTopo, usLivedGeoms)
        : null;
      const usVisitedMerged = usVisitedGeoms.length > 0
        ? topojson.merge(stateTopo, usVisitedGeoms)
        : null;

      // Merge international geometries using intl topology
      const intlLivedGeoms = intlHighlighted.filter(
        (g) => stateHighlights.get(g.properties.name) === 'lived',
      );
      const intlVisitedGeoms = intlHighlighted.filter(
        (g) => stateHighlights.get(g.properties.name) === 'visited',
      );
      const intlLivedMerged = intlLivedGeoms.length > 0
        ? topojson.merge(intlTopo, intlLivedGeoms)
        : null;
      const intlVisitedMerged = intlVisitedGeoms.length > 0
        ? topojson.merge(intlTopo, intlVisitedGeoms)
        : null;

      // Combine merged geometries from both topologies
      function combineMultiPolygons(a, b) {
        if (!a) return b;
        if (!b) return a;
        return { type: 'MultiPolygon', coordinates: [...a.coordinates, ...b.coordinates] };
      }

      const livedMerged = combineMultiPolygons(usLivedMerged, intlLivedMerged);
      const visitedMerged = combineMultiPolygons(usVisitedMerged, intlVisitedMerged);

      // Build individual features for hover hit-testing (US + international)
      const stateFeatures = [
        ...allStateGeoms
          .filter((g) => stateHighlights.has(g.properties.name))
          .map((g) => ({
            feature: topojson.feature(stateTopo, g),
            category: stateHighlights.get(g.properties.name),
            name: g.properties.name,
          })),
        ...intlHighlighted.map((g) => ({
          feature: topojson.feature(intlTopo, g),
          category: stateHighlights.get(g.properties.name),
          name: g.properties.name,
        })),
      ];

      renderer.setStateData(livedMerged, visitedMerged, stateFeatures);

      // Visited country data — extract from country topology
      const allCountryGeoms = countryTopo.objects.countries.geometries;
      const visitedGeomsList = allCountryGeoms.filter(
        (g) => visitedCountryNames.has(g.properties.name),
      );

      const visitedMergedCountries = visitedGeomsList.length > 0
        ? topojson.merge(countryTopo, visitedGeomsList)
        : null;

      const countryFeatures = visitedGeomsList.map((g) => {
        const feature = topojson.feature(countryTopo, g);
        const centroid = geoCentroid(feature);
        const bounds = geoBounds(feature);
        // angularRadius = max distance from centroid to any bounds corner (in degrees)
        const d1 = geoDistance(centroid, bounds[0]) * (180 / Math.PI);
        const d2 = geoDistance(centroid, bounds[1]) * (180 / Math.PI);
        const d3val = geoDistance(centroid, [bounds[0][0], bounds[1][1]]) * (180 / Math.PI);
        const d4 = geoDistance(centroid, [bounds[1][0], bounds[0][1]]) * (180 / Math.PI);
        const angularRadius = Math.max(d1, d2, d3val, d4);
        return {
          feature,
          name: g.properties.name,
          centroid,
          angularRadius,
        };
      });

      renderer.setCountryData(visitedMergedCountries, countryFeatures);

      // Compute unvisited geometry for gray overlay
      const provinceCountries = new Set(['United States of America', 'Canada', 'Mexico']);
      const unvisitedCountryGeoms = allCountryGeoms.filter(
        (g) => !visitedCountryNames.has(g.properties.name) && !provinceCountries.has(g.properties.name),
      );
      const unvisitedCountriesMerged = unvisitedCountryGeoms.length > 0
        ? topojson.merge(countryTopo, unvisitedCountryGeoms)
        : null;

      const unvisitedStateGeoms = allStateGeoms.filter(
        (g) => !stateHighlights.has(g.properties.name),
      );
      const unvisitedStatesMerged = unvisitedStateGeoms.length > 0
        ? topojson.merge(stateTopo, unvisitedStateGeoms)
        : null;

      const unvisitedIntlGeoms = intlGeoms.filter(
        (g) => !stateHighlights.has(g.properties.name),
      );
      const unvisitedIntlMerged = unvisitedIntlGeoms.length > 0
        ? topojson.merge(intlTopo, unvisitedIntlGeoms)
        : null;

      const unvisitedLand = combineMultiPolygons(
        combineMultiPolygons(unvisitedCountriesMerged, unvisitedStatesMerged),
        unvisitedIntlMerged,
      );
      renderer.setUnvisitedData(unvisitedLand);

      // Store for later lookup — key by country code
      for (const cf of countryFeatures) {
        const code = nameToCode.get(cf.name);
        if (code) countryFeaturesMap.set(code, cf);
      }

      // Set earth texture if loaded
      if (earthTexture) {
        renderer.setEarthTexture(earthTexture);
      }

      renderer.setZoomState('default', 0, '', '');
      renderer.render();
      startIdle();
    });

    // Drag interaction
    const sel = select(canvasEl);
    let dragStart;
    let rotationStart;

    sel.call(
      drag()
        .on('start', (event) => {
          isDragging = true;
          dragDisplacement = 0;
          stopIdle();
          stopAnim();
          clearDragResume();
          clearHover();
          dismissCard();
          dragStart = [event.x, event.y];
          rotationStart = renderer.getRotation();
          canvasEl.style.cursor = 'grabbing';
        })
        .on('drag', (event) => {
          // Prevent rotation while pinch-zooming
          if (event.sourceEvent?.touches?.length >= 2) return;
          const dx = event.x - dragStart[0];
          const dy = event.y - dragStart[1];
          dragDisplacement = Math.sqrt(dx * dx + dy * dy);
          const scale = 0.3;
          renderer.setRotation([
            rotationStart[0] + dx * scale,
            Math.max(-90, Math.min(90, rotationStart[1] - dy * scale)),
            rotationStart[2],
          ]);
          renderer.render();
        })
        .on('end', (event) => {
          isDragging = false;
          canvasEl.style.cursor = 'grab';

          // Click disambiguation: if drag was < 3px, treat as click
          if (dragDisplacement < 3 && event.sourceEvent) {
            handleGlobeClick(event.sourceEvent);
            return;
          }

          if (isZoomed && zoomedCountryFeature) {
            // Snap back to pin cluster centroid after 2s
            dragResumeTimer = setTimeout(() => {
              const cf = zoomedCountryFeature;
              const pt = lastPinTarget;
              const centroid = pt ? pt.centroid : cf.centroid;
              const angRadius = pt ? pt.angularRadius : cf.angularRadius;
              animateToTarget(
                [-centroid[0], -centroid[1], 0],
                renderer.computeZoomScale(angRadius),
              );
            }, 2000);
          } else {
            // Resume scroll-linked rotation after 3s
            dragResumeTimer = setTimeout(() => {
              animateToSection(activeSection);
              startIdle();
            }, 3000);
          }
        })
    );

    canvasEl.style.cursor = 'grab';

    // Mouse hover for pin + state + country hit detection
    canvasEl.addEventListener('mousemove', handleMouseMove);
    canvasEl.addEventListener('mouseleave', handleMouseLeave);

    // Free zoom: mouse wheel + trackpad pinch
    function handleWheel(e) {
      e.preventDefault();
      const delta = e.deltaMode === 1 ? e.deltaY * 15 : e.deltaY;
      const factor = 1 - delta * 0.002;
      const base = renderer.getBaseScale();
      const newScale = Math.max(base, Math.min(base * 10, renderer.getScale() * factor));
      renderer.setScale(newScale);
      // Clear country-click zoom if zoomed out to base
      if (isZoomed && newScale <= base + 0.1) {
        isZoomed = false;
        zoomedCountryName = '';
        zoomedCountryCode = '';
        zoomedCountryFeature = null;
      lastPinTarget = null;
        renderer.setZoomState('default', 0, '', '');
        startIdle();
      }
      renderer.render();
    }
    canvasEl.addEventListener('wheel', handleWheel, { passive: false });

    // Free zoom: touch pinch
    let pinchStartDist = 0;
    let pinchStartScale = 0;

    function handleTouchStart(e) {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchStartDist = Math.sqrt(dx * dx + dy * dy);
        pinchStartScale = renderer.getScale();
      }
    }

    function handleTouchMove(e) {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (pinchStartDist > 0) {
          const ratio = dist / pinchStartDist;
          const base = renderer.getBaseScale();
          const newScale = Math.max(base, Math.min(base * 10, pinchStartScale * ratio));
          renderer.setScale(newScale);
          if (isZoomed && newScale <= base + 0.1) {
            isZoomed = false;
            zoomedCountryName = '';
            zoomedCountryCode = '';
            zoomedCountryFeature = null;
            lastPinTarget = null;
            renderer.setZoomState('default', 0, '', '');
            startIdle();
          }
          renderer.render();
        }
      }
    }

    function handleTouchEnd(e) {
      if (e.touches.length < 2) {
        pinchStartDist = 0;
        pinchStartScale = 0;
      }
    }

    canvasEl.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvasEl.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvasEl.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Keyboard: Escape to zoom out
    function handleKeydown(e) {
      if (e.key === 'Escape' && isZoomed) {
        zoomOut();
      }
    }
    window.addEventListener('keydown', handleKeydown);

    // Listen for globe:zoom events from Hero lightbox
    function handleGlobeZoom(e) {
      const { country, countryCode: evtCode, lat, lng } = e.detail;
      const code = evtCode || nameToCode.get(country);
      const cf = code ? countryFeaturesMap.get(code) : null;

      // Always scroll globe into view
      const stage = canvasEl.closest('.globe-stage');
      if (stage) {
        stage.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      // Cancel any in-progress animation so the new zoom isn't blocked
      stopAnim();
      zoomAnimating = false;

      // Find and highlight the matching photo pin
      function activateMatchingPin() {
        if (lat != null && lng != null) {
          const match = pins.find(
            (p) => p.category === 'photo' && p.lat === lat && p.lng === lng,
          );
          if (match) {
            renderer.setActivePin(match);
            renderer.render();
          }
        }
      }

      if (cf) {
        setTimeout(() => {
          if (isZoomed && zoomedCountryCode === code) {
            // Already on this country — just highlight the pin, don't re-zoom
            activateMatchingPin();
          } else if (isZoomed) {
            zoomOut(() => {
              zoomToCountry(cf, activateMatchingPin);
            });
          } else {
            zoomToCountry(cf, activateMatchingPin);
          }
        }, 400);
      } else if (lat != null && lng != null) {
        // Fallback — rotate to coordinates (no boundary zoom)
        const target = [-lng, -lat, 0];
        setTimeout(() => {
          if (isZoomed) {
            zoomOut(() => animateToCoords(target));
          } else {
            animateToCoords(target);
          }
        }, 400);
      }
    }
    window.addEventListener('globe:zoom', handleGlobeZoom);

    // Resize handling
    function handleResize() {
      const containerWidth = canvasEl.parentElement?.clientWidth || size;
      const newSize = Math.min(containerWidth, size);
      // Preserve zoom ratio across resize
      const oldBase = renderer.getBaseScale();
      const zoomRatio = renderer.getScale() / oldBase;
      renderer.resize(newSize);
      if (isZoomed && zoomedCountryFeature) {
        const pt = lastPinTarget;
        const angRadius = pt ? pt.angularRadius : zoomedCountryFeature.angularRadius;
        const zoomScale = renderer.computeZoomScale(angRadius);
        renderer.setScale(zoomScale);
      } else if (zoomRatio > 1.01) {
        // Preserve free zoom ratio
        renderer.setScale(renderer.getBaseScale() * zoomRatio);
      }
      renderer.render();
    }
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      renderer?.dispose();
      stopIdle();
      stopAnim();
      clearDragResume();
      canvasEl.removeEventListener('mousemove', handleMouseMove);
      canvasEl.removeEventListener('mouseleave', handleMouseLeave);
      canvasEl.removeEventListener('wheel', handleWheel);
      canvasEl.removeEventListener('touchstart', handleTouchStart);
      canvasEl.removeEventListener('touchmove', handleTouchMove);
      canvasEl.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKeydown);
      observer.disconnect();
      darkQuery.removeEventListener('change', updateTheme);
      motionQuery.removeEventListener('change', handleMotionChange);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('globe:zoom', handleGlobeZoom);
    };
  });

  function handleGlobeClick(sourceEvent) {
    if (zoomAnimating || !renderer) return;

    const rect = canvasEl.getBoundingClientRect();
    const mx = sourceEvent.clientX - rect.left;
    const my = sourceEvent.clientY - rect.top;

    if (isZoomed) {
      // Zoomed: hit-test pins in the zoomed country first (travel + photo)
      const projected = renderer.getProjectedPins();
      let closestIdx = -1;
      let closestDist = 14;

      for (let i = 0; i < projected.length; i++) {
        const pp = projected[i];
        if (!pp.visible) continue;
        if (pp.pin.category !== 'travel' && pp.pin.category !== 'photo') continue;
        const dx = pp.x - mx;
        const dy = pp.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = i;
        }
      }

      if (closestIdx >= 0) {
        const pp = projected[closestIdx];
        const pinCode = pp.pin.countryCode;
        if (pinCode && pinCode !== zoomedCountryCode) {
          // Pin belongs to a different country — zoom there
          const country = countryFeaturesMap.get(pinCode);
          if (country) {
            zoomToCountry(country);
            return;
          }
        }
        // Same country — open lightbox for photo pins, card for travel pins
        if (pp.pin.category === 'photo') {
          const photoEntry = photoById.get(pp.pin.photoId);
          if (photoEntry) {
            renderer.setActivePin(pp.pin);
            renderer.render();
            globeLightboxPhoto = photoEntry;
            return;
          }
        }
        expandedPinIndex = closestIdx;
        positionCard(pp.x, pp.y);
        return;
      }

      // Click anywhere else while zoomed
      if (expandedPinIndex >= 0) {
        // First click: dismiss card, stay zoomed
        dismissCard();
      } else {
        // Second click: zoom out
        zoomOut();
      }
    } else {
      // Default view: hit-test pins first, then countries
      const projected = renderer.getProjectedPins();
      let closestPinIdx = -1;
      let closestPinDist = 14;

      for (let i = 0; i < projected.length; i++) {
        const pp = projected[i];
        if (!pp.visible) continue;
        const dx = pp.x - mx;
        const dy = pp.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < closestPinDist) {
          closestPinDist = dist;
          closestPinIdx = i;
        }
      }

      if (closestPinIdx >= 0) {
        const pin = projected[closestPinIdx].pin;
        if (pin.category === 'travel' || pin.category === 'photo') {
          const code = pin.countryCode;
          const country = code ? countryFeaturesMap.get(code) : null;
          if (country) {
            zoomToCountry(country);
            return;
          }
        }
        // home/studyAbroad pins consume the click without falling through
        return;
      }

      // Fall through: hit-test visited country polygons
      const countryHit = renderer.hitTestCountry(mx, my);
      if (countryHit) {
        zoomToCountry(countryHit);
      }
    }
  }

  function positionCard(px, py) {
    const flipX = px > size / 2;
    cardX = flipX ? px - 212 : px + 12;
    cardY = Math.max(12, py - 60);
    // Keep card within globe bounds
    if (cardY + 200 > size) cardY = size - 200;
  }

  function dismissCard() {
    expandedPinIndex = -1;
  }

  // Compute zoom target based on pin cluster centroid instead of country centroid
  let lastPinTarget = null;
  function computePinZoomTarget(code) {
    const countryPins = pins.filter(
      (p) => (p.category === 'travel' || p.category === 'photo') && p.countryCode === code,
    );
    if (countryPins.length === 0) return null;

    const avgLng = countryPins.reduce((s, p) => s + p.lng, 0) / countryPins.length;
    const avgLat = countryPins.reduce((s, p) => s + p.lat, 0) / countryPins.length;

    let maxDist = 0;
    for (const p of countryPins) {
      const d = geoDistance([avgLng, avgLat], [p.lng, p.lat]) * (180 / Math.PI);
      if (d > maxDist) maxDist = d;
    }
    const angularRadius = Math.max(maxDist + 2, 5);

    return { centroid: [avgLng, avgLat], angularRadius };
  }

  function zoomToCountry(country, onComplete) {
    if (zoomAnimating || !renderer) return;

    zoomAnimating = true;
    stopIdle();
    stopAnim();
    clearDragResume();
    clearHover();
    dismissCard();

    const code = nameToCode.get(country.name) ?? '';
    zoomedCountryName = country.name;
    zoomedCountryCode = code;
    zoomedCountryFeature = country;
    isZoomed = true;

    // Zoom to pin cluster centroid if pins exist, otherwise country centroid
    const pinTarget = computePinZoomTarget(code);
    lastPinTarget = pinTarget;
    const centroid = pinTarget ? pinTarget.centroid : country.centroid;
    const angRadius = pinTarget ? pinTarget.angularRadius : country.angularRadius;

    const targetRotation = [-centroid[0], -centroid[1], 0];
    const targetScale = renderer.computeZoomScale(angRadius);

    if (prefersReducedMotion) {
      renderer.setRotation(targetRotation);
      renderer.setScale(targetScale);
      renderer.setZoomState('zoomed', 1, country.name, zoomedCountryCode);
      renderer.render();
      zoomAnimating = false;
      if (onComplete) onComplete();
      return;
    }

    renderer.setZoomState('zooming', 0, country.name, zoomedCountryCode);

    const fromRotation = shortestRotation(renderer.getRotation(), targetRotation);
    const fromScale = renderer.getScale();
    const interpR = interpolate(fromRotation, targetRotation);
    const duration = 800;
    const start = performance.now();

    animTimer = timer(() => {
      const t = Math.min(1, (performance.now() - start) / duration);
      // Cubic ease-in-out
      const eased = t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;

      renderer.setRotation(interpR(eased));
      renderer.setScale(fromScale + (targetScale - fromScale) * eased);
      renderer.setZoomState('zooming', eased, zoomedCountryName, zoomedCountryCode);
      renderer.render();

      if (t >= 1) {
        animTimer.stop();
        animTimer = null;
        renderer.setZoomState('zoomed', 1, zoomedCountryName, zoomedCountryCode);
        zoomAnimating = false;
        if (onComplete) onComplete();
      }
    });
  }

  function zoomOut(onComplete) {
    if (!renderer) {
      if (onComplete) onComplete();
      return;
    }
    if (zoomAnimating) {
      // Force-reset stale animation state so we don't stay stuck
      stopAnim();
      zoomAnimating = false;
    }

    zoomAnimating = true;
    dismissCard();
    clearDragResume();
    renderer.setActivePin(null);

    const targetRotation = sectionRotations[activeSection] || sectionRotations.about;
    const targetScale = renderer.getBaseScale();

    if (prefersReducedMotion) {
      renderer.setRotation(targetRotation);
      renderer.setScale(targetScale);
      renderer.setZoomState('default', 0, '', '');
      renderer.render();
      isZoomed = false;
      zoomedCountryName = '';
      zoomedCountryCode = '';
      zoomedCountryFeature = null;
      lastPinTarget = null;
      zoomAnimating = false;
      startIdle();
      if (onComplete) onComplete();
      return;
    }

    renderer.setZoomState('zooming', 1, zoomedCountryName, zoomedCountryCode);

    const fromRotation = shortestRotation(renderer.getRotation(), targetRotation);
    const fromScale = renderer.getScale();
    const interpR = interpolate(fromRotation, targetRotation);
    const duration = 800;
    const start = performance.now();

    animTimer = timer(() => {
      const t = Math.min(1, (performance.now() - start) / duration);
      const eased = t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;

      renderer.setRotation(interpR(eased));
      renderer.setScale(fromScale + (targetScale - fromScale) * eased);
      renderer.setZoomState('zooming', 1 - eased, zoomedCountryName, zoomedCountryCode);
      renderer.render();

      if (t >= 1) {
        animTimer.stop();
        animTimer = null;
        renderer.setZoomState('default', 0, '', '');
        isZoomed = false;
        zoomedCountryName = '';
        zoomedCountryCode = '';
        zoomedCountryFeature = null;
      lastPinTarget = null;
        zoomAnimating = false;
        startIdle();
        if (onComplete) onComplete();
      }
    });
  }

  function animateToTarget(targetRotation, targetScale) {
    if (!renderer) return;

    if (prefersReducedMotion) {
      renderer.setRotation(targetRotation);
      renderer.setScale(targetScale);
      renderer.render();
      return;
    }

    stopAnim();
    const fromRotation = shortestRotation(renderer.getRotation(), targetRotation);
    const fromScale = renderer.getScale();
    const interpR = interpolate(fromRotation, targetRotation);
    const duration = 800;
    const start = performance.now();

    animTimer = timer(() => {
      const t = Math.min(1, (performance.now() - start) / duration);
      const eased = 1 - (1 - t) * (1 - t);
      renderer.setRotation(interpR(eased));
      renderer.setScale(fromScale + (targetScale - fromScale) * eased);
      renderer.render();
      if (t >= 1) {
        animTimer.stop();
        animTimer = null;
      }
    });
  }

  function handleMouseMove(event) {
    if (isDragging || !renderer) return;

    const rect = canvasEl.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    lastMouseX = mx;
    lastMouseY = my;

    // First check pins (they render on top)
    const projected = renderer.getProjectedPins();
    let closestIdx = -1;
    let closestDist = 12;

    for (let i = 0; i < projected.length; i++) {
      const pp = projected[i];
      if (!pp.visible) continue;
      const dx = pp.x - mx;
      const dy = pp.y - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    }

    if (closestIdx >= 0) {
      // Hovering a pin — clear any state/country hover
      if (hoveredStateName) {
        hoveredStateName = '';
        hoveredStateCategory = '';
        renderer.setHighlightedState(null);
      }
      if (hoveredCountryName) {
        hoveredCountryName = '';
        renderer.setHighlightedCountry(null);
      }
      if (closestIdx !== hoveredPinIndex) {
        hoveredPinIndex = closestIdx;
        const pp = projected[closestIdx];
        tooltipX = pp.x;
        tooltipY = pp.y;
        renderer.setHighlightedPin(pp.pin);
        renderer.render();
      }
      canvasEl.style.cursor = 'pointer';
      return;
    }

    // No pin — clear pin hover
    if (hoveredPinIndex >= 0) {
      hoveredPinIndex = -1;
      renderer.setHighlightedPin(null);
    }

    // Check state polygons
    const stateHit = renderer.hitTestState(mx, my);
    if (stateHit) {
      if (hoveredCountryName) {
        hoveredCountryName = '';
        renderer.setHighlightedCountry(null);
      }
      if (hoveredStateName !== stateHit.name) {
        hoveredStateName = stateHit.name;
        hoveredStateCategory = stateHit.category;
        renderer.setHighlightedState(stateHit);
        renderer.render();
      }
      tooltipX = mx;
      tooltipY = my;
      canvasEl.style.cursor = 'pointer';
      return;
    }

    // Clear state hover
    if (hoveredStateName) {
      hoveredStateName = '';
      hoveredStateCategory = '';
      renderer.setHighlightedState(null);
    }

    // Check visited countries (only in default view)
    if (!isZoomed) {
      const countryHit = renderer.hitTestCountry(mx, my);
      if (countryHit) {
        if (hoveredCountryName !== countryHit.name) {
          hoveredCountryName = countryHit.name;
          renderer.setHighlightedCountry(countryHit);
          renderer.render();
        }
        tooltipX = mx;
        tooltipY = my;
        canvasEl.style.cursor = 'pointer';
        return;
      }
    }

    // Nothing hit
    if (hoveredCountryName) {
      hoveredCountryName = '';
      renderer.setHighlightedCountry(null);
    }
    if (hoveredPinIndex >= 0 || hoveredStateName) {
      hoveredStateName = '';
      hoveredStateCategory = '';
      hoveredPinIndex = -1;
      renderer.setHighlightedState(null);
      renderer.setHighlightedPin(null);
    }
    renderer.render();
    canvasEl.style.cursor = isZoomed ? 'pointer' : 'grab';
  }

  function handleMouseLeave() {
    clearHover();
  }

  function clearHover() {
    if (hoveredPinIndex >= 0 || hoveredStateName || hoveredCountryName) {
      hoveredPinIndex = -1;
      hoveredStateName = '';
      hoveredStateCategory = '';
      hoveredCountryName = '';
      if (renderer) {
        renderer.setHighlightedPin(null);
        renderer.setHighlightedState(null);
        renderer.setHighlightedCountry(null);
        renderer.render();
      }
    }
    if (canvasEl && !isDragging) {
      canvasEl.style.cursor = isZoomed ? 'pointer' : 'grab';
    }
  }

  function recheckHover() {
    // Recheck pin hover
    if (hoveredPinIndex >= 0 && renderer) {
      const projected = renderer.getProjectedPins();
      if (hoveredPinIndex >= projected.length) {
        clearHover();
        return;
      }
      const pp = projected[hoveredPinIndex];
      if (!pp.visible) {
        clearHover();
      } else {
        tooltipX = pp.x;
        tooltipY = pp.y;
      }
    }
    // Recheck state hover
    if (hoveredStateName && renderer) {
      const stateHit = renderer.hitTestState(lastMouseX, lastMouseY);
      if (!stateHit || stateHit.name !== hoveredStateName) {
        hoveredStateName = '';
        hoveredStateCategory = '';
        renderer.setHighlightedState(null);
      }
    }
    // Recheck country hover
    if (hoveredCountryName && renderer) {
      const countryHit = renderer.hitTestCountry(lastMouseX, lastMouseY);
      if (!countryHit || countryHit.name !== hoveredCountryName) {
        hoveredCountryName = '';
        renderer.setHighlightedCountry(null);
      }
    }
  }

  function updateTheme() {
    if (!renderer) return;
    const attr = document.documentElement.getAttribute('data-theme');
    let dark;
    if (attr === 'dark') {
      dark = true;
    } else if (attr === 'light') {
      dark = false;
    } else {
      dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    renderer.setTheme(dark);
    renderer.render();

  }

  function animateToSection(sectionId) {
    const target = sectionRotations[sectionId];
    if (!target || !renderer) return;

    if (prefersReducedMotion) {
      renderer.setRotation(target);
      renderer.render();
      return;
    }

    stopAnim();
    const from = shortestRotation(renderer.getRotation(), target);
    const interp = interpolate(from, target);
    const duration = 1200;
    const start = performance.now();

    animTimer = timer(() => {
      const t = Math.min(1, (performance.now() - start) / duration);
      const eased = 1 - (1 - t) * (1 - t);
      renderer.setRotation(interp(eased));
      renderer.render();
      recheckHover();
      if (t >= 1) {
        animTimer.stop();
        animTimer = null;
      }
    });
  }

  function animateToCoords(target) {
    if (!renderer) return;
    if (prefersReducedMotion) {
      renderer.setRotation(target);
      renderer.render();
      return;
    }
    stopAnim();
    const from = shortestRotation(renderer.getRotation(), target);
    const interp = interpolate(from, target);
    const duration = 1200;
    const start = performance.now();
    animTimer = timer(() => {
      const t = Math.min(1, (performance.now() - start) / duration);
      const eased = 1 - (1 - t) * (1 - t);
      renderer.setRotation(interp(eased));
      renderer.render();
      recheckHover();
      if (t >= 1) {
        animTimer.stop();
        animTimer = null;
      }
    });
  }

  function startIdle() {
    if (prefersReducedMotion || idleTimer || isZoomed) return;
    idleTimer = timer(() => {
      if (isDragging || animTimer) return;
      const r = renderer.getRotation();
      renderer.setRotation([r[0] + 0.05, r[1], r[2]]);
      renderer.render();
      recheckHover();
    });
  }

  function stopIdle() {
    if (idleTimer) {
      idleTimer.stop();
      idleTimer = null;
    }
  }

  function stopAnim() {
    if (animTimer) {
      animTimer.stop();
      animTimer = null;
    }
  }

  function shortestRotation(from, to) {
    const adjusted = [from[0], from[1], from[2]];
    while (adjusted[0] - to[0] > 180) adjusted[0] -= 360;
    while (adjusted[0] - to[0] < -180) adjusted[0] += 360;
    return adjusted;
  }

  function clearDragResume() {
    if (dragResumeTimer) {
      clearTimeout(dragResumeTimer);
      dragResumeTimer = null;
    }
  }

  function tooltipStyle(x, y) {
    const flipX = x > size / 2;
    const tx = flipX ? 'calc(-100% - 12px)' : '12px';
    return `left:${x}px;top:${y}px;transform:translate(${tx},-100%)`;
  }

</script>

<div class="globe-wrapper">
  <canvas bind:this={canvasEl} width={size} height={size}></canvas>

  <!-- Back button (zoomed view) -->
  {#if isZoomed}
    <button class="globe-back-btn" onclick={() => zoomOut()}>
      <svg width="14" height="14" viewBox="0 0 640 640" fill="currentColor"><path d="M162.3 314.3C159.2 317.4 159.2 322.5 162.3 325.6L378.3 541.6C381.4 544.7 386.5 544.7 389.6 541.6C392.7 538.5 392.7 533.4 389.6 530.3L179.3 320L389.7 109.7C392.8 106.6 392.8 101.5 389.7 98.4C386.6 95.3 381.5 95.3 378.4 98.4L162.4 314.4z"/></svg>
      Back
    </button>
  {/if}

  <!-- Country name label (zoomed view) -->
  {#if isZoomed && zoomedCountryName}
    <div class="globe-country-label">{zoomedCountryName}</div>
  {/if}

  <!-- Expanded pin card (zoomed view) -->
  {#if expandedPinIndex >= 0}
    {@const pin = pins[expandedPinIndex]}
    <div class="globe-card" style="left:{cardX}px;top:{cardY}px">
      <button class="globe-card-close" onclick={() => dismissCard()}>
        <svg width="12" height="12" viewBox="0 0 640 640" fill="currentColor"><path d="M509.7 141.7C512.8 138.6 512.8 133.5 509.7 130.4C506.6 127.3 501.5 127.3 498.4 130.4L320 308.7L141.7 130.3C138.6 127.2 133.5 127.2 130.4 130.3C127.3 133.4 127.3 138.5 130.4 141.6L308.7 320L130.3 498.3C127.2 501.4 127.2 506.5 130.3 509.6C133.4 512.7 138.5 512.7 141.6 509.6L320 331.3L498.3 509.7C501.4 512.8 506.5 512.8 509.6 509.7C512.7 506.6 512.7 501.5 509.6 498.4L331.3 320L509.7 141.7z"/></svg>
      </button>
      {#if pin.category === 'photo'}
        <img src={pin.thumbUrl} alt={[pin.city, pin.state, pin.country].filter(Boolean).join(', ')} class="globe-card-thumb" />
        <span class="tooltip-category tooltip-category--photo">Photo</span>
        <strong>{[pin.city, pin.state, pin.country].filter(Boolean).join(', ')}</strong>
      {:else}
        <span class="tooltip-category tooltip-category--travel">Travel</span>
        <strong>{pin.location}</strong>
      {/if}
    </div>
  {/if}

  <!-- Pin tooltip (default view hover) -->
  {#if hoveredPinIndex >= 0 && expandedPinIndex < 0}
    {@const pin = pins[hoveredPinIndex]}
    <div class="globe-tooltip" style={tooltipStyle(tooltipX, tooltipY)}>
      {#if pin.category === 'home'}
        <span class="tooltip-category tooltip-category--home">Home</span>
        <strong>{pin.location}</strong>
      {:else if pin.category === 'studyAbroad'}
        <span class="tooltip-category tooltip-category--studyAbroad">Studied Abroad</span>
        <strong>{pin.location}</strong>
      {:else if pin.category === 'photo'}
        <span class="tooltip-category tooltip-category--photo">Photo</span>
        <strong>{[pin.city, pin.state, pin.country].filter(Boolean).join(', ')}</strong>
      {:else if pin.category === 'travel'}
        <span class="tooltip-category tooltip-category--travel">Travel</span>
        <strong>{pin.country}</strong>
      {/if}
    </div>
  {:else if hoveredStateName && expandedPinIndex < 0}
    <div class="globe-tooltip" style={tooltipStyle(tooltipX, tooltipY)}>
      {#if hoveredStateCategory === 'lived'}
        <span class="tooltip-category tooltip-category--lived">Lived</span>
      {:else}
        <span class="tooltip-category tooltip-category--visited">Visited</span>
      {/if}
      <strong>{hoveredStateName}</strong>
    </div>
  {:else if hoveredCountryName && !isZoomed && expandedPinIndex < 0}
    <div class="globe-tooltip" style={tooltipStyle(tooltipX, tooltipY)}>
      <span class="tooltip-category tooltip-category--country">Visited</span>
      <strong>{hoveredCountryName}</strong>
    </div>
  {/if}
</div>

<Lightbox bind:photo={globeLightboxPhoto} showGlobeButton={false} />

<style>
  .globe-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  canvas {
    display: block;
    touch-action: none;
  }

  .globe-tooltip {
    position: absolute;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    gap: 2px;
    background: var(--c-surface);
    color: var(--c-text);
    border: 1px solid var(--c-border);
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 13px;
    line-height: 1.4;
    white-space: nowrap;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    z-index: 10;
  }

  .globe-tooltip strong {
    font-size: 14px;
  }

  .tooltip-category {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .tooltip-category--home {
    color: var(--c-pin-work);
  }

  .tooltip-category--studyAbroad {
    color: var(--c-pin-education);
  }

  .tooltip-category--travel {
    color: var(--c-pin-travel);
  }

  .tooltip-category--lived {
    color: var(--c-pin-lived);
  }

  .tooltip-category--visited {
    color: var(--c-pin-visited);
  }

  .tooltip-category--photo {
    color: var(--c-pin-photo, #d4956b);
  }

  .tooltip-category--country {
    color: var(--c-country-visited);
  }

  .tooltip-detail {
    color: var(--c-text-muted);
  }

  /* Back button */
  .globe-back-btn {
    position: absolute;
    top: 12px;
    left: 12px;
    z-index: 15;
    display: flex;
    align-items: center;
    gap: 4px;
    background: var(--c-surface);
    color: var(--c-text);
    border: 1px solid var(--c-border);
    border-radius: 16px;
    padding: 6px 12px 6px 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: opacity 0.15s ease;
  }

  .globe-back-btn:hover {
    opacity: 0.8;
  }

  /* Country name label */
  .globe-country-label {
    position: absolute;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    pointer-events: none;
    z-index: 10;
    background: var(--c-surface);
    color: var(--c-text);
    border: 1px solid var(--c-border);
    border-radius: 16px;
    padding: 4px 14px;
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  /* Expanded pin card */
  .globe-card {
    position: absolute;
    z-index: 20;
    pointer-events: auto;
    width: 200px;
    background: var(--c-surface);
    color: var(--c-text);
    border: 1px solid var(--c-border);
    border-radius: 10px;
    padding: 10px 12px;
    font-size: 13px;
    line-height: 1.4;
    display: flex;
    flex-direction: column;
    gap: 4px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }

  .globe-card strong {
    font-size: 14px;
    padding-right: 18px;
  }

  .globe-card-close {
    position: absolute;
    top: 8px;
    right: 8px;
    background: none;
    border: none;
    color: var(--c-text-muted);
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: color 0.15s ease;
  }

  .globe-card-close:hover {
    color: var(--c-text);
  }

  .globe-card-thumb {
    width: 100%;
    height: 100px;
    object-fit: cover;
    border-radius: 6px;
    margin-bottom: 4px;
  }

</style>
