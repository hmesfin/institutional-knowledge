/**
 * Confidence feedback mechanism
 *
 * Learns from user confirmations/rejections to improve scoring
 */

import type { ScoringWeights } from './types';

export interface FeedbackEntry {
  /** Detection ID or hash */
  id: string;
  /** User feedback */
  feedback: 'confirm' | 'reject';
  /** Confidence score at time of feedback */
  confidence: number;
  /** Factors that contributed */
  factors: string[];
  /** Timestamp */
  timestamp: number;
}

export interface WeightAdjustment {
  /** Factor to adjust */
  factor: keyof ScoringWeights;
  /** New weight */
  newWeight: number;
  /** Adjustment amount */
  delta: number;
  /** Reason for adjustment */
  reason: string;
}

/**
 * In-memory feedback storage
 * In production, this would be persisted to database
 */
class FeedbackStore {
  private entries: Map<string, FeedbackEntry[]> = new Map();

  add(entry: FeedbackEntry): void {
    const key = entry.id;
    if (!this.entries.has(key)) {
      this.entries.set(key, []);
    }
    this.entries.get(key)!.push(entry);
  }

  get(id: string): FeedbackEntry[] {
    return this.entries.get(id) || [];
  }

  getAll(): FeedbackEntry[] {
    return Array.from(this.entries.values()).flat();
  }

  clear(): void {
    this.entries.clear();
  }
}

const store = new FeedbackStore();

/**
 * Record user feedback
 */
export function recordFeedback(entry: FeedbackEntry): void {
  store.add(entry);
}

/**
 * Get feedback history
 */
export function getFeedback(id: string): FeedbackEntry[] {
  return store.get(id);
}

/**
 * Get all feedback
 */
export function getAllFeedback(): FeedbackEntry[] {
  return store.getAll();
}

/**
 * Calculate weight adjustments based on feedback
 */
export function calculateWeightAdjustments(
  feedbackHistory: FeedbackEntry[],
  currentWeights: ScoringWeights,
  minSamples: number = 10
): WeightAdjustment[] {
  const adjustments: WeightAdjustment[] = [];

  // Need minimum samples to make meaningful adjustments
  if (feedbackHistory.length < minSamples) {
    return adjustments;
  }

  // Analyze which factors correlate with confirmations
  const factorImpact = new Map<string, { confirm: number; reject: number }>();

  for (const entry of feedbackHistory) {
    for (const factor of entry.factors) {
      if (!factorImpact.has(factor)) {
        factorImpact.set(factor, { confirm: 0, reject: 0 });
      }
      const impact = factorImpact.get(factor)!;
      if (entry.feedback === 'confirm') {
        impact.confirm++;
      } else {
        impact.reject++;
      }
    }
  }

  // Calculate adjustments
  const learningRate = 0.1; // How fast to adjust weights

  for (const [factor, { confirm, reject }] of factorImpact.entries()) {
    const total = confirm + reject;
    if (total < minSamples / 2) continue; // Skip factors with insufficient data

    const confirmRate = confirm / total;

    // Factor is underperforming (low confirmation rate)
    if (confirmRate < 0.5) {
      // Find corresponding weight
      const weightKey = factorToWeightKey(factor);
      if (weightKey && currentWeights[weightKey] > 0.05) {
        // Reduce weight
        const delta = -learningRate * currentWeights[weightKey];
        const newWeight = Math.max(0.05, currentWeights[weightKey] + delta);

        adjustments.push({
          factor: weightKey,
          newWeight,
          delta,
          reason: `Low confirmation rate (${(confirmRate * 100).toFixed(0)}%)`,
        });
      }
    }
    // Factor is performing well (high confirmation rate)
    else if (confirmRate > 0.7) {
      const weightKey = factorToWeightKey(factor);
      if (weightKey && currentWeights[weightKey] < 0.5) {
        // Increase weight
        const delta = learningRate * (0.5 - currentWeights[weightKey]);
        const newWeight = Math.min(0.5, currentWeights[weightKey] + delta);

        adjustments.push({
          factor: weightKey,
          newWeight,
          delta,
          reason: `High confirmation rate (${(confirmRate * 100).toFixed(0)}%)`,
        });
      }
    }
  }

  return adjustments;
}

/**
 * Map factor name to weight key
 */
function factorToWeightKey(factor: string): keyof ScoringWeights | null {
  const mapping: Record<string, keyof ScoringWeights> = {
    pattern: 'pattern',
    sentiment: 'sentiment',
    'text length': 'textLength',
    structure: 'structure',
  };

  return mapping[factor.toLowerCase()] || null;
}

/**
 * Apply weight adjustments
 */
export function applyWeightAdjustments(
  weights: ScoringWeights,
  adjustments: WeightAdjustment[]
): ScoringWeights {
  const newWeights = { ...weights };

  for (const adjustment of adjustments) {
    (newWeights as any)[adjustment.factor] = adjustment.newWeight;
  }

  // Normalize to ensure sum = 1
  const total = Object.values(newWeights).reduce((sum, w) => sum + w, 0);
  const weightKeys = Object.keys(newWeights) as Array<keyof ScoringWeights>;
  for (const key of weightKeys) {
    newWeights[key] = (newWeights[key] as number) / total;
  }

  return newWeights;
}

/**
 * Get feedback statistics
 */
export function getFeedbackStats(): {
  total: number;
  confirmed: number;
  rejected: number;
  confirmationRate: number;
  avgConfidence: { confirmed: number; rejected: number };
} {
  const all = getAllFeedback();

  if (all.length === 0) {
    return {
      total: 0,
      confirmed: 0,
      rejected: 0,
      confirmationRate: 0,
      avgConfidence: { confirmed: 0, rejected: 0 },
    };
  }

  const confirmed = all.filter((f) => f.feedback === 'confirm');
  const rejected = all.filter((f) => f.feedback === 'reject');

  const confirmedConfidence =
    confirmed.reduce((sum, f) => sum + f.confidence, 0) / confirmed.length;
  const rejectedConfidence =
    rejected.reduce((sum, f) => sum + f.confidence, 0) / rejected.length;

  return {
    total: all.length,
    confirmed: confirmed.length,
    rejected: rejected.length,
    confirmationRate: confirmed.length / all.length,
    avgConfidence: {
      confirmed: confirmedConfidence,
      rejected: rejectedConfidence,
    },
  };
}

/**
 * Clear feedback history
 */
export function clearFeedback(): void {
  store.clear();
}
