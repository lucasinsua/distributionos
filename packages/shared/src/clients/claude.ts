/**
 * Claude API client for content generation.
 * Requires ANTHROPIC_API_KEY environment variable.
 * Docs: https://docs.anthropic.com/en/api
 */

const CLAUDE_API_BASE = "https://api.anthropic.com/v1";

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

interface ClaudeResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: Array<{
    type: "text";
    text: string;
  }>;
  model: string;
  stop_reason: "end_turn" | "max_tokens" | "stop_sequence";
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

function getApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY environment variable is required");
  return key;
}

/**
 * Generate content using Claude API.
 */
export async function generateContent(
  systemPrompt: string,
  userPrompt: string,
  options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const res = await fetch(`${CLAUDE_API_BASE}/messages`, {
    method: "POST",
    headers: {
      "x-api-key": getApiKey(),
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model ?? "claude-sonnet-4-20250514",
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature ?? 0.7,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }] satisfies ClaudeMessage[],
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Claude API error: ${res.status} — ${errorBody}`);
  }

  const data = (await res.json()) as ClaudeResponse;
  const text = data.content.map((c) => c.text).join("");

  return {
    text,
    inputTokens: data.usage.input_tokens,
    outputTokens: data.usage.output_tokens,
  };
}

/**
 * Generate a structured JSON response from Claude.
 */
export async function generateStructuredContent<T>(
  systemPrompt: string,
  userPrompt: string,
  options: {
    model?: string;
    maxTokens?: number;
  } = {}
): Promise<{ data: T; inputTokens: number; outputTokens: number }> {
  const result = await generateContent(
    systemPrompt + "\n\nRespond with valid JSON only. No markdown, no explanation.",
    userPrompt,
    { ...options, temperature: 0.3 }
  );

  // Extract JSON from response (handle potential markdown wrapping)
  let jsonStr = result.text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const data = JSON.parse(jsonStr) as T;

  return {
    data,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  };
}
