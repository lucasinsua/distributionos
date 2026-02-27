import type { APIRoute } from "astro";
import { getSupabaseClient, sendEmail } from "@prospecting-engine/shared";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, leadMagnetId, source } = body as {
      email?: string;
      leadMagnetId?: string;
      source?: string;
    };

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Valid email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const db = getSupabaseClient();

    // Upsert lead (don't fail if already exists)
    const { data: lead } = await db
      .from("leads")
      .upsert(
        {
          email,
          source_channel: "lead_magnet",
          source_campaign: source ?? "landing_page",
          status: "new",
        },
        { onConflict: "email" }
      )
      .select("id")
      .single();

    // Record the form submission interaction
    if (lead) {
      await db.from("interactions").insert({
        lead_id: lead.id,
        type: "form_submit",
        metadata: {
          lead_magnet_id: leadMagnetId ?? null,
          source: source ?? "landing_page",
        },
      });
    }

    // If a lead magnet is specified, fetch it and send the first email
    if (leadMagnetId) {
      const { data: magnet } = await db
        .from("lead_magnets")
        .select("title, type, content_data")
        .eq("id", leadMagnetId)
        .single();

      if (magnet) {
        try {
          await sendEmail({
            from: "hello@notifications.yourdomain.com",
            to: email,
            subject: `Here's your free resource: ${magnet.title}`,
            html: `
              <h1>Welcome!</h1>
              <p>Thanks for signing up. Here's your free resource: <strong>${magnet.title}</strong>.</p>
              <p>Check your inbox over the next few days for more great content.</p>
            `,
            tags: [
              { name: "type", value: "lead_magnet_delivery" },
              { name: "lead_magnet_id", value: leadMagnetId },
            ],
          });
        } catch {
          // Email delivery failure is non-fatal
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
