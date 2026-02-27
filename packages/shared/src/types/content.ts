import { z } from "zod";

// ── Lead Magnet Types ──
export const LeadMagnetType = z.enum([
  "email_course",
  "pdf_guide",
  "interactive_tool",
  "template_pack",
  "mini_saas",
]);
export type LeadMagnetType = z.infer<typeof LeadMagnetType>;

export const LeadMagnetStatus = z.enum(["draft", "active", "paused", "archived"]);
export type LeadMagnetStatus = z.infer<typeof LeadMagnetStatus>;

export const LeadMagnetSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  type: LeadMagnetType,
  topic: z.string(),
  description: z.string().nullable(),
  target_saas_product_id: z.string().uuid(),
  landing_page_url: z.string().url().nullable(),
  conversion_rate: z.number().min(0).max(1).default(0),
  total_signups: z.number().int().default(0),
  status: LeadMagnetStatus.default("draft"),
  content_data: z.record(z.unknown()).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type LeadMagnet = z.infer<typeof LeadMagnetSchema>;

export type LeadMagnetInsert = Omit<LeadMagnet, "id" | "created_at" | "updated_at">;

// ── Content ──
export const ContentType = z.enum([
  "article",
  "social_post",
  "community_reply",
  "email_copy",
  "landing_page",
]);
export type ContentType = z.infer<typeof ContentType>;

export const ContentPlatform = z.enum([
  "blog",
  "medium",
  "devto",
  "hashnode",
  "twitter",
  "linkedin",
  "reddit",
  "hacker_news",
  "indie_hackers",
  "other",
]);
export type ContentPlatform = z.infer<typeof ContentPlatform>;

export const ContentSchema = z.object({
  id: z.string().uuid(),
  type: ContentType,
  title: z.string().nullable(),
  body: z.string(),
  platform: ContentPlatform,
  url: z.string().url().nullable(),
  saas_product_id: z.string().uuid().nullable(),
  campaign_id: z.string().uuid().nullable(),
  performance_metrics: z.record(z.unknown()).nullable(),
  status: z.enum(["draft", "pending_review", "published", "archived"]).default("draft"),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Content = z.infer<typeof ContentSchema>;

export type ContentInsert = Omit<Content, "id" | "created_at" | "updated_at">;

// ── Email Sequences ──
export const EmailSequenceType = z.enum(["cold", "nurture", "course"]);
export type EmailSequenceType = z.infer<typeof EmailSequenceType>;

export const EmailStepSchema = z.object({
  step_number: z.number().int().min(1),
  subject: z.string(),
  body: z.string(),
  delay_days: z.number().int().min(0),
  variant: z.string().optional(),
});
export type EmailStep = z.infer<typeof EmailStepSchema>;

export const EmailSequenceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: EmailSequenceType,
  saas_product_id: z.string().uuid().nullable(),
  lead_magnet_id: z.string().uuid().nullable(),
  steps: z.array(EmailStepSchema),
  active: z.boolean().default(true),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type EmailSequence = z.infer<typeof EmailSequenceSchema>;

export type EmailSequenceInsert = Omit<EmailSequence, "id" | "created_at" | "updated_at">;
