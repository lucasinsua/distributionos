import { z } from "zod";

// ── Lead Status ──
export const LeadStatus = z.enum([
  "new",
  "nurturing",
  "qualified",
  "converted",
  "lost",
]);
export type LeadStatus = z.infer<typeof LeadStatus>;

// ── Lead Source Channels ──
export const SourceChannel = z.enum([
  "seo",
  "social_twitter",
  "social_linkedin",
  "community_reddit",
  "community_hn",
  "community_indie_hackers",
  "community_discord",
  "cold_email",
  "lead_magnet",
  "referral",
  "paid_ads",
  "direct",
  "other",
]);
export type SourceChannel = z.infer<typeof SourceChannel>;

// ── Lead ──
export const LeadSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  company_id: z.string().uuid().nullable(),
  role: z.string().nullable(),
  source_channel: SourceChannel,
  source_campaign: z.string().nullable(),
  lead_score: z.number().int().min(0).max(100).default(0),
  fit_score: z.number().int().min(0).max(40).default(0),
  intent_score: z.number().int().min(0).max(35).default(0),
  engagement_score: z.number().int().min(0).max(25).default(0),
  status: LeadStatus.default("new"),
  assigned_saas_product_id: z.string().uuid().nullable(),
  enrichment_data: z.record(z.unknown()).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Lead = z.infer<typeof LeadSchema>;

export type LeadInsert = Omit<Lead, "id" | "created_at" | "updated_at">;

// ── Company ──
export const CompanySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  domain: z.string().nullable(),
  industry: z.string().nullable(),
  employee_count: z.number().int().nullable(),
  tech_stack: z.array(z.string()).default([]),
  funding_stage: z.string().nullable(),
  annual_revenue_est: z.number().nullable(),
  enrichment_data: z.record(z.unknown()).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Company = z.infer<typeof CompanySchema>;

export type CompanyInsert = Omit<Company, "id" | "created_at" | "updated_at">;
