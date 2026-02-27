import { getSupabaseClient, type Database } from "@prospecting-engine/shared";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type ContentRow = Database["public"]["Tables"]["content"]["Row"];
type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];
type LeadMagnetRow = Database["public"]["Tables"]["lead_magnets"]["Row"];

export class ReportService {
  /**
   * Generates formatted performance reports.
   * Sent weekly (Monday 8 AM) to the admin email.
   */
  async generate(
    type: string,
    startDate: string,
    endDate: string,
    format: string
  ): Promise<string> {
    const db = getSupabaseClient();

    // Gather all metrics
    const { data: leads } = await db
      .from("leads")
      .select("*")
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .returns<LeadRow[]>();

    const { data: content } = await db
      .from("content")
      .select("*")
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .returns<ContentRow[]>();

    const { data: campaigns } = await db
      .from("campaigns")
      .select("*")
      .gte("created_at", startDate)
      .returns<CampaignRow[]>();

    const { data: magnets } = await db
      .from("lead_magnets")
      .select("*")
      .gte("created_at", startDate)
      .returns<LeadMagnetRow[]>();

    const allLeads = leads ?? [];
    const allContent = content ?? [];
    const allCampaigns = campaigns ?? [];
    const allMagnets = magnets ?? [];

    const newLeads = allLeads.filter((l) => l.status === "new").length;
    const nurturing = allLeads.filter((l) => l.status === "nurturing").length;
    const qualified = allLeads.filter((l) => l.status === "qualified").length;
    const converted = allLeads.filter((l) => l.status === "converted").length;
    const avgScore = allLeads.length > 0
      ? Math.round(allLeads.reduce((sum, l) => sum + l.lead_score, 0) / allLeads.length)
      : 0;

    const articles = allContent.filter((c) => c.type === "article").length;
    const socialPosts = allContent.filter((c) => c.type === "social_post").length;
    const communityReplies = allContent.filter((c) => c.type === "community_reply").length;

    if (format === "json") {
      return JSON.stringify(
        {
          type,
          period: { start: startDate, end: endDate },
          leads: { total: allLeads.length, new: newLeads, nurturing, qualified, converted, avgScore },
          content: { articles, socialPosts, communityReplies, leadMagnets: allMagnets.length },
          campaigns: { total: allCampaigns.length, active: allCampaigns.filter((c) => c.status === "active").length },
        },
        null,
        2
      );
    }

    // Markdown format
    return `# ${type === "weekly" ? "Weekly" : "Monthly"} Prospecting Report

**Period:** ${startDate} to ${endDate}

---

## Lead Pipeline

| Stage | Count |
|-------|-------|
| New Leads | ${newLeads} |
| Nurturing | ${nurturing} |
| Qualified | ${qualified} |
| Converted | ${converted} |
| **Total** | **${allLeads.length}** |

**Average Lead Score:** ${avgScore}/100

---

## Content Production

| Type | Count |
|------|-------|
| SEO Articles | ${articles} |
| Social Posts | ${socialPosts} |
| Community Replies | ${communityReplies} |
| Lead Magnets Created | ${allMagnets.length} |

---

## Campaigns

- **Total Campaigns:** ${allCampaigns.length}
- **Active:** ${allCampaigns.filter((c) => c.status === "active").length}
- **Completed:** ${allCampaigns.filter((c) => c.status === "completed").length}

---

## Key Metrics

- **Lead Magnet Signups:** ${allMagnets.reduce((sum, m) => sum + m.total_signups, 0)}
- **Qualification Rate:** ${allLeads.length > 0 ? Math.round((qualified / allLeads.length) * 100) : 0}%
- **Conversion Rate:** ${allLeads.length > 0 ? Math.round((converted / allLeads.length) * 100) : 0}%

---

*Report generated automatically by the Prospecting Engine Analytics System.*`;
  }
}
