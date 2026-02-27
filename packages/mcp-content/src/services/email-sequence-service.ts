import { getSupabaseClient, generateContent, type Database } from "@prospecting-engine/shared";

type LeadMagnetRow = Database["public"]["Tables"]["lead_magnets"]["Row"];
type SaasProductRow = Database["public"]["Tables"]["saas_products"]["Row"];
type EmailSequenceRow = Database["public"]["Tables"]["email_sequences"]["Row"];

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
      .returns<LeadMagnetRow[]>()
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
        .returns<SaasProductRow[]>()
        .single();
      product = data;
    }

    // Generate email steps based on type using Claude AI
    const steps = await this.generateSteps(input, magnet, product);

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
      .returns<EmailSequenceRow[]>()
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

  private async generateSteps(
    input: GenerateInput,
    magnet: Record<string, unknown>,
    product: Record<string, unknown> | null
  ): Promise<Array<{ stepNumber: number; subject: string; body: string; delayDays: number }>> {
    const steps: Array<{ stepNumber: number; subject: string; body: string; delayDays: number }> = [];
    const productName = (product?.name as string) ?? "our tool";
    const topic = magnet.topic as string;
    const audience = (magnet.target_audience as string) ?? "professionals";

    const delayMap: Record<string, (i: number, length: number) => number> = {
      course: (i) => (i === 1 ? 0 : 1),
      nurture: (i) => (i === 1 ? 3 : 4),
      cold: (i) => (i === 1 ? 0 : i === 2 ? 3 : 5),
    };

    const getDelay = delayMap[input.type] ?? ((i: number) => (i === 1 ? 0 : 2));

    const systemPrompt =
      "You are an expert email copywriter. Generate email content for a drip sequence.";

    for (let i = 1; i <= input.length; i++) {
      const delayDays = getDelay(i, input.length);

      try {
        const userPrompt = [
          `Generate email step ${i} of ${input.length} for a ${input.type} email sequence.`,
          "",
          `Topic: ${topic}`,
          `Sequence type: ${input.type}`,
          `Product name: ${productName}`,
          `Target audience: ${audience}`,
          `Step ${i} of ${input.length}`,
          "",
          i === 1 ? "This is the opening email. Make it welcoming and set expectations." : "",
          i === input.length && input.includeUpsell
            ? `This is the final email. Include a soft upsell for ${productName}.`
            : "",
          "",
          "Respond in this exact format:",
          "SUBJECT: <the subject line>",
          "BODY:",
          "<the email body>",
        ]
          .filter(Boolean)
          .join("\n");

        const result = await generateContent(systemPrompt, userPrompt, {
          temperature: 0.7,
          maxTokens: 1024,
        });

        const text = result.text.trim();
        const subjectMatch = text.match(/^SUBJECT:\s*(.+)/m);
        const bodyMatch = text.match(/BODY:\s*\n?([\s\S]+)/m);

        const subject = subjectMatch?.[1]?.trim() ?? `${topic} — Email ${i}`;
        const body = bodyMatch?.[1]?.trim() ?? text;

        steps.push({ stepNumber: i, subject, body, delayDays });
      } catch {
        // Fall back to placeholder content on failure
        steps.push({
          stepNumber: i,
          subject: this.fallbackSubject(input.type, topic, productName, i, input.length),
          body: this.fallbackBody(input.type, topic, productName, i, input.length, input.includeUpsell),
          delayDays,
        });
      }
    }

    return steps;
  }

  private fallbackSubject(
    type: string,
    topic: string,
    productName: string,
    step: number,
    total: number
  ): string {
    switch (type) {
      case "course":
        return step === 1
          ? `Welcome! Your ${topic} course starts now`
          : `Day ${step}: ${topic} — Lesson ${step}`;
      case "nurture": {
        const nurtureSubs = [
          `How ${topic} is changing in 2026`,
          `3 mistakes most people make with ${topic}`,
          `Case study: How Company X solved ${topic}`,
          `Quick tip: Improve your ${topic} results today`,
          `You might like this: ${productName}`,
        ];
        return nurtureSubs[step - 1] ?? `${topic} — Email ${step}`;
      }
      case "cold": {
        const coldSubs = [
          `Quick question about ${topic}`,
          `Re: ${topic} at {{company}}`,
          `Thought you'd find this useful`,
        ];
        return coldSubs[step - 1] ?? `${topic} — Email ${step}`;
      }
      default:
        return `${topic} — Email ${step}`;
    }
  }

  private fallbackBody(
    type: string,
    topic: string,
    productName: string,
    step: number,
    total: number,
    includeUpsell: boolean
  ): string {
    switch (type) {
      case "course":
        if (step === 1) return `[Welcome email: set expectations, deliver first lesson, build excitement]`;
        if (step === total && includeUpsell) return `[Final lesson + soft pitch for ${productName}]`;
        return `[Lesson ${step} content about ${topic}]`;
      case "nurture":
        return `[Nurture email ${step}: value-first content about ${topic}]`;
      case "cold":
        return `[Cold email ${step}: personalized, value-first, links to lead magnet]`;
      default:
        return `[Email ${step} about ${topic}]`;
    }
  }
}
