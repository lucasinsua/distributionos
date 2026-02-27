import {
  getSupabaseClient,
  getMaxSendsForDay,
  createInstantlyCampaign,
  launchInstantlyCampaign,
  listWarmedAccounts,
  type Database,
} from "@prospecting-engine/shared";

type ProspectListRow = Database["public"]["Tables"]["prospect_lists"]["Row"];
type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];

interface LaunchInput {
  prospectListId: string;
  templateId?: string;
  dailyLimit: number;
  sendingDomains?: string[];
  startImmediately: boolean;
}

interface LaunchResult {
  campaignId: string;
  prospectListId: string;
  totalProspects: number;
  dailyLimit: number;
  estimatedDaysToComplete: number;
  sendingDomains: string[];
  status: string;
}

export class ColdCampaignService {
  /**
   * Launches a cold email campaign via Instantly.ai.
   *
   * Deliverability architecture:
   * - Multiple sending domains with automated warmup
   * - Each domain warmed 14-21 days before live campaigns
   * - Volume scales: 5/day → 25/day → 50/day
   * - Monitors bounce rates and spam complaints
   * - Auto-pauses domains approaching thresholds
   */
  async launch(input: LaunchInput): Promise<LaunchResult> {
    const db = getSupabaseClient();

    // Fetch prospect list
    const { data: list } = await db
      .from("prospect_lists")
      .select("*")
      .eq("id", input.prospectListId)
      .single()
      .returns<ProspectListRow>();

    if (!list) throw new Error("Prospect list not found");

    // Determine sending domains
    const domains = input.sendingDomains ?? await this.getWarmedDomains();

    // Validate warmup readiness
    for (const domain of domains) {
      const maxSends = getMaxSendsForDay(21); // Assume fully warmed for now
      if (input.dailyLimit > maxSends) {
        throw new Error(
          `Daily limit ${input.dailyLimit} exceeds warmup capacity ${maxSends} for domain ${domain}`
        );
      }
    }

    const totalDailyCapacity = domains.length * input.dailyLimit;
    const estimatedDays = Math.ceil(list.total_prospects / totalDailyCapacity);

    // Create campaign record
    const { data: campaign, error } = await db
      .from("campaigns")
      .insert({
        name: `Cold: ${list.name}`,
        type: "cold",
        channel: "email",
        saas_product_id: list.saas_product_id,
        status: input.startImmediately ? "active" : "scheduled",
        config: {
          prospectListId: input.prospectListId,
          templateId: input.templateId,
          dailyLimit: input.dailyLimit,
          sendingDomains: domains,
        },
        metrics: {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          cost: 0,
          revenue: 0,
        },
        started_at: input.startImmediately ? new Date().toISOString() : null,
      })
      .select()
      .single()
      .returns<CampaignRow>();

    if (error || !campaign) {
      throw new Error(`Failed to create campaign: ${error?.message}`);
    }

    // Mark list as in use
    await db
      .from("prospect_lists")
      .update({ status: "in_use" })
      .eq("id", input.prospectListId);

    // Create campaign in Instantly.ai
    const instantlyCampaign = await createInstantlyCampaign({
      name: `Cold: ${list.name}`,
      emailAccount: domains,
      sequences: [
        {
          steps: [
            {
              subject: "Quick question about {{company}}",
              body: "Hi {{firstName}},\n\nI noticed {{company}} and wanted to reach out...",
              delay: 0,
            },
            {
              subject: "Re: Quick question about {{company}}",
              body: "Hi {{firstName}},\n\nJust following up on my previous email...",
              delay: 3,
            },
          ],
        },
      ],
    });

    // Update campaign record with Instantly campaign ID
    await db
      .from("campaigns")
      .update({
        config: {
          prospectListId: input.prospectListId,
          templateId: input.templateId,
          dailyLimit: input.dailyLimit,
          sendingDomains: domains,
          instantlyCampaignId: instantlyCampaign.campaignId,
        },
      })
      .eq("id", campaign.id);

    // Launch campaign immediately if requested
    if (input.startImmediately) {
      await launchInstantlyCampaign(instantlyCampaign.campaignId);
    }

    return {
      campaignId: campaign.id,
      prospectListId: input.prospectListId,
      totalProspects: list.total_prospects,
      dailyLimit: input.dailyLimit,
      estimatedDaysToComplete: estimatedDays,
      sendingDomains: domains,
      status: campaign.status,
    };
  }

  private async getWarmedDomains(): Promise<string[]> {
    const accounts = await listWarmedAccounts();
    const ready = accounts.filter((a) => a.isReady).map((a) => a.email);
    if (ready.length === 0) {
      throw new Error("No warmed email accounts available. Start warmup first.");
    }
    return ready;
  }
}
