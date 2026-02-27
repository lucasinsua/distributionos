/**
 * Hacker News Algolia API client.
 * Free, no API key required.
 * Docs: https://hn.algolia.com/api
 */

const HN_API_BASE = "https://hn.algolia.com/api/v1";

interface HNHit {
  objectID: string;
  title?: string;
  story_text?: string;
  comment_text?: string;
  url?: string;
  author: string;
  points: number | null;
  num_comments: number | null;
  created_at: string;
  created_at_i: number;
  story_url?: string;
  parent_id?: number;
  _tags: string[];
}

interface HNSearchResponse {
  hits: HNHit[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
}

export interface HNResult {
  id: string;
  title: string | null;
  text: string;
  url: string | null;
  author: string;
  points: number;
  comments: number;
  createdAt: string;
  type: "story" | "comment";
}

/**
 * Search HN stories and comments. Pain-point patterns:
 * "is there a tool", "I wish", "frustrated", "looking for", "anyone know"
 */
export async function searchHN(
  query: string,
  options: {
    tags?: string; // e.g., "ask_hn", "show_hn", "comment", "story"
    numericFilters?: string; // e.g., "created_at_i>1700000000"
    hitsPerPage?: number;
    page?: number;
  } = {}
): Promise<HNResult[]> {
  const params = new URLSearchParams({
    query,
    hitsPerPage: String(options.hitsPerPage ?? 50),
    page: String(options.page ?? 0),
  });

  if (options.tags) params.set("tags", options.tags);
  if (options.numericFilters) params.set("numericFilters", options.numericFilters);

  const res = await fetch(`${HN_API_BASE}/search?${params}`);
  if (!res.ok) throw new Error(`HN API error: ${res.status} ${res.statusText}`);

  const data = (await res.json()) as HNSearchResponse;

  return data.hits.map((hit) => ({
    id: hit.objectID,
    title: hit.title ?? null,
    text: hit.comment_text ?? hit.story_text ?? hit.title ?? "",
    url: hit.url ?? hit.story_url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
    author: hit.author,
    points: hit.points ?? 0,
    comments: hit.num_comments ?? 0,
    createdAt: hit.created_at,
    type: hit._tags.includes("comment") ? "comment" : "story",
  }));
}

/**
 * Search HN with multiple pain-point query patterns for a niche.
 */
export async function searchHNPainPoints(
  niche: string,
  sinceHours: number = 168
): Promise<HNResult[]> {
  const sinceTimestamp = Math.floor((Date.now() - sinceHours * 3600 * 1000) / 1000);
  const numericFilters = `created_at_i>${sinceTimestamp}`;

  const queries = [
    `${niche} "is there a tool"`,
    `${niche} "I wish"`,
    `${niche} frustrated`,
    `${niche} "looking for"`,
    `${niche} problem`,
    `${niche} alternative`,
  ];

  const allResults: HNResult[] = [];
  const seenIds = new Set<string>();

  for (const query of queries) {
    try {
      const results = await searchHN(query, {
        numericFilters,
        hitsPerPage: 20,
      });
      for (const r of results) {
        if (!seenIds.has(r.id)) {
          seenIds.add(r.id);
          allResults.push(r);
        }
      }
    } catch {
      // Continue with other queries if one fails
    }
  }

  return allResults.sort((a, b) => b.points - a.points);
}
