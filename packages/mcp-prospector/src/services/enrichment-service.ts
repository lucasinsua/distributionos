import { getSupabaseClient } from "@prospecting-engine/shared";

interface EnrichmentInput {
  email?: string;
  domain?: string;
  leadId?: string;
}

interface EnrichmentResult {
  email?: string;
  domain?: string;
  person: {
    firstName: string | null;
    lastName: string | null;
    role: string | null;
    linkedinUrl: string | null;
    twitterHandle: string | null;
  } | null;
  company: {
    name: string | null;
    domain: string | null;
    industry: string | null;
    employeeCount: number | null;
    techStack: string[];
    fundingStage: string | null;
    annualRevenueEst: number | null;
    description: string | null;
  } | null;
  sources: string[];
}

export class EnrichmentService {
  /**
   * Enriches a lead or company using Hunter.io, Clearbit, Clay, and public data.
   * If leadId is provided, updates the lead record in the database.
   */
  async enrich(input: EnrichmentInput): Promise<EnrichmentResult> {
    const results: EnrichmentResult = {
      email: input.email,
      domain: input.domain ?? (input.email ? input.email.split("@")[1] : undefined),
      person: null,
      company: null,
      sources: [],
    };

    const domain = results.domain;

    // Enrich person data if email provided
    if (input.email) {
      results.person = await this.enrichPerson(input.email);
      if (results.person) results.sources.push("hunter", "clearbit");
    }

    // Enrich company data if domain available
    if (domain) {
      results.company = await this.enrichCompany(domain);
      if (results.company) results.sources.push("clearbit", "clay");
    }

    // Persist enrichment to database if lead ID provided
    if (input.leadId) {
      await this.persistEnrichment(input.leadId, results);
    }

    return results;
  }

  private async enrichPerson(email: string): Promise<EnrichmentResult["person"]> {
    // Hunter.io: verify email, find person name and role
    // Endpoint: GET https://api.hunter.io/v2/email-verifier?email=...
    // Clearbit: enrich person by email
    // Endpoint: GET https://person.clearbit.com/v2/people/find?email=...
    // TODO: Implement API calls
    const _ = email;
    return null;
  }

  private async enrichCompany(domain: string): Promise<EnrichmentResult["company"]> {
    // Clearbit: company enrichment
    // Endpoint: GET https://company.clearbit.com/v2/companies/find?domain=...
    // Clay: additional enrichment data
    // BuiltWith / Wappalyzer: tech stack detection
    // TODO: Implement API calls
    const _ = domain;
    return null;
  }

  private async persistEnrichment(
    leadId: string,
    enrichment: EnrichmentResult
  ): Promise<void> {
    const db = getSupabaseClient();

    const updates: Record<string, unknown> = {
      enrichment_data: enrichment,
    };

    if (enrichment.person) {
      if (enrichment.person.firstName) updates.first_name = enrichment.person.firstName;
      if (enrichment.person.lastName) updates.last_name = enrichment.person.lastName;
      if (enrichment.person.role) updates.role = enrichment.person.role;
    }

    await db.from("leads").update(updates).eq("id", leadId);

    // Upsert company data if available
    if (enrichment.company && enrichment.domain) {
      await db.from("companies").upsert(
        {
          name: enrichment.company.name ?? enrichment.domain,
          domain: enrichment.domain,
          industry: enrichment.company.industry,
          employee_count: enrichment.company.employeeCount,
          tech_stack: enrichment.company.techStack,
          funding_stage: enrichment.company.fundingStage,
          annual_revenue_est: enrichment.company.annualRevenueEst,
          enrichment_data: enrichment.company,
        },
        { onConflict: "domain" }
      );
    }
  }
}
