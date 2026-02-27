/**
 * GitHub REST API client for prospect discovery.
 * Uses public API (60 req/hr unauthenticated, 5000/hr with token).
 */

interface GitHubRepo {
  id: number;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  language: string | null;
  topics: string[];
  owner: {
    login: string;
    type: string; // "User" or "Organization"
    html_url: string;
  };
  created_at: string;
  updated_at: string;
}

interface GitHubSearchResponse {
  total_count: number;
  items: GitHubRepo[];
}

export interface GitHubProspect {
  repoName: string;
  repoUrl: string;
  ownerName: string;
  ownerUrl: string;
  ownerType: string;
  stars: number;
  language: string | null;
  topics: string[];
  description: string | null;
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "ProspectingEngine/0.1.0",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/**
 * Search GitHub repos for companies using specific technologies.
 * Useful for finding prospects using competitor OSS or adjacent tech.
 */
export async function searchGitHubRepos(
  query: string,
  options: {
    sort?: "stars" | "forks" | "updated";
    order?: "asc" | "desc";
    perPage?: number;
  } = {}
): Promise<GitHubProspect[]> {
  const params = new URLSearchParams({
    q: query,
    sort: options.sort ?? "stars",
    order: options.order ?? "desc",
    per_page: String(options.perPage ?? 30),
  });

  const res = await fetch(`https://api.github.com/search/repositories?${params}`, {
    headers: getHeaders(),
  });

  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

  const data = (await res.json()) as GitHubSearchResponse;

  return data.items
    .filter((repo) => repo.owner.type === "Organization")
    .map((repo) => ({
      repoName: repo.full_name,
      repoUrl: repo.html_url,
      ownerName: repo.owner.login,
      ownerUrl: repo.owner.html_url,
      ownerType: repo.owner.type,
      stars: repo.stargazers_count,
      language: repo.language,
      topics: repo.topics,
      description: repo.description,
    }));
}

/**
 * Find companies using competitor or adjacent technology.
 */
export async function findCompaniesUsingTech(
  techKeywords: string[]
): Promise<GitHubProspect[]> {
  const allProspects: GitHubProspect[] = [];
  const seenOwners = new Set<string>();

  for (const keyword of techKeywords) {
    try {
      const prospects = await searchGitHubRepos(`topic:${keyword}`, {
        sort: "stars",
        perPage: 20,
      });
      for (const p of prospects) {
        if (!seenOwners.has(p.ownerName)) {
          seenOwners.add(p.ownerName);
          allProspects.push(p);
        }
      }
      // Respect rate limits
      await new Promise((r) => setTimeout(r, 1000));
    } catch {
      // Continue with other keywords
    }
  }

  return allProspects.sort((a, b) => b.stars - a.stars);
}
