/**
 * Reddit JSON API client.
 * Uses public JSON endpoints (append .json to any Reddit URL).
 * No API key required for read-only access (rate limited to ~60 req/min).
 */

interface RedditPost {
  kind: string;
  data: {
    id: string;
    title: string;
    selftext: string;
    url: string;
    permalink: string;
    author: string;
    score: number;
    num_comments: number;
    created_utc: number;
    subreddit: string;
    link_flair_text: string | null;
  };
}

interface RedditListing {
  kind: "Listing";
  data: {
    children: RedditPost[];
    after: string | null;
  };
}

export interface RedditResult {
  id: string;
  title: string;
  text: string;
  url: string;
  author: string;
  score: number;
  comments: number;
  createdAt: string;
  subreddit: string;
}

const USER_AGENT = "ProspectingEngine/0.1.0";

async function redditFetch(url: string): Promise<Response> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (res.status === 429) {
    // Rate limited — wait and retry once
    await new Promise((r) => setTimeout(r, 2000));
    return fetch(url, { headers: { "User-Agent": USER_AGENT } });
  }
  return res;
}

/**
 * Search Reddit for posts matching a query.
 */
export async function searchReddit(
  query: string,
  options: {
    subreddit?: string;
    sort?: "relevance" | "hot" | "top" | "new" | "comments";
    time?: "hour" | "day" | "week" | "month" | "year" | "all";
    limit?: number;
  } = {}
): Promise<RedditResult[]> {
  const params = new URLSearchParams({
    q: query,
    sort: options.sort ?? "relevance",
    t: options.time ?? "month",
    limit: String(options.limit ?? 25),
    restrict_sr: options.subreddit ? "true" : "false",
    type: "link",
  });

  const base = options.subreddit
    ? `https://www.reddit.com/r/${options.subreddit}/search.json`
    : "https://www.reddit.com/search.json";

  const res = await redditFetch(`${base}?${params}`);
  if (!res.ok) throw new Error(`Reddit API error: ${res.status}`);

  const data = (await res.json()) as RedditListing;

  return data.data.children.map((post) => ({
    id: post.data.id,
    title: post.data.title,
    text: post.data.selftext.slice(0, 2000),
    url: `https://www.reddit.com${post.data.permalink}`,
    author: post.data.author,
    score: post.data.score,
    comments: post.data.num_comments,
    createdAt: new Date(post.data.created_utc * 1000).toISOString(),
    subreddit: post.data.subreddit,
  }));
}

/**
 * Search Reddit with pain-point patterns across relevant subreddits.
 */
export async function searchRedditPainPoints(
  niche: string,
  subreddits: string[] = []
): Promise<RedditResult[]> {
  const painPatterns = [
    `"${niche}" is there a tool`,
    `"${niche}" frustrated`,
    `"${niche}" looking for`,
    `"${niche}" alternative to`,
    `"${niche}" recommendation`,
  ];

  const allResults: RedditResult[] = [];
  const seenIds = new Set<string>();

  for (const pattern of painPatterns) {
    for (const subreddit of subreddits.length > 0 ? subreddits : [""]) {
      try {
        const results = await searchReddit(pattern, {
          subreddit: subreddit || undefined,
          sort: "relevance",
          time: "month",
          limit: 10,
        });
        for (const r of results) {
          if (!seenIds.has(r.id)) {
            seenIds.add(r.id);
            allResults.push(r);
          }
        }
        // Respect rate limits
        await new Promise((r) => setTimeout(r, 500));
      } catch {
        // Continue with other patterns
      }
    }
  }

  return allResults.sort((a, b) => b.score - a.score);
}
