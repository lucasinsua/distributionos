import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { LandingPageService } from "../services/landing-page-service.js";

export function registerGenerateLandingPage(server: McpServer): void {
  server.tool(
    "generate_landing_page",
    "Builds and deploys an Astro landing page for a lead magnet. Includes headline, " +
      "pain-point narrative, social proof, email capture form, and thank-you page. " +
      "Deploys to Cloudflare Pages via git push.",
    {
      lead_magnet_id: z.string().uuid().describe("ID of the lead magnet to create a page for"),
      headline: z.string().optional().describe("Custom headline (auto-generated if not provided)"),
      subheadline: z.string().optional().describe("Custom subheadline"),
      cta_text: z.string().default("Get Free Access").describe("Call-to-action button text"),
      generate_variants: z
        .boolean()
        .default(true)
        .describe("Generate A/B test variants for headline"),
      subdomain_path: z
        .string()
        .optional()
        .describe("Custom path for the page (e.g., 'email-course-name')"),
    },
    async ({ lead_magnet_id, headline, subheadline, cta_text, generate_variants, subdomain_path }) => {
      const service = new LandingPageService();
      const result = await service.generate({
        leadMagnetId: lead_magnet_id,
        headline,
        subheadline,
        ctaText: cta_text,
        generateVariants: generate_variants,
        subdomainPath: subdomain_path,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
}
