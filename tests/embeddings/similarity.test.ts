import { describe, it, expect } from 'bun:test';
import { cosineSimilarity, areSimilar } from '../../src/embeddings/similarity';

describe('cosineSimilarity', () => {
  it('should return 1.0 for identical vectors', () => {
    const a = [1, 2, 3];
    const b = [1, 2, 3];
    expect(cosineSimilarity(a, b)).toBeCloseTo(1.0, 5);
  });

  it('should return 1.0 for scaled identical vectors', () => {
    const a = [1, 2, 3];
    const b = [2, 4, 6];
    expect(cosineSimilarity(a, b)).toBeCloseTo(1.0, 5);
  });

  it('should return 0 for orthogonal vectors', () => {
    const a = [1, 0];
    const b = [0, 1];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
  });

  it('should return -1 for opposite vectors', () => {
    const a = [1, 2, 3];
    const b = [-1, -2, -3];
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0, 5);
  });

  it('should return values between -1 and 1', () => {
    const a = [1, 2, 3];
    const b = [3, 2, 1];
    const similarity = cosineSimilarity(a, b);
    expect(similarity).toBeGreaterThanOrEqual(-1);
    expect(similarity).toBeLessThanOrEqual(1);
  });

  it('should handle high-dimensional vectors (384 dims)', () => {
    const a = Array(384).fill(0).map(() => Math.random());
    const b = Array(384).fill(0).map(() => Math.random());
    const similarity = cosineSimilarity(a, b);
    expect(similarity).toBeGreaterThanOrEqual(-1);
    expect(similarity).toBeLessThanOrEqual(1);
  });

  it('should throw for vectors of different lengths', () => {
    const a = [1, 2, 3];
    const b = [1, 2];
    expect(() => cosineSimilarity(a, b)).toThrow('Vector dimension mismatch');
  });

  it('should throw for empty vectors', () => {
    const a: number[] = [];
    const b: number[] = [];
    expect(() => cosineSimilarity(a, b)).toThrow('Cannot calculate similarity of empty vectors');
  });
});

describe('areSimilar', () => {
  it('should return true for highly similar vectors', () => {
    const a = [1, 2, 3, 4];
    const b = [1.1, 2.1, 3.1, 4.1];
    expect(areSimilar(a, b, 0.9)).toBe(true);
  });

  it('should return false for dissimilar vectors', () => {
    const a = [1, 2, 3, 4];
    const b = [4, 3, 2, 1];
    expect(areSimilar(a, b, 0.9)).toBe(false);
  });

  it('should use default threshold of 0.8', () => {
    const a = [1, 2, 3, 4];
    const b = [1, 2, 3, 4];
    expect(areSimilar(a, b)).toBe(true);
  });

  it('should respect custom threshold', () => {
    const a = [1, 2, 3, 4];
    const b = [1, 2, 3, -4]; // Last dimension is opposite
    expect(areSimilar(a, b, 0.5)).toBe(false);
    expect(areSimilar(a, b, -0.1)).toBe(true);
  });
});
