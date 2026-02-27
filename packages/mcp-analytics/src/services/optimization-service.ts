import { getSupabaseClient, type Database } from "@prospecting-engine/shared";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];

interface OptimizationResult {
  lookbackDays: number;
  recommendations: Array<{
    type: "increase_budget" | "decrease_budget" | "shift_focus" | "pause" | "scale_up";
    channel: string;
    reason: string;
    impact: "high" | "medium" | "low";
    currentMetric: string;
    suggestedAction: string;
  }>;
  channelScores: Record<string, number>;
}

export class OptimizationService {
  /**
   * Analyzes performance data and recommends resource reallocation.
   * Runs weekly to shift budget/effort toward highest-ROI channels.
   */
  async optimize(lookbackDays: number): Promise<OptimizationResult> {
    const db = getSupabaseClient();

    const startDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
    const endDate = new Date().toISOString();

    // Get leads by channel
    const { data: leads } = await db
      .from("leads")
      .select("*")
      .gte("created_at", startDate)
      .returns<LeadRow[]>();

    const allLeads = leads ?? [];
    const byChannel = new Map<string, typeof allLeads>();
    for (const lead of allLeads) {
      if (!byChannel.has(lead.source_channel)) byChannel.set(lead.source_channel, []);
      byChannel.get(lead.source_channel)!.push(lead);
    }

    // Score channels
    const channelScores: Record<string, number> = {};
    const recommendations: OptimizationResult["recommendations"] = [];

    for (const [channel, channelLeads] of byChannel) {
      const qualified = channelLeads.filter((l) => l.lead_score >= 45).length;
      const converted = channelLeads.filter((l) => l.status === "converted").length;

      // Score: weighted combination of volume, quality, and conversion
      const volumeScore = Math.min(channelLeads.length / 10, 30);
      const qualityScore = channelLeads.length > 0
        ? (qualified / channelLeads.length) * 40
        : 0;
      const conversionScore = channelLeads.length > 0
        ? (converted / channelLeads.length) * 30
        : 0;

      channelScores[channel] = Math.round(volumeScore + qualityScore + conversionScore);

      // Generate recommendations
      if (channelScores[channel]! >= 60) {
        recommendations.push({
          type: "scale_up",
          channel,
          reason: `High performance: ${qualified} qualified leads, ${converted} conversions`,
          impact: "high",
          currentMetric: `${channelLeads.length} leads, ${Math.round((qualified / Math.max(channelLeads.length, 1)) * 100)}% qualification rate`,
          suggestedAction: `Increase ${channel} budget/effort by 25-50%`,
        });
      } else if (channelScores[channel]! <= 20 && channelLeads.length > 5) {
        recommendations.push({
          type: "decrease_budget",
          channel,
          reason: `Low ROI: ${channelLeads.length} leads but only ${converted} conversions`,
          impact: "medium",
          currentMetric: `${channelLeads.length} leads, ${Math.round((converted / Math.max(channelLeads.length, 1)) * 100)}% conversion rate`,
          suggestedAction: `Reduce ${channel} investment and reallocate to higher performers`,
        });
      }
    }

    return {
      lookbackDays,
      recommendations: recommendations.sort(
        (a, b) => (b.impact === "high" ? 3 : b.impact === "medium" ? 2 : 1) -
                  (a.impact === "high" ? 3 : a.impact === "medium" ? 2 : 1)
      ),
      channelScores,
    };
  }
}
