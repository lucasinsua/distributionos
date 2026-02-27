import { z } from "zod";

// ── Campaign Types ──
export const CampaignType = z.enum(["cold", "seo", "social", "community", "paid"]);
export type CampaignType = z.infer<typeof CampaignType>;

export const CampaignChannel = z.enum([
  "email",
  "twitter",
  "linkedin",
  "reddit",
  "hacker_news",
  "indie_hackers",
  "blog",
  "medium",
  "devto",
  "google_ads",
  "other",
]);
export type CampaignChannel = z.infer<typeof CampaignChannel>;

export const CampaignStatus = z.enum([
  "draft",
  "scheduled",
  "active",
  "paused",
  "completed",
  "cancelled",
]);
export type CampaignStatus = z.infer<typeof CampaignStatus>;

export const CampaignMetricsSchema = z.object({
  impressions: z.number().int().default(0),
  clicks: z.number().int().default(0),
  conversions: z.number().int().default(0),
  cost: z.number().default(0),
  revenue: z.number().default(0),
});
export type CampaignMetrics = z.infer<typeof CampaignMetricsSchema>;

export const CampaignSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: CampaignType,
  channel: CampaignChannel,
  lead_magnet_id: z.string().uuid().nullable(),
  saas_product_id: z.string().uuid().nullable(),
  status: CampaignStatus.default("draft"),
  metrics: CampaignMetricsSchema.nullable(),
  config: z.record(z.unknown()).nullable(),
  started_at: z.string().datetime().nullable(),
  ended_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Campaign = z.infer<typeof CampaignSchema>;

export type CampaignInsert = Omit<Campaign, "id" | "created_at" | "updated_at">;
