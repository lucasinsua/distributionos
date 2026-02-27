/**
 * Hunter.io API client for email finding and verification.
 * Requires HUNTER_API_KEY environment variable.
 * Docs: https://hunter.io/api-documentation/v2
 */

const HUNTER_API_BASE = "https://api.hunter.io/v2";

interface HunterEmailVerifyResponse {
  data: {
    status: "valid" | "invalid" | "accept_all" | "webmail" | "disposable" | "unknown";
    score: number;
    email: string;
    regexp: boolean;
    gibberish: boolean;
    disposable: boolean;
    webmail: boolean;
    mx_records: boolean;
    smtp_server: boolean;
    smtp_check: boolean;
    accept_all: boolean;
    block: boolean;
    sources: Array<{
      domain: string;
      uri: string;
      extracted_on: string;
      last_seen_on: string;
    }>;
  };
}

interface HunterDomainSearchResponse {
  data: {
    domain: string;
    disposable: boolean;
    webmail: boolean;
    accept_all: boolean;
    pattern: string | null;
    organization: string | null;
    country: string | null;
    state: string | null;
    emails: Array<{
      value: string;
      type: "personal" | "generic";
      confidence: number;
      first_name: string | null;
      last_name: string | null;
      position: string | null;
      seniority: string | null;
      department: string | null;
      linkedin: string | null;
      twitter: string | null;
    }>;
  };
}

interface HunterEmailFinderResponse {
  data: {
    first_name: string;
    last_name: string;
    email: string;
    score: number;
    domain: string;
    accept_all: boolean;
    position: string | null;
    twitter: string | null;
    linkedin_url: string | null;
    phone_number: string | null;
    company: string | null;
  };
}

function getApiKey(): string {
  const key = process.env.HUNTER_API_KEY;
  if (!key) throw new Error("HUNTER_API_KEY environment variable is required");
  return key;
}

/**
 * Verify if an email address is valid and deliverable.
 */
export async function verifyEmail(email: string): Promise<{
  valid: boolean;
  score: number;
  disposable: boolean;
  webmail: boolean;
}> {
  const params = new URLSearchParams({
    email,
    api_key: getApiKey(),
  });

  const res = await fetch(`${HUNTER_API_BASE}/email-verifier?${params}`);
  if (!res.ok) throw new Error(`Hunter API error: ${res.status}`);

  const data = (await res.json()) as HunterEmailVerifyResponse;

  return {
    valid: data.data.status === "valid" || data.data.status === "accept_all",
    score: data.data.score,
    disposable: data.data.disposable,
    webmail: data.data.webmail,
  };
}

/**
 * Search for email addresses associated with a domain.
 */
export async function searchDomainEmails(
  domain: string,
  options: {
    type?: "personal" | "generic";
    seniority?: string;
    department?: string;
    limit?: number;
  } = {}
): Promise<{
  domain: string;
  organization: string | null;
  pattern: string | null;
  emails: Array<{
    email: string;
    firstName: string | null;
    lastName: string | null;
    position: string | null;
    seniority: string | null;
    department: string | null;
    confidence: number;
    linkedinUrl: string | null;
    twitterHandle: string | null;
  }>;
}> {
  const params = new URLSearchParams({
    domain,
    api_key: getApiKey(),
    limit: String(options.limit ?? 10),
  });

  if (options.type) params.set("type", options.type);
  if (options.seniority) params.set("seniority", options.seniority);
  if (options.department) params.set("department", options.department);

  const res = await fetch(`${HUNTER_API_BASE}/domain-search?${params}`);
  if (!res.ok) throw new Error(`Hunter API error: ${res.status}`);

  const data = (await res.json()) as HunterDomainSearchResponse;

  return {
    domain: data.data.domain,
    organization: data.data.organization,
    pattern: data.data.pattern,
    emails: data.data.emails.map((e) => ({
      email: e.value,
      firstName: e.first_name,
      lastName: e.last_name,
      position: e.position,
      seniority: e.seniority,
      department: e.department,
      confidence: e.confidence,
      linkedinUrl: e.linkedin,
      twitterHandle: e.twitter,
    })),
  };
}

/**
 * Find the most likely email for a person at a company.
 */
export async function findEmail(
  domain: string,
  firstName: string,
  lastName: string
): Promise<{
  email: string;
  score: number;
  position: string | null;
  linkedinUrl: string | null;
  twitterHandle: string | null;
} | null> {
  const params = new URLSearchParams({
    domain,
    first_name: firstName,
    last_name: lastName,
    api_key: getApiKey(),
  });

  const res = await fetch(`${HUNTER_API_BASE}/email-finder?${params}`);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Hunter API error: ${res.status}`);
  }

  const data = (await res.json()) as HunterEmailFinderResponse;

  if (!data.data.email) return null;

  return {
    email: data.data.email,
    score: data.data.score,
    position: data.data.position,
    linkedinUrl: data.data.linkedin_url,
    twitterHandle: data.data.twitter,
  };
}
