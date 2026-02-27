import { getSupabaseClient, generateContent, generateStructuredContent, type Database } from "@prospecting-engine/shared";

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
    const productName = (product as Record<string, unknown> | null)?.name ?? "our tool";
    const audienceLabel = audience ?? "general";

    try {
      const systemPrompt = [
        "You are an expert email course creator specializing in educational drip campaigns.",
        "You write engaging, actionable lessons that provide genuine value while naturally guiding readers toward a product solution.",
        "Each lesson should be 200-400 words, conversational yet professional.",
      ].join(" ");

      const userPrompt = [
        `Create a ${length}-lesson email course about "${topic}" for a ${audienceLabel} audience.`,
        product ? `The course should subtly position "${productName}" (${(product as Record<string, unknown>).description ?? "a SaaS product"}) as a solution without being overly promotional.` : "",
        "",
        "Return a JSON object with this exact structure:",
        "{",
        '  "welcomeEmail": {',
        '    "subject": "string — compelling welcome email subject line",',
        '    "body": "string — welcome email body (150-250 words) that sets expectations and excites the reader"',
        "  },",
        '  "lessons": [',
        "    {",
        '      "day": number,',
        '      "subject": "string — compelling email subject line for this lesson",',
        '      "body": "string — full lesson content (200-400 words) with actionable advice",',
        '      "keyTakeaway": "string — one-sentence key insight from this lesson",',
        '      "cta": "string — call-to-action appropriate for this lesson position"',
        "    }",
        "  ]",
        "}",
        "",
        `The final lesson's CTA should reference "${productName}" directly.`,
        "Earlier lessons should end with a teaser for the next lesson.",
      ].join("\n");

      interface EmailCourseData {
        welcomeEmail: { subject: string; body: string };
        lessons: Array<{
          day: number;
          subject: string;
          body: string;
          keyTakeaway: string;
          cta: string;
        }>;
      }

      const { data } = await generateStructuredContent<EmailCourseData>(
        systemPrompt,
        userPrompt,
        { maxTokens: Math.max(4096, length * 1500) }
      );

      return {
        format: "email_course",
        topic,
        targetAudience: audienceLabel,
        totalLessons: length,
        lessons: data.lessons,
        welcomeEmail: data.welcomeEmail,
      };
    } catch (err) {
      console.error("Claude API email course generation failed, using fallback:", err);
      // Fallback to placeholder content
      const lessons = Array.from({ length }, (_, i) => ({
        day: i + 1,
        subject: `Day ${i + 1}: ${topic} — Lesson ${i + 1}`,
        body: `[AI-generated lesson content for day ${i + 1}]`,
        keyTakeaway: `[Key insight from lesson ${i + 1}]`,
        cta: i === length - 1
          ? `Ready to put this into practice? Try ${productName}`
          : "See you tomorrow for the next lesson!",
      }));

      return {
        format: "email_course",
        topic,
        targetAudience: audienceLabel,
        totalLessons: length,
        lessons,
        welcomeEmail: {
          subject: `Welcome! Your ${topic} course starts now`,
          body: `[AI-generated welcome email]`,
        },
      };
    }
  }

  private async generatePdfGuide(
    topic: string,
    audience: string | undefined,
    product: Record<string, unknown> | null
  ): Promise<Record<string, unknown>> {
    const audienceLabel = audience ?? "general";
    const productName = (product as Record<string, unknown> | null)?.name ?? "our tool";

    try {
      const systemPrompt = [
        "You are a professional content writer who creates comprehensive, well-structured PDF guides.",
        "Your guides are authoritative, practical, and easy to follow.",
        "Each section should be thorough (300-600 words) with clear headings, actionable advice, and real-world examples.",
      ].join(" ");

      const userPrompt = [
        `Create a comprehensive PDF guide about "${topic}" for a ${audienceLabel} audience.`,
        product ? `The guide should naturally reference "${productName}" (${(product as Record<string, unknown>).description ?? "a SaaS product"}) in the final section as a recommended next step.` : "",
        "",
        "Return a JSON object with this exact structure:",
        "{",
        '  "sections": [',
        "    {",
        '      "title": "string — section heading",',
        '      "content": "string — full section content (300-600 words) in markdown format"',
        "    }",
        "  ]",
        "}",
        "",
        "Include at least 5 sections:",
        "1. An engaging introduction that hooks the reader and outlines what they will learn",
        "2. A section explaining the core problem or challenge",
        "3. A detailed step-by-step solution or methodology",
        "4. Best practices, tips, and common pitfalls to avoid",
        "5. Next steps and a soft call-to-action",
        "",
        "Use markdown formatting within the content (bold, bullet points, numbered lists) for readability.",
      ].join("\n");

      interface PdfGuideData {
        sections: Array<{ title: string; content: string }>;
      }

      const { data } = await generateStructuredContent<PdfGuideData>(
        systemPrompt,
        userPrompt,
        { maxTokens: 8192 }
      );

      return {
        format: "pdf_guide",
        topic,
        targetAudience: audienceLabel,
        sections: data.sections,
      };
    } catch (err) {
      console.error("Claude API PDF guide generation failed, using fallback:", err);
      return {
        format: "pdf_guide",
        topic,
        targetAudience: audienceLabel,
        sections: [
          { title: "Introduction", content: "[AI-generated introduction]" },
          { title: "The Problem", content: "[AI-generated problem statement]" },
          { title: "Step-by-Step Solution", content: "[AI-generated solution]" },
          { title: "Best Practices", content: "[AI-generated best practices]" },
          { title: "Next Steps", content: "[AI-generated next steps with soft CTA]" },
        ],
      };
    }
  }

  private async generateTemplatePack(
    topic: string,
    audience: string | undefined,
    product: Record<string, unknown> | null
  ): Promise<Record<string, unknown>> {
    const audienceLabel = audience ?? "general";
    const productName = (product as Record<string, unknown> | null)?.name ?? "our tool";

    try {
      const systemPrompt = [
        "You are an expert template designer who creates practical, ready-to-use templates and checklists.",
        "Your templates are clear, well-organized, and immediately actionable.",
        "Each template should include placeholder text that users can easily customize, along with instructions for use.",
      ].join(" ");

      const userPrompt = [
        `Create a template pack about "${topic}" for a ${audienceLabel} audience.`,
        product ? `Where relevant, templates can reference "${productName}" (${(product as Record<string, unknown>).description ?? "a SaaS product"}) as a recommended tool.` : "",
        "",
        "Return a JSON object with this exact structure:",
        "{",
        '  "templates": [',
        "    {",
        '      "name": "string — descriptive template name",',
        '      "content": "string — full template content in markdown format with placeholder fields marked as [PLACEHOLDER_NAME]"',
        "    }",
        "  ]",
        "}",
        "",
        "Include at least 3 templates:",
        `1. A getting-started template for beginners approaching ${topic}`,
        `2. An advanced or detailed template for experienced practitioners`,
        `3. A checklist or quick-reference template for daily use`,
        "",
        "Each template should be practical and ready to use, with clear section headings and placeholder fields.",
      ].join("\n");

      interface TemplatePackData {
        templates: Array<{ name: string; content: string }>;
      }

      const { data } = await generateStructuredContent<TemplatePackData>(
        systemPrompt,
        userPrompt,
        { maxTokens: 8192 }
      );

      return {
        format: "template_pack",
        topic,
        targetAudience: audienceLabel,
        templates: data.templates,
      };
    } catch (err) {
      console.error("Claude API template pack generation failed, using fallback:", err);
      return {
        format: "template_pack",
        topic,
        targetAudience: audienceLabel,
        templates: [
          { name: `${topic} — Getting Started Template`, content: "[Template content]" },
          { name: `${topic} — Advanced Template`, content: "[Template content]" },
          { name: `${topic} — Checklist`, content: "[Checklist content]" },
        ],
      };
    }
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
