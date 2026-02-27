import { getSupabaseClient, type Database } from "@prospecting-engine/shared";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type CompanyRow = Database["public"]["Tables"]["companies"]["Row"];
type SaasProductRow = Database["public"]["Tables"]["saas_products"]["Row"];
type LeadMagnetRow = Database["public"]["Tables"]["lead_magnets"]["Row"];
type InteractionRow = Database["public"]["Tables"]["interactions"]["Row"];

interface RouteResult {
  leadId: string;
  matchedProduct: {
    id: string;
    name: string;
    slug: string;
    matchScore: number;
    matchReason: string;
  } | null;
  alternativeProducts: Array<{
    id: string;
    name: string;
    matchScore: number;
  }>;
  routing: "single" | "portfolio" | "unmatched";
}

export class RoutingService {
  /**
   * Routes a lead to the best SaaS product match using three signal layers:
   *
   * Primary:   Which lead magnet did they consume?
   * Secondary: Enrichment data (tech stack, company type, role) vs ICP
   * Tertiary:  Behavioral data (pages visited, emails clicked)
   *
   * Conflict resolution: multiple matches → portfolio nurture track
   */
  async route(leadId: string): Promise<RouteResult> {
    const db = getSupabaseClient();

    // Fetch lead with interactions
    const { data: lead } = await db
      .from("leads")
      .select("*, companies(*)")
      .eq("id", leadId)
      .returns<(LeadRow & { companies: CompanyRow | null })[]>()
      .single();

    if (!lead) throw new Error("Lead not found");

    // Fetch all active SaaS products
    const { data: products } = await db
      .from("saas_products")
      .select("*")
      .eq("active", true)
      .returns<SaasProductRow[]>();

    if (!products || products.length === 0) {
      return { leadId, matchedProduct: null, alternativeProducts: [], routing: "unmatched" };
    }

    // Score each product
    const scores: Array<{ product: Record<string, unknown>; score: number; reason: string }> = [];

    for (const product of products) {
      const { score, reason } = await this.scoreMatch(lead, product);
      scores.push({ product, score, reason });
    }

    scores.sort((a, b) => b.score - a.score);

    // Determine routing strategy
    const top = scores[0]!;
    const alternatives = scores.slice(1).filter((s) => s.score > 30);

    // If top two are close in score, use portfolio track
    if (alternatives.length > 0 && top.score - alternatives[0]!.score < 15) {
      return {
        leadId,
        matchedProduct: {
          id: top.product.id as string,
          name: top.product.name as string,
          slug: top.product.slug as string,
          matchScore: top.score,
          matchReason: top.reason,
        },
        alternativeProducts: alternatives.map((a) => ({
          id: a.product.id as string,
          name: a.product.name as string,
          matchScore: a.score,
        })),
        routing: "portfolio",
      };
    }

    // Clear winner — assign directly
    await db
      .from("leads")
      .update({ assigned_saas_product_id: top.product.id as string })
      .eq("id", leadId);

    return {
      leadId,
      matchedProduct: {
        id: top.product.id as string,
        name: top.product.name as string,
        slug: top.product.slug as string,
        matchScore: top.score,
        matchReason: top.reason,
      },
      alternativeProducts: alternatives.slice(0, 3).map((a) => ({
        id: a.product.id as string,
        name: a.product.name as string,
        matchScore: a.score,
      })),
      routing: "single",
    };
  }

  private async scoreMatch(
    lead: Record<string, unknown>,
    product: Record<string, unknown>
  ): Promise<{ score: number; reason: string }> {
    const db = getSupabaseClient();
    let score = 0;
    const reasons: string[] = [];

    const productId = product.id as string;
    const icp = (product.icp_criteria as Record<string, string[]>) ?? {};

    // Primary signal: lead magnet consumed
    const { data: magnets } = await db
      .from("lead_magnets")
      .select("id")
      .eq("target_saas_product_id", productId)
      .returns<Pick<LeadMagnetRow, "id">[]>();

    if (magnets && magnets.length > 0) {
      const magnetIds = magnets.map((m) => m.id);
      const { data: interactions } = await db
        .from("interactions")
        .select("*")
        .eq("lead_id", lead.id as string)
        .in("type", ["form_submit", "content_download", "course_complete"])
        .returns<InteractionRow[]>();

      if (interactions) {
        const magnetInteractions = interactions.filter((i) => {
          const meta = i.metadata as Record<string, unknown> | null;
          return meta && magnetIds.includes(meta.lead_magnet_id as string);
        });
        if (magnetInteractions.length > 0) {
          score += 40;
          reasons.push("consumed lead magnet");
        }
      }
    }

    // Secondary signal: ICP match
    const company = lead.companies as Record<string, unknown> | null;
    if (company) {
      const techStack = (company.tech_stack as string[]) ?? [];
      const icpTech = icp.tech_stack ?? [];
      if (icpTech.length > 0 && techStack.length > 0) {
        const overlap = techStack.filter((t) =>
          icpTech.some((it) => t.toLowerCase().includes(it.toLowerCase()))
        ).length;
        if (overlap > 0) {
          score += 20;
          reasons.push("tech stack match");
        }
      }

      const industry = (company.industry as string) ?? "";
      if ((icp.industries ?? []).some((i) => industry.toLowerCase().includes(i.toLowerCase()))) {
        score += 15;
        reasons.push("industry match");
      }
    }

    const role = (lead.role as string) ?? "";
    if ((icp.roles ?? []).some((r) => role.toLowerCase().includes(r.toLowerCase()))) {
      score += 10;
      reasons.push("role match");
    }

    // Tertiary signal: behavioral data
    const { count: pageViews } = await db
      .from("interactions")
      .select("*", { count: "exact", head: true })
      .eq("lead_id", lead.id as string)
      .eq("type", "page_view");

    if (pageViews && pageViews > 3) {
      score += 15;
      reasons.push("high engagement");
    }

    return {
      score: Math.min(score, 100),
      reason: reasons.join(", ") || "no strong signals",
    };
  }
}
