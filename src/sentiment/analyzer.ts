/**
 * Sentiment analysis engine
 *
 * Analyzes text for sentiment polarity and detects shifts
 */

import {
  isPositiveWord,
  isNegativeWord,
  getIntensifier,
  isProblemIndicator,
  isSolutionIndicator,
} from './lexicon';

export interface SentimentScore {
  /** Overall sentiment score (-1.0 to 1.0) */
  score: number;
  /** Positive word count */
  positiveCount: number;
  /** Negative word count */
  negativeCount: number;
  /** Confidence in the score (0-1) */
  confidence: number;
  /** Words that influenced the score */
  influentialWords: Array<{
    word: string;
    sentiment: number;
    position: number;
  }>;
}

export interface TextSegment {
  text: string;
  start: number;
  end: number;
}

export interface SentimentTimeline {
  segments: Array<{
    text: string;
    score: number;
    position: number;
  }>;
  overall: number;
}

export interface SentimentShift {
  /** Starting sentiment */
  from: number;
  /** Ending sentiment */
  to: number;
  /** Magnitude of change */
  delta: number;
  /** Position where shift occurred */
  position: number;
  /** Type of shift (problem-to-solution, etc.) */
  type: 'negative-to-positive' | 'positive-to-negative' | 'neutral';
}

/**
 * Tokenize text into words, preserving position
 */
function tokenize(text: string): Array<{ word: string; position: number }> {
  const tokens: Array<{ word: string; position: number }> = [];
  const words = text.split(/[\s\p{P}]+/u);

  let currentPosition = 0;
  for (const word of words) {
    if (word.length > 0) {
      tokens.push({ word, position: currentPosition });
      currentPosition = text.indexOf(word, currentPosition) + word.length;
    }
  }

  return tokens;
}

/**
 * Calculate sentiment score for a single word
 */
function scoreWord(word: string, _position: number, negated: boolean): {
  score: number;
  influential: boolean;
} {
  const lowerWord = word.toLowerCase();
  let score = 0;
  let influential = false;

  if (isPositiveWord(lowerWord)) {
    score = 1.0;
    influential = true;
  } else if (isNegativeWord(lowerWord)) {
    score = -1.0;
    influential = true;
  } else if (isProblemIndicator(lowerWord)) {
    score = -0.7;
    influential = true;
  } else if (isSolutionIndicator(lowerWord)) {
    score = 0.7;
    influential = true;
  }

  // Apply negation
  if (negated) {
    score = -score;
  }

  return { score, influential };
}

/**
 * Check if a position is negated (has a negator word before it)
 */
function isNegatedAt(
  tokens: Array<{ word: string; position: number }>,
  currentIndex: number,
  windowSize: number = 3
): boolean {
  const start = Math.max(0, currentIndex - windowSize);

  for (let i = start; i < currentIndex; i++) {
    const intensifier = getIntensifier(tokens[i].word);
    if (intensifier < 0) {
      return true;
    }
  }

  return false;
}

/**
 * Get intensifier multiplier for a position
 */
function getIntensifierAt(
  tokens: Array<{ word: string; position: number }>,
  currentIndex: number,
  windowSize: number = 2
): number {
  const start = Math.max(0, currentIndex - windowSize);
  const end = Math.min(tokens.length - 1, currentIndex + windowSize);

  // Check for intensifiers before and after
  for (let i = start; i <= end; i++) {
    if (i !== currentIndex) {
      const multiplier = getIntensifier(tokens[i].word);
      if (multiplier !== 1.0) {
        return multiplier;
      }
    }
  }

  return 1.0;
}

/**
 * Analyze sentiment of text
 */
