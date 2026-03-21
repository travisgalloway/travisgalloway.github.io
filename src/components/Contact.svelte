<script>
  const links = [
    {
      name: "GitHub",
      logo: "/images/github.svg",
      href: "https://github.com/travisgalloway",
      display: "github.com/travisgalloway",
    },
    {
      name: "LinkedIn",
      logo: "/images/linkedin.svg",
      href: "https://linkedin.com/in/travis-galloway",
      display: "linkedin.com/in/travis-galloway",
    },
  ];
</script>

<section id="contact" class="contact fade-in-up">
  <div class="inner">
    <h2>Connect</h2>
    {#each links as link}
      <a class="link" href={link.href} target="_blank" rel="noopener noreferrer">
        <img
          src={link.logo}
          alt="{link.name} logo"
          width="32"
          height="32"
          class="link-logo"
        />
        <div class="link-info">
          <h3>{link.name}</h3>
          <p>{link.display}</p>
        </div>
      </a>
    {/each}
  </div>
</section>

<footer>
  <div class="inner">
    <span>&copy; {new Date().getFullYear()} Travis Galloway</span>
  </div>
</footer>

<style>
  .contact {
    padding: var(--space-xl) 2rem;
    border-top: 1px solid var(--c-border-light);
  }

  .contact .inner {
    max-width: var(--max-w);
    margin: 0 auto;
  }

  h2 {
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: -0.02em;
    margin-bottom: var(--space-lg);
    color: var(--c-text);
  }

  .link {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: var(--space-sm);
    padding-bottom: var(--space-sm);
    border-bottom: 1px solid var(--c-border-light);
  }

  .link:last-of-type {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }

  .link-logo {
    border-radius: 4px;
    flex-shrink: 0;
  }

  h3 {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--c-text);
  }

  p {
    font-size: 0.85rem;
    color: var(--c-text-muted);
    line-height: 1.5;
  }

  footer {
    padding: var(--space-md) 2rem;
    border-top: 1px solid var(--c-border-light);
  }

  footer .inner {
    max-width: var(--max-w);
    margin: 0 auto;
  }

  footer span {
    font-size: 0.8rem;
    color: var(--c-text-muted);
  }
</style>
