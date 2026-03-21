<script>
  const projects = [
    {
      name: "Geog",
      logo: "/images/geog.svg",
      description:
        "Maps and places APIs built on open data. Free to start, affordable to scale.",
      link: "https://geog.dev/",
    },
  ];
</script>

<section id="projects" class="projects fade-in-up">
  <div class="inner">
    <h2>Projects</h2>
    {#each projects as project}
      <div class="project">
        <img
          src={project.logo}
          alt="{project.name} logo"
          width="32"
          height="32"
          class="project-logo"
        />
        <div class="project-info">
          {#if project.link}
            <a href={project.link} target="_blank" rel="noopener noreferrer">
              <h3>{project.name}</h3>
            </a>
          {:else}
            <h3>{project.name}</h3>
          {/if}
          <p>{project.description}</p>
        </div>
      </div>
    {/each}
  </div>
</section>

<style>
  .projects {
    padding: var(--space-xl) 2rem;
    border-top: 1px solid var(--c-border-light);
  }

  .inner {
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

  .project {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: var(--space-sm);
    padding-bottom: var(--space-sm);
    border-bottom: 1px solid var(--c-border-light);
  }

  .project:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }

  .project-logo {
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

  a {
    color: inherit;
  }

  p {
    font-size: 0.85rem;
    color: var(--c-text-muted);
    line-height: 1.5;
  }
</style>
