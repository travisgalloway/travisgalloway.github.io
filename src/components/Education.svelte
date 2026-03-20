<script>
  const schools = [
    {
      name: "University of Minnesota",
      logo: "/images/umn.svg",
      degree: "MS Software Engineering",
      location: "Minneapolis",
    },
    {
      name: "University of Idaho",
      logo: "/images/uidaho.png",
      degree: "BA Political Science",
      location: "Moscow",
    },
  ];
</script>

<section id="education" class="education fade-in-up">
  <div class="inner">
    <h2>Education</h2>
    {#each schools as school}
      <div class="school">
        <img
          src={school.logo}
          alt="{school.name} logo"
          width="32"
          height="32"
          class="school-logo"
        />
        <div class="school-info">
          <h3>{school.name}</h3>
          <p>{school.degree} &middot; {school.location}</p>
        </div>
      </div>
    {/each}
  </div>
</section>

<style>
  .education {
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

  .school {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: var(--space-sm);
    padding-bottom: var(--space-sm);
    border-bottom: 1px solid var(--c-border-light);
  }

  .school:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }

  .school-logo {
    border-radius: 4px;
    flex-shrink: 0;
  }

  h3 {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  p {
    font-size: 0.85rem;
    color: var(--c-text-muted);
    line-height: 1.5;
  }
</style>
