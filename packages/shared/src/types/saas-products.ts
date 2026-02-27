import { z } from "zod";

// ── ICP (Ideal Customer Profile) ──
export const ICPCriteriaSchema = z.object({
  industries: z.array(z.string()).default([]),
  company_sizes: z.array(z.string()).default([]),
  roles: z.array(z.string()).default([]),
  tech_stack: z.array(z.string()).default([]),
  geographies: z.array(z.string()).default([]),
  funding_stages: z.array(z.string()).default([]),
  pain_points: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
});
export type ICPCriteria = z.infer<typeof ICPCriteriaSchema>;

// ── SaaS Product ──
export const SaasProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  domain: z.string().nullable(),
  icp_criteria: ICPCriteriaSchema,
  active: z.boolean().default(true),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type SaasProduct = z.infer<typeof SaasProductSchema>;

export type SaasProductInsert = Omit<SaasProduct, "id" | "created_at" | "updated_at">;
