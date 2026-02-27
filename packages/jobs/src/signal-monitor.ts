import { schedules } from "@trigger.dev/sdk/v3";
import {
  getSupabaseClient,
  searchHN,
  searchReddit,
  type Database,
} from "@prospecting-engine/shared";

type SaasProductRow = Database["public"]["Tables"]["saas_products"]["Row"];

/**
 * Signal Monitor Job
 *
 * Runs every 2 hours. For each active SaaS product, scans HN and Reddit
 * for buying signals using keywords from the product's ICP criteria.
 * Inserts discovered signals into the signals table with processed=false.
 */
export const signalMonitorJob = schedules.task({
  id: "signal-monitor",
  cron: "0 */2 * * *",
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
      console.log("No active SaaS products found. Skipping signal monitor.");
      return;
    }

    let totalNewSignals = 0;

    for (const product of products) {
      const icp = product.icp_criteria as Record<string, unknown>;
      const keywords = (icp?.keywords as string[]) ?? [];

      if (keywords.length === 0) {
        console.log(`No keywords configured for "${product.name}". Skipping.`);
        continue;
      }

      console.log(
        `Monitoring signals for "${product.name}" with ${keywords.length} keywords`
      );

      const signalRows: Array<{
        type: string;
        source: string;
        source_url: string | null;
        content: string;
        entity_name: string | null;
        entity_domain: string | null;
        relevance_score: number;
        keywords_matched: string[];
        processed: boolean;
      }> = [];

      // Search HN for each keyword
      const sinceTimestamp = Math.floor((Date.now() - 2 * 3600 * 1000) / 1000);
      const numericFilters = `created_at_i>${sinceTimestamp}`;

      for (const keyword of keywords) {
        try {
          const hnResults = await searchHN(keyword, {
            numericFilters,
            hitsPerPage: 20,
          });

          for (const result of hnResults) {
            const matchedKeywords = keywords.filter(
              (kw) =>
                result.text.toLowerCase().includes(kw.toLowerCase()) ||
                (result.title?.toLowerCase().includes(kw.toLowerCase()) ?? false)
            );

            signalRows.push({
              type: "buying_signal",
              source: "hacker_news",
              source_url: result.url,
              content: `${result.title ?? ""}\n\n${result.text}`.trim().slice(0, 2000),
              entity_name: result.author,
              entity_domain: null,
              relevance_score: Math.min(
                Math.round((matchedKeywords.length / keywords.length) * 100),
                100
              ),
              keywords_matched: matchedKeywords,
              processed: false,
            });
          }
        } catch (err) {
          console.error(`  HN search failed for keyword "${keyword}":`, err);
        }
      }

      // Search Reddit for each keyword
      for (const keyword of keywords) {
        try {
          const redditResults = await searchReddit(keyword, {
            sort: "new",
            time: "day",
            limit: 20,
          });

          for (const result of redditResults) {
            const matchedKeywords = keywords.filter(
              (kw) =>
                result.text.toLowerCase().includes(kw.toLowerCase()) ||
                result.title.toLowerCase().includes(kw.toLowerCase())
            );

            signalRows.push({
              type: "buying_signal",
              source: "reddit",
              source_url: result.url,
              content: `${result.title}\n\n${result.text}`.trim().slice(0, 2000),
              entity_name: result.author,
              entity_domain: null,
              relevance_score: Math.min(
                Math.round((matchedKeywords.length / keywords.length) * 100),
                100
              ),
              keywords_matched: matchedKeywords,
              processed: false,
            });
          }
        } catch (err) {
          console.error(`  Reddit search failed for keyword "${keyword}":`, err);
        }
      }

      // Deduplicate by source_url
      const seen = new Set<string>();
      const uniqueSignals = signalRows.filter((s) => {
        if (!s.source_url || seen.has(s.source_url)) return false;
        seen.add(s.source_url);
        return true;
      });

      if (uniqueSignals.length === 0) {
        console.log(`  No new signals found for "${product.name}".`);
        continue;
      }

      const { data: inserted, error: insertError } = await supabase
        .from("signals")
        .insert(uniqueSignals)
        .select("id");

      if (insertError) {
        console.error(
          `  Failed to insert signals for "${product.name}":`,
          insertError.message
        );
      } else {
        const count = inserted?.length ?? 0;
        totalNewSignals += count;
        console.log(`  Inserted ${count} signals for "${product.name}"`);
      }
    }

    console.log(`Signal monitor complete. Total new signals: ${totalNewSignals}`);
  },
});
