# Heroku & GitHub Student Developer Pack

## Credits (GitHub Students)

Through the [GitHub Student Developer Pack](https://education.github.com/pack), Heroku has offered **monthly platform credits** (commonly cited as **USD $13/month for 12 months** when enrolled via [Heroku for GitHub Students](https://www.heroku.com/github-students/)). Offers change — confirm the current benefit on GitHub Education and Heroku’s signup page.

**Verify on your account (not exposed in plain CLI):**

1. [Heroku Dashboard](https://dashboard.heroku.com) → **Account settings** → **Billing**.
2. Look for **Platform credits** / student credits (see [Heroku Help](https://help.heroku.com/5NWYWU7I/how-can-i-check-if-my-platform-credits-associated-with-the-heroku-for-github-students-program-have-been-applied-to-my-account)).

CLI check: `heroku auth:whoami` only confirms login (you have `heroku` installed).

**Important:** credits usually **do not roll over**; usage beyond the monthly allocation bills to your payment method. A card is typically required to redeem student offers.

## Lighthouse on Heroku

Lighthouse’s default stack is **multi-container** (Kestra + Postgres + pgvector + LiteLLM + Miniflux + SearxNG + worker). Heroku does **not** run `docker-compose.yml` as a single unit. Running the **full** demo means either:

- **Splitting** into multiple Heroku apps / add-ons (complex, costly), or  
- **Trimming** to a subset (e.g. API-only or static site) and hosting the orchestrator elsewhere.

For a **faithful** deployment, a **VPS** or **container platform** that runs Compose or Kubernetes is usually simpler than Heroku. See [`SECURITY.md`](../SECURITY.md) for operational risks (Docker socket, DB exposure).

This doc is for **verifying your student credits** and **sanity-checking cost** — not a turnkey Heroku port of the whole stack.
