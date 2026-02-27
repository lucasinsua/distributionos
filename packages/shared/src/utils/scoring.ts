/**
 * Lead scoring utilities.
 *
 * Scoring dimensions (weights from architecture doc):
 *   Fit Score:        40% (0-40)  — company size, industry, tech stack, role, geography
 *   Intent Score:     35% (0-35)  — pages visited, content consumed, emails opened, replies
 *   Engagement Score: 25% (0-25)  — course completion %, email CTR, return visits
 */

export interface FitSignals {
  industryMatch: boolean;
  companySizeMatch: boolean;
  roleMatch: boolean;
  techStackOverlap: number; // 0-1
  geographyMatch: boolean;
  fundingStageMatch: boolean;
}

export interface IntentSignals {
  pagesVisited: number;
  contentPiecesConsumed: number;
  emailsOpened: number;
  emailReplies: number;
  leadMagnetDownloads: number;
}

export interface EngagementSignals {
  courseCompletionPct: number; // 0-1
  emailClickThroughRate: number; // 0-1
  returnVisits: number;
  daysSinceLastInteraction: number;
}

export function calculateFitScore(signals: FitSignals): number {
  let score = 0;
  if (signals.industryMatch) score += 8;
  if (signals.companySizeMatch) score += 8;
  if (signals.roleMatch) score += 8;
  score += Math.round(signals.techStackOverlap * 8);
  if (signals.geographyMatch) score += 4;
  if (signals.fundingStageMatch) score += 4;
  return Math.min(score, 40);
}

export function calculateIntentScore(signals: IntentSignals): number {
  let score = 0;
  score += Math.min(signals.pagesVisited * 2, 10);
  score += Math.min(signals.contentPiecesConsumed * 3, 9);
  score += Math.min(signals.emailsOpened * 1, 5);
  score += Math.min(signals.emailReplies * 5, 5);
  score += Math.min(signals.leadMagnetDownloads * 3, 6);
  return Math.min(score, 35);
}

export function calculateEngagementScore(signals: EngagementSignals): number {
  let score = 0;
  score += Math.round(signals.courseCompletionPct * 10);
  score += Math.round(signals.emailClickThroughRate * 5);
  score += Math.min(signals.returnVisits * 2, 6);

  // Decay for inactivity
  if (signals.daysSinceLastInteraction > 30) score -= 4;
  else if (signals.daysSinceLastInteraction > 14) score -= 2;

  return Math.max(0, Math.min(score, 25));
}

export function calculateLeadScore(
  fit: FitSignals,
  intent: IntentSignals,
  engagement: EngagementSignals
): {
  leadScore: number;
  fitScore: number;
  intentScore: number;
  engagementScore: number;
} {
  const fitScore = calculateFitScore(fit);
  const intentScore = calculateIntentScore(intent);
  const engagementScore = calculateEngagementScore(engagement);
  return {
    leadScore: fitScore + intentScore + engagementScore,
    fitScore,
    intentScore,
    engagementScore,
  };
}

export type QualificationTier = "hot" | "warm" | "cool" | "cold";

export function getQualificationTier(leadScore: number): QualificationTier {
  if (leadScore >= 70) return "hot";
  if (leadScore >= 45) return "warm";
  if (leadScore >= 20) return "cool";
  return "cold";
}
