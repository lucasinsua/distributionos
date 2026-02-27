import { getSupabaseClient } from "@prospecting-engine/shared";

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
      .single();

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
        .limit(1);

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

    // In production: call Loops.so or ConvertKit API
    // Loops: POST https://app.loops.so/api/v1/transactional
    // ConvertKit: POST https://api.convertkit.com/v3/sequences/{id}/subscribe

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
