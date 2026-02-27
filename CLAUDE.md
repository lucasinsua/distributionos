# CLAUDE.md — Prospecting Engine

## Project Overview

AI-powered B2B prospecting and lead generation platform. Automates the full customer acquisition funnel: pain-point discovery, lead enrichment, content generation, multi-channel outreach, lead scoring, and funnel analytics.

**Tech stack:** TypeScript, Node.js 20+, React 19, Astro 4, Vite 6, Supabase (PostgreSQL), Turbo monorepo, MCP (Model Context Protocol), Trigger.dev

## Repository Structure

```
packages/
├── shared/              # Core types, DB client, API clients, utilities
├── dashboard/           # React SPA (Vite) — pipeline, content, campaigns, analytics views
├── landing-pages/       # Astro static site — lead magnet landing pages
├── jobs/                # Trigger.dev scheduled jobs (lead scoring, signal monitoring)
├── mcp-prospector/      # MCP server: pain point discovery, prospect enrichment
├── mcp-content/         # MCP server: AI content generation (lead magnets, articles, email)
├── mcp-outreach/        # MCP server: cold email campaigns, nurture sequences, warmup
├── mcp-router/          # MCP server: lead scoring, product routing, nurture assignment
└── mcp-analytics/       # MCP server: funnel metrics, channel attribution, budget optimization
infra/
├── ci/github-actions.yml   # CI: typecheck → build → deploy (Cloudflare Pages)
└── docker/                 # Docker Compose for MCP servers + dashboard
scripts/
├── validate-env.mjs     # Validate .env variables by tier (critical/recommended/optional)
├── seed.mjs             # Seed saas_products table with sample data
├── run-pipeline.mjs     # End-to-end pipeline orchestrator
└── deploy.sh            # Multi-component deployment script
```

## Build & Development Commands

```bash
npm install              # Install all workspace dependencies
npm run build            # Build all packages (turbo)
npm run dev              # Run all dev servers concurrently
npm run typecheck        # TypeScript type checking across all packages
npm run lint             # Lint all packages
npm run test             # Run tests (turbo)
npm run clean            # Clean dist/ and .turbo/ in all packages
npm run validate         # Validate .env configuration
npm run seed             # Seed database with sample products
npm run db:migrate       # Run database migrations (shared package)
```

### Running individual packages

```bash
npx turbo build --filter=@prospecting-engine/shared       # Build single package
npx turbo dev --filter=@prospecting-engine/dashboard       # Dev single package
npx turbo typecheck --filter=@prospecting-engine/mcp-router # Typecheck single package
```

### Pipeline runner

```bash
npm run pipeline -- --niche "cold email deliverability" --product distributionos
npm run pipeline -- --niche "cold email deliverability" --product distributionos --dry-run
```

### Deployment

```bash
npm run deploy              # Deploy all components
npm run deploy:landing      # Landing pages → Cloudflare Pages
npm run deploy:dashboard    # Dashboard → Cloudflare Pages
npm run deploy:mcp          # MCP servers → Docker
npm run deploy:migrate      # Run DB migrations
npm run deploy:jobs         # Jobs → Trigger.dev
```

## Architecture

### Monorepo Layout

- **Turbo** orchestrates builds with dependency-aware task pipelines (turbo.json)
- **npm workspaces** (`packages/*`) link internal dependencies
- All packages use `"type": "module"` (ESM)
- Shared base `tsconfig.base.json`: ES2022 target, NodeNext module resolution, strict mode

### Package Dependency Graph

```
shared ← mcp-prospector, mcp-content, mcp-outreach, mcp-router, mcp-analytics
shared ← dashboard, landing-pages, jobs
```

All packages depend on `@prospecting-engine/shared` for types, DB client, API clients, and utilities.

### MCP Server Pattern

All five MCP servers follow the same structure:

```
src/
├── index.ts              # Server bootstrap: create McpServer, register tools, connect stdio
├── tools/                # One file per tool — exports registerXxx(server: McpServer)
│   └── tool-name.ts      # Uses Zod schemas for input validation
└── services/             # Business logic classes used by tools
    └── service-name.ts   # Stateless service with methods that call shared clients + Supabase
```

