<script>
  const links = [
    { label: 'About', href: '#about' },
    { label: 'Experience', href: '#experience' },
    { label: 'Projects', href: '#projects' },
    { label: 'Education', href: '#education' },
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
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      {#if menuOpen}
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      {:else}
        <line x1="3" y1="6" x2="21" y2="6"/>
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
      {/if}
    </svg>
  </button>
  <div class="links" class:open={menuOpen}>
    {#each links as link}
      <a href={link.href} onclick={closeMenu}>{link.label}</a>
    {/each}
    <button class="theme-toggle" onclick={cycleTheme} aria-label="Toggle theme: {theme}">
      {#if theme === 'light'}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      {:else if theme === 'dark'}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      {:else}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
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
