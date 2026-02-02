/**
 * Pattern matching engine for knowledge detection
 *
 * Analyzes text to find knowledge-worthy moments with confidence scoring
 */

import type { Pattern, PatternType } from './patterns';
import { ALL_PATTERNS, getPatternsByType } from './patterns';

export interface PatternMatch {
  /** The pattern that matched */
  pattern: Pattern;
  /** Matched text */
  matchedText: string;
  /** Start position in text */
  start: number;
  /** End position in text */
  end: number;
  /** Base confidence from pattern */
  baseConfidence: number;
  /** Adjusted confidence after context analysis */
  finalConfidence: number;
  /** Context window around the match */
  context: string;
  /** Reasons for confidence adjustment */
  reasons: string[];
}

export interface DetectionResult {
  /** Whether any patterns matched */
  detected: boolean;
  /** All pattern matches found */
  matches: PatternMatch[];
  /** Highest confidence match */
  bestMatch: PatternMatch | null;
  /** Suggested knowledge item type */
  suggestedType: 'solution' | 'pattern' | 'gotcha' | 'win' | 'troubleshooting' | null;
  /** Overall confidence score (0-1) */
  confidence: number;
}

export interface MatchOptions {
  /** Minimum confidence threshold (default: 0.5) */
  minConfidence?: number;
  /** Context window size in characters (default: 200) */
  contextWindow?: number;
  /** Only match specific pattern types */
  patternTypes?: PatternType[];
}

/**
 * Calculate context-based confidence adjustment
 */
function calculateContextConfidence(
  match: string,
  context: string,
  pattern: Pattern
): { confidence: number; reasons: string[] } {
  let confidence = pattern.confidence;
  const reasons: string[] = [];

  const lowerContext = context.toLowerCase();

  // Apply boosters
  if (pattern.contextBoosters) {
    for (const booster of pattern.contextBoosters) {
      if (lowerContext.includes(booster.toLowerCase())) {
        const boost = 0.05;
        confidence = Math.min(1.0, confidence + boost);
        reasons.push(`+${boost} for context "${booster}"`);
      }
    }
  }

  // Apply dampers
  if (pattern.contextDampers) {
    for (const damper of pattern.contextDampers) {
      if (lowerContext.includes(damper.toLowerCase())) {
        const reduction = 0.10;
        confidence = Math.max(0.0, confidence - reduction);
        reasons.push(`-${reduction} for context "${damper}"`);
      }
    }
  }

  // Boost for exclamation marks (indicates excitement)
  if (match.includes('!')) {
    confidence = Math.min(1.0, confidence + 0.05);
    reasons.push('+0.05 for exclamation mark');
  }

  // Boost for uppercase (indicates emphasis)
  if (match === match.toUpperCase() && match.length > 2) {
    confidence = Math.min(1.0, confidence + 0.05);
    reasons.push('+0.05 for emphasis (all caps)');
  }

  // Reduce for very short matches (likely false positives)
  if (match.length < 5) {
    confidence = Math.max(0.0, confidence - 0.15);
    reasons.push('-0.15 for very short match');
  }

  // Boost for multiple sentence indicators
  const sentenceEnders = (match.match(/[.!?]/g) || []).length;
  if (sentenceEnders >= 2) {
    confidence = Math.min(1.0, confidence + 0.05);
    reasons.push('+0.05 for complete sentences');
  }

  return { confidence, reasons };
}

/**
 * Extract context window around a match
 */
function extractContext(text: string, start: number, end: number, windowSize: number): string {
  const contextStart = Math.max(0, start - windowSize);
  const contextEnd = Math.min(text.length, end + windowSize);
  return text.slice(contextStart, contextEnd);
}

/**
 * Find all pattern matches in text
 */
function findMatches(
  text: string,
  patterns: Pattern[],
  contextWindow: number
): PatternMatch[] {
  const matches: PatternMatch[] = [];

  for (const pattern of patterns) {
    // Reset regex state
    pattern.regex.lastIndex = 0;

    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      const matchedText = match[0];
      const start = match.index;
      const end = start + matchedText.length;

      // Extract context
      const context = extractContext(text, start, end, contextWindow);

      // Calculate confidence with context
      const { confidence, reasons } = calculateContextConfidence(matchedText, context, pattern);

      matches.push({
        pattern,
        matchedText,
        start,
        end,
        baseConfidence: pattern.confidence,
        finalConfidence: confidence,
        context,
        reasons,
      });

      // Prevent infinite loops with zero-width matches
      if (start === end) {
        pattern.regex.lastIndex++;
      }
    }
  }

  return matches;
}

/**
 * Determine best match and suggested type
 */
function analyzeMatches(matches: PatternMatch[]): {
  bestMatch: PatternMatch | null;
  suggestedType: 'solution' | 'pattern' | 'gotcha' | 'win' | 'troubleshooting' | null;
} {
  if (matches.length === 0) {
    return { bestMatch: null, suggestedType: null };
  }

  // Sort by final confidence
  matches.sort((a, b) => b.finalConfidence - a.finalConfidence);

  const bestMatch = matches[0];

  // Count by suggested type
  const typeCounts = matches.reduce((acc, match) => {
    const type = match.pattern.suggestedType;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Get most common suggested type
  const suggestedType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return { bestMatch, suggestedType: suggestedType as any };
}

/**
 * Detect knowledge-worthy patterns in text
 */
export function detectPatterns(text: string, options: MatchOptions = {}): DetectionResult {
  const minConfidence = options.minConfidence ?? 0.5;
  const contextWindow = options.contextWindow ?? 200;
  const patternTypes = options.patternTypes;

  // Select patterns to match
  let patterns = patternTypes
    ? patternTypes.flatMap((type) => getPatternsByType(type))
    : ALL_PATTERNS;

  // Find all matches
  const matches = findMatches(text, patterns, contextWindow);

  // Filter by minimum confidence
  const confidentMatches = matches.filter((m) => m.finalConfidence >= minConfidence);

  // Analyze matches
  const { bestMatch, suggestedType } = analyzeMatches(confidentMatches);

  // Calculate overall confidence
  const confidence =
    confidentMatches.length > 0
      ? confidentMatches.reduce((sum, m) => sum + m.finalConfidence, 0) / confidentMatches.length
      : 0;

  return {
    detected: confidentMatches.length > 0,
    matches: confidentMatches,
    bestMatch,
    suggestedType,
    confidence,
  };
}

/**
 * Extract a summary from text around the best match
 */
export function extractSummary(_text: string, match: PatternMatch, maxLength: number = 200): string {
  const { context } = match;

  // Try to extract complete sentences around the match
  const sentences = context.split(/[.!?]/);

  // Find sentences closest to the match
  let summary = '';
  for (const sentence of sentences) {
    if (summary.length + sentence.length > maxLength) {
      break;
    }
    if (sentence.trim().length > 0) {
      summary += sentence.trim() + '. ';
    }
  }

  // Fallback to context if no sentences found
  if (summary.length < 20) {
    summary = context.slice(0, maxLength);
  }

  return summary.trim();
}
