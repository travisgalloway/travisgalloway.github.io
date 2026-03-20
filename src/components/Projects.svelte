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
        <div class="project-name">
          <img
            src={project.logo}
            alt="{project.name} logo"
            width="32"
            height="32"
            class="project-logo"
          />
          {#if project.link}
            <a href={project.link} target="_blank" rel="noopener noreferrer">
              <h3>{project.name} <span class="arrow">&nearr;</span></h3>
            </a>
          {:else}
            <h3>{project.name}</h3>
          {/if}
        </div>
        <p>{project.description}</p>
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
    margin-bottom: var(--space-md);
    padding-bottom: var(--space-md);
    border-bottom: 1px solid var(--c-border-light);
  }

  .project:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }

  .project-name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .project-logo {
    border-radius: 4px;
    flex-shrink: 0;
  }

  h3 {
    font-family: var(--font-display);
    font-size: 1.15rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--c-text);
  }

  .arrow {
    font-size: 0.85em;
    opacity: 0.5;
    transition: opacity 0.2s ease;
  }

  a:hover .arrow {
    opacity: 1;
  }

  a {
    color: inherit;
  }

  p {
    font-size: 0.9rem;
    color: var(--c-text-muted);
    line-height: 1.6;
    margin-left: 2.5rem;
  }
</style>
