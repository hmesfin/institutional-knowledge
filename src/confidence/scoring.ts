/**
 * Confidence scoring engine
 *
 * Multi-factor confidence scoring for knowledge detection
 */

import type { ConfidenceScore, ScoringOptions, ConfidenceThresholds, ScoringWeights } from './types';
import {
  DEFAULT_WEIGHTS,
  THRESHOLD_PRESETS,
  getConfidenceLevel,
  calculateTextLengthScore,
  calculateStructureScore,
  createFactor,
} from './types';
import type { DetectionResult } from '../detection';
import type { CombinedDetectionResult } from '../detection/combined-detector';

/**
 * Score confidence for a detection result
 */
export function scoreConfidence(
  text: string,
  detection: DetectionResult | CombinedDetectionResult,
  options: ScoringOptions = {}
): ConfidenceScore {
  // Merge with defaults
  const thresholds: ConfidenceThresholds = {
    high: 0.9,
    medium: 0.7,
    low: 0.5,
    ...options.thresholds,
  };

  const weights: ScoringWeights = {
    ...DEFAULT_WEIGHTS,
    ...options.weights,
  };

  const minLength = options.minLength ?? 50;
  const optimalLength = options.optimalLength ?? [100, 500];

  const factors: ConfidenceScore['factors'] = [];
  const reasoning: string[] = [];

  // Factor 1: Pattern matching
  const patternScore = detection.detected ? detection.confidence : 0;
  factors.push(
    createFactor(
      'pattern',
      'Pattern Match',
      weights.pattern,
      patternScore,
      detection.detected
        ? `Pattern confidence: ${(patternScore * 100).toFixed(0)}%`
        : 'No patterns detected'
    )
  );

  // Factor 2: Sentiment analysis (if available)
  if ('sentiment' in detection && detection.sentiment) {
    const sentimentScore = detection.sentiment.confidence;
    factors.push(
      createFactor(
        'sentiment',
        'Sentiment',
        weights.sentiment,
        sentimentScore,
        `Sentiment confidence: ${(sentimentScore * 100).toFixed(0)}%`
      )
    );

    // Bonus for transitions
    if (detection.hasTransition) {
      reasoning.push('Problem-to-solution transition detected');
    }
  }

  // Factor 3: Text length
  const { score: lengthScore, explanation: lengthExplanation } = calculateTextLengthScore(
    text,
    minLength,
    optimalLength
  );
  factors.push(
    createFactor('text_length', 'Text Length', weights.textLength, lengthScore, lengthExplanation)
  );

  // Factor 4: Structure
  const hasPattern = detection.detected;
  const hasTransition = 'hasTransition' in detection ? detection.hasTransition : false;
  const hasMultipleSentences = (text.match(/[.!?]/g) || []).length >= 2;
  const hasQuestion = text.includes('?');

  const { score: structureScore, explanation: structureExplanation } = calculateStructureScore(
    hasPattern,
    hasTransition,
    hasMultipleSentences,
    hasQuestion
  );
  factors.push(
    createFactor('structure', 'Structure', weights.structure, structureScore, structureExplanation)
  );

  // Calculate overall score
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  const totalScore = factors.reduce((sum, f) => sum + f.contribution, 0) / totalWeight;

  // Generate reasoning
  const level = getConfidenceLevel(totalScore, thresholds);
  reasoning.push(`Overall confidence: ${(totalScore * 100).toFixed(0)}% (${level})`);

  // Add specific recommendations based on score
  if (totalScore >= thresholds.high) {
    reasoning.push('High confidence: Valuable knowledge moment worth capturing');
  } else if (totalScore >= thresholds.medium) {
    reasoning.push('Medium confidence: Likely worth capturing with some context');
  } else if (totalScore >= thresholds.low) {
    reasoning.push('Low confidence: May be worth reviewing manually');
  } else {
    reasoning.push('Very low confidence: Likely noise or not valuable');
  }

  return {
    score: totalScore,
    level,
    factors,
    reasoning,
    meetsThreshold: totalScore >= thresholds.low,
  };
}

/**
 * Score confidence with a preset threshold
 */
export function scoreWithPreset(
  text: string,
  detection: DetectionResult | CombinedDetectionResult,
  preset: keyof typeof THRESHOLD_PRESETS
): ConfidenceScore {
  return scoreConfidence(text, detection, {
    thresholds: THRESHOLD_PRESETS[preset],
  });
}

/**
 * Filter detection by confidence threshold
 */
export function filterByConfidence(
  text: string,
  detection: DetectionResult | CombinedDetectionResult,
  options: ScoringOptions = {}
): { passes: boolean; confidence: ConfidenceScore; reason?: string } {
  const confidence = scoreConfidence(text, detection, options);

  if (!confidence.meetsThreshold) {
    return {
      passes: false,
      confidence,
      reason: `Confidence score (${(confidence.score * 100).toFixed(0)}%) below threshold (${(options.thresholds?.low ?? 0.5) * 100}%)`,
    };
  }

  return {
    passes: true,
    confidence,
  };
}

/**
 * Get recommended action based on confidence
 */
export function getRecommendedAction(confidence: ConfidenceScore): {
  action: 'capture' | 'review' | 'ignore';
  reason: string;
} {
  if (confidence.score >= 0.9) {
    return {
      action: 'capture',
      reason: 'Very high confidence - auto-capture immediately',
    };
  }

  if (confidence.score >= 0.7) {
    return {
      action: 'capture',
      reason: 'High confidence - capture with minimal review',
    };
  }

  if (confidence.score >= 0.5) {
    return {
      action: 'review',
      reason: 'Medium confidence - manual review recommended',
    };
  }

  return {
    action: 'ignore',
    reason: 'Low confidence - unlikely to be valuable',
  };
}
