import { getSupabaseClient } from "@prospecting-engine/shared";

interface ChannelMetric {
  channel: string;
  leads: number;
  qualifiedLeads: number;
  conversions: number;
  conversionRate: number;
  costPerLead: number | null;
  roi: number | null;
}

interface ChannelPerformanceResult {
  dateRange: { start: string; end: string };
  channels: ChannelMetric[];
  bestPerforming: string | null;
  worstPerforming: string | null;
}

export class ChannelPerformanceService {
  async getPerformance(
    startDate: string,
    endDate: string
  ): Promise<ChannelPerformanceResult> {
    const db = getSupabaseClient();

    const { data: leads } = await db
      .from("leads")
      .select("*")
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    const allLeads = leads ?? [];

    // Group by source channel
    const byChannel = new Map<string, typeof allLeads>();
    for (const lead of allLeads) {
      const channel = lead.source_channel;
      if (!byChannel.has(channel)) byChannel.set(channel, []);
      byChannel.get(channel)!.push(lead);
    }

    // Get campaign cost data
    const { data: campaigns } = await db
      .from("campaigns")
      .select("*")
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    const costByChannel = new Map<string, number>();
    for (const campaign of campaigns ?? []) {
      const metrics = campaign.metrics as Record<string, number> | null;
      const cost = metrics?.cost ?? 0;
      const current = costByChannel.get(campaign.channel) ?? 0;
      costByChannel.set(campaign.channel, current + cost);
    }

    const channels: ChannelMetric[] = [];
    for (const [channel, channelLeads] of byChannel) {
      const qualified = channelLeads.filter((l) => l.status === "qualified").length;
      const converted = channelLeads.filter((l) => l.status === "converted").length;
      const cost = costByChannel.get(channel) ?? null;

      channels.push({
        channel,
        leads: channelLeads.length,
        qualifiedLeads: qualified,
        conversions: converted,
        conversionRate: channelLeads.length > 0 ? converted / channelLeads.length : 0,
        costPerLead: cost !== null && channelLeads.length > 0 ? cost / channelLeads.length : null,
        roi: null, // Requires revenue attribution
      });
    }

    channels.sort((a, b) => b.conversionRate - a.conversionRate);

    return {
      dateRange: { start: startDate, end: endDate },
      channels,
      bestPerforming: channels[0]?.channel ?? null,
      worstPerforming: channels.length > 1 ? channels[channels.length - 1]!.channel : null,
    };
  }
}
