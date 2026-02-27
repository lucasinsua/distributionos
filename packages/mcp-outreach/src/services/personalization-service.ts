import { getSupabaseClient } from "@prospecting-engine/shared";

interface PersonalizationResult {
  leadId: string;
  originalTemplate: string;
  personalizedEmail: string;
  personalizationSignals: {
    company: Record<string, unknown> | null;
    personal: Record<string, unknown> | null;
    painPoints: string[];
    timing: string | null;
  };
  depth: string;
}

export class PersonalizationService {
  /**
   * Hyper-personalizes email copy for a specific lead.
   *
   * Pulls from:
   * - Company context: news, funding, product launches, job posts, tech stack
   * - Personal context: tweets, blog posts, podcast appearances, GitHub activity
   * - Pain-point context: problems discovered during signal monitoring
   * - Timing context: why reaching out NOW makes sense
   */
  async personalize(
    leadId: string,
    template: string,
    depth: string
  ): Promise<PersonalizationResult> {
    const db = getSupabaseClient();

    // Fetch lead with company data
    const { data: lead } = await db
      .from("leads")
      .select("*, companies(*)")
      .eq("id", leadId)
      .single();

    if (!lead) throw new Error("Lead not found");

    // Gather personalization signals based on depth
    const signals = await this.gatherSignals(lead, depth);

    // Generate personalized version (in production: Claude API)
    const personalized = this.applyPersonalization(template, lead, signals);

    return {
      leadId,
      originalTemplate: template,
      personalizedEmail: personalized,
      personalizationSignals: signals,
      depth,
    };
  }

  private async gatherSignals(
    lead: Record<string, unknown>,
    depth: string
  ): Promise<{
    company: Record<string, unknown> | null;
    personal: Record<string, unknown> | null;
    painPoints: string[];
    timing: string | null;
  }> {
    const signals: {
      company: Record<string, unknown> | null;
      personal: Record<string, unknown> | null;
      painPoints: string[];
      timing: string | null;
    } = {
      company: null,
      personal: null,
      painPoints: [],
      timing: null,
    };

    const company = lead.companies as Record<string, unknown> | null;

    // Light: just use enrichment data we already have
    if (company) {
      signals.company = {
        name: company.name,
        industry: company.industry,
        size: company.employee_count,
        techStack: company.tech_stack,
      };
    }

    if (depth === "light") return signals;

    // Medium: check for recent signals
    const db = getSupabaseClient();
    const domain = company?.domain as string | undefined;
    if (domain) {
      const { data: recentSignals } = await db
        .from("signals")
        .select("*")
        .eq("entity_domain", domain)
        .order("created_at", { ascending: false })
        .limit(3);

      if (recentSignals) {
        signals.painPoints = recentSignals.map((s) => s.content).slice(0, 3);
        if (recentSignals.length > 0) {
          const latestSignal = recentSignals[0]!;
          signals.timing = `Recent ${latestSignal.type}: ${latestSignal.content.slice(0, 100)}`;
        }
      }
    }

    if (depth === "medium") return signals;

    // Deep: additional research (Twitter, blog, GitHub)
    // In production: real-time API calls to gather fresh data
    signals.personal = {
      recentActivity: "[Research lead's recent tweets, blog posts, GitHub activity]",
    };

    return signals;
  }

  private applyPersonalization(
    template: string,
    lead: Record<string, unknown>,
    signals: {
      company: Record<string, unknown> | null;
      personal: Record<string, unknown> | null;
      painPoints: string[];
      timing: string | null;
    }
  ): string {
    // In production: use Claude API to rewrite the template with personalization
    // For now: simple placeholder replacement
    let result = template;
    result = result.replace("{{first_name}}", (lead.first_name as string) ?? "there");
    result = result.replace("{{company}}", (signals.company?.name as string) ?? "your company");
    result = result.replace("{{role}}", (lead.role as string) ?? "your role");

    if (signals.timing) {
      result = result.replace("{{timing_hook}}", signals.timing);
    }

    if (signals.painPoints.length > 0) {
      result = result.replace("{{pain_point}}", signals.painPoints[0]!);
    }

    return result;
  }
}
