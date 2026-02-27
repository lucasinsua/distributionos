import { getSupabaseClient } from "@prospecting-engine/shared";

interface GenerateInput {
  leadMagnetId: string;
  headline?: string;
  subheadline?: string;
  ctaText: string;
  generateVariants: boolean;
  subdomainPath?: string;
}

interface GenerateResult {
  leadMagnetId: string;
  pageUrl: string | null;
  headline: string;
  variants: Array<{ headline: string; subheadline: string }>;
  htmlPreview: string;
  deployed: boolean;
}

export class LandingPageService {
  /**
   * Generates and optionally deploys an Astro landing page for a lead magnet.
   *
   * The page includes:
   * - Headline + subhead optimized for target audience (A/B variants)
   * - Pain point → solution narrative
   * - Social proof section
   * - Email capture form connected to ESP
   * - Thank-you page with immediate delivery + upsell
   */
  async generate(input: GenerateInput): Promise<GenerateResult> {
    const db = getSupabaseClient();

    // Fetch lead magnet details
    const { data: magnet, error } = await db
      .from("lead_magnets")
      .select("*, saas_products:target_saas_product_id(*)")
      .eq("id", input.leadMagnetId)
      .single();

    if (error || !magnet) {
      throw new Error(`Lead magnet not found: ${error?.message}`);
    }

    const headline = input.headline ?? `Master ${magnet.topic} — Free ${magnet.type.replace("_", " ")}`;
    const subheadline = input.subheadline ??
      `Join thousands of professionals who've transformed their approach to ${magnet.topic}`;

    // Generate A/B variants
    const variants = input.generateVariants
      ? this.generateHeadlineVariants(magnet.topic, magnet.type)
      : [{ headline, subheadline }];

    // Generate the Astro page HTML
    const html = this.generateAstroPage({
      title: magnet.title,
      headline,
      subheadline,
      ctaText: input.ctaText,
      topic: magnet.topic,
      format: magnet.type,
    });

    const slug = input.subdomainPath ?? this.slugify(magnet.title);

    // Store as content record
    await db.from("content").insert({
      type: "landing_page",
      title: magnet.title,
      body: html,
      platform: "blog",
      saas_product_id: magnet.target_saas_product_id,
      status: "draft",
    });

    // Update lead magnet with landing page URL
    const pageUrl = `https://learn.yourdomain.com/${slug}`;
    await db
      .from("lead_magnets")
      .update({ landing_page_url: pageUrl })
      .eq("id", input.leadMagnetId);

    return {
      leadMagnetId: input.leadMagnetId,
      pageUrl,
      headline,
      variants,
      htmlPreview: html.slice(0, 1000) + "...",
      deployed: false, // Set to true after git push deploy
    };
  }

  private generateHeadlineVariants(
    topic: string,
    format: string
  ): Array<{ headline: string; subheadline: string }> {
    const formatLabel = format.replace("_", " ");
    return [
      {
        headline: `The ${topic} ${formatLabel} that 1,000+ professionals swear by`,
        subheadline: `Actionable strategies you can implement today — completely free`,
      },
      {
        headline: `Stop struggling with ${topic}. Start here.`,
        subheadline: `A step-by-step ${formatLabel} built from real-world experience`,
      },
      {
        headline: `Everything you need to know about ${topic}`,
        subheadline: `Free ${formatLabel} — no fluff, just results`,
      },
    ];
  }

  private generateAstroPage(params: {
    title: string;
    headline: string;
    subheadline: string;
    ctaText: string;
    topic: string;
    format: string;
  }): string {
    return `---
import Layout from '../layouts/Landing.astro';
---

<Layout title="${params.title}">
  <main class="landing">
    <section class="hero">
      <h1>${params.headline}</h1>
      <p class="subheadline">${params.subheadline}</p>

      <form id="capture-form" class="email-capture" data-topic="${params.topic}">
        <input
          type="email"
          name="email"
          placeholder="Enter your email"
          required
          aria-label="Email address"
        />
        <button type="submit">${params.ctaText}</button>
      </form>

      <p class="trust-signal">Join 1,000+ professionals. Unsubscribe anytime.</p>
    </section>

    <section class="pain-points">
      <h2>Sound familiar?</h2>
      <ul>
        <li>You're spending hours on ${params.topic} with no clear framework</li>
        <li>Existing resources are either too basic or too overwhelming</li>
        <li>You need actionable steps, not just theory</li>
      </ul>
    </section>

    <section class="solution">
      <h2>What you'll learn</h2>
      <p>This free ${params.format.replace("_", " ")} breaks down ${params.topic} into
         clear, actionable steps based on what actually works.</p>
    </section>

    <section class="social-proof">
      <h2>What people are saying</h2>
      <div class="testimonials">
        <blockquote>
          <p>"This completely changed how I approach ${params.topic}."</p>
        </blockquote>
      </div>
    </section>

    <section class="final-cta">
      <h2>Ready to get started?</h2>
      <form class="email-capture" data-topic="${params.topic}">
        <input type="email" name="email" placeholder="Enter your email" required />
        <button type="submit">${params.ctaText}</button>
      </form>
    </section>
  </main>
</Layout>

<script>
  document.querySelectorAll('.email-capture').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const email = formData.get('email');
      const topic = e.target.dataset.topic;

      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, topic }),
      });

      if (res.ok) {
        window.location.href = '/thank-you';
      }
    });
  });
</script>`;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }
}
