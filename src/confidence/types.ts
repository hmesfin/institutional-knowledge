/**
 * Confidence scoring system for auto-detection
 *
 * Provides multi-factor confidence scoring with tunable thresholds
 */

export type ConfidenceLevel = 'very-low' | 'low' | 'medium' | 'high' | 'very-high';

export interface ConfidenceFactor {
  /** Factor identifier */
  id: string;
  /** Display name */
  name: string;
  /** Factor weight (0-1) */
  weight: number;
  /** Calculated value (0-1) */
  value: number;
  /** Contribution to final score (weight * value) */
  contribution: number;
  /** Human-readable explanation */
  explanation: string;
}

export interface ConfidenceScore {
  /** Overall confidence score (0-1) */
  score: number;
  /** Confidence level category */
  level: ConfidenceLevel;
  /** Individual factors */
  factors: ConfidenceFactor[];
  /** Reasoning for the score */
  reasoning: string[];
  /** Whether score meets threshold */
  meetsThreshold: boolean;
}

export interface ConfidenceThresholds {
  /** Minimum score to be considered high confidence */
  high: number;
  /** Minimum score to be considered medium confidence */
  medium: number;
  /** Minimum score to be considered acceptable (low confidence) */
  low: number;
}

export interface ScoringWeights {
  /** Pattern matching weight */
  pattern: number;
  /** Sentiment analysis weight */
  sentiment: number;
  /** Text length weight */
  textLength: number;
  /** Structure weight (has context, solution, etc.) */
  structure: number;
}

export interface ScoringOptions {
  /** Confidence thresholds */
  thresholds?: Partial<ConfidenceThresholds>;
  /** Custom weights */
  weights?: Partial<ScoringWeights>;
  /** Minimum text length */
  minLength?: number;
  /** Optimal text length range */
  optimalLength?: [number, number];
}

/** Default threshold presets */
export const THRESHOLD_PRESETS: Record<string, ConfidenceThresholds> = {
  conservative: {
    high: 0.9,
    medium: 0.7,
    low: 0.5,
  },
  moderate: {
    high: 0.8,
    medium: 0.6,
    low: 0.4,
  },
  aggressive: {
    high: 0.7,
    medium: 0.5,
    low: 0.3,
  },
};

/** Default scoring weights */
export const DEFAULT_WEIGHTS: ScoringWeights = {
  pattern: 0.35,
  sentiment: 0.30,
  textLength: 0.15,
  structure: 0.20,
};

/**
 * Calculate confidence level from score
 */
export function getConfidenceLevel(score: number, thresholds: ConfidenceThresholds): ConfidenceLevel {
  if (score >= thresholds.high) return 'very-high';
  if (score >= thresholds.medium) return 'high';
  if (score >= thresholds.low) return 'medium';
  if (score >= 0.2) return 'low';
  return 'very-low';
}

/**
 * Calculate text length score
 * Penalizes very short and very long text
 */
export function calculateTextLengthScore(
  text: string,
  minLength: number = 50,
  optimalLength: [number, number] = [100, 500]
): { score: number; explanation: string } {
  const length = text.length;

  if (length < minLength) {
    return {
      score: 0.2,
      explanation: `Text is too short (${length} chars, min ${minLength})`,
    };
  }

  const [optimalMin, optimalMax] = optimalLength;

  if (length >= optimalMin && length <= optimalMax) {
    return {
      score: 1.0,
      explanation: `Text length is optimal (${length} chars)`,
    };
  }

  if (length < optimalMin) {
    // Below optimal but above minimum - partial score
    const ratio = (length - minLength) / (optimalMin - minLength);
    return {
      score: 0.5 + ratio * 0.5,
      explanation: `Text is on the short side (${length} chars)`,
    };
  }

  // Above optimal - penalize very long text
  const excessRatio = (length - optimalMax) / optimalMax;
  const score = Math.max(0.3, 1.0 - excessRatio * 0.5);

  return {
    score,
    explanation: `Text is long (${length} chars), may lose focus`,
  };
}

/**
 * Calculate structure score
 * Checks for context, problem statement, solution, etc.
 */
export function calculateStructureScore(
  hasPattern: boolean,
  hasSentimentTransition: boolean,
  hasMultipleSentences: boolean,
  hasQuestion: boolean
): { score: number; explanation: string } {
  let score = 0;
  const reasons: string[] = [];

  // Pattern matching is a strong indicator
  if (hasPattern) {
    score += 0.4;
    reasons.push('Contains knowledge pattern');
  }

  // Sentiment transition indicates problem-solving
  if (hasSentimentTransition) {
    score += 0.3;
    reasons.push('Shows problem-to-solution transition');
  }

  // Multiple sentences indicate more context
  if (hasMultipleSentences) {
    score += 0.2;
    reasons.push('Has multiple sentences (good context)');
  }

  // Questions might indicate exploration (lower value)
  if (hasQuestion) {
    score -= 0.1;
    reasons.push('Contains questions (exploratory)');
  }

  // Cap at 1.0
  score = Math.min(1.0, Math.max(0, score));

  return {
    score,
    explanation: reasons.length > 0 ? reasons.join('; ') : 'Basic structure',
  };
}

/**
 * Create a confidence factor
 */
export function createFactor(
  id: string,
  name: string,
  weight: number,
  value: number,
  explanation: string
): ConfidenceFactor {
  return {
    id,
    name,
    weight,
    value,
    contribution: weight * value,
    explanation,
  };
}
