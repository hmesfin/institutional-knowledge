/**
 * Combined pattern and sentiment detection
 *
 * Integrates pattern matching with sentiment analysis for improved accuracy
 */

import type { DetectionResult } from './matcher';
import { detectPatterns } from './matcher';
import {
  analyzeSentiment,
  createSentimentTimeline,
  detectSentimentShifts,
  hasProblemToSolutionTransition,
} from '../sentiment';

export interface CombinedDetectionResult extends DetectionResult {
  /** Sentiment analysis results */
  sentiment: {
    /** Overall sentiment score (-1 to 1) */
    score: number;
    /** Sentiment confidence (0 to 1) */
    confidence: number;
    /** Positive word count */
    positiveCount: number;
    /** Negative word count */
    negativeCount: number;
  };
  /** Sentiment timeline */
  timeline: {
    segments: Array<{ position: number; score: number }>;
    overall: number;
  };
  /** Detected sentiment shifts */
  shifts: Array<{
    from: number;
    to: number;
    delta: number;
    position: number;
    type: string;
  }>;
  /** Whether a problem-to-solution transition was detected */
  hasTransition: boolean;
  /** Combined confidence score (0-1) */
  combinedConfidence: number;
  /** Reasoning for the detection */
  reasoning: string[];
}

export interface CombinedDetectionOptions {
  /** Minimum pattern confidence */
  minPatternConfidence?: number;
  /** Minimum sentiment shift magnitude */
  minSentimentShift?: number;
  /** Segment size for sentiment timeline */
  segmentSize?: number;
  /** Whether to require both pattern and sentiment */
  requireBoth?: boolean;
}

/**
 * Combine pattern and sentiment detection
 */
export function detectWithSentiment(
  text: string,
  options: CombinedDetectionOptions = {}
): CombinedDetectionResult {
  const {
    minPatternConfidence = 0.5,
    minSentimentShift = 0.4,
    segmentSize = 200,
    requireBoth = false,
  } = options;

  const reasoning: string[] = [];

  // Run pattern detection
  const patternResult = detectPatterns(text, {
    minConfidence: minPatternConfidence,
  });

  // Run sentiment analysis
  const sentimentScore = analyzeSentiment(text);
  const timeline = createSentimentTimeline(text, segmentSize);
  const shifts = detectSentimentShifts(text, minSentimentShift);
  const hasTransition = hasProblemToSolutionTransition(text);

  // Build reasoning
  if (patternResult.detected) {
    reasoning.push(
      `Found ${patternResult.matches.length} pattern(s) with confidence ${patternResult.confidence.toFixed(2)}`
    );
  }

  if (sentimentScore.confidence > 0.3) {
    reasoning.push(
      `Sentiment score: ${sentimentScore.score.toFixed(2)} (${sentimentScore.positiveCount} positive, ${sentimentScore.negativeCount} negative words)`
    );
  }

  if (shifts.length > 0) {
    reasoning.push(
      `Detected ${shifts.length} sentiment shift(s) including ${shifts.filter((s) => s.type === 'negative-to-positive').length} problem-to-solution transition(s)`
    );
  }

  // Calculate combined confidence
  let combinedConfidence = 0;

  if (requireBoth) {
    // Require both pattern and sentiment evidence
    if (patternResult.detected && hasTransition) {
      combinedConfidence = (patternResult.confidence + sentimentScore.confidence) / 2;
      reasoning.push(
        'Both pattern and sentiment evidence detected - high confidence knowledge moment'
      );
    } else if (patternResult.detected) {
      combinedConfidence = patternResult.confidence * 0.6;
      reasoning.push('Pattern detected but no sentiment transition - moderate confidence');
    } else if (hasTransition) {
      combinedConfidence = sentimentScore.confidence * 0.6;
      reasoning.push('Sentiment transition detected but no pattern - moderate confidence');
    }
  } else {
    // Either pattern or sentiment is sufficient
    if (patternResult.detected && hasTransition) {
      combinedConfidence = Math.min(1.0, patternResult.confidence + sentimentScore.confidence * 0.5);
      reasoning.push('Both pattern and sentiment evidence - very high confidence');
    } else if (patternResult.detected) {
      combinedConfidence = patternResult.confidence;
      reasoning.push('Pattern detection - high confidence');
    } else if (hasTransition) {
      combinedConfidence = sentimentScore.confidence;
      reasoning.push('Sentiment transition alone - moderate confidence');
    } else {
      // Check for weak signals
      if (sentimentScore.score > 0.3) {
        combinedConfidence = sentimentScore.confidence * 0.4;
        reasoning.push('Positive sentiment detected - low confidence');
      } else if (shifts.length > 0) {
        combinedConfidence = 0.3;
        reasoning.push('Minor sentiment shifts detected - low confidence');
      }
    }
  }

  return {
    ...patternResult,
    sentiment: {
      score: sentimentScore.score,
      confidence: sentimentScore.confidence,
      positiveCount: sentimentScore.positiveCount,
      negativeCount: sentimentScore.negativeCount,
    },
    timeline,
    shifts,
    hasTransition,
    combinedConfidence,
    reasoning,
  };
}
