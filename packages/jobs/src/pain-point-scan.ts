import { schedules } from "@trigger.dev/sdk/v3";
import {
  getSupabaseClient,
  searchHNPainPoints,
  searchRedditPainPoints,
  type Database,
} from "@prospecting-engine/shared";

type SaasProductRow = Database["public"]["Tables"]["saas_products"]["Row"];

/**
 * Pain Point Scan Job
 *
 * Runs every 6 hours. For each active SaaS product, searches HN and Reddit
 * for pain points related to the product's niche, then inserts discovered
 * pain points into the pain_points table.
 */
export const painPointScanJob = schedules.task({
  id: "pain-point-scan",
  cron: "0 */6 * * *",
  run: async () => {
    const supabase = getSupabaseClient();

    // Fetch all active SaaS products
    const { data: products, error: productsError } = await supabase
      .from("saas_products")
      .select("*")
      .eq("active", true)
      .returns<SaasProductRow[]>();

    if (productsError) {
      console.error("Failed to fetch active SaaS products:", productsError.message);
      return;
    }

    if (!products || products.length === 0) {
      console.log("No active SaaS products found. Skipping pain point scan.");
      return;
    }

    let totalInserted = 0;

    for (const product of products) {
      const icp = product.icp_criteria as Record<string, unknown>;
      const keywords = (icp?.keywords as string[]) ?? [];
      const niche = keywords.length > 0 ? keywords.join(" ") : product.name;
      const subreddits = (icp?.pain_points as string[]) ?? [];

      console.log(`Scanning pain points for "${product.name}" (niche: "${niche}")`);

      // Search HN for pain points
      let hnResults: Awaited<ReturnType<typeof searchHNPainPoints>> = [];
      try {
        hnResults = await searchHNPainPoints(niche, 168); // Last 7 days
        console.log(`  HN: found ${hnResults.length} results for "${product.name}"`);
      } catch (err) {
        console.error(`  HN search failed for "${product.name}":`, err);
      }

      // Search Reddit for pain points
      let redditResults: Awaited<ReturnType<typeof searchRedditPainPoints>> = [];
      try {
        redditResults = await searchRedditPainPoints(niche, subreddits);
        console.log(`  Reddit: found ${redditResults.length} results for "${product.name}"`);
      } catch (err) {
        console.error(`  Reddit search failed for "${product.name}":`, err);
      }

      // Build pain point records from HN results
      const painPointRows = [
        ...hnResults.map((r) => ({
          topic: r.title ?? niche,
          description: r.text.slice(0, 1000),
          source: "hacker_news" as const,
          source_url: r.url,
          frequency_score: Math.min(r.points, 100),
          recency_score: 50,
          alignment_score: 50,
          composite_score: Math.round((Math.min(r.points, 100) + 50 + 50) / 3),
          saas_product_id: product.id,
          raw_signals: [{ type: "hn", id: r.id, author: r.author, points: r.points }],
        })),
        ...redditResults.map((r) => ({
          topic: r.title,
          description: r.text.slice(0, 1000),
          source: "reddit" as const,
          source_url: r.url,
          frequency_score: Math.min(r.score, 100),
          recency_score: 50,
          alignment_score: 50,
          composite_score: Math.round((Math.min(r.score, 100) + 50 + 50) / 3),
          saas_product_id: product.id,
          raw_signals: [
            {
              type: "reddit",
              id: r.id,
              author: r.author,
              score: r.score,
              subreddit: r.subreddit,
            },
          ],
        })),
      ];

      if (painPointRows.length === 0) {
        console.log(`  No pain points found for "${product.name}". Skipping insert.`);
        continue;
      }

      // Insert pain points (upsert would require a unique constraint on source_url)
      const { data: inserted, error: insertError } = await supabase
        .from("pain_points")
        .insert(painPointRows)
        .select("id");

      if (insertError) {
        console.error(`  Failed to insert pain points for "${product.name}":`, insertError.message);
      } else {
        const count = inserted?.length ?? 0;
        totalInserted += count;
        console.log(`  Inserted ${count} pain points for "${product.name}"`);
      }
    }

    console.log(`Pain point scan complete. Total inserted: ${totalInserted}`);
  },
});
