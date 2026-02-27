import { schedules } from "@trigger.dev/sdk/v3";
import {
  getSupabaseClient,
  calculateFitScore,
  calculateIntentScore,
  calculateEngagementScore,
  type FitSignals,
  type IntentSignals,
  type EngagementSignals,
  type Database,
} from "@prospecting-engine/shared";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type CompanyRow = Database["public"]["Tables"]["companies"]["Row"];
type SaasProductRow = Database["public"]["Tables"]["saas_products"]["Row"];

/**
 * Lead Scoring Job
 *
 * Runs every 4 hours. Queries all leads with status 'new' or 'nurturing'
 * that haven't been scored in the last 24 hours, recalculates their
 * fit/intent/engagement scores, and updates lead_score.
 * If lead_score >= 70, promotes status to 'qualified'.
 */
export const leadScoringJob = schedules.task({
  id: "lead-scoring",
  cron: "0 */4 * * *",
  run: async () => {
    const supabase = getSupabaseClient();

    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString();

    // Fetch leads that need rescoring
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("*")
      .in("status", ["new", "nurturing"])
      .or(`updated_at.lt.${twentyFourHoursAgo},updated_at.is.null`)
      .returns<LeadRow[]>();

    if (leadsError) {
      console.error("Failed to fetch leads for scoring:", leadsError.message);
      return;
    }

    if (!leads || leads.length === 0) {
      console.log("No leads require rescoring at this time.");
      return;
    }

    console.log(`Found ${leads.length} leads to rescore.`);

    let updatedCount = 0;
    let qualifiedCount = 0;

    for (const lead of leads) {
      // --- Build Fit Signals ---
      // Look up company data if available
      let fitSignals: FitSignals = {
        industryMatch: false,
        companySizeMatch: false,
        roleMatch: false,
        techStackOverlap: 0,
        geographyMatch: false,
        fundingStageMatch: false,
      };

      if (lead.assigned_saas_product_id) {
        const { data: product } = await supabase
          .from("saas_products")
          .select("icp_criteria")
          .eq("id", lead.assigned_saas_product_id)
          .returns<Pick<SaasProductRow, "icp_criteria">[]>()
          .single();

        if (product) {
          const icp = product.icp_criteria as Record<string, unknown>;
          const icpIndustries = (icp?.industries as string[]) ?? [];
          const icpRoles = (icp?.roles as string[]) ?? [];
          const icpTechStack = (icp?.tech_stack as string[]) ?? [];

          // Check company data for industry/size/tech match
          if (lead.company_id) {
            const { data: company } = await supabase
              .from("companies")
              .select("*")
              .eq("id", lead.company_id)
              .returns<CompanyRow[]>()
              .single();

            if (company) {
              fitSignals.industryMatch =
                !!company.industry &&
                icpIndustries.some(
                  (ind: string) =>
                    company.industry?.toLowerCase().includes(ind.toLowerCase())
                );

              const icpSizes = (icp?.company_sizes as string[]) ?? [];
              const empCount = company.employee_count ?? 0;
              fitSignals.companySizeMatch = icpSizes.some((size: string) => {
                if (size.includes("-")) {
                  const [min, max] = size.split("-").map(Number);
                  return empCount >= min && empCount <= max;
                }
                return false;
              });

              const companyTech = (company.tech_stack as string[]) ?? [];
              if (icpTechStack.length > 0 && companyTech.length > 0) {
                const overlap = companyTech.filter((t: string) =>
                  icpTechStack.some(
                    (it: string) => it.toLowerCase() === t.toLowerCase()
                  )
                ).length;
                fitSignals.techStackOverlap = overlap / icpTechStack.length;
              }

              fitSignals.fundingStageMatch =
                !!company.funding_stage &&
                ((icp?.funding_stages as string[]) ?? []).some(
                  (fs: string) =>
                    company.funding_stage?.toLowerCase() === fs.toLowerCase()
                );
            }
          }

          fitSignals.roleMatch =
            !!lead.role &&
            icpRoles.some((r: string) =>
              lead.role?.toLowerCase().includes(r.toLowerCase())
            );

          // Geography is not stored on lead directly, default to false
          fitSignals.geographyMatch = false;
        }
      }

      // --- Build Intent Signals ---
      const { data: interactions } = await supabase
        .from("interactions")
        .select("type")
        .eq("lead_id", lead.id);

      const interactionTypes = (interactions ?? []).map(
        (i: { type: string }) => i.type
      );

      const intentSignals: IntentSignals = {
        pagesVisited: interactionTypes.filter((t) => t === "page_view").length,
        contentPiecesConsumed: interactionTypes.filter(
          (t) => t === "content_download" || t === "course_step_complete"
        ).length,
        emailsOpened: interactionTypes.filter((t) => t === "email_open").length,
        emailReplies: interactionTypes.filter((t) => t === "email_reply")
          .length,
        leadMagnetDownloads: interactionTypes.filter(
          (t) => t === "content_download" || t === "form_submit"
        ).length,
      };

      // --- Build Engagement Signals ---
      const courseCompletions = interactionTypes.filter(
        (t) => t === "course_complete"
      ).length;
      const courseSteps = interactionTypes.filter(
        (t) => t === "course_step_complete"
      ).length;

      const emailClicks = interactionTypes.filter(
        (t) => t === "email_click"
      ).length;
      const totalEmails = interactionTypes.filter(
        (t) =>
          t === "email_open" || t === "email_click" || t === "email_reply"
      ).length;

      const { data: latestInteraction } = await supabase
        .from("interactions")
        .select("timestamp")
        .eq("lead_id", lead.id)
        .order("timestamp", { ascending: false })
        .limit(1)
        .single();

      const daysSinceLastInteraction = latestInteraction
        ? Math.floor(
            (Date.now() - new Date(latestInteraction.timestamp).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 999;

      const engagementSignals: EngagementSignals = {
        courseCompletionPct:
          courseSteps > 0
            ? Math.min(courseCompletions > 0 ? 1 : courseSteps / 10, 1)
            : 0,
        emailClickThroughRate:
          totalEmails > 0 ? Math.min(emailClicks / totalEmails, 1) : 0,
        returnVisits: Math.max(
          interactionTypes.filter((t) => t === "page_view").length - 1,
          0
        ),
        daysSinceLastInteraction,
      };

      // --- Calculate Scores ---
      const fitScore = calculateFitScore(fitSignals);
      const intentScore = calculateIntentScore(intentSignals);
      const engagementScore = calculateEngagementScore(engagementSignals);
      const leadScore = fitScore + intentScore + engagementScore;

      const newStatus = leadScore >= 70 ? "qualified" : lead.status;

      // --- Update Lead ---
      const { error: updateError } = await supabase
        .from("leads")
        .update({
          fit_score: fitScore,
          intent_score: intentScore,
          engagement_score: engagementScore,
          lead_score: leadScore,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", lead.id);

      if (updateError) {
        console.error(
          `Failed to update lead ${lead.id}:`,
          updateError.message
        );
      } else {
        updatedCount++;
        if (newStatus === "qualified" && lead.status !== "qualified") {
          qualifiedCount++;
          console.log(
            `Lead ${lead.id} promoted to qualified (score: ${leadScore})`
          );
        }
      }
    }

    console.log(
      `Lead scoring complete. Updated: ${updatedCount}, Newly qualified: ${qualifiedCount}`
    );
  },
});
