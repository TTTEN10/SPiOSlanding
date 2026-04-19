/**
 * Unit tests for RetrieverService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RetrieverService } from '../retriever.service';
import { EmbeddingProvider, EmbeddingResult } from '../embedding-provider';
import { QdrantService, SearchResult, DocumentPayload } from '../qdrant.service';

// Mock dependencies
class MockEmbeddingProvider implements EmbeddingProvider {
  private dimension: number;

  constructor(dimension: number = 1536) {
    this.dimension = dimension;
  }

  async embed(text: string): Promise<EmbeddingResult> {
    // Generate a simple mock embedding
    const embedding = new Array(this.dimension).fill(0).map(() => Math.random());
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    const normalized = embedding.map((val) => val / magnitude);
    return {
      embedding: normalized,
      model: 'test-model',
    };
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    return Promise.all(texts.map((text) => this.embed(text)));
  }

  getDimension(): number {
    return this.dimension;
  }
}

class MockQdrantService extends QdrantService {
  private points: Map<string | number, { vector: number[]; payload: DocumentPayload }> = new Map();

  constructor() {
    // Call parent constructor with mock config (won't actually connect)
    super({ url: 'http://localhost:6333' });
  }

  async ensureCollection(): Promise<void> {
    // Mock implementation - no-op
  }

  async upsertVectors(points: Array<{ id: string | number; vector: number[]; payload: DocumentPayload }>): Promise<void> {
    points.forEach((point) => {
      this.points.set(point.id, { vector: point.vector, payload: point.payload });
    });
  }

  async search(
    queryVector: number[],
    limit: number = 5,
    _collectionName?: string,
    _filter?: Record<string, unknown>
  ): Promise<SearchResult[]> {
    // Simple cosine similarity search
    const results: SearchResult[] = [];

    for (const [id, point] of this.points.entries()) {
      // Apply filter (e.g. source, documentId) so tests that filter by source pass
      if (_filter && Object.keys(_filter).length > 0) {
        if (_filter.source != null && point.payload.source !== _filter.source) continue;
        if (_filter.documentId != null && point.payload.documentId !== _filter.documentId) continue;
      }
      // Calculate cosine similarity
      const dotProduct = queryVector.reduce((sum, val, i) => sum + val * point.vector[i], 0);
      const queryMagnitude = Math.sqrt(queryVector.reduce((sum, val) => sum + val * val, 0));
      const pointMagnitude = Math.sqrt(point.vector.reduce((sum, val) => sum + val * val, 0));
      const similarity = dotProduct / (queryMagnitude * pointMagnitude);

      results.push({
        id,
        score: similarity,
        payload: point.payload,
      });
    }

    // Sort by score descending and limit
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async deletePoints(pointIds: (string | number)[]): Promise<void> {
    pointIds.forEach((id) => this.points.delete(id));
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

describe('RetrieverService', () => {
  let retrieverService: RetrieverService;
  let mockEmbeddingProvider: MockEmbeddingProvider;
  let mockQdrantService: MockQdrantService;

  beforeEach(() => {
    mockEmbeddingProvider = new MockEmbeddingProvider(1536);
    mockQdrantService = new MockQdrantService();
    retrieverService = new RetrieverService(mockEmbeddingProvider, mockQdrantService);
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await expect(retrieverService.initialize()).resolves.not.toThrow();
    });
  });

  describe('indexDocument', () => {
    it('should index a document successfully', async () => {
      const text = 'This is a test document about mental health.';
      const source = 'psychoeducation';

      await expect(
        retrieverService.indexDocument(text, source)
      ).resolves.not.toThrow();
    });

    it('should index a document with custom ID', async () => {
      const text = 'Test document';
      const source = 'legal';
      const documentId = 'custom-doc-123';

      await retrieverService.indexDocument(text, source, documentId);

      // Verify document was indexed by trying to retrieve it
      const result = await retrieverService.retrieve('test', { documentId });
      expect(result.documents.length).toBeGreaterThan(0);
    });

    it('should index a document with metadata', async () => {
      const text = 'Test document with metadata';
      const source = 'product';
      const metadata = { category: 'therapy', version: '1.0' };

      await retrieverService.indexDocument(text, source, undefined, metadata);

      const result = await retrieverService.retrieve('test');
      expect(result.documents[0]?.metadata).toEqual(metadata);
    });
  });

  describe('indexDocuments', () => {
    it('should index multiple documents in batch', async () => {
      const documents = [
        { text: 'Document 1 about anxiety', source: 'psychoeducation' },
        { text: 'Document 2 about depression', source: 'psychoeducation' },
        { text: 'Document 3 about legal rights', source: 'legal' },
      ];

      await expect(
        retrieverService.indexDocuments(documents)
      ).resolves.not.toThrow();
    });
  });

  describe('retrieve', () => {
    beforeEach(async () => {
      // Index some test documents
      await retrieverService.indexDocument(
        'Anxiety is a common mental health condition characterized by excessive worry.',
        'psychoeducation',
        'doc-anxiety-1'
      );
      await retrieverService.indexDocument(
        'Depression is a mood disorder that causes persistent sadness.',
        'psychoeducation',
        'doc-depression-1'
      );
      await retrieverService.indexDocument(
        'Users have the right to access their therapy records.',
        'legal',
        'doc-legal-1'
      );
    });

    it('should retrieve relevant documents for a query', async () => {
      const result = await retrieverService.retrieve('anxiety mental health');

      expect(result).toHaveProperty('documents');
      expect(result).toHaveProperty('query');
      expect(result).toHaveProperty('count');
      expect(result.count).toBeGreaterThan(0);
      expect(result.documents[0]).toHaveProperty('text');
      expect(result.documents[0]).toHaveProperty('source');
      expect(result.documents[0]).toHaveProperty('score');
    });

    it('should respect the limit parameter', async () => {
      const result = await retrieverService.retrieve('mental health', { limit: 2 });

      expect(result.count).toBeLessThanOrEqual(2);
      expect(result.documents.length).toBeLessThanOrEqual(2);
    });

    it('should filter by source', async () => {
      const result = await retrieverService.retrieve('mental health', {
        source: 'psychoeducation',
      });

      expect(result.documents.every((doc) => doc.source === 'psychoeducation')).toBe(true);
    });

    it('should filter by minimum score', async () => {
      const result = await retrieverService.retrieve('completely unrelated topic', {
        minScore: 0.8,
      });

      // With high minScore, we might get no results
      expect(result.count).toBeGreaterThanOrEqual(0);
      if (result.count > 0) {
        expect(result.documents.every((doc) => doc.score >= 0.8)).toBe(true);
      }
    });

    it('should return empty results when no documents match', async () => {
      const result = await retrieverService.retrieve('xyzabc123', { minScore: 0.99 });

      expect(result.count).toBe(0);
      expect(result.documents).toEqual([]);
    });
  });

  describe('deleteDocument', () => {
    it('should delete a document successfully', async () => {
      const documentId = 'doc-to-delete';
      await retrieverService.indexDocument('Test document', 'test', documentId);

      await expect(
        retrieverService.deleteDocument(documentId)
      ).resolves.not.toThrow();

      // Verify document is deleted
      const result = await retrieverService.retrieve('test', { documentId });
      expect(result.count).toBe(0);
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      const health = await retrieverService.healthCheck();

      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('embedding');
      expect(health).toHaveProperty('qdrant');
      expect(typeof health.healthy).toBe('boolean');
    });
  });
});

