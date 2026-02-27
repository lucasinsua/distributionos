#!/usr/bin/env node

/**
 * Database seed script — inserts sample SaaS products with ICP criteria.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env file
try {
  const envPath = resolve(process.cwd(), ".env");
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    if (!process.env[t.slice(0, eq)]) process.env[t.slice(0, eq)] = t.slice(eq + 1);
  }
} catch {}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  console.error("Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed.mjs");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

const PRODUCTS = [
  {
    name: "DistributionOS",
    slug: "distributionos",
    description: "AI-powered distribution engine that turns content into qualified leads across multiple SaaS products.",
    domain: "distributionos.com",
    icp_criteria: {
      industries: ["saas", "b2b_software", "developer_tools", "martech"],
      company_size: { min: 5, max: 200 },
      roles: ["founder", "ceo", "cto", "head_of_growth", "marketing_lead"],
      tech_signals: ["typescript", "react", "nextjs", "supabase", "vercel"],
      pain_points: [
        "lead generation",
        "content distribution",
        "cold email deliverability",
        "lead scoring",
        "multi-product routing",
      ],
      funding_stages: ["pre_seed", "seed", "series_a"],
      geography: ["us", "eu", "uk", "canada", "australia"],
    },
  },
  {
    name: "FormCraft",
    slug: "formcraft",
    description: "AI form builder that converts more leads with adaptive, conversational forms.",
    domain: "formcraft.io",
    icp_criteria: {
      industries: ["saas", "ecommerce", "agencies", "real_estate", "education"],
      company_size: { min: 1, max: 100 },
      roles: ["founder", "product_manager", "marketing_manager", "growth_hacker"],
      tech_signals: ["react", "wordpress", "shopify", "hubspot", "webflow"],
      pain_points: [
        "form conversion rates",
        "lead capture",
        "survey fatigue",
        "form abandonment",
        "conditional logic forms",
      ],
      funding_stages: ["bootstrapped", "pre_seed", "seed"],
      geography: ["us", "eu", "uk"],
    },
  },
  {
    name: "MetricPulse",
    slug: "metricpulse",
    description: "Real-time SaaS analytics dashboard — MRR, churn, LTV, and cohort analysis in one place.",
    domain: "metricpulse.app",
    icp_criteria: {
      industries: ["saas", "fintech", "subscription_services"],
      company_size: { min: 10, max: 500 },
      roles: ["founder", "cfo", "head_of_finance", "vp_operations", "data_analyst"],
      tech_signals: ["stripe", "chargebee", "recurly", "paddle", "baremetrics"],
      pain_points: [
        "mrr tracking",
        "churn analysis",
        "revenue forecasting",
        "cohort analysis",
        "investor reporting",
      ],
      funding_stages: ["seed", "series_a", "series_b"],
      geography: ["us", "eu", "uk", "canada"],
    },
  },
];

async function seed() {
  console.log("Seeding SaaS products...\n");

  for (const product of PRODUCTS) {
    const { data, error } = await db
      .from("saas_products")
      .upsert(product, { onConflict: "slug" })
      .select("id, name, slug")
      .single();

    if (error) {
      console.error(`  ✗ ${product.name}: ${error.message}`);
    } else {
      console.log(`  ✓ ${data.name} (${data.slug}) — ${data.id}`);
    }
  }

  console.log("\nDone. Products seeded successfully.");
}

seed().catch(console.error);
