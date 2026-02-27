import { schedules } from "@trigger.dev/sdk/v3";
import { getSupabaseClient, type Database } from "@prospecting-engine/shared";

type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];

/**
 * Warmup Monitor Job
 *
 * Runs daily at 6am UTC. Queries the campaigns table for active campaigns,
 * logs a daily summary of active campaigns and warming domains.
 * This is a monitoring/alerting job — just logs stats for now.
 */
export const warmupMonitorJob = schedules.task({
  id: "warmup-monitor",
  cron: "0 6 * * *",
  run: async () => {
    const supabase = getSupabaseClient();

    // Fetch active campaigns
    const { data: campaigns, error: campaignsError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("status", "active")
      .returns<CampaignRow[]>();

    if (campaignsError) {
      console.error(
        "Failed to fetch active campaigns:",
        campaignsError.message
      );
      return;
    }

    if (!campaigns || campaigns.length === 0) {
      console.log("No active campaigns found.");
      return;
    }

    // Group campaigns by type
    const campaignsByType: Record<string, number> = {};
    for (const campaign of campaigns) {
      const type = campaign.type ?? "unknown";
      campaignsByType[type] = (campaignsByType[type] ?? 0) + 1;
    }

    // Group campaigns by channel
    const campaignsByChannel: Record<string, number> = {};
    for (const campaign of campaigns) {
      const channel = campaign.channel ?? "unknown";
      campaignsByChannel[channel] = (campaignsByChannel[channel] ?? 0) + 1;
    }

    // Identify email campaigns (warming domains)
    const emailCampaigns = campaigns.filter(
      (c) => c.channel === "email"
    );

    // Aggregate metrics from active campaigns
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalConversions = 0;

    for (const campaign of campaigns) {
      const metrics = campaign.metrics as Record<string, number> | null;
      if (metrics) {
        totalImpressions += metrics.impressions ?? 0;
        totalClicks += metrics.clicks ?? 0;
        totalConversions += metrics.conversions ?? 0;
      }
    }

    // Log daily summary
    console.log("=== Daily Warmup Monitor Summary ===");
    console.log(`Date: ${new Date().toISOString().split("T")[0]}`);
    console.log(`Total active campaigns: ${campaigns.length}`);
    console.log("");

    console.log("Campaigns by type:");
    for (const [type, count] of Object.entries(campaignsByType)) {
      console.log(`  ${type}: ${count}`);
    }
    console.log("");

    console.log("Campaigns by channel:");
    for (const [channel, count] of Object.entries(campaignsByChannel)) {
      console.log(`  ${channel}: ${count}`);
    }
    console.log("");

    console.log(`Email campaigns (warming domains): ${emailCampaigns.length}`);
    for (const ec of emailCampaigns) {
      const config = ec.config as Record<string, unknown> | null;
      const domain = config?.domain ?? config?.sending_domain ?? "unknown";
      console.log(`  - "${ec.name}" (domain: ${domain})`);
    }
    console.log("");

    console.log("Aggregate metrics across active campaigns:");
    console.log(`  Impressions: ${totalImpressions}`);
    console.log(`  Clicks: ${totalClicks}`);
    console.log(`  Conversions: ${totalConversions}`);
    console.log("=== End Summary ===");
  },
});
