import {
  getSupabaseClient,
  calculateLeadScore,
  getQualificationTier,
  type Database,
  type FitSignals,
  type IntentSignals,
  type EngagementSignals,
} from "@prospecting-engine/shared";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type CompanyRow = Database["public"]["Tables"]["companies"]["Row"];
type SaasProductRow = Database["public"]["Tables"]["saas_products"]["Row"];
type InteractionRow = Database["public"]["Tables"]["interactions"]["Row"];

interface ScoreOptions {
  forceRefresh: boolean;
}

interface ScoreResult {
  leadId: string;
  leadScore: number;
  fitScore: number;
  intentScore: number;
  engagementScore: number;
  tier: string;
  signals: {
    fit: FitSignals;
    intent: IntentSignals;
    engagement: EngagementSignals;
  };
}

export class LeadScoringService {
  /**
   * Calculates a composite lead score based on three dimensions:
   *   Fit (40%):        company size, industry, tech stack, role, geography
   *   Intent (35%):     pages visited, content consumed, emails opened, replies
   *   Engagement (25%): course completion %, email CTR, return visits
   */
  async score(leadId: string, options: ScoreOptions): Promise<ScoreResult> {
    const db = getSupabaseClient();

    // Fetch lead with company
    const { data: lead } = await db
      .from("leads")
      .select("*, companies(*)")
      .eq("id", leadId)
      .returns<(LeadRow & { companies: CompanyRow | null })[]>()
      .single();

    if (!lead) throw new Error("Lead not found");

    // Skip if recently scored and not forcing refresh
    if (!options.forceRefresh && lead.lead_score > 0) {
      const lastUpdate = new Date(lead.updated_at);
      const hoursSince = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 6) {
        return {
          leadId,
          leadScore: lead.lead_score,
          fitScore: lead.fit_score,
          intentScore: lead.intent_score,
          engagementScore: lead.engagement_score,
          tier: getQualificationTier(lead.lead_score),
          signals: { fit: {} as FitSignals, intent: {} as IntentSignals, engagement: {} as EngagementSignals },
        };
      }
    }

    // Gather fit signals
    const fitSignals = await this.gatherFitSignals(lead);

    // Gather intent signals
    const intentSignals = await this.gatherIntentSignals(leadId);

    // Gather engagement signals
    const engagementSignals = await this.gatherEngagementSignals(leadId);

    // Calculate composite score
    const scores = calculateLeadScore(fitSignals, intentSignals, engagementSignals);
    const tier = getQualificationTier(scores.leadScore);

    // Update lead record
    await db
      .from("leads")
      .update({
        lead_score: scores.leadScore,
        fit_score: scores.fitScore,
        intent_score: scores.intentScore,
        engagement_score: scores.engagementScore,
      })
      .eq("id", leadId);

    return {
      leadId,
      ...scores,
      tier,
      signals: {
        fit: fitSignals,
        intent: intentSignals,
        engagement: engagementSignals,
      },
    };
  }

  private async gatherFitSignals(lead: Record<string, unknown>): Promise<FitSignals> {
    const db = getSupabaseClient();
    const productId = lead.assigned_saas_product_id as string | null;

    if (!productId) {
      return {
        industryMatch: false,
        companySizeMatch: false,
        roleMatch: false,
        techStackOverlap: 0,
        geographyMatch: false,
        fundingStageMatch: false,
      };
    }

    const { data: product } = await db
      .from("saas_products")
      .select("*")
      .eq("id", productId)
      .returns<SaasProductRow[]>()
      .single();

    if (!product) {
      return {
        industryMatch: false,
        companySizeMatch: false,
        roleMatch: false,
        techStackOverlap: 0,
        geographyMatch: false,
        fundingStageMatch: false,
      };
    }

    const icp = product.icp_criteria as Record<string, string[]>;
    const company = lead.companies as Record<string, unknown> | null;

    const companyIndustry = (company?.industry as string) ?? "";
    const companySize = (company?.employee_count as number) ?? 0;
    const companyTechStack = (company?.tech_stack as string[]) ?? [];
    const companyFunding = (company?.funding_stage as string) ?? "";
    const leadRole = (lead.role as string) ?? "";

    return {
      industryMatch: (icp.industries ?? []).some(
        (i) => companyIndustry.toLowerCase().includes(i.toLowerCase())
      ),
      companySizeMatch: companySize > 10 && companySize < 10000,
      roleMatch: (icp.roles ?? []).some(
        (r) => leadRole.toLowerCase().includes(r.toLowerCase())
      ),
      techStackOverlap: this.calculateOverlap(
        companyTechStack,
        icp.tech_stack ?? []
      ),
      geographyMatch: true, // Simplified — enhance with geo data
      fundingStageMatch: (icp.funding_stages ?? []).includes(companyFunding),
    };
  }

  private async gatherIntentSignals(leadId: string): Promise<IntentSignals> {
    const db = getSupabaseClient();

    const { data: interactions } = await db
      .from("interactions")
      .select("*")
      .eq("lead_id", leadId)
      .returns<InteractionRow[]>();

    if (!interactions) {
      return {
        pagesVisited: 0,
        contentPiecesConsumed: 0,
        emailsOpened: 0,
        emailReplies: 0,
        leadMagnetDownloads: 0,
      };
    }

    return {
      pagesVisited: interactions.filter((i) => i.type === "page_view").length,
      contentPiecesConsumed: interactions.filter(
        (i) => i.type === "content_download" || i.type === "course_step_complete"
      ).length,
      emailsOpened: interactions.filter((i) => i.type === "email_open").length,
      emailReplies: interactions.filter((i) => i.type === "email_reply").length,
      leadMagnetDownloads: interactions.filter((i) => i.type === "form_submit").length,
    };
  }

  private async gatherEngagementSignals(leadId: string): Promise<EngagementSignals> {
    const db = getSupabaseClient();

    const { data: interactions } = await db
      .from("interactions")
      .select("*")
      .eq("lead_id", leadId)
      .order("timestamp", { ascending: false })
      .returns<InteractionRow[]>();

    if (!interactions || interactions.length === 0) {
      return {
        courseCompletionPct: 0,
        emailClickThroughRate: 0,
        returnVisits: 0,
        daysSinceLastInteraction: 999,
      };
    }

    const courseSteps = interactions.filter((i) => i.type === "course_step_complete").length;
    const courseComplete = interactions.some((i) => i.type === "course_complete");
    const emailClicks = interactions.filter((i) => i.type === "email_click").length;
    const emailOpens = interactions.filter((i) => i.type === "email_open").length;
    const pageViews = interactions.filter((i) => i.type === "page_view").length;

    const lastInteraction = new Date(interactions[0]!.timestamp);
    const daysSince = (Date.now() - lastInteraction.getTime()) / (1000 * 60 * 60 * 24);

    return {
      courseCompletionPct: courseComplete ? 1 : Math.min(courseSteps / 5, 0.9),
      emailClickThroughRate: emailOpens > 0 ? Math.min(emailClicks / emailOpens, 1) : 0,
      returnVisits: Math.min(pageViews, 10),
      daysSinceLastInteraction: Math.round(daysSince),
    };
  }

  private calculateOverlap(a: string[], b: string[]): number {
    if (a.length === 0 || b.length === 0) return 0;
    const setB = new Set(b.map((s) => s.toLowerCase()));
    const matches = a.filter((s) => setB.has(s.toLowerCase())).length;
    return matches / Math.max(a.length, b.length);
  }
}
