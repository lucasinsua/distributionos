import { getSupabaseClient } from "@prospecting-engine/shared";

interface GenerateInput {
  leadMagnetId: string;
  length: number;
  type: string;
  saasProductId?: string;
  includeUpsell: boolean;
}

interface GenerateResult {
  sequenceId: string;
  name: string;
  type: string;
  totalSteps: number;
  steps: Array<{
    stepNumber: number;
    subject: string;
    bodyPreview: string;
    delayDays: number;
  }>;
  status: string;
}

export class EmailSequenceService {
  /**
   * Creates a drip email sequence tied to a lead magnet.
   * Supports course delivery, nurture, and cold outreach templates.
   */
  async generate(input: GenerateInput): Promise<GenerateResult> {
    const db = getSupabaseClient();

    // Fetch lead magnet for context
    const { data: magnet } = await db
      .from("lead_magnets")
      .select("*")
      .eq("id", input.leadMagnetId)
      .single();

    if (!magnet) {
      throw new Error("Lead magnet not found");
    }

    let product = null;
    const productId = input.saasProductId ?? magnet.target_saas_product_id;
    if (productId) {
      const { data } = await db
        .from("saas_products")
        .select("*")
        .eq("id", productId)
        .single();
      product = data;
    }

    // Generate email steps based on type
    const steps = this.generateSteps(input, magnet, product);

    const name = `${magnet.title} — ${input.type} sequence`;

    // Store sequence
    const { data: sequence, error } = await db
      .from("email_sequences")
      .insert({
        name,
        type: input.type,
        saas_product_id: productId,
        lead_magnet_id: input.leadMagnetId,
        steps: steps.map((s) => ({
          step_number: s.stepNumber,
          subject: s.subject,
          body: s.body,
          delay_days: s.delayDays,
        })),
        active: true,
      })
      .select()
      .single();

    if (error || !sequence) {
      throw new Error(`Failed to create sequence: ${error?.message}`);
    }

    return {
      sequenceId: sequence.id,
      name,
      type: input.type,
      totalSteps: steps.length,
      steps: steps.map((s) => ({
        stepNumber: s.stepNumber,
        subject: s.subject,
        bodyPreview: s.body.slice(0, 200),
        delayDays: s.delayDays,
      })),
      status: "active",
    };
  }

  private generateSteps(
    input: GenerateInput,
    magnet: Record<string, unknown>,
    product: Record<string, unknown> | null
  ): Array<{ stepNumber: number; subject: string; body: string; delayDays: number }> {
    const steps: Array<{ stepNumber: number; subject: string; body: string; delayDays: number }> = [];
    const productName = (product?.name as string) ?? "our tool";
    const topic = magnet.topic as string;

    switch (input.type) {
      case "course":
        for (let i = 1; i <= input.length; i++) {
          const isLast = i === input.length;
          steps.push({
            stepNumber: i,
            subject: i === 1
              ? `Welcome! Your ${topic} course starts now`
              : `Day ${i}: ${topic} — Lesson ${i}`,
            body: i === 1
              ? `[Welcome email: set expectations, deliver first lesson, build excitement]`
              : isLast && input.includeUpsell
                ? `[Final lesson + soft pitch for ${productName}]`
                : `[Lesson ${i} content about ${topic}]`,
            delayDays: i === 1 ? 0 : 1,
          });
        }
        break;

      case "nurture":
        const nurtureSubs = [
          `How ${topic} is changing in 2026`,
          `3 mistakes most people make with ${topic}`,
          `Case study: How Company X solved ${topic}`,
          `Quick tip: Improve your ${topic} results today`,
          `You might like this: ${productName}`,
        ];
        for (let i = 0; i < Math.min(input.length, nurtureSubs.length); i++) {
          steps.push({
            stepNumber: i + 1,
            subject: nurtureSubs[i]!,
            body: `[Nurture email ${i + 1}: value-first content about ${topic}]`,
            delayDays: i === 0 ? 3 : 4,
          });
        }
        break;

      case "cold":
        const coldSubs = [
          `Quick question about ${topic}`,
          `Re: ${topic} at {{company}}`,
          `Thought you'd find this useful`,
        ];
        for (let i = 0; i < Math.min(input.length, coldSubs.length); i++) {
          steps.push({
            stepNumber: i + 1,
            subject: coldSubs[i]!,
            body: `[Cold email ${i + 1}: personalized, value-first, links to lead magnet]`,
            delayDays: i === 0 ? 0 : i === 1 ? 3 : 5,
          });
        }
        break;
    }

    return steps;
  }
}