- Entry point creates `McpServer` from `@modelcontextprotocol/sdk`
- Tools are registered via `server.tool(name, description, zodSchema, handler)`
- Handlers instantiate service classes and return `{ content: [{ type: "text", text }] }`
- Dev mode: `tsx watch src/index.ts`
- Production: `node dist/index.js` via stdio transport

### Shared Package Exports

```typescript
import { ... } from "@prospecting-engine/shared";         // Everything
import { ... } from "@prospecting-engine/shared/types";    // Zod schemas & types
import { ... } from "@prospecting-engine/shared/db";       // Supabase client
import { ... } from "@prospecting-engine/shared/utils";    // Scoring, email utilities
```

Key modules:
- `db/client.ts` — Singleton Supabase client (`getSupabaseClient()`)
- `types/` — Zod schemas for all entities (leads, content, campaigns, interactions, saas-products, prospects)
- `clients/` — API integrations: Claude, Hunter, Instantly, Resend, GitHub, Reddit, HN
- `utils/scoring.ts` — Lead scoring algorithm (fit 0-40, intent 0-35, engagement 0-25, total 0-100)
- `utils/email.ts` — Email validation, disposable domain detection, warmup schedule

### Database

- **Supabase** (managed PostgreSQL) with typed client via `@supabase/supabase-js`
- Schema in `packages/shared/src/db/migrations/001_core_schema.sql`
- Tables: `saas_products`, `companies`, `leads`, `lead_magnets`, `campaigns`, `email_sequences`, `interactions`, `content`, `pain_points`, `prospect_lists`, `signals`
- UUIDs as primary keys (uuid-ossp extension)
- Row Level Security enabled on all tables; service role bypass policies for MCP servers
- `updated_at` triggers on mutable tables
- Lead score constraints: `lead_score` 0-100, `fit_score` 0-40, `intent_score` 0-35, `engagement_score` 0-25

### Lead Lifecycle

1. **Discovery** (mcp-prospector) — Scan HN/Reddit/Twitter for pain points, build prospect lists, enrich leads
2. **Attraction** (mcp-content) — Generate lead magnets, landing pages, SEO articles, social content
3. **Engagement** (mcp-outreach) — Send cold/nurture email campaigns, manage domain warmup
4. **Qualification** (mcp-router + jobs) — Score leads (fit/intent/engagement), route to products, assign nurture tracks
5. **Analytics** (mcp-analytics) — Funnel conversion rates, channel attribution, budget optimization

### Scoring Tiers

- **Hot** (≥70): Ready for sales handoff
- **Warm** (≥45): Active nurturing
- **Cool** (≥20): Early engagement
- **Cold** (<20): Monitor for signals

## Code Conventions

### TypeScript

- Strict mode enabled everywhere
- ES2022 target with NodeNext module resolution
- All imports use `.js` extension (ESM convention, even for .ts source files)
- Zod for runtime validation (tool inputs, API responses)
- Interface-first approach for data shapes
- `type` keyword for type-only imports: `import type { ... }`
- Database row types derived from `Database["public"]["Tables"]["table_name"]["Row"]`

### Naming

- Files: `kebab-case.ts` (e.g., `pain-point-service.ts`, `discover-pain-points.ts`)
- Classes: `PascalCase` (e.g., `PainPointService`, `EnrichmentService`)
- Functions: `camelCase` (e.g., `calculateLeadScore`, `getSupabaseClient`)
- MCP tools: `snake_case` (e.g., `discover_pain_points`, `score_lead`)
- Database columns: `snake_case` (e.g., `lead_score`, `created_at`)
- Environment variables: `UPPER_SNAKE_CASE` (e.g., `SUPABASE_URL`, `ANTHROPIC_API_KEY`)

### Service Pattern

Services are stateless classes instantiated per-request in MCP tool handlers:

```typescript
export class ExampleService {
  async doWork(input: Input): Promise<Output> {
    const db = getSupabaseClient();
    // Business logic using db + shared clients
    return result;
  }
}
```

