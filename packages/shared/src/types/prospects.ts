import { z } from "zod";

// ── Pain Point ──
export const PainPointSchema = z.object({
  id: z.string().uuid(),
  topic: z.string(),
  description: z.string(),
  source: z.string(),
  source_url: z.string().url().nullable(),
  frequency_score: z.number().min(0).max(100).default(0),
  recency_score: z.number().min(0).max(100).default(0),
  alignment_score: z.number().min(0).max(100).default(0),
  composite_score: z.number().min(0).max(100).default(0),
  saas_product_id: z.string().uuid().nullable(),
  cluster_id: z.string().nullable(),
  raw_signals: z.array(z.record(z.unknown())).default([]),
  created_at: z.string().datetime(),
});
export type PainPoint = z.infer<typeof PainPointSchema>;

// ── Prospect List ──
export const ProspectListSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  icp_criteria: z.record(z.unknown()),
  sources: z.array(z.string()),
  total_prospects: z.number().int().default(0),
  status: z.enum(["building", "ready", "in_use", "exhausted"]).default("building"),
  saas_product_id: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type ProspectList = z.infer<typeof ProspectListSchema>;

// ── Signal Monitoring ──
export const SignalSchema = z.object({
  id: z.string().uuid(),
  type: z.enum([
    "job_posting",
    "funding_event",
    "tech_adoption",
    "competitor_mention",
    "pain_point_expression",
    "product_launch",
    "review_complaint",
    "social_mention",
  ]),
  source: z.string(),
  source_url: z.string().url().nullable(),
  content: z.string(),
  entity_name: z.string().nullable(),
  entity_domain: z.string().nullable(),
  relevance_score: z.number().min(0).max(100).default(0),
  keywords_matched: z.array(z.string()).default([]),
  processed: z.boolean().default(false),
  lead_id: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
});
export type Signal = z.infer<typeof SignalSchema>;
