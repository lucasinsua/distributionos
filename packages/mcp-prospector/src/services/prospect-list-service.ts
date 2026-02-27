import { getSupabaseClient } from "@prospecting-engine/shared";

interface BuildResult {
  listId: string;
  prospectsFound: number;
  status: string;
}

interface BuildOptions {
  saasProductId?: string;
  maxProspects: number;
}

export class ProspectListService {
  /**
   * Builds a prospect list by searching public data sources against ICP criteria.
   *
   * Sources: job boards, GitHub, Product Hunt, company websites,
   * Crunchbase, G2 reviews, Twitter, podcasts.
   */
  async build(
    name: string,
    icpCriteria: Record<string, unknown>,
    sources: string[],
    options: BuildOptions
  ): Promise<BuildResult> {
    const db = getSupabaseClient();

    // Create the list record
    const { data: list, error } = await db
      .from("prospect_lists")
      .insert({
        name,
        icp_criteria: icpCriteria,
        sources,
        status: "building",
        saas_product_id: options.saasProductId ?? null,
      })
      .select()
      .single();

    if (error || !list) {
      throw new Error(`Failed to create prospect list: ${error?.message}`);
    }

    // Search each source for matching prospects
    let totalFound = 0;

    for (const source of sources) {
      const prospects = await this.searchSource(source, icpCriteria, options.maxProspects - totalFound);
      for (const prospect of prospects) {
        // Upsert company
        const { data: company } = await db
          .from("companies")
          .upsert(
            {
              name: prospect.companyName,
              domain: prospect.domain,
              industry: prospect.industry ?? null,
              employee_count: prospect.employeeCount ?? null,
              tech_stack: prospect.techStack ?? [],
              funding_stage: prospect.fundingStage ?? null,
            },
            { onConflict: "domain" }
          )
          .select()
          .single();

        // Create lead if email found
        if (prospect.email && company) {
          await db.from("leads").upsert(
            {
              email: prospect.email,
              first_name: prospect.firstName ?? null,
              last_name: prospect.lastName ?? null,
              company_id: company.id,
              role: prospect.role ?? null,
              source_channel: "cold_email",
              source_campaign: name,
              status: "new",
              assigned_saas_product_id: options.saasProductId ?? null,
            },
            { onConflict: "email" }
          );
          totalFound++;
        }
      }

      if (totalFound >= options.maxProspects) break;
    }

    // Update list status
    await db
      .from("prospect_lists")
      .update({ status: "ready", total_prospects: totalFound })
      .eq("id", list.id);

    return {
      listId: list.id,
      prospectsFound: totalFound,
      status: "ready",
    };
  }

  private async searchSource(
    source: string,
    icpCriteria: Record<string, unknown>,
    limit: number
  ): Promise<
    Array<{
      companyName: string;
      domain: string | null;
      industry?: string;
      employeeCount?: number;
      techStack?: string[];
      fundingStage?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      role?: string;
    }>
  > {
    switch (source) {
      case "job_boards":
        return this.searchJobBoards(icpCriteria, limit);
      case "github":
        return this.searchGitHub(icpCriteria, limit);
      case "product_hunt":
        return this.searchProductHunt(icpCriteria, limit);
      case "crunchbase":
        return this.searchCrunchbase(icpCriteria, limit);
      case "g2_reviews":
        return this.searchG2Reviews(icpCriteria, limit);
      default:
        return [];
    }
  }

  // Each method integrates with the respective API.
  // Stubs return empty arrays — connect to live APIs in production.

  private async searchJobBoards(
    _criteria: Record<string, unknown>,
    _limit: number
  ) {
    // Search for companies hiring roles that indicate need for your SaaS
    // APIs: Indeed, LinkedIn Jobs (public), Greenhouse boards, Lever boards
    return [] as Array<{
      companyName: string;
      domain: string | null;
      industry?: string;
      employeeCount?: number;
      techStack?: string[];
      fundingStage?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      role?: string;
    }>;
  }

  private async searchGitHub(
    _criteria: Record<string, unknown>,
    _limit: number
  ) {
    // Search GitHub for companies using competitor OSS or adjacent tech
    // API: GitHub REST/GraphQL — search repos, org profiles
    return [] as Array<{
      companyName: string;
      domain: string | null;
      techStack?: string[];
      email?: string;
      firstName?: string;
      lastName?: string;
      role?: string;
    }>;
  }

  private async searchProductHunt(
    _criteria: Record<string, unknown>,
    _limit: number
  ) {
    // Find recently launched companies in adjacent space
    // API: Product Hunt GraphQL API
    return [] as Array<{
      companyName: string;
      domain: string | null;
      email?: string;
      firstName?: string;
      lastName?: string;
    }>;
  }

  private async searchCrunchbase(
    _criteria: Record<string, unknown>,
    _limit: number
  ) {
    // Recently funded companies in target verticals
    // API: Crunchbase Basic API
    return [] as Array<{
      companyName: string;
      domain: string | null;
      industry?: string;
      employeeCount?: number;
      fundingStage?: string;
    }>;
  }

  private async searchG2Reviews(
    _criteria: Record<string, unknown>,
    _limit: number
  ) {
    // Users complaining about competitor limitations
    // Scrape G2 review pages for low-rating reviews
    return [] as Array<{
      companyName: string;
      domain: string | null;
      email?: string;
    }>;
  }
}
