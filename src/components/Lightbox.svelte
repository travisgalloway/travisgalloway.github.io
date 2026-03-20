<script>
  let { photo = $bindable(null) } = $props();
  let backdropEl = $state(null);
  let closeBtn = $state(null);

  function close() {
    photo = null;
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab' && backdropEl) {
      const focusable = backdropEl.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) close();
  }

  function viewOnGlobe() {
    const { country, countryCode, lat, lng } = photo ?? {};
    close();
    if (country) {
      window.dispatchEvent(
        new CustomEvent('globe:zoom', { detail: { country, countryCode, lat, lng } })
      );
    }
  }

  $effect(() => {
    if (photo && closeBtn) {
      closeBtn.focus();
    }
  });
</script>

<svelte:window onkeydown={handleKeydown} />

{#if photo}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="lightbox-backdrop" role="dialog" aria-modal="true" bind:this={backdropEl} onclick={handleBackdropClick}>
    <div class="lightbox-content">
      <button class="lightbox-close" bind:this={closeBtn} onclick={close} aria-label="Close lightbox">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M4 4L16 16M16 4L4 16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>

      <img
        src={photo.full}
        alt={[photo.description, photo.city, photo.state, photo.country].filter(Boolean).join(', ') || 'Travel photo'}
        class="lightbox-image"
      />

      <div class="lightbox-info">
        {#if photo.description}
          <span class="lightbox-description">{photo.description}</span>
        {/if}
        {#if photo.city || photo.country}
          <span class="lightbox-location">
            {[photo.city, photo.state, photo.country].filter(Boolean).join(', ')}
          </span>
        {/if}
        {#if !photo.description && !photo.city && !photo.country}
          <span class="lightbox-location">Travel photo</span>
        {/if}
        {#if photo.country}
          <button class="lightbox-globe-btn" onclick={viewOnGlobe}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.2"/>
              <ellipse cx="7" cy="7" rx="3" ry="6" stroke="currentColor" stroke-width="1.2"/>
              <line x1="1" y1="7" x2="13" y2="7" stroke="currentColor" stroke-width="1.2"/>
            </svg>
            View on Globe
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .lightbox-backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  .lightbox-content {
    position: relative;
    max-width: 90vw;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .lightbox-close {
    position: absolute;
    top: -2.5rem;
    right: -0.5rem;
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    padding: 4px;
    transition: color 0.15s ease;
    z-index: 2;
  }

  .lightbox-close:hover {
    color: #fff;
  }

  .lightbox-image {
    max-width: 100%;
    max-height: 80vh;
    object-fit: contain;
    border-radius: 6px;
  }

  .lightbox-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.35rem;
    color: rgba(255, 255, 255, 0.85);
    font-size: 0.9rem;
  }

  .lightbox-description {
    font-weight: 600;
    font-size: 1rem;
  }

  .lightbox-location {
    font-weight: 400;
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.85rem;
  }

  .lightbox-globe-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.85);
    border-radius: 20px;
    padding: 6px 14px;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .lightbox-globe-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
  }
</style>
