/**
 * Email-related utilities for deliverability and validation.
 */

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "throwaway.email",
  "yopmail.com",
  "sharklasers.com",
  "guerrillamailblock.com",
  "grr.la",
  "dispostable.com",
  "trashmail.com",
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false;
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && !isDisposableEmail(email);
}

export function extractDomain(email: string): string | null {
  const parts = email.split("@");
  return parts.length === 2 ? parts[1]!.toLowerCase() : null;
}

/**
 * Warmup schedule: domains should follow this sending volume ramp.
 */
export interface WarmupSchedule {
  day: number;
  maxSendsPerDay: number;
}

export function getWarmupSchedule(): WarmupSchedule[] {
  return [
    { day: 1, maxSendsPerDay: 2 },
    { day: 3, maxSendsPerDay: 5 },
    { day: 5, maxSendsPerDay: 10 },
    { day: 7, maxSendsPerDay: 15 },
    { day: 10, maxSendsPerDay: 20 },
    { day: 14, maxSendsPerDay: 30 },
    { day: 18, maxSendsPerDay: 40 },
    { day: 21, maxSendsPerDay: 50 },
  ];
}

export function getMaxSendsForDay(warmupDayNumber: number): number {
  const schedule = getWarmupSchedule();
  for (let i = schedule.length - 1; i >= 0; i--) {
    if (warmupDayNumber >= schedule[i]!.day) {
      return schedule[i]!.maxSendsPerDay;
    }
  }
  return 2;
}
