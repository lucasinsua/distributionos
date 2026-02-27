import { getSupabaseClient, type Database } from "@prospecting-engine/shared";

type LeadMagnetRow = Database["public"]["Tables"]["lead_magnets"]["Row"];
type SaasProductRow = Database["public"]["Tables"]["saas_products"]["Row"];

interface GenerateInput {
  topic: string;
  format: string;
  targetSaasProductId: string;
  title?: string;
  courseLength: number;
  targetAudience?: string;
}

interface GenerateResult {
  leadMagnetId: string;
  title: string;
  format: string;
  topic: string;
  contentPreview: string;
  contentData: Record<string, unknown>;
  status: string;
}

export class LeadMagnetService {
  /**
   * Generates a complete lead magnet based on pain-point research.
   * Uses Claude API to generate content, then stores in database.
   */
  async generate(input: GenerateInput): Promise<GenerateResult> {
    const db = getSupabaseClient();

    // Fetch the target SaaS product for context
    const { data: product } = await db
      .from("saas_products")
      .select("*")
      .eq("id", input.targetSaasProductId)
      .returns<SaasProductRow[]>()
      .single();

    const title = input.title ?? this.generateTitle(input.topic, input.format);
    let contentData: Record<string, unknown>;

    switch (input.format) {
      case "email_course":
        contentData = await this.generateEmailCourse(
          input.topic,
          input.courseLength,
          input.targetAudience,
          product
        );
        break;
      case "pdf_guide":
        contentData = await this.generatePdfGuide(
          input.topic,
          input.targetAudience,
          product
        );
        break;
      case "template_pack":
        contentData = await this.generateTemplatePack(
          input.topic,
          input.targetAudience,
          product
        );
        break;
      case "interactive_tool":
        contentData = await this.generateInteractiveTool(
          input.topic,
          product
        );
        break;
      default:
        contentData = { format: input.format, topic: input.topic };
    }

    // Store in database
    const { data: magnet, error } = await db
      .from("lead_magnets")
      .insert({
        title,
        type: input.format,
        topic: input.topic,
        description: `${input.format} about ${input.topic}`,
        target_saas_product_id: input.targetSaasProductId,
        status: "draft",
        content_data: contentData,
      })
      .select()
      .returns<LeadMagnetRow[]>()
      .single();

    if (error || !magnet) {
      throw new Error(`Failed to create lead magnet: ${error?.message}`);
    }

    return {
      leadMagnetId: magnet.id,
      title,
      format: input.format,
      topic: input.topic,
      contentPreview: JSON.stringify(contentData).slice(0, 500),
      contentData,
      status: "draft",
    };
  }

  private generateTitle(topic: string, format: string): string {
    const formatLabels: Record<string, string> = {
      email_course: "Free Email Course",
      pdf_guide: "The Complete Guide to",
      template_pack: "Template Pack:",
      interactive_tool: "Free Calculator:",
      mini_saas: "Free Tool:",
    };
    return `${formatLabels[format] ?? ""} ${topic}`;
  }

  private async generateEmailCourse(
    topic: string,
    length: number,
    audience: string | undefined,
    product: Record<string, unknown> | null
  ): Promise<Record<string, unknown>> {
    // In production: call Claude API to generate course content
    // Each lesson includes: subject line, body content, key takeaway, CTA
    const lessons = Array.from({ length }, (_, i) => ({
      day: i + 1,
      subject: `Day ${i + 1}: ${topic} — Lesson ${i + 1}`,
      body: `[AI-generated lesson content for day ${i + 1}]`,
      keyTakeaway: `[Key insight from lesson ${i + 1}]`,
      cta: i === length - 1
        ? `Ready to put this into practice? Try ${(product as Record<string, unknown> | null)?.name ?? "our tool"}`
        : "See you tomorrow for the next lesson!",
    }));

    return {
      format: "email_course",
      topic,
      targetAudience: audience ?? "general",
      totalLessons: length,
      lessons,
      welcomeEmail: {
        subject: `Welcome! Your ${topic} course starts now`,
        body: `[AI-generated welcome email]`,
      },
    };
  }

  private async generatePdfGuide(
    topic: string,
    audience: string | undefined,
    _product: Record<string, unknown> | null
  ): Promise<Record<string, unknown>> {
    // In production: generate structured guide content
    return {
      format: "pdf_guide",
      topic,
      targetAudience: audience ?? "general",
      sections: [
        { title: "Introduction", content: "[AI-generated introduction]" },
        { title: "The Problem", content: "[AI-generated problem statement]" },
        { title: "Step-by-Step Solution", content: "[AI-generated solution]" },
        { title: "Best Practices", content: "[AI-generated best practices]" },
        { title: "Next Steps", content: "[AI-generated next steps with soft CTA]" },
      ],
    };
  }

  private async generateTemplatePack(
    topic: string,
    audience: string | undefined,
    _product: Record<string, unknown> | null
  ): Promise<Record<string, unknown>> {
    return {
      format: "template_pack",
      topic,
      targetAudience: audience ?? "general",
      templates: [
        { name: `${topic} — Getting Started Template`, content: "[Template content]" },
        { name: `${topic} — Advanced Template`, content: "[Template content]" },
        { name: `${topic} — Checklist`, content: "[Checklist content]" },
      ],
    };
  }

  private async generateInteractiveTool(
    topic: string,
    _product: Record<string, unknown> | null
  ): Promise<Record<string, unknown>> {
    // In production: generate React component spec for calculator/tool
    return {
      format: "interactive_tool",
      topic,
      componentSpec: {
        inputs: [
          { name: "input1", type: "number", label: "[Dynamic based on topic]" },
          { name: "input2", type: "number", label: "[Dynamic based on topic]" },
        ],
        calculation: "[Formula based on topic]",
        outputs: [
          { name: "result", label: "[Result label]", format: "currency" },
        ],
      },
    };
  }
}
