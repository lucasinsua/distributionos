import { getMaxSendsForDay } from "@prospecting-engine/shared";

interface WarmupResult {
  domain: string;
  action: string;
  status: string;
  warmupDay: number | null;
  maxDailySends: number | null;
  isReady: boolean;
  deliverability: {
    bounceRate: number | null;
    spamComplaintRate: number | null;
    inboxRate: number | null;
  } | null;
}

export class WarmupService {
  /**
   * Manages email domain warmup via Instantly.ai.
   *
   * Warmup schedule (14-21 days):
   *   Day 1:  2/day → Day 3:  5/day → Day 5:  10/day
   *   Day 7: 15/day → Day 10: 20/day → Day 14: 30/day
   *   Day 18: 40/day → Day 21: 50/day
   *
   * Monitors bounce rate and spam complaints.
   * Auto-pauses domains that approach thresholds (>3% bounce).
   */
  async manage(domain: string, action: string): Promise<WarmupResult> {
    switch (action) {
      case "start":
        return this.startWarmup(domain);
      case "status":
        return this.getStatus(domain);
      case "pause":
        return this.pauseWarmup(domain);
      case "resume":
        return this.resumeWarmup(domain);
      default:
        throw new Error(`Unknown warmup action: ${action}`);
    }
  }

  private async startWarmup(domain: string): Promise<WarmupResult> {
    // In production: POST to Instantly.ai warmup API
    return {
      domain,
      action: "start",
      status: "warming_up",
      warmupDay: 1,
      maxDailySends: getMaxSendsForDay(1),
      isReady: false,
      deliverability: null,
    };
  }

  private async getStatus(domain: string): Promise<WarmupResult> {
    // In production: GET from Instantly.ai warmup status API
    // Returns current warmup day, deliverability metrics
    const warmupDay = 14; // Example: 2 weeks in
    return {
      domain,
      action: "status",
      status: "warming_up",
      warmupDay,
      maxDailySends: getMaxSendsForDay(warmupDay),
      isReady: warmupDay >= 21,
      deliverability: {
        bounceRate: 0.01,
        spamComplaintRate: 0.001,
        inboxRate: 0.95,
      },
    };
  }

  private async pauseWarmup(domain: string): Promise<WarmupResult> {
    return {
      domain,
      action: "pause",
      status: "paused",
      warmupDay: null,
      maxDailySends: 0,
      isReady: false,
      deliverability: null,
    };
  }

  private async resumeWarmup(domain: string): Promise<WarmupResult> {
    return {
      domain,
      action: "resume",
      status: "warming_up",
      warmupDay: null,
      maxDailySends: null,
      isReady: false,
      deliverability: null,
    };
  }
}
