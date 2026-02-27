import { getSupabaseClient, type Database } from "@prospecting-engine/shared";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type EmailSequenceRow = Database["public"]["Tables"]["email_sequences"]["Row"];

interface AssignResult {
  leadId: string;
  trackType: "single_product" | "portfolio" | "unassigned";
  assignedSequences: Array<{
    sequenceId: string;
    sequenceName: string;
    saasProductId: string;
  }>;
}

export class NurtureTrackService {
  /**
   * Assigns a lead to the right nurture track based on their SaaS product match.
   *
   * Single product match → enroll in that product's nurture sequence
   * Multiple matches → portfolio track that introduces all products sequentially
   * No match → generic value nurture
   */
  async assign(leadId: string, overrideProductId?: string): Promise<AssignResult> {
    const db = getSupabaseClient();

    const { data: lead } = await db
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .returns<LeadRow[]>()
      .single();

    if (!lead) throw new Error("Lead not found");

    const productId = overrideProductId ?? lead.assigned_saas_product_id;

    if (!productId) {
      return { leadId, trackType: "unassigned", assignedSequences: [] };
    }

    // Find nurture sequences for this product
    const { data: sequences } = await db
      .from("email_sequences")
      .select("*")
      .eq("saas_product_id", productId)
      .eq("type", "nurture")
      .eq("active", true)
      .returns<EmailSequenceRow[]>();

    if (!sequences || sequences.length === 0) {
      return { leadId, trackType: "unassigned", assignedSequences: [] };
    }

    // Pick the best sequence (first active one for now)
    const sequence = sequences[0]!;

    // Record the assignment
    await db.from("interactions").insert({
      lead_id: leadId,
      type: "form_submit",
      metadata: {
        action: "nurture_track_assigned",
        sequence_id: sequence.id,
        saas_product_id: productId,
      },
    });

    // Update lead status
    await db
      .from("leads")
      .update({ status: "nurturing", assigned_saas_product_id: productId })
      .eq("id", leadId);

    return {
      leadId,
      trackType: "single_product",
      assignedSequences: [
        {
          sequenceId: sequence.id,
          sequenceName: sequence.name,
          saasProductId: productId,
        },
      ],
    };
  }
}
