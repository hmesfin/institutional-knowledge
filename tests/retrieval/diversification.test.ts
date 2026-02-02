import { describe, it, expect } from 'bun:test';
import { applyDiversification, calculateDiversityMetrics } from '../../src/retrieval';
import type { SemanticSearchResult, DiversificationStrategy } from '../../src/types/retrieval';

function createMockResult(
  id: string,
  project: string,
  type: string,
  similarity: number
): SemanticSearchResult {
  return {
    item: {
      id,
      project,
      file_context: 'src/file.ts',
      type: type as any,
      summary: `Summary ${id}`,
      content: `Content ${id}`,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      solution_verified: true,
    },
    similarity,
  };
}

describe('Diversification', () => {
  describe('applyDiversification', () => {
    it('should return unchanged results for "none" strategy', () => {
      const results = [
        createMockResult('1', 'proj1', 'solution', 0.9),
        createMockResult('2', 'proj1', 'solution', 0.8),
        createMockResult('3', 'proj1', 'pattern', 0.7),
      ];

      const diversified = applyDiversification(results, 'none');
      expect(diversified).toEqual(results);
    });

    it('should diversify by type using round-robin', () => {
      const results = [
        createMockResult('1', 'proj1', 'solution', 0.9),
        createMockResult('2', 'proj1', 'solution', 0.8),
        createMockResult('3', 'proj1', 'solution', 0.7),
        createMockResult('4', 'proj1', 'pattern', 0.6),
        createMockResult('5', 'proj1', 'pattern', 0.5),
        createMockResult('6', 'proj1', 'gotcha', 0.4),
      ];

      const diversified = applyDiversification(results, 'type');

      // Should alternate between types
      const types = diversified.map((r) => r.item.type);
      expect(types[0]).toBe('solution');
      expect(types[1]).toBe('pattern');
      expect(types[2]).toBe('gotcha');
      expect(types[3]).toBe('solution'); // Back to solution
    });

    it('should diversify by project using round-robin', () => {
      const results = [
        createMockResult('1', 'proj1', 'solution', 0.9),
        createMockResult('2', 'proj1', 'solution', 0.8),
        createMockResult('3', 'proj2', 'solution', 0.7),
        createMockResult('4', 'proj2', 'solution', 0.6),
        createMockResult('5', 'proj3', 'solution', 0.5),
      ];

      const diversified = applyDiversification(results, 'project');

      // Should alternate between projects
      const projects = diversified.map((r) => r.item.project);
      expect(projects[0]).toBe('proj1');
      expect(projects[1]).toBe('proj2');
      expect(projects[2]).toBe('proj3');
      expect(projects[3]).toBe('proj1'); // Back to proj1
    });

    it('should diversify by both type and project', () => {
      const results = [
        createMockResult('1', 'proj1', 'solution', 0.9),
        createMockResult('2', 'proj1', 'solution', 0.8),
        createMockResult('3', 'proj1', 'pattern', 0.7),
        createMockResult('4', 'proj2', 'solution', 0.6),
        createMockResult('5', 'proj2', 'pattern', 0.5),
      ];

      const diversified = applyDiversification(results, 'both');

      // Each (project, type) pair should be treated as a group
      const keys = diversified.map((r) => `${r.item.project}:${r.item.type}`);
      expect(keys).toEqual([
        'proj1:solution',
        'proj1:pattern',
        'proj2:solution',
        'proj2:pattern',
        'proj1:solution',
      ]);
    });

    it('should handle empty results', () => {
      const diversified = applyDiversification([], 'type');
      expect(diversified).toEqual([]);
    });
  });

  describe('calculateDiversityMetrics', () => {
    it('should return zero metrics for empty results', () => {
      const metrics = calculateDiversityMetrics([]);
      expect(metrics.score).toBe(0);
      expect(metrics.typeDistribution).toEqual({});
      expect(metrics.projectDistribution).toEqual({});
      expect(metrics.typeDominance).toBe(false);
      expect(metrics.projectDominance).toBe(false);
    });

    it('should detect type dominance', () => {
      const results = [
        createMockResult('1', 'proj1', 'solution', 0.9),
        createMockResult('2', 'proj1', 'solution', 0.8),
        createMockResult('3', 'proj1', 'solution', 0.7),
        createMockResult('4', 'proj1', 'pattern', 0.6),
      ];

      const metrics = calculateDiversityMetrics(results);
      expect(metrics.typeDistribution.solution).toBe(3);
      expect(metrics.typeDistribution.pattern).toBe(1);
      expect(metrics.typeDominance).toBe(true); // 75% solutions
    });

    it('should detect project dominance', () => {
      const results = [
        createMockResult('1', 'proj1', 'solution', 0.9),
        createMockResult('2', 'proj1', 'pattern', 0.8),
        createMockResult('3', 'proj1', 'gotcha', 0.7),
        createMockResult('4', 'proj2', 'solution', 0.6),
      ];

      const metrics = calculateDiversityMetrics(results);
      expect(metrics.projectDistribution.proj1).toBe(3);
      expect(metrics.projectDistribution.proj2).toBe(1);
      expect(metrics.projectDominance).toBe(true); // 75% proj1
    });

    it('should calculate high diversity for balanced distribution', () => {
      const results = [
        createMockResult('1', 'proj1', 'solution', 0.9),
        createMockResult('2', 'proj2', 'pattern', 0.8),
        createMockResult('3', 'proj3', 'gotcha', 0.7),
        createMockResult('4', 'proj1', 'solution', 0.6),
        createMockResult('5', 'proj2', 'pattern', 0.5),
        createMockResult('6', 'proj3', 'gotcha', 0.4),
      ];

      const metrics = calculateDiversityMetrics(results);
      expect(metrics.score).toBeGreaterThan(0.5); // Should be well-diversified
      expect(metrics.typeDominance).toBe(false);
      expect(metrics.projectDominance).toBe(false);
    });

    it('should calculate low diversity for homogeneous results', () => {
      const results = [
        createMockResult('1', 'proj1', 'solution', 0.9),
        createMockResult('2', 'proj1', 'solution', 0.8),
        createMockResult('3', 'proj1', 'solution', 0.7),
        createMockResult('4', 'proj1', 'solution', 0.6),
      ];

      const metrics = calculateDiversityMetrics(results);
      expect(metrics.score).toBeLessThan(0.2); // Should have low diversity
      expect(metrics.typeDominance).toBe(true);
      expect(metrics.projectDominance).toBe(true);
    });
  });
});
