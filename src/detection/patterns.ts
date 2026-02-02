/**
 * Pattern definitions for auto-detection of knowledge items
 *
 * Patterns are organized by type and include regex patterns
 * with associated confidence weights
 */

export type PatternType = 'success' | 'problem' | 'solution' | 'gotcha';

export interface Pattern {
  /** Unique identifier for the pattern */
  id: string;
  /** Pattern type category */
  type: PatternType;
  /** Regex pattern to match */
  regex: RegExp;
  /** Base confidence score (0-1) */
  confidence: number;
  /** Context clues that increase confidence */
  contextBoosters?: string[];
  /** Context clues that decrease confidence */
  contextDampers?: string[];
  /** Suggested knowledge item type */
  suggestedType: 'solution' | 'pattern' | 'gotcha' | 'win' | 'troubleshooting';
}

/**
 * Success patterns - indicate wins, breakthroughs, achievements
 */
export const SUCCESS_PATTERNS: Pattern[] = [
  {
    id: 'finally-working',
    type: 'success',
    regex: /\b(finally\s+working|it\s+works?|working\s+now|got\s+it\s+working|fixed\s+it|finally\s+fixed)\b/gi,
    confidence: 0.85,
    contextBoosters: ['after', 'hours', 'days', 'finally', 'struggle', 'debugging'],
    contextDampers: ['not', "n't", 'broken', 'failed'],
    suggestedType: 'win',
  },
  {
    id: 'breakthrough',
    type: 'success',
    regex: /\b(breakthrough|solved|cracked\s+it|figured\s+it\s+out|found\s+the\s+solution|eureka|clicked|clicked\s+for\s+me)\b/gi,
    confidence: 0.80,
    contextBoosters: ['finally', 'after', 'hours', 'solution'],
    suggestedType: 'win',
  },
  {
    id: 'performance-win',
    type: 'success',
    regex: /(\d+x?\s*faster|(reduced|improved)\s+by\s+\d+%|optimized|improved\s+performance|speed\s+up|latency\s+reduced)/gi,
    confidence: 0.75,
    contextBoosters: ['significantly', 'dramatically', 'massively'],
    suggestedType: 'win',
  },
  {
    id: 'success-indicator',
    type: 'success',
    regex: /\b(successful|successfully|perfect|exactly\s+what\s+i\s+needed|works?\s+like\s+a\s+charm)\b/gi,
    confidence: 0.70,
    suggestedType: 'win',
  },
];

/**
 * Problem patterns - indicate bugs, issues, blockers
 */
export const PROBLEM_PATTERNS: Pattern[] = [
  {
    id: 'bug-found',
    type: 'problem',
    regex: /\b(found\s+the\s+bug|bug\s+was|the\s+issue\s+is|problem\s+was|root\s+cause)\b/gi,
    confidence: 0.85,
    contextBoosters: ['finally', 'after', 'hours', 'debugging'],
    contextDampers: ['not found', "couldn't find", 'still looking'],
    suggestedType: 'troubleshooting',
  },
  {
    id: 'frustration',
    type: 'problem',
    regex: /\b(stuck|blocked|can't\s+figure\s+out|driving\s+me\s+crazy|wasted\s+\d+\s+hours|no\s+idea|why\s+is\s+this\s+happening)\b/gi,
    confidence: 0.70,
    suggestedType: 'troubleshooting',
  },
  {
    id: 'error-pattern',
    type: 'problem',
    regex: /\b(error|exception|failed|failure|crash|broken|not\s+working|doesn'?t\s+work)\b/gi,
    confidence: 0.50, // Lower confidence as this is common
    contextBoosters: ['mystery', 'weird', 'strange', 'unexpected', 'suddenly'],
    suggestedType: 'troubleshooting',
  },
  {
    id: 'edge-case',
    type: 'problem',
    regex: /\b(edge\s+case|corner\s+case|race\s+condition|intermittent|flaky|sometimes\s+fails?)\b/gi,
    confidence: 0.75,
    suggestedType: 'gotcha',
  },
];

/**
 * Solution patterns - indicate approaches, fixes, implementations
 */
export const SOLUTION_PATTERNS: Pattern[] = [
  {
    id: 'solution-statement',
    type: 'solution',
    regex: /\b(the\s+(solution|fix|answer)\s+is|to\s+fix\s+(?:this|it)|here'?s\s+how\s+to\s+fix|the\s+problem\s+was)\b/gi,
    confidence: 0.80,
    suggestedType: 'solution',
  },
  {
    id: 'implementation',
    type: 'solution',
    regex: /\b(implemented|added|created|built|developed)\s+(a\s+)?(?:new\s+)?(?:feature|function|method|class)\b/gi,
    confidence: 0.65,
    contextBoosters: ['successfully', 'finally', 'working'],
    suggestedType: 'solution',
  },
  {
    id: 'approach',
    type: 'solution',
    regex: /\b(the\s+(approach|strategy|method|technique)|way\s+to\s+(?:do|solve|fix))\b/gi,
    confidence: 0.60,
    contextBoosters: ['best', 'optimal', 'efficient', 'simple'],
    suggestedType: 'pattern',
  },
];

/**
 * Gotcha patterns - indicate tricky parts, warnings, lessons learned
 */
export const GOTCHA_PATTERNS: Pattern[] = [
  {
    id: 'warning',
    type: 'gotcha',
    regex: /\b(watch\s+out|be\s+careful|don'?t\s+(?:forget|use|do)|warning|caution|important\s+note|remember\s+to)\b/gi,
    confidence: 0.75,
    suggestedType: 'gotcha',
  },
  {
    id: 'counter-intuitive',
    type: 'gotcha',
    regex: /\b(counter.?intuitive|unexpectedly|surprisingly|not\s+obvious|easy\s+to\s+miss|subtle)\b/gi,
    confidence: 0.80,
    suggestedType: 'gotcha',
  },
  {
    id: 'lesson-learned',
    type: 'gotcha',
    regex: /\b(lesson\s+(?:learned|the\s+hard\s+way)|in\s+hindsight|the\s+hard\s+way|should\s+have)\b/gi,
    confidence: 0.85,
    suggestedType: 'gotcha',
  },
  {
    id: 'documentation-gap',
    type: 'gotcha',
    regex: /\b(not\s+(?:well\s+)?documented|unclear|poorly\s+documented|missing\s+documentation|not\s+mentioned)\b/gi,
    confidence: 0.70,
    suggestedType: 'gotcha',
  },
];

/**
 * All patterns combined
 */
export const ALL_PATTERNS = [
  ...SUCCESS_PATTERNS,
  ...PROBLEM_PATTERNS,
  ...SOLUTION_PATTERNS,
  ...GOTCHA_PATTERNS,
];

/**
 * Get patterns by type
 */
export function getPatternsByType(type: PatternType): Pattern[] {
  return ALL_PATTERNS.filter((p) => p.type === type);
}

/**
 * Get pattern by ID
 */
export function getPatternById(id: string): Pattern | undefined {
  return ALL_PATTERNS.find((p) => p.id === id);
}
