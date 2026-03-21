<script>
  const links = [
    { label: 'About', href: '#about' },
    { label: 'Experience', href: '#experience' },
    { label: 'Education', href: '#education' },
    { label: 'Projects', href: '#projects' },
    { label: 'Connect', href: '#contact' },
  ];

  const themes = ['system', 'light', 'dark'];

  let theme = $state('system');
  let menuOpen = $state(false);

  function applyTheme(t) {
    if (t === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', t);
    }
    localStorage.setItem('theme', t);
  }

  function cycleTheme() {
    const next = themes[(themes.indexOf(theme) + 1) % themes.length];
    theme = next;
    applyTheme(next);
  }

  function toggleMenu() {
    menuOpen = !menuOpen;
  }

  function closeMenu() {
    menuOpen = false;
  }

  $effect(() => {
    const stored = localStorage.getItem('theme');
    if (stored && themes.includes(stored)) {
      theme = stored;
      applyTheme(stored);
    }
  });
</script>

<nav>
  <div class="nav-inner">
  <a href="/" class="wordmark">
    <img src="/images/profile.jpeg" alt="Travis Galloway" width="32" height="32" class="nav-avatar" />
  </a>
  <button class="hamburger" onclick={toggleMenu} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}>
    {#if menuOpen}
      <svg width="20" height="20" viewBox="0 0 640 640" fill="currentColor"><path d="M509.7 141.7C512.8 138.6 512.8 133.5 509.7 130.4C506.6 127.3 501.5 127.3 498.4 130.4L320 308.7L141.7 130.3C138.6 127.2 133.5 127.2 130.4 130.3C127.3 133.4 127.3 138.5 130.4 141.6L308.7 320L130.3 498.3C127.2 501.4 127.2 506.5 130.3 509.6C133.4 512.7 138.5 512.7 141.6 509.6L320 331.3L498.3 509.7C501.4 512.8 506.5 512.8 509.6 509.7C512.7 506.6 512.7 501.5 509.6 498.4L331.3 320L509.7 141.7z"/></svg>
    {:else}
      <svg width="20" height="20" viewBox="0 0 640 640" fill="currentColor"><path d="M96 136C96 131.6 99.6 128 104 128L536 128C540.4 128 544 131.6 544 136C544 140.4 540.4 144 536 144L104 144C99.6 144 96 140.4 96 136zM96 320C96 315.6 99.6 312 104 312L536 312C540.4 312 544 315.6 544 320C544 324.4 540.4 328 536 328L104 328C99.6 328 96 324.4 96 320zM544 504C544 508.4 540.4 512 536 512L104 512C99.6 512 96 508.4 96 504C96 499.6 99.6 496 104 496L536 496C540.4 496 544 499.6 544 504z"/></svg>
    {/if}
  </button>
  <div class="links" class:open={menuOpen}>
    {#each links as link}
      <a href={link.href} onclick={closeMenu}>{link.label}</a>
    {/each}
    <button class="theme-toggle" onclick={cycleTheme} aria-label="Toggle theme: {theme}">
      {#if theme === 'light'}
        <svg width="16" height="16" viewBox="0 0 640 640" fill="currentColor"><path opacity=".4" d="M224 320C224 373 267 416 320 416C373 416 416 373 416 320C416 267 373 224 320 224C267 224 224 267 224 320z"/><path d="M320 576C315.6 576 312 572.4 312 568L312 480C312 475.6 315.6 472 320 472C324.4 472 328 475.6 328 480L328 568C328 572.4 324.4 576 320 576zM320 168C315.6 168 312 164.4 312 160L312 72C312 67.6 315.6 64 320 64C324.4 64 328 67.6 328 72L328 160C328 164.4 324.4 168 320 168zM139 501C135.9 497.9 135.9 492.8 139 489.7L201.2 427.5C204.3 424.4 209.4 424.4 212.5 427.5C215.6 430.6 215.6 435.7 212.5 438.8L150.3 501C147.2 504.1 142.1 504.1 139 501zM427.5 212.5C424.4 209.4 424.4 204.3 427.5 201.2L489.7 139C492.8 135.9 497.9 135.9 501 139C504.1 142.1 504.1 147.2 501 150.3L438.8 212.5C435.7 215.6 430.6 215.6 427.5 212.5zM568 328L480 328C475.6 328 472 324.4 472 320C472 315.6 475.6 312 480 312L568 312C572.4 312 576 315.6 576 320C576 324.4 572.4 328 568 328zM160 328L72 328C67.6 328 64 324.4 64 320C64 315.6 67.6 312 72 312L160 312C164.4 312 168 315.6 168 320C168 324.4 164.4 328 160 328zM501 501C497.9 504.1 492.8 504.1 489.7 501L427.5 438.8C424.4 435.7 424.4 430.6 427.5 427.5C430.6 424.4 435.7 424.4 438.8 427.5L501 489.7C504.1 492.8 504.1 497.9 501 501zM212.5 212.5C209.4 215.6 204.3 215.6 201.2 212.5L139 150.3C135.9 147.2 135.9 142.1 139 139C142.1 135.9 147.2 135.9 150.3 139L212.5 201.2C215.6 204.3 215.6 209.4 212.5 212.5zM416 320C416 267 373 224 320 224C267 224 224 267 224 320C224 373 267 416 320 416C373 416 416 373 416 320zM208 320C208 258.1 258.1 208 320 208C381.9 208 432 258.1 432 320C432 381.9 381.9 432 320 432C258.1 432 208 381.9 208 320z"/></svg>
      {:else if theme === 'dark'}
        <svg width="16" height="16" viewBox="0 0 640 640" fill="currentColor"><path opacity=".4" d="M80 320C80 452.5 187.5 560 320 560C384.5 560 443.1 534.5 486.2 493.1C488.6 490.8 489.3 487.1 488 484.1C486.7 481.1 483.4 479.1 480.1 479.4C365.5 488.5 264 395.5 264 280C264 201.6 309.2 133.6 374.9 100.9C377.9 99.4 379.7 96.1 379.3 92.8C378.9 89.5 376.4 86.7 373.1 86C356 82 338.3 80 320 80C187.5 80 80 187.4 80 320z"/><path d="M320 80C338.3 80 356 82 373.1 85.9C376.4 86.6 378.9 89.4 379.3 92.7C379.7 96 378 99.3 374.9 100.8C309.1 133.6 264 201.5 264 279.9C264 395.4 365.4 488.4 480.1 479.3C483.5 479 486.6 480.9 488 484C489.4 487.1 488.7 490.7 486.2 493C443.1 534.5 384.5 560 320 560C187.5 560 80 452.5 80 320C80 187.5 187.5 80 320 80zM320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576C388.8 576 451.3 548.8 497.3 504.6C504.6 497.6 506.7 486.7 502.6 477.5C498.5 468.3 488.9 462.6 478.8 463.4C373.4 471.8 280 386.1 280 280C280 207.9 321.5 145.4 382.1 115.2C391.2 110.7 396.4 100.9 395.2 90.8C394 80.7 386.6 72.5 376.7 70.3C358.4 66.2 339.4 64 320 64z"/></svg>
      {:else}
        <svg width="16" height="16" viewBox="0 0 640 640" fill="currentColor"><path opacity=".4" d="M144 176L496 176L496 400L144 400L144 176zM257.4 560L270.7 480L369.1 480L382.4 560L257.3 560z"/><path d="M512 112C538.5 112 560 133.5 560 160L560 416C560 442.5 538.5 464 512 464L128 464C101.5 464 80 442.5 80 416L80 160C80 133.5 101.5 112 128 112L512 112zM128 480L254.6 480L241.3 560L168.1 560C163.7 560 160.1 563.6 160.1 568C160.1 572.4 163.7 576 168.1 576L472.1 576C476.5 576 480.1 572.4 480.1 568C480.1 563.6 476.5 560 472.1 560L398.9 560L385.6 480L512.2 480C547.5 480 576.2 451.3 576.2 416L576.2 160C576.2 124.7 547.5 96 512.2 96L128 96C92.7 96 64 124.7 64 160L64 416C64 451.3 92.7 480 128 480zM257.4 560L270.7 480L369.1 480L382.4 560L257.3 560zM144 176L496 176L496 400L144 400L144 176zM128 176L128 400C128 408.8 135.2 416 144 416L496 416C504.8 416 512 408.8 512 400L512 176C512 167.2 504.8 160 496 160L144 160C135.2 160 128 167.2 128 176z"/></svg>
      {/if}
    </button>
  </div>
  </div>
</nav>

<style>
  nav {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    padding: 1.25rem 2rem;
    background: color-mix(in srgb, var(--c-bg) 85%, transparent);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--c-border-light);
  }

  .nav-inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    max-width: var(--max-w);
    margin: 0 auto;
    width: 100%;
  }

  .wordmark {
    color: var(--c-text);
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .nav-avatar {
    border-radius: 6px;
    object-fit: cover;
    display: block;
  }

  .links {
    display: flex;
    align-items: center;
    gap: 2rem;
  }

  .links a {
    font-size: 0.85rem;
    color: var(--c-text-muted);
    letter-spacing: 0.02em;
    transition: color 0.2s ease;
  }

  .links a:hover {
    color: var(--c-text);
    opacity: 1;
  }

  .theme-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--c-text-muted);
    padding: 0.25rem;
    border-radius: 4px;
    transition: color 0.2s ease;
  }

  .theme-toggle:hover {
    color: var(--c-text);
  }

  .hamburger {
    display: none;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--c-text-muted);
    padding: 0.25rem;
    border-radius: 4px;
    transition: color 0.2s ease;
  }

  .hamburger:hover {
    color: var(--c-text);
  }

  .links a:focus-visible,
  .theme-toggle:focus-visible,
  .hamburger:focus-visible {
    outline: 2px solid var(--c-accent);
    outline-offset: 2px;
    border-radius: 4px;
  }

  @media (max-width: 600px) {
    .hamburger {
      display: flex;
    }

    .nav-inner {
      position: relative;
    }

    .links {
      display: none;
      position: absolute;
      top: 100%;
      left: -2rem;
      right: -2rem;
      flex-direction: column;
      align-items: stretch;
      gap: 0;
      background: var(--c-bg);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--c-border-light);
      padding: 0.5rem 0;
      margin-top: 1.25rem;
    }

    .links.open {
      display: flex;
    }

    .links a {
      padding: 0.75rem 2rem;
      font-size: 0.9rem;
    }

    .links a:hover {
      background: color-mix(in srgb, var(--c-accent) 8%, transparent);
    }

    .theme-toggle {
      padding: 0.75rem 2rem;
      justify-content: flex-start;
    }

    nav {
      padding: 1rem 1.25rem;
    }
  }
</style>
