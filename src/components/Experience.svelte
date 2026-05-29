<script>
  const companies = [
    {
      name: "CVS Health",
      logo: "/images/cvs.png",
      period: "Apr 2026 – Present",
      roles: [
        {
          title: "Lead Director - Developer Tooling",
          period: "Apr 2026 – Present",
          points: [
            "Lead CI/CD teams.",
          ],
        },
      ],
    },
    {
      name: "Target",
      logo: "/images/target.png",
      period: "Nov 2019 – Apr 2026",
      roles: [
        {
          title: "Senior Engineering Manager, Platform AI & Compute Platform",
          period: "Aug 2022 – Apr 2026",
          points: [
            "Led engineering teams across platform infrastructure and AI initiatives.",
            "Drove enterprise adoption of AI-assisted developer tools and platform strategy.",
          ],
        },
        {
          title: "Lead Software Engineer, Managed Containers",
          period: "Oct 2020 – Aug 2022",
          points: [
            "Led backend development for a managed container platform.",
            "Designed and shipped systems for autoscaling and multi-cloud deployments.",
          ],
        },
        {
          title: "Senior Software Engineer, Managed Containers",
          period: "Nov 2019 – Oct 2020",
          points: [
            "Extended platform services to support cloud and multi-region deployments.",
            "Designed access control and permissions systems for platform resources.",
          ],
        },
      ],
    },
    {
      name: "Samsung SmartThings",
      logo: "/images/smartthings.png",
      period: "Dec 2017 – Oct 2019",
      roles: [
        {
          title: "Senior Software Engineer, Rules & Behaviors",
          period: "Dec 2017 – Oct 2019",
          points: [
            "Developed backend services for an IoT platform, handling storage and execution of user-defined automations.",
            "Integrated and consolidated platform features during post-acquisition transition.",
          ],
        },
      ],
    },
    {
      name: "University of Minnesota",
      logo: "/images/umn.png",
      period: "Apr 2015 – Dec 2021",
      roles: [
        {
          title: "Adjunct Instructor, Computer Science",
          period: "2016 – 2021",
          points: [
            "Taught a senior capstone course, partnering with corporate sponsors to scope real-world projects.",
          ],
        },
        {
          title: "Web Application Developer, Education Technology",
          period: "2015 – 2017",
          points: [
            "Built instructional tools including a video annotation platform.",
          ],
        },
      ],
    },
  ];
</script>

<section id="experience" class="experience fade-in-up">
  <div class="inner">
    <h2>Experience</h2>
    {#each companies as company}
      <div class="company">
        <div class="company-header">
          <div class="company-name">
            <img
              src={company.logo}
              alt="{company.name} logo"
              width="32"
              height="32"
              class="company-logo"
            />
            <h3>{company.name}</h3>
          </div>
          <span class="period">{company.period}</span>
        </div>
        {#each company.roles as role}
          <div class="role">
            <div class="role-header">
              <p class="title">{role.title}</p>
              <span class="role-period">{role.period}</span>
            </div>
            <ul>
              {#each role.points as point}
                <li>{point}</li>
              {/each}
            </ul>
          </div>
        {/each}
      </div>
    {/each}
  </div>
</section>

<style>
  .experience {
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

  .company {
    margin-bottom: var(--space-md);
    padding-bottom: var(--space-md);
    border-bottom: 1px solid var(--c-border-light);
  }

  .company:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }

  .company-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .company-name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .company-logo {
    border-radius: 4px;
    flex-shrink: 0;
    object-fit: contain;
  }

  h3 {
    font-family: var(--font-display);
    font-size: 1.15rem;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .period {
    font-size: 0.8rem;
    color: var(--c-text-muted);
    white-space: nowrap;
  }

  .role {
    margin-bottom: 1rem;
    margin-left: 2.5rem;
  }

  .role:last-child {
    margin-bottom: 0;
  }

  .role-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .title {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--c-text);
  }

  .role-period {
    font-size: 0.75rem;
    color: var(--c-text-muted);
    white-space: nowrap;
  }

  ul {
    list-style: none;
    padding: 0;
  }

  li {
    font-size: 0.9rem;
    color: var(--c-text-muted);
    line-height: 1.6;
    padding-left: 1rem;
    position: relative;
    margin-bottom: 0.35rem;
  }

  li::before {
    content: "\2013";
    position: absolute;
    left: 0;
    color: var(--c-border);
  }

  @media (max-width: 480px) {
    .role {
      margin-left: 0;
    }
  }
</style>
