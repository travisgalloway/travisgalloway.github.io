<script>
  import manifest from "../data/photo-manifest.json";
  import Lightbox from "./Lightbox.svelte";

  let lightboxPhoto = $state(null);

  // Seeded PRNG (mulberry32) for deterministic shuffle across SSR/client
  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Shuffle all photos deterministically, then deal into 4 disjoint lanes
  const allPhotos = [...manifest.photos];
  const rng = mulberry32(42);
  for (let i = allPhotos.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [allPhotos[i], allPhotos[j]] = [allPhotos[j], allPhotos[i]];
  }

  const LANE_COUNT = 4;

  function photoLabel(photo) {
    const parts = [
      photo.description,
      photo.city,
      photo.state,
      photo.country,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "Travel photo";
  }
  const lanes = Array.from({ length: LANE_COUNT }, () => []);
  allPhotos.forEach((photo, i) => {
    lanes[i % LANE_COUNT].push(photo);
  });

  function openLightbox(photo) {
    lightboxPhoto = photo;
  }
</script>

<section class="hero fade-in-up">
  <div class="photo-cloud">
    {#each lanes as lane, laneIdx}
      <div class="lane lane-{laneIdx + 1}">
        <div class="track">
          {#each lane as photo}
            <button
              class="card {photo.orientation}"
              onclick={() => openLightbox(photo)}
              aria-label={photoLabel(photo)}
            >
              <img src={photo.thumb} alt="" loading="lazy" />
            </button>
          {/each}
          {#each lane as photo}
            <button
              class="card {photo.orientation}"
              onclick={() => openLightbox(photo)}
              aria-label={photoLabel(photo)}
              tabindex="-1"
            >
              <img src={photo.thumb} alt="" loading="lazy" />
            </button>
          {/each}
        </div>
      </div>
    {/each}
  </div>
  <div class="hero-content">
    <div class="inner">
      <div class="hero-text">
        <h1 class="name">Travis Galloway</h1>
        <p class="blurb">
          I'm a software engineer living in Northeast Minneapolis.<br />
          I spend my time tinkering, traveling, and biking between breweries.
        </p>
        <div class="links">
          <a href="#contact">Connect</a>
        </div>
      </div>
      <button
        class="avatar-btn"
        onclick={() => (lightboxPhoto = { full: '/images/profile.jpeg', description: 'The day my wife discovered portrait mode on iPhone.', city: 'Havana', country: 'Cuba', countryCode: 'CU', lat: 23.1136, lng: -82.3666 })}
        aria-label="View profile photo"
      >
        <img
          src="/images/profile.jpeg"
          alt="Travis Galloway"
          width="200"
          height="200"
          class="hero-avatar"
        />
      </button>
    </div>
  </div>
</section>

<Lightbox bind:photo={lightboxPhoto} />

<style>
  .hero {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6rem 2rem 4rem;
    position: relative;
    overflow: hidden;
  }

  .photo-cloud {
    position: absolute;
    top: 70px;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 16px;
  }

  .hero-content {
    position: relative;
    z-index: 1;
    max-width: var(--max-w);
    width: 100%;
    margin: 0 auto;
    background: color-mix(in srgb, var(--c-surface) 78%, transparent);
    backdrop-filter: blur(20px) saturate(140%);
    -webkit-backdrop-filter: blur(20px) saturate(140%);
    border-radius: 16px;
    padding: 2.5rem;
  }

  .lane {
    overflow: hidden;
  }

  .track {
    display: flex;
    gap: 16px;
    width: max-content;
    animation: flow linear infinite;
  }

  .lane-1 .track {
    animation-duration: 170s;
  }
  .lane-2 .track {
    animation-duration: 210s;
  }
  .lane-3 .track {
    animation-duration: 190s;
  }
  .lane-4 .track {
    animation-duration: 225s;
  }

  .lane-2 .track,
  .lane-4 .track {
    animation-name: flow-reverse;
  }

  @keyframes flow {
    from {
      transform: translateX(-50%);
    }
    to {
      transform: translateX(0);
    }
  }

  @keyframes flow-reverse {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(-50%);
    }
  }

  .card {
    flex-shrink: 0;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    padding: 0;
    border: none;
    background: var(--c-border-light);
    cursor: pointer;
    opacity: 0.6;
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease,
      opacity 0.2s ease;
  }

  .card:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    z-index: 2;
    opacity: 1;
  }

  .card img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .card.h {
    width: 240px;
    height: 165px;
  }
  .card.v {
    width: 165px;
    height: 225px;
  }

  @media (prefers-reduced-motion: reduce) {
    .track {
      animation-play-state: paused;
    }
  }

  .inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
  }

  .hero-text {
    flex: 1;
    min-width: 0;
  }

  .blurb {
    font-size: 0.95rem;
    line-height: 1.6;
    margin-bottom: 1.5rem;
    color: var(--c-text-muted);
  }

  .avatar-btn {
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    flex-shrink: 0;
    border-radius: 12px;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .avatar-btn:hover {
    transform: scale(1.04);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }

  .hero-avatar {
    width: 200px;
    height: 200px;
    border-radius: 12px;
    object-fit: cover;
    aspect-ratio: 1 / 1;
    display: block;
  }

  .name {
    font-family: var(--font-display);
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.03em;
    margin-bottom: 0.75rem;
    color: var(--c-text);
  }

  .links {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .links a {
    display: inline-flex;
    align-items: center;
    padding: 0.5rem 1.25rem;
    background: color-mix(in srgb, var(--c-accent) 12%, transparent);
    border-radius: 8px;
    color: var(--c-accent);
    font-weight: 500;
    font-size: 0.875rem;
    letter-spacing: 0.02em;
    transition: background 0.25s ease;
  }

  .links a:hover {
    background: color-mix(in srgb, var(--c-accent) 22%, transparent);
  }

  .sep {
    color: var(--c-border);
    font-size: 0.8rem;
  }

  @media (max-width: 899px) {
    .hero-content {
      padding: 1.75rem;
    }
    .hero-avatar {
      width: 100px;
      height: 100px;
      border-radius: 8px;
    }
    .avatar-btn {
      border-radius: 8px;
    }
  }

  @media (max-width: 480px) {
    .hero-avatar {
      width: 120px;
      height: 120px;
      border-radius: 10px;
    }
    .avatar-btn {
      border-radius: 10px;
    }
    .hero-content {
      padding: 1.25rem;
    }
    .blurb,
    .links {
      display: none;
    }
    .name {
      margin-bottom: 0;
    }
  }
</style>
