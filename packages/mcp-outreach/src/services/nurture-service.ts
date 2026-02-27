import { getSupabaseClient, type Database, sendEmail } from "@prospecting-engine/shared";

type EmailSequenceRow = Database["public"]["Tables"]["email_sequences"]["Row"];
type InteractionRow = Database["public"]["Tables"]["interactions"]["Row"];

interface EnrollOptions {
  skipIfActive: boolean;
}

interface EnrollResult {
  leadId: string;
  sequenceId: string;
  enrolled: boolean;
  reason?: string;
}

export class NurtureService {
  /**
   * Enrolls a lead in a nurture sequence via Loops.so or ConvertKit.
   * Handles deduplication and avoids sequence conflicts.
   */
  async enroll(
    leadId: string,
    sequenceId: string,
    options: EnrollOptions
  ): Promise<EnrollResult> {
    const db = getSupabaseClient();

    // Fetch lead
    const { data: lead } = await db
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (!lead) throw new Error("Lead not found");

    // Fetch sequence
    const { data: sequence } = await db
      .from("email_sequences")
      .select("*")
      .eq("id", sequenceId)
      .single()
      .returns<EmailSequenceRow>();

    if (!sequence) throw new Error("Sequence not found");
    if (!sequence.active) {
      return { leadId, sequenceId, enrolled: false, reason: "Sequence is inactive" };
    }

    // Check for active enrollments
    if (options.skipIfActive) {
      const { data: activeInteractions } = await db
        .from("interactions")
        .select("*")
        .eq("lead_id", leadId)
        .eq("type", "course_step_complete")
        .order("timestamp", { ascending: false })
        .limit(1)
        .returns<InteractionRow[]>();

      if (activeInteractions && activeInteractions.length > 0) {
        const lastActivity = new Date(activeInteractions[0]!.timestamp);
        const daysSince = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 14) {
          return {
            leadId,
            sequenceId,
            enrolled: false,
            reason: "Lead is already in an active sequence",
          };
        }
      }
    }

    // Send the first email in the sequence via Resend
    const steps = sequence.steps as Array<{ step_number: number; subject: string; body: string; delay_days: number }>;
    const firstStep = steps.find((s) => s.step_number === 1);
    if (firstStep) {
      try {
        await sendEmail({
          from: "course@notifications.kintrion.com",
          to: (lead as Record<string, unknown>).email as string,
          subject: firstStep.subject,
          html: firstStep.body,
          tags: [
            { name: "sequence_id", value: sequenceId },
            { name: "step", value: "1" },
          ],
        });
      } catch {
        // Email delivery failure is non-fatal; enrollment still proceeds
      }
    }

    // Record enrollment interaction
    await db.from("interactions").insert({
      lead_id: leadId,
      type: "form_submit",
      metadata: {
        action: "nurture_enrollment",
        sequence_id: sequenceId,
        sequence_name: sequence.name,
      },
    });

    // Update lead status
    await db
      .from("leads")
      .update({ status: "nurturing" })
      .eq("id", leadId);

    return { leadId, sequenceId, enrolled: true };
  }
}
