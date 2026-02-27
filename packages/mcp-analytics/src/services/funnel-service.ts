import { getSupabaseClient, type Database } from "@prospecting-engine/shared";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type LeadMagnetRow = Database["public"]["Tables"]["lead_magnets"]["Row"];

interface FunnelMetrics {
  dateRange: { start: string; end: string };
  saasProductId: string | null;
  stages: {
    visitors: number;
    emailCaptures: number;
    leadsNurturing: number;
    qualifiedLeads: number;
    conversions: number;
  };
  conversionRates: {
    visitorToCapture: number;
    captureToNurture: number;
    nurtureToQualified: number;
    qualifiedToConversion: number;
    overallVisitorToConversion: number;
  };
  leadMagnets: Array<{
    id: string;
    title: string;
    signups: number;
    conversionRate: number;
  }>;
}

export class FunnelService {
  async getMetrics(
    startDate: string,
    endDate: string,
    saasProductId?: string
  ): Promise<FunnelMetrics> {
    const db = getSupabaseClient();

    // Query leads by status within date range
    let query = db
      .from("leads")
      .select("*")
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    if (saasProductId) {
      query = query.eq("assigned_saas_product_id", saasProductId);
    }

    const { data: leads } = await query.returns<LeadRow[]>();
    const allLeads = leads ?? [];

    const newLeads = allLeads.filter((l) => l.status === "new").length;
    const nurturing = allLeads.filter((l) => l.status === "nurturing").length;
    const qualified = allLeads.filter((l) => l.status === "qualified").length;
    const converted = allLeads.filter((l) => l.status === "converted").length;
    const totalCaptures = allLeads.length;

    // Estimate visitors from page view interactions
    const { count: pageViews } = await db
      .from("interactions")
      .select("*", { count: "exact", head: true })
      .eq("type", "page_view")
      .gte("timestamp", startDate)
      .lte("timestamp", endDate);

    const visitors = pageViews ?? 0;

    // Lead magnet performance
    let magnetQuery = db
      .from("lead_magnets")
      .select("*")
      .gte("created_at", startDate);

    if (saasProductId) {
      magnetQuery = magnetQuery.eq("target_saas_product_id", saasProductId);
    }

    const { data: magnets } = await magnetQuery.returns<LeadMagnetRow[]>();

    const safe = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 10000) / 10000 : 0);

    return {
      dateRange: { start: startDate, end: endDate },
      saasProductId: saasProductId ?? null,
      stages: {
        visitors,
        emailCaptures: totalCaptures,
        leadsNurturing: nurturing,
        qualifiedLeads: qualified,
        conversions: converted,
      },
      conversionRates: {
        visitorToCapture: safe(totalCaptures, visitors),
        captureToNurture: safe(nurturing, totalCaptures),
        nurtureToQualified: safe(qualified, nurturing),
        qualifiedToConversion: safe(converted, qualified),
        overallVisitorToConversion: safe(converted, visitors),
      },
      leadMagnets: (magnets ?? []).map((m) => ({
        id: m.id,
        title: m.title,
        signups: m.total_signups,
        conversionRate: m.conversion_rate,
      })),
    };
  }
}