export function analyzeSentiment(text: string): SentimentScore {
  const tokens = tokenize(text);

  let totalScore = 0;
  let positiveCount = 0;
  let negativeCount = 0;
  const influentialWords: SentimentScore['influentialWords'] = [];

  for (let i = 0; i < tokens.length; i++) {
    const { word, position } = tokens[i];

    // Skip very short words
    if (word.length < 2) continue;

    const negated = isNegatedAt(tokens, i);
    const { score, influential } = scoreWord(word, position, negated);

    if (influential) {
      const multiplier = getIntensifierAt(tokens, i);
      const adjustedScore = score * multiplier;

      totalScore += adjustedScore;

      if (adjustedScore > 0) {
        positiveCount++;
      } else if (adjustedScore < 0) {
        negativeCount++;
      }

      influentialWords.push({
        word,
        sentiment: adjustedScore,
        position,
      });
    }
  }

  // Normalize score to -1 to 1 range
  const maxScore = influentialWords.length > 0 ? influentialWords.length : 1;
  const normalizedScore = Math.max(-1.0, Math.min(1.0, totalScore / maxScore));

  // Calculate confidence based on number of influential words
  const confidence = Math.min(1.0, influentialWords.length / 5);

  return {
    score: normalizedScore,
    positiveCount,
    negativeCount,
    confidence,
    influentialWords,
  };
}

/**
 * Split text into segments for timeline analysis
 */
export function splitIntoSegments(text: string, segmentSize: number = 200): TextSegment[] {
  const segments: TextSegment[] = [];
  const sentences = text.split(/[.!?]+/);

  let currentSegment = '';
  let segmentStart = 0;

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.length === 0) continue;

    const newLength = currentSegment.length + trimmed.length + 1;

    if (currentSegment.length > 0 && newLength > segmentSize) {
      // Save current segment and start new one
      segments.push({
        text: currentSegment.trim(),
        start: segmentStart,
        end: segmentStart + currentSegment.length,
      });

      segmentStart += currentSegment.length;
      currentSegment = trimmed;
    } else {
      currentSegment += (currentSegment.length > 0 ? '. ' : '') + trimmed;
    }
  }

  // Add final segment
  if (currentSegment.length > 0) {
    segments.push({
      text: currentSegment.trim(),
      start: segmentStart,
      end: segmentStart + currentSegment.length,
    });
  }

  return segments;
}

/**
 * Create sentiment timeline for text
 */
export function createSentimentTimeline(text: string, segmentSize: number = 200): SentimentTimeline {
  const segments = splitIntoSegments(text, segmentSize);

  const scoredSegments = segments.map((segment) => ({
    text: segment.text,
    score: analyzeSentiment(segment.text).score,
    position: segment.start,
  }));

  // Calculate overall sentiment
  const overall =
    scoredSegments.length > 0
      ? scoredSegments.reduce((sum, s) => sum + s.score, 0) / scoredSegments.length
      : 0;

  return {
    segments: scoredSegments,
    overall,
  };
}

/**
 * Detect sentiment shifts in text
 */
export function detectSentimentShifts(text: string, minDelta: number = 0.3): SentimentShift[] {
  const timeline = createSentimentTimeline(text);
  const shifts: SentimentShift[] = [];

  for (let i = 1; i < timeline.segments.length; i++) {
    const prev = timeline.segments[i - 1];
    const curr = timeline.segments[i];

    const delta = curr.score - prev.score;

    if (Math.abs(delta) >= minDelta) {
      let type: SentimentShift['type'] = 'neutral';

      if (prev.score < -0.2 && curr.score > 0.2) {
        type = 'negative-to-positive';
      } else if (prev.score > 0.2 && curr.score < -0.2) {
        type = 'positive-to-negative';
      }

      shifts.push({
        from: prev.score,
        to: curr.score,
        delta,
        position: curr.position,
        type,
      });
    }
  }

  return shifts;
}

/**
 * Check if text contains a problem-to-solution transition
 */
export function hasProblemToSolutionTransition(text: string): boolean {
  const shifts = detectSentimentShifts(text, 0.3);
  return shifts.some((s) => s.type === 'negative-to-positive');
}