### MCP Tool Registration Pattern

```typescript
export function registerToolName(server: McpServer): void {
  server.tool(
    "tool_name",
    "Description of what the tool does",
    { param: z.string().describe("Param description") },
    async ({ param }) => {
      const service = new SomeService();
      const result = await service.method(param);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
```

### Frontend (Dashboard)

- React 19 with functional components and hooks
- Inline styles (no CSS framework currently)
- Custom `useQuery<T>()` hook for data fetching
- Supabase client initialized with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
- Tab-based navigation in App.tsx

### Frontend (Landing Pages)

- Astro 4 with static pre-rendering (`export const prerender = true`)
- `.astro` components for pages and layouts
- API routes at `src/pages/api/` (e.g., `subscribe.ts`)
- SSR adapter: `@astrojs/node`

## Environment Variables

### Critical (required for core functionality)

- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_ANON_KEY` — Browser-safe key
- `SUPABASE_SERVICE_ROLE_KEY` — Server-side key (MCP servers)

### Dashboard (browser-side)

- `VITE_SUPABASE_URL` — Same as SUPABASE_URL, prefixed for Vite
- `VITE_SUPABASE_ANON_KEY` — Same as SUPABASE_ANON_KEY, prefixed for Vite

### Recommended

- `ANTHROPIC_API_KEY` — Claude API for content generation
- `RESEND_API_KEY` — Transactional email delivery
- `INSTANTLY_API_KEY` — Cold email campaigns
- `HUNTER_API_KEY` — Email finding and verification

### Optional

- `CLEARBIT_API_KEY`, `CLAY_API_KEY` — Company enrichment
- `LOOPS_API_KEY` — Nurture email automation
- `GITHUB_TOKEN` — Prospect discovery from GitHub
- `GHOST_API_URL`, `GHOST_ADMIN_API_KEY` — Blog publishing
- `DEV_TO_API_KEY`, `MEDIUM_TOKEN`, `HASHNODE_TOKEN` — Article cross-posting
- `POSTHOG_API_KEY`, `POSTHOG_HOST` — Analytics
- `TRIGGER_DEV_API_KEY` — Job scheduling

Validate with: `npm run validate`

## CI/CD

- **GitHub Actions** (infra/ci/github-actions.yml): typecheck → build → deploy on push to main
- **Landing pages + Dashboard**: Deploy to Cloudflare Pages
- **MCP servers**: Docker Compose (infra/docker/)
- **Jobs**: Trigger.dev managed platform
- **Database**: Supabase (migrations via `npm run db:migrate`)

## Testing

No test suite is configured yet. The Turbo `test` task exists but packages don't implement it. When adding tests:
- Place test files adjacent to source or in a `__tests__/` directory
- Follow the existing build dependency: tests depend on successful build

## Key External Integrations

| Service | Client Location | Purpose |
|---------|----------------|---------|
| Supabase | `shared/src/db/client.ts` | Database (PostgreSQL) |
| Claude API | `shared/src/clients/claude.ts` | AI content generation |
| Hunter.io | `shared/src/clients/hunter.ts` | Email finding/verification |
| Instantly.ai | `shared/src/clients/instantly.ts` | Cold email campaigns + warmup |
| Resend | `shared/src/clients/resend.ts` | Transactional email |
| Loops.so | via mcp-outreach | Nurture automation |
| GitHub API | `shared/src/clients/github.ts` | Prospect discovery |
| HN Algolia | `shared/src/clients/hn.ts` | Pain point discovery |
| PostHog | via mcp-analytics | Product analytics |
| Trigger.dev | `packages/jobs/` | Background job scheduling |
| Ghost CMS | via mcp-content | Blog publishing |
| Cloudflare Pages | via deploy.sh / CI | Static site hosting |

## MCP Server Configuration

The `.mcp.json` file at the project root configures five MCP servers for Claude integration. Each server runs as a Node.js stdio process with environment variables injected from `.env`. Build all packages before running MCP servers:

```bash
npm run build
```
