/**
 * Instantly.ai API client for cold email campaigns and domain warmup.
 * Requires INSTANTLY_API_KEY environment variable.
 * Docs: https://api.instantly.ai/api/v1/
 */

const INSTANTLY_API_BASE = "https://api.instantly.ai/api/v1";

// ── Response types ──────────────────────────────────────────────────────

interface InstantlyCreateCampaignResponse {
  campaign_id: string;
  status: string;
}

interface InstantlyAnalyticsResponse {
  campaign_id: string;
  sent: number;
  opened: number;
  replied: number;
  bounced: number;
}

interface InstantlyWarmupStatusResponse {
  email: string;
  status: string;
  warmup_day: number;
  daily_limit: number;
  bounce_rate: number;
  spam_rate: number;
  inbox_rate: number;
}

interface InstantlyAccountListResponse {
  accounts: Array<{
    email: string;
    warmup_day: number;
    daily_limit: number;
    warmup_status: string;
  }>;
}

interface InstantlyErrorResponse {
  error?: string;
  message?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.INSTANTLY_API_KEY;
  if (!key) throw new Error("INSTANTLY_API_KEY environment variable is required");
  return key;
}

async function instantlyFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${INSTANTLY_API_BASE}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      const err = (await res.json()) as InstantlyErrorResponse;
      detail = err.error ?? err.message ?? detail;
    } catch {
      // ignore parse failures
    }
    throw new Error(`Instantly API error (${path}): ${detail}`);
  }

  return (await res.json()) as T;
}

// ── Campaign functions ──────────────────────────────────────────────────

/**
 * Create a new cold email campaign in Instantly.
 */
export async function createInstantlyCampaign(params: {
  name: string;
  emailAccount: string[];
  sequences: Array<{
    steps: Array<{ subject: string; body: string; delay: number }>;
  }>;
}): Promise<{ campaignId: string; status: string }> {
  const data = await instantlyFetch<InstantlyCreateCampaignResponse>(
    "/campaign/create",
    {
      method: "POST",
      body: JSON.stringify({
        api_key: getApiKey(),
        name: params.name,
        email_account: params.emailAccount,
        sequences: params.sequences,
      }),
    },
  );

  return {
    campaignId: data.campaign_id,
    status: data.status,
  };
}

/**
 * Launch (activate) an existing campaign.
 */
export async function launchInstantlyCampaign(
  campaignId: string,
): Promise<{ success: boolean }> {
  await instantlyFetch<{ status: string }>("/campaign/launch", {
    method: "POST",
    body: JSON.stringify({
      api_key: getApiKey(),
      campaign_id: campaignId,
    }),
  });

  return { success: true };
}

/**
 * Retrieve analytics (sent, opened, replied, bounced) for a campaign.
 */
export async function getCampaignAnalytics(
  campaignId: string,
): Promise<{
  sent: number;
  opened: number;
  replied: number;
  bounced: number;
}> {
  const params = new URLSearchParams({
    api_key: getApiKey(),
    campaign_id: campaignId,
  });

  const data = await instantlyFetch<InstantlyAnalyticsResponse>(
    `/campaign/analytics?${params}`,
  );

  return {
    sent: data.sent,
    opened: data.opened,
    replied: data.replied,
    bounced: data.bounced,
  };
}

// ── Warmup functions ────────────────────────────────────────────────────

/**
 * Start warmup on an email account.
 */
export async function startAccountWarmup(
  email: string,
): Promise<{ success: boolean }> {
  await instantlyFetch<{ status: string }>("/account/warmup/start", {
    method: "POST",
    body: JSON.stringify({
      api_key: getApiKey(),
      email,
    }),
  });

  return { success: true };
}

/**
 * Get the current warmup status for an email account.
 */
export async function getWarmupStatus(
  email: string,
): Promise<{
  status: string;
  warmupDay: number;
  dailyLimit: number;
  bounceRate: number;
  spamRate: number;
  inboxRate: number;
}> {
  const params = new URLSearchParams({
    api_key: getApiKey(),
    email,
  });

  const data = await instantlyFetch<InstantlyWarmupStatusResponse>(
    `/account/warmup/status?${params}`,
  );

  return {
    status: data.status,
    warmupDay: data.warmup_day,
    dailyLimit: data.daily_limit,
    bounceRate: data.bounce_rate,
    spamRate: data.spam_rate,
    inboxRate: data.inbox_rate,
  };
}

/**
 * Pause warmup on an email account.
 */
export async function pauseAccountWarmup(
  email: string,
): Promise<{ success: boolean }> {
  await instantlyFetch<{ status: string }>("/account/warmup/pause", {
    method: "POST",
    body: JSON.stringify({
      api_key: getApiKey(),
      email,
    }),
  });

  return { success: true };
}

/**
 * Resume warmup on a previously paused email account.
 */
export async function resumeAccountWarmup(
  email: string,
): Promise<{ success: boolean }> {
  await instantlyFetch<{ status: string }>("/account/warmup/resume", {
    method: "POST",
    body: JSON.stringify({
      api_key: getApiKey(),
      email,
    }),
  });

  return { success: true };
}

/**
 * List all email accounts with their warmup status.
 * Returns accounts that are ready (warmupDay >= 21) flagged with isReady.
 */
export async function listWarmedAccounts(): Promise<
  Array<{
    email: string;
    warmupDay: number;
    dailyLimit: number;
    isReady: boolean;
  }>
> {
  const params = new URLSearchParams({
    api_key: getApiKey(),
  });

  const data = await instantlyFetch<InstantlyAccountListResponse>(
    `/account/warmup/list?${params}`,
  );

  return data.accounts.map((a) => ({
    email: a.email,
    warmupDay: a.warmup_day,
    dailyLimit: a.daily_limit,
    isReady: a.warmup_day >= 21,
  }));
}
