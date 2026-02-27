import { z } from "zod";

// ── Interaction Types ──
export const InteractionType = z.enum([
  "email_open",
  "email_click",
  "email_reply",
  "email_bounce",
  "email_unsubscribe",
  "page_view",
  "form_submit",
  "course_step_complete",
  "course_complete",
  "content_download",
  "trial_signup",
  "demo_request",
  "social_engage",
]);
export type InteractionType = z.infer<typeof InteractionType>;

export const InteractionSchema = z.object({
  id: z.string().uuid(),
  lead_id: z.string().uuid(),
  type: InteractionType,
  metadata: z.record(z.unknown()).nullable(),
  campaign_id: z.string().uuid().nullable(),
  content_id: z.string().uuid().nullable(),
  timestamp: z.string().datetime(),
});
export type Interaction = z.infer<typeof InteractionSchema>;

export type InteractionInsert = Omit<Interaction, "id">;
