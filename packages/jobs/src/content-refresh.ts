import { schedules } from "@trigger.dev/sdk/v3";
import { getSupabaseClient } from "@prospecting-engine/shared";

/**
 * Content Refresh Job
 *
 * Runs weekly on Monday at 8am UTC. Queries the content table for articles
 * older than 30 days, marks them for review by setting status to 'pending_review',
 * and logs how many articles need refreshing.
 */
export const contentRefreshJob = schedules.task({
  id: "content-refresh",
  cron: "0 8 * * 1",
  run: async () => {
    const supabase = getSupabaseClient();

    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    // Query published articles older than 30 days
    const { data: staleArticles, error: queryError } = await supabase
      .from("content")
      .select("id, title, type, platform, created_at, updated_at")
      .eq("type", "article")
      .eq("status", "published")
      .lt("updated_at", thirtyDaysAgo)
      .returns<Array<{ id: string; title: string | null; type: string; platform: string; created_at: string; updated_at: string }>>();

    if (queryError) {
      console.error(
        "Failed to query stale content:",
        queryError.message
      );
      return;
    }

    if (!staleArticles || staleArticles.length === 0) {
      console.log(
        "No articles older than 30 days need refreshing. All content is up to date."
      );
      return;
    }

    console.log(
      `Found ${staleArticles.length} articles older than 30 days that need review.`
    );

    // Group by platform for summary
    const byPlatform: Record<string, number> = {};
    for (const article of staleArticles) {
      const platform = article.platform ?? "unknown";
      byPlatform[platform] = (byPlatform[platform] ?? 0) + 1;
    }

    console.log("Articles needing refresh by platform:");
    for (const [platform, count] of Object.entries(byPlatform)) {
      console.log(`  ${platform}: ${count}`);
    }

    // Collect IDs to update
    const articleIds = staleArticles.map((a) => a.id);

    // Mark articles for review
    const { error: updateError, count } = await supabase
      .from("content")
      .update({
        status: "pending_review",
        updated_at: new Date().toISOString(),
      })
      .in("id", articleIds);

    if (updateError) {
      console.error(
        "Failed to mark articles for review:",
        updateError.message
      );
      return;
    }

    console.log(
      `Marked ${count ?? articleIds.length} articles as 'pending_review'.`
    );

    // Log individual articles for visibility
    for (const article of staleArticles.slice(0, 20)) {
      console.log(
        `  - "${article.title ?? "Untitled"}" (${article.platform}, last updated: ${article.updated_at})`
      );
    }

    if (staleArticles.length > 20) {
      console.log(
        `  ... and ${staleArticles.length - 20} more articles.`
      );
    }

    console.log("Content refresh scan complete.");
  },
});
