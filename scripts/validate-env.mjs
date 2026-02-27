#!/usr/bin/env node

/**
 * Validates that required environment variables are set.
 * Groups them by tier: critical (won't start), recommended (degraded), optional.
 *
 * Usage:
 *   node scripts/validate-env.mjs
 */

import { readFileSync } from "fs";
import { resolve } from "path";

const TIERS = {
  critical: {
    label: "CRITICAL (system won't function without these)",
    vars: [
      ["SUPABASE_URL", "Supabase project URL"],
      ["SUPABASE_ANON_KEY", "Supabase anonymous key (or service role key for MCP servers)"],
    ],
  },
  recommended: {
    label: "RECOMMENDED (core features depend on these)",
    vars: [
      ["ANTHROPIC_API_KEY", "Claude API — content generation, personalization, SEO articles"],
      ["RESEND_API_KEY", "Resend — transactional email delivery for lead magnets"],
      ["INSTANTLY_API_KEY", "Instantly.ai — cold email campaigns and domain warmup"],
      ["HUNTER_API_KEY", "Hunter.io — email finding and verification"],
    ],
  },
  optional: {
    label: "OPTIONAL (enhances functionality)",
    vars: [
      ["SUPABASE_SERVICE_ROLE_KEY", "Supabase service role key (bypasses RLS)"],
      ["GITHUB_TOKEN", "GitHub API — prospect discovery via tech stack search"],
      ["DEV_TO_API_KEY", "Dev.to — article cross-posting"],
      ["MEDIUM_TOKEN", "Medium — article cross-posting"],
      ["MEDIUM_USER_ID", "Medium — user ID for publishing"],
      ["HASHNODE_TOKEN", "Hashnode — article cross-posting"],
      ["HASHNODE_PUBLICATION_ID", "Hashnode — publication ID for publishing"],
      ["LOOPS_API_KEY", "Loops.so — nurture email automation"],
      ["CLEARBIT_API_KEY", "Clearbit — company enrichment"],
      ["CLAY_API_KEY", "Clay — enrichment workflows"],
      ["GHOST_API_URL", "Ghost CMS — blog publishing"],
      ["GHOST_ADMIN_API_KEY", "Ghost CMS — admin API key"],
      ["POSTHOG_API_KEY", "PostHog — analytics tracking"],
      ["POSTHOG_HOST", "PostHog — instance URL"],
      ["TRIGGER_DEV_API_KEY", "Trigger.dev — job scheduling"],
      ["VITE_SUPABASE_URL", "Dashboard — Supabase URL (browser-side)"],
      ["VITE_SUPABASE_ANON_KEY", "Dashboard — Supabase anon key (browser-side)"],
    ],
  },
};

// Try to load .env file
try {
  const envPath = resolve(process.cwd(), ".env");
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx);
    const value = trimmed.slice(eqIdx + 1);
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
} catch {
  // No .env file — rely on actual environment
}

let hasFailure = false;

console.log("\n  Environment Validation\n");

for (const [tier, config] of Object.entries(TIERS)) {
  console.log(`  ${config.label}\n`);

  for (const [key, desc] of config.vars) {
    const value = process.env[key];
    const isSet = value && !value.startsWith("your-") && !value.startsWith("https://your-");

    if (isSet) {
      const masked = value.slice(0, 4) + "..." + value.slice(-4);
      console.log(`    ✓ ${key} = ${masked}`);
    } else {
      const icon = tier === "critical" ? "✗" : tier === "recommended" ? "!" : "·";
      console.log(`    ${icon} ${key} — ${desc}`);
      if (tier === "critical") hasFailure = true;
    }
  }

  console.log("");
}

if (hasFailure) {
  console.log("  ✗ Critical variables missing. Copy .env.example to .env and fill in values.\n");
  process.exit(1);
} else {
  console.log("  ✓ All critical variables are set.\n");
}
