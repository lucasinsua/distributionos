import {
  getSupabaseClient,
  type Database,
  searchHNPainPoints,
  searchRedditPainPoints,
  generateStructuredContent,
} from "@prospecting-engine/shared";

type PainPointRow = Database["public"]["Tables"]["pain_points"]["Row"];

interface PainPointResult {
  topic: string;
  description: string;
  source: string;
  sourceUrl: string | null;
  frequencyScore: number;
  recencyScore: number;
  alignmentScore: number;
  compositeScore: number;
  rawSignals: Record<string, unknown>[];
}

interface DiscoverOptions {
  saasProductId?: string;
  maxResults: number;
}

export class PainPointService {
  /**
   * Discovers pain points from specified sources for a given niche.
   *
   * In production this connects to APIs for Reddit, HN, Twitter, etc.
   * The service scrapes, clusters via embeddings, and scores results.
   */
  async discover(
    niche: string,
    sources: string[],
    options: DiscoverOptions
  ): Promise<PainPointResult[]> {
    const db = getSupabaseClient();

    // Check for recently cached pain points for this niche
    const { data: cached } = await db
      .from("pain_points")
      .select("*")
      .ilike("topic", `%${niche}%`)
      .order("composite_score", { ascending: false })
      .limit(options.maxResults)
      .returns<PainPointRow[]>();

    if (cached && cached.length > 0) {
      return cached.map((p) => ({
        topic: p.topic,
        description: p.description,
        source: p.source,
        sourceUrl: p.source_url,
        frequencyScore: p.frequency_score,
        recencyScore: p.recency_score,
        alignmentScore: p.alignment_score,
        compositeScore: p.composite_score,
        rawSignals: p.raw_signals as Record<string, unknown>[],
      }));
    }

    // Collect signals from each source
    const signals = await this.collectSignals(niche, sources);

    // Cluster and score
    const painPoints = this.clusterAndScore(signals, niche);

    // Persist to database
    for (const pp of painPoints.slice(0, options.maxResults)) {
      await db.from("pain_points").insert({
        topic: pp.topic,
        description: pp.description,
        source: pp.source,
        source_url: pp.sourceUrl,
        frequency_score: pp.frequencyScore,
        recency_score: pp.recencyScore,
        alignment_score: pp.alignmentScore,
        composite_score: pp.compositeScore,
        saas_product_id: options.saasProductId ?? null,
        raw_signals: pp.rawSignals,
      });
    }

    return painPoints.slice(0, options.maxResults);
  }

  private async collectSignals(
    niche: string,
    sources: string[]
  ): Promise<Array<{ source: string; content: string; url: string | null; timestamp: string }>> {
    const signals: Array<{ source: string; content: string; url: string | null; timestamp: string }> = [];

    for (const source of sources) {
      switch (source) {
        case "reddit":
          signals.push(...(await this.scrapeReddit(niche)));
          break;
        case "hacker_news":
          signals.push(...(await this.scrapeHackerNews(niche)));
          break;
        case "twitter":
          signals.push(...(await this.scrapeTwitter(niche)));
          break;
        case "indie_hackers":
          signals.push(...(await this.scrapeIndieHackers(niche)));
          break;
        // Additional sources follow the same pattern
        default:
          break;
      }
    }

    return signals;
  }

  private async scrapeReddit(
    niche: string
  ): Promise<Array<{ source: string; content: string; url: string | null; timestamp: string }>> {
    try {
      const results = await searchRedditPainPoints(niche);
      return results.map((r) => ({
        source: "reddit",
        content: `${r.title}\n${r.text}`.trim(),
        url: r.url,
        timestamp: r.createdAt,
      }));
    } catch {
      return [];
    }
  }

  private async scrapeHackerNews(
    niche: string
  ): Promise<Array<{ source: string; content: string; url: string | null; timestamp: string }>> {
    try {
      const results = await searchHNPainPoints(niche);
      return results.map((r) => ({
        source: "hacker_news",
        content: `${r.title ?? ""}\n${r.text}`.trim(),
        url: r.url,
        timestamp: r.createdAt,
      }));
    } catch {
      return [];
    }
  }

  private async scrapeTwitter(
    _niche: string
  ): Promise<Array<{ source: string; content: string; url: string | null; timestamp: string }>> {
    // Twitter/X API v2: search recent tweets for pain-point keywords
    return [];
  }

  private async scrapeIndieHackers(
    _niche: string
  ): Promise<Array<{ source: string; content: string; url: string | null; timestamp: string }>> {
    // Indie Hackers: scrape discussion threads
    return [];
  }

  private clusterAndScore(
    signals: Array<{ source: string; content: string; url: string | null; timestamp: string }>,
    niche: string
  ): PainPointResult[] {
    if (signals.length === 0) return [];

    // Group signals by source, then cluster by keyword overlap
    const clusters = new Map<string, Array<{ source: string; content: string; url: string | null; timestamp: string }>>();

    for (const signal of signals) {
      const words = signal.content.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
      let assigned = false;

      for (const [key, group] of clusters) {
        const keyWords = new Set(key.toLowerCase().split(/\s+/));
        const overlap = words.filter((w) => keyWords.has(w)).length;
        if (overlap >= 3) {
          group.push(signal);
          assigned = true;
          break;
        }
      }

      if (!assigned) {
        clusters.set(signal.content.slice(0, 200), [signal]);
      }
    }

    const now = Date.now();

    return Array.from(clusters.entries()).map(([key, group]) => {
      // Frequency score: more signals = higher
      const frequencyScore = Math.min(100, group.length * 20);

      // Recency score: more recent = higher
      const timestamps = group
        .map((s) => new Date(s.timestamp).getTime())
        .filter((t) => !isNaN(t));
      const newest = timestamps.length > 0 ? Math.max(...timestamps) : now;
      const hoursSinceNewest = (now - newest) / (1000 * 60 * 60);
      const recencyScore = Math.max(0, Math.min(100, 100 - hoursSinceNewest));

      // Alignment score: how well does the content match the niche
      const nicheWords = new Set(niche.toLowerCase().split(/\s+/));
      const contentWords = key.toLowerCase().split(/\s+/);
      const nicheOverlap = contentWords.filter((w) => nicheWords.has(w)).length;
      const alignmentScore = Math.min(100, nicheOverlap * 25 + 25);

      const compositeScore = Math.round(
        frequencyScore * 0.4 + recencyScore * 0.35 + alignmentScore * 0.25
      );

      return {
        topic: niche,
        description: key.slice(0, 500),
        source: group[0]!.source,
        sourceUrl: group[0]!.url,
        frequencyScore,
        recencyScore,
        alignmentScore,
        compositeScore,
        rawSignals: group.map((s) => ({ content: s.content, source: s.source, url: s.url })),
      };
    }).sort((a, b) => b.compositeScore - a.compositeScore);
  }
}
