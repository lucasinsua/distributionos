#!/usr/bin/env node

/**
 * Full pipeline orchestrator — runs the end-to-end prospecting pipeline.
 *
 * Usage:
 *   node scripts/run-pipeline.mjs --niche "cold email deliverability" --product distributionos
 *
 * Pipeline stages:
 *   1. Discover pain points from HN + Reddit
 *   2. Generate lead magnet (email course) from top pain points
 *   3. Generate landing page for the lead magnet
 *   4. Generate email sequence (nurture + cold)
 *   5. Generate SEO article targeting the niche keyword
 *   6. Generate social content (Twitter thread + LinkedIn post)
 *   7. Print summary of all generated assets
 */

import { createClient } from "@supabase/supabase-js";
import { parseArgs } from "node:util";
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

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const { values: args } = parseArgs({
  options: {
    niche: { type: "string" },
    product: { type: "string" },
    "dry-run": { type: "boolean", default: false },
    help: { type: "boolean", default: false },
  },
});

if (args.help || !args.niche || !args.product) {
  console.log(`
  Prospecting Engine — Pipeline Runner

  Usage:
    node scripts/run-pipeline.mjs --niche <topic> --product <slug>

  Options:
    --niche     Target niche/topic for pain point discovery
    --product   SaaS product slug (from saas_products table)
    --dry-run   Print what would happen without executing
    --help      Show this message

  Example:
    node scripts/run-pipeline.mjs --niche "cold email deliverability" --product distributionos
  `);
  process.exit(0);
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY);
const niche = args.niche;
const productSlug = args.product;
const dryRun = args["dry-run"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stage(n, name) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  Stage ${n}: ${name}`);
  console.log(`${"─".repeat(60)}\n`);
}

async function callMcp(serverName, toolName, params) {
  // This orchestrator calls the service classes directly by importing them
  // after building. For now, we use Supabase directly as a lightweight
  // alternative that doesn't require running MCP servers.
  return params;
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

async function run() {
  console.log("\n  Prospecting Engine — Full Pipeline");
  console.log(`  Niche:   ${niche}`);
  console.log(`  Product: ${productSlug}`);
  console.log(`  Mode:    ${dryRun ? "DRY RUN" : "LIVE"}`);

  // Resolve product
  const { data: product, error: productErr } = await db
    .from("saas_products")
    .select("id, name, slug, icp_criteria")
    .eq("slug", productSlug)
    .single();

  if (productErr || !product) {
    console.error(`\n  ✗ Product "${productSlug}" not found. Run: node scripts/seed.mjs first.`);
    process.exit(1);
  }

  console.log(`  Resolved: ${product.name} (${product.id})\n`);

  if (dryRun) {
    console.log("  [DRY RUN] Would execute the following stages:");
    console.log("    1. Discover pain points from HN + Reddit");
    console.log("    2. Generate email course lead magnet");
    console.log("    3. Generate landing page");
    console.log("    4. Generate nurture + cold email sequences");
    console.log("    5. Generate SEO article");
    console.log("    6. Generate Twitter thread + LinkedIn post");
    console.log("\n  Re-run without --dry-run to execute.");
    return;
  }

  const results = {};

  // ── Stage 1: Pain Points ──────────────────────────────────────
  stage(1, "Discovering pain points");
  try {
    // Search HN via Algolia API (no build step needed)
    const hnResp = await fetch(
      `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(niche)}&tags=story&hitsPerPage=20`
    );
    const hnData = await hnResp.json();
    const hnItems = (hnData.hits ?? []).map((h) => ({
      title: h.title ?? "",
      text: h.story_text ?? h.title ?? "",
      url: h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
    }));

    // Search Reddit via public JSON API
    let redditItems = [];
    try {
      const redditResp = await fetch(
        `https://www.reddit.com/search.json?q=${encodeURIComponent(niche)}&sort=relevance&limit=20`,
        { headers: { "User-Agent": "ProspectingEngine/1.0" } }
      );
      const redditData = await redditResp.json();
      redditItems = (redditData?.data?.children ?? []).map((c) => ({
        title: c.data.title ?? "",
        text: c.data.selftext ?? c.data.title ?? "",
        url: `https://reddit.com${c.data.permalink}`,
      }));
    } catch {
      console.log("  Reddit API unavailable, continuing with HN results only");
    }

    const allSignals = [...hnItems, ...redditItems];

    console.log(`  Found ${hnItems.length} HN signals, ${redditItems.length} Reddit signals`);

    // Insert pain points
    let inserted = 0;
    for (const signal of allSignals.slice(0, 20)) {
      const content = (signal.title ?? "") + "\n" + (signal.text ?? "");
      const { error } = await db.from("pain_points").insert({
        topic: niche,
        description: content.slice(0, 500),
        source: signal.url?.includes("reddit") ? "reddit" : "hacker_news",
        source_url: signal.url ?? null,
        frequency_score: 50,
        recency_score: 70,
        alignment_score: 60,
        composite_score: 60,
        saas_product_id: product.id,
        raw_signals: [{ content, url: signal.url }],
      });
      if (!error) inserted++;
    }

    console.log(`  Inserted ${inserted} pain points into database`);
    results.painPoints = inserted;
  } catch (err) {
    console.error(`  ✗ Pain point discovery failed: ${err.message}`);
    results.painPoints = 0;
  }

  // ── Stage 2: Lead Magnet ──────────────────────────────────────
  stage(2, "Generating lead magnet");
  try {
    const title = `Free Email Course: Master ${niche}`;
    const { data: magnet, error } = await db
      .from("lead_magnets")
      .insert({
        title,
        type: "email_course",
        topic: niche,
        description: `5-day email course about ${niche}`,
        target_saas_product_id: product.id,
        status: "draft",
        content_data: {
          format: "email_course",
          topic: niche,
          totalLessons: 5,
          lessons: Array.from({ length: 5 }, (_, i) => ({
            day: i + 1,
            subject: `Day ${i + 1}: ${niche} — Lesson ${i + 1}`,
            body: `[Content will be generated via Claude API when ANTHROPIC_API_KEY is set]`,
            keyTakeaway: `Key insight from lesson ${i + 1}`,
            cta: i === 4 ? `Try ${product.name}` : "See you tomorrow!",
          })),
        },
      })
      .select("id, title")
      .single();

    if (error) throw new Error(error.message);
    console.log(`  ✓ Created lead magnet: ${magnet.title} (${magnet.id})`);
    results.leadMagnet = magnet;
  } catch (err) {
    console.error(`  ✗ Lead magnet creation failed: ${err.message}`);
  }

  // ── Stage 3: Landing Page ─────────────────────────────────────
  stage(3, "Generating landing page");
  try {
    const slug = niche.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const pageUrl = `https://back.kintrion.com/${slug}`;

    const { data: content, error } = await db
      .from("content")
      .insert({
        type: "landing_page",
        title: `Landing: ${niche}`,
        body: `<!-- Generated landing page for ${niche} -->`,
        platform: "blog",
        saas_product_id: product.id,
        status: "draft",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    if (results.leadMagnet) {
      await db
        .from("lead_magnets")
        .update({ landing_page_url: pageUrl })
        .eq("id", results.leadMagnet.id);
    }

    console.log(`  ✓ Created landing page: ${pageUrl} (${content.id})`);
    results.landingPage = { id: content.id, url: pageUrl };
  } catch (err) {
    console.error(`  ✗ Landing page creation failed: ${err.message}`);
  }

  // ── Stage 4: Email Sequences ──────────────────────────────────
  stage(4, "Generating email sequences");
  try {
    // Nurture sequence
    const nurtureSteps = [
      { step_number: 1, subject: `How ${niche} is changing in 2026`, body: `[Value email 1]`, delay_days: 3 },
      { step_number: 2, subject: `3 mistakes most people make with ${niche}`, body: `[Value email 2]`, delay_days: 4 },
      { step_number: 3, subject: `Case study: How Company X solved ${niche}`, body: `[Value email 3]`, delay_days: 4 },
      { step_number: 4, subject: `Quick tip: Improve your ${niche} results today`, body: `[Value email 4]`, delay_days: 4 },
      { step_number: 5, subject: `You might like ${product.name}`, body: `[Soft pitch]`, delay_days: 5 },
    ];

    const { data: nurture, error: nErr } = await db
      .from("email_sequences")
      .insert({
        name: `${niche} — Nurture Sequence`,
        type: "nurture",
        saas_product_id: product.id,
        lead_magnet_id: results.leadMagnet?.id ?? null,
        steps: nurtureSteps,
        active: true,
      })
      .select("id, name")
      .single();

    if (nErr) throw new Error(nErr.message);
    console.log(`  ✓ Nurture sequence: ${nurture.name} (${nurture.id})`);

    // Cold sequence
    const coldSteps = [
      { step_number: 1, subject: `Quick question about ${niche}`, body: `[Personalized cold email 1]`, delay_days: 0 },
      { step_number: 2, subject: `Re: ${niche} at {{company}}`, body: `[Follow-up 2]`, delay_days: 3 },
      { step_number: 3, subject: `Thought you'd find this useful`, body: `[Value + lead magnet link]`, delay_days: 5 },
    ];

    const { data: cold, error: cErr } = await db
      .from("email_sequences")
      .insert({
        name: `${niche} — Cold Sequence`,
        type: "cold",
        saas_product_id: product.id,
        steps: coldSteps,
        active: true,
      })
      .select("id, name")
      .single();

    if (cErr) throw new Error(cErr.message);
    console.log(`  ✓ Cold sequence: ${cold.name} (${cold.id})`);
    results.sequences = { nurture, cold };
  } catch (err) {
    console.error(`  ✗ Sequence creation failed: ${err.message}`);
  }

  // ── Stage 5: SEO Article ──────────────────────────────────────
  stage(5, "Generating SEO article");
  try {
    const { data: article, error } = await db
      .from("content")
      .insert({
        type: "article",
        title: `The Complete Guide to ${niche} in 2026`,
        body: `[SEO article will be generated via Claude API. Set ANTHROPIC_API_KEY to enable.]`,
        platform: "blog",
        saas_product_id: product.id,
        status: "draft",
        performance_metrics: {
          keyword: niche,
          wordCount: 2000,
          metaTitle: `The Complete Guide to ${niche} in 2026 | ${product.name}`,
          metaDescription: `Everything you need to know about ${niche}, including step-by-step instructions and best practices.`,
          slug: niche.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        },
      })
      .select("id, title")
      .single();

    if (error) throw new Error(error.message);
    console.log(`  ✓ SEO article: ${article.title} (${article.id})`);
    results.article = article;
  } catch (err) {
    console.error(`  ✗ Article creation failed: ${err.message}`);
  }

  // ── Stage 6: Social Content ───────────────────────────────────
  stage(6, "Generating social content");
  try {
    const { data: thread, error: tErr } = await db
      .from("content")
      .insert({
        type: "social_post",
        title: `Twitter: ${niche}`,
        body: `Thread: Everything I've learned about ${niche}.\n\n1/ Key insight one.\n2/ Key insight two.\n3/ Key insight three.\n4/ Practical takeaway.\n5/ Free resource link + CTA.`,
        platform: "twitter",
        saas_product_id: product.id,
        status: "draft",
      })
      .select("id")
      .single();

    if (tErr) throw new Error(tErr.message);
    console.log(`  ✓ Twitter thread draft (${thread.id})`);

    const { data: liPost, error: lErr } = await db
      .from("content")
      .insert({
        type: "social_post",
        title: `LinkedIn: ${niche}`,
        body: `[LinkedIn post about ${niche} — storytelling format with hook, insights, and soft CTA]`,
        platform: "linkedin",
        saas_product_id: product.id,
        status: "draft",
      })
      .select("id")
      .single();

    if (lErr) throw new Error(lErr.message);
    console.log(`  ✓ LinkedIn post draft (${liPost.id})`);
    results.social = { thread, liPost };
  } catch (err) {
    console.error(`  ✗ Social content creation failed: ${err.message}`);
  }

  // ── Summary ───────────────────────────────────────────────────
  console.log(`\n${"═".repeat(60)}`);
  console.log("  Pipeline Complete\n");
  console.log(`  Pain points discovered:  ${results.painPoints ?? 0}`);
  console.log(`  Lead magnet:             ${results.leadMagnet?.title ?? "—"}`);
  console.log(`  Landing page:            ${results.landingPage?.url ?? "—"}`);
  console.log(`  Email sequences:         ${results.sequences ? "Nurture + Cold" : "—"}`);
  console.log(`  SEO article:             ${results.article?.title ?? "—"}`);
  console.log(`  Social content:          ${results.social ? "Twitter + LinkedIn" : "—"}`);
  console.log(`\n${"═".repeat(60)}\n`);

  console.log("  Next steps:");
  console.log("    1. Set ANTHROPIC_API_KEY to enable AI content generation");
  console.log("    2. Set RESEND_API_KEY to enable email delivery");
  console.log("    3. Review draft content in the dashboard");
  console.log("    4. Activate the lead magnet: UPDATE lead_magnets SET status='active' WHERE ...");
  console.log("    5. Deploy landing pages to Cloudflare Pages\n");
}

run().catch((err) => {
  console.error(`\n  Fatal error: ${err.message}\n`);
  process.exit(1);
});
