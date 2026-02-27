import {
  getSupabaseClient,
  searchHN,
  searchReddit,
  searchGitHubRepos,
} from "@prospecting-engine/shared";

interface SignalResult {
  type: string;
  source: string;
  sourceUrl: string | null;
  content: string;
  entityName: string | null;
  entityDomain: string | null;
  relevanceScore: number;
  keywordsMatched: string[];
}

interface MonitorOptions {
  signalTypes?: string[];
  sinceHours: number;
}

export class SignalMonitorService {
  /**
   * Monitors channels for buying signals matching the given keywords.
   * Signals are persisted to the database for follow-up processing.
   */
  async monitor(
    keywords: string[],
    channels: string[],
    options: MonitorOptions
  ): Promise<SignalResult[]> {
    const db = getSupabaseClient();
    const signals: SignalResult[] = [];

    for (const channel of channels) {
      const channelSignals = await this.scanChannel(channel, keywords, options);
      signals.push(...channelSignals);
    }

    // Filter by signal type if specified
    const filtered = options.signalTypes
      ? signals.filter((s) => options.signalTypes!.includes(s.type))
      : signals;

    // Persist new signals to database
    for (const signal of filtered) {
      await db.from("signals").insert({
        type: signal.type,
        source: signal.source,
        source_url: signal.sourceUrl,
        content: signal.content,
        entity_name: signal.entityName,
        entity_domain: signal.entityDomain,
        relevance_score: signal.relevanceScore,
        keywords_matched: signal.keywordsMatched,
        processed: false,
      });
    }

    return filtered.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private async scanChannel(
    channel: string,
    keywords: string[],
    options: MonitorOptions
  ): Promise<SignalResult[]> {
    switch (channel) {
      case "reddit":
        return this.scanReddit(keywords, options.sinceHours);
      case "twitter":
        return this.scanTwitter(keywords, options.sinceHours);
      case "hacker_news":
        return this.scanHackerNews(keywords, options.sinceHours);
      case "job_boards":
        return this.scanJobBoards(keywords, options.sinceHours);
      case "crunchbase":
        return this.scanCrunchbase(keywords, options.sinceHours);
      case "g2_reviews":
        return this.scanG2(keywords, options.sinceHours);
      case "product_hunt":
        return this.scanProductHunt(keywords, options.sinceHours);
      case "github":
        return this.scanGitHub(keywords, options.sinceHours);
      default:
        return [];
    }
  }

  // Each scanner method calls the respective API and classifies signals.
  // Stubs below — implement with live API integrations.

  private async scanReddit(keywords: string[], sinceHours: number): Promise<SignalResult[]> {
    try {
      const signals: SignalResult[] = [];
      const seenIds = new Set<string>();
      const time = sinceHours <= 24 ? "day" : sinceHours <= 168 ? "week" : "month";

      for (const keyword of keywords) {
        const results = await searchReddit(keyword, { time, limit: 15 });

        for (const r of results) {
          if (seenIds.has(r.id)) continue;
          seenIds.add(r.id);

          const contentLower = `${r.title} ${r.text}`.toLowerCase();
          const keywordLower = keyword.toLowerCase();

          // Classify signal type based on content
          let type = "discussion";
          if (/looking for|is there a tool|recommend|suggestion/i.test(contentLower)) {
            type = "tool_search";
          } else if (/frustrat|annoying|hate|terrible|broken|sucks/i.test(contentLower)) {
            type = "pain_point";
          } else if (/alternative|switch|migrat|compet|vs\b/i.test(contentLower)) {
            type = "competitor_mention";
          }

          // Calculate keyword match density
          const words = contentLower.split(/\s+/);
          const matchCount = words.filter((w) => w.includes(keywordLower)).length;
          const density = words.length > 0 ? matchCount / words.length : 0;

          // Relevance score: normalized combination of score, comments, and keyword density
          const relevanceScore = Math.min(
            1,
            (r.score / 500) * 0.4 + (r.comments / 100) * 0.3 + density * 10 * 0.3
          );

          const matchedKeywords = keywords.filter((kw) =>
            contentLower.includes(kw.toLowerCase())
          );

          signals.push({
            type,
            source: "reddit",
            sourceUrl: r.url,
            content: `${r.title}\n\n${r.text}`.slice(0, 2000),
            entityName: r.author !== "[deleted]" ? r.author : null,
            entityDomain: null,
            relevanceScore: Math.round(relevanceScore * 100) / 100,
            keywordsMatched: matchedKeywords,
          });
        }
      }

      return signals;
    } catch {
      return [];
    }
  }

  private async scanTwitter(_keywords: string[], _sinceHours: number): Promise<SignalResult[]> {
    return [];
  }

  private async scanHackerNews(keywords: string[], sinceHours: number): Promise<SignalResult[]> {
    try {
      const signals: SignalResult[] = [];
      const seenIds = new Set<string>();
      const sinceTimestamp = Math.floor((Date.now() - sinceHours * 3600 * 1000) / 1000);

      for (const keyword of keywords) {
        const results = await searchHN(keyword, {
          numericFilters: `created_at_i>${sinceTimestamp}`,
          hitsPerPage: 20,
        });

        for (const r of results) {
          if (seenIds.has(r.id)) continue;
          seenIds.add(r.id);

          const contentLower = `${r.title ?? ""} ${r.text}`.toLowerCase();

          // Classify signal type based on content
          let type = "discussion";
          if (/looking for|is there|recommend|anyone know/i.test(contentLower)) {
            type = "tool_search";
          } else if (/frustrat|i wish|problem|broken|painful/i.test(contentLower)) {
            type = "pain_point";
          } else if (/alternative|compet|vs\b|switch|migrat/i.test(contentLower)) {
            type = "competitor_mention";
          }

          // Score based on points + comments
          const relevanceScore = Math.min(
            1,
            (r.points / 500) * 0.5 + (r.comments / 200) * 0.5
          );

          const matchedKeywords = keywords.filter((kw) =>
            contentLower.includes(kw.toLowerCase())
          );

          const hnUrl = r.url ?? `https://news.ycombinator.com/item?id=${r.id}`;

          signals.push({
            type,
            source: "hacker_news",
            sourceUrl: hnUrl,
            content: `${r.title ?? ""}\n\n${r.text}`.slice(0, 2000),
            entityName: r.author,
            entityDomain: null,
            relevanceScore: Math.round(relevanceScore * 100) / 100,
            keywordsMatched: matchedKeywords,
          });
        }
      }

      return signals;
    } catch {
      return [];
    }
  }

  private async scanJobBoards(_keywords: string[], _sinceHours: number): Promise<SignalResult[]> {
    return [];
  }

  private async scanCrunchbase(_keywords: string[], _sinceHours: number): Promise<SignalResult[]> {
    return [];
  }

  private async scanG2(_keywords: string[], _sinceHours: number): Promise<SignalResult[]> {
    return [];
  }

  private async scanProductHunt(_keywords: string[], _sinceHours: number): Promise<SignalResult[]> {
    return [];
  }

  private async scanGitHub(keywords: string[], _sinceHours: number): Promise<SignalResult[]> {
    try {
      const signals: SignalResult[] = [];
      const seenRepos = new Set<string>();

      for (const keyword of keywords) {
        const results = await searchGitHubRepos(`topic:${keyword}`, { perPage: 15 });

        for (const r of results) {
          if (seenRepos.has(r.repoName)) continue;
          seenRepos.add(r.repoName);

          // Score based on stars
          const relevanceScore = Math.min(1, r.stars / 10000);

          const matchedKeywords = keywords.filter((kw) => {
            const kl = kw.toLowerCase();
            return (
              r.topics.some((t: string) => t.toLowerCase().includes(kl)) ||
              r.repoName.toLowerCase().includes(kl) ||
              (r.description ?? "").toLowerCase().includes(kl)
            );
          });

          signals.push({
            type: "tech_adoption",
            source: "github",
            sourceUrl: r.repoUrl,
            content: `${r.repoName}: ${r.description ?? "No description"}`,
            entityName: r.ownerName,
            entityDomain: null,
            relevanceScore: Math.round(relevanceScore * 100) / 100,
            keywordsMatched: matchedKeywords,
          });
        }
      }

      return signals;
    } catch {
      return [];
    }
  }
}
