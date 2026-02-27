/**
 * Resend email API client for transactional emails.
 * Requires RESEND_API_KEY environment variable.
 * Docs: https://resend.com/docs/api-reference
 */

const RESEND_API_BASE = "https://api.resend.com";

interface ResendEmailResponse {
  id: string;
}

interface ResendErrorResponse {
  statusCode: number;
  message: string;
  name: string;
}

export interface SendEmailInput {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}

export interface SendEmailResult {
  id: string;
  success: boolean;
  error?: string;
}

function getApiKey(): string {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY environment variable is required");
  return key;
}

/**
 * Send a single transactional email via Resend.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const res = await fetch(`${RESEND_API_BASE}/emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: input.from,
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      reply_to: input.replyTo,
      tags: input.tags,
    }),
  });

  if (!res.ok) {
    const err = (await res.json()) as ResendErrorResponse;
    return { id: "", success: false, error: `${err.name}: ${err.message}` };
  }

  const data = (await res.json()) as ResendEmailResponse;
  return { id: data.id, success: true };
}

/**
 * Send a batch of emails via Resend.
 */
export async function sendBatchEmails(
  emails: SendEmailInput[]
): Promise<SendEmailResult[]> {
  const res = await fetch(`${RESEND_API_BASE}/emails/batch`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      emails.map((e) => ({
        from: e.from,
        to: Array.isArray(e.to) ? e.to : [e.to],
        subject: e.subject,
        html: e.html,
        text: e.text,
        reply_to: e.replyTo,
        tags: e.tags,
      }))
    ),
  });

  if (!res.ok) {
    const err = (await res.json()) as ResendErrorResponse;
    return emails.map(() => ({ id: "", success: false, error: `${err.name}: ${err.message}` }));
  }

  const data = (await res.json()) as { data: ResendEmailResponse[] };
  return data.data.map((d) => ({ id: d.id, success: true }));
}
