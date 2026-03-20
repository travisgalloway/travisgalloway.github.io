<section id="contact" class="contact fade-in-up">
  <div class="inner">
    <h2>Connect</h2>
    <div class="links">
      <a
        href="https://linkedin.com/in/travis-galloway"
        target="_blank"
        rel="noopener noreferrer">LinkedIn</a
      >
      <a href="https://github.com/travisgalloway" target="_blank" rel="noopener noreferrer"
        >GitHub</a
      >
    </div>
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
    margin-bottom: 1rem;
    color: var(--c-text);
  }

  p {
    font-size: 1rem;
    color: var(--c-text-muted);
    line-height: 1.7;
    margin-bottom: 1.5rem;
    max-width: 480px;
  }

  .links {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    font-size: 0.9rem;
  }

  .links a {
    color: var(--c-text-muted);
    transition: color 0.2s ease;
  }

  .links a:hover {
    color: var(--c-accent);
    opacity: 1;
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
