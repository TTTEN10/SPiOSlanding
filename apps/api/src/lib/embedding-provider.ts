/**
 * Embedding Provider Abstraction
 * 
 * Provides a clean interface for generating embeddings from text.
 * Uses mock provider only (OpenAI SDK removed).
 */

import logger from './logger';

/**
 * Result of embedding generation
 */
export interface EmbeddingResult {
  /** The embedding vector */
  embedding: number[];
  /** Model used for embedding */
  model: string;
}

/**
 * Abstract interface for embedding providers
 */
export interface EmbeddingProvider {
  /**
   * Generate an embedding vector for the given text
   * @param text - Text to embed
   * @returns Promise resolving to the embedding vector and model info
   */
  embed(text: string): Promise<EmbeddingResult>;

  /**
   * Generate embeddings for multiple texts in batch
   * @param texts - Array of texts to embed
   * @returns Promise resolving to array of embedding results
   */
  embedBatch(texts: string[]): Promise<EmbeddingResult[]>;

  /**
   * Get the dimension of embeddings produced by this provider
   * @returns Dimension of the embedding vector
   */
  getDimension(): number;
}

/**
 * Mock embedding provider
 * Generates deterministic hash-based embeddings for testing/development
 */
export class MockEmbeddingProvider implements EmbeddingProvider {
  private readonly model: string;
  private readonly dimension: number;

  constructor(model: string = 'mock-embedding') {
    this.model = model;
    // Use 1536 dimensions (standard embedding size)
    this.dimension = 1536;
  }

  async embed(text: string): Promise<EmbeddingResult> {
    return this.mockEmbed(text);
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    return Promise.all(texts.map((text) => this.mockEmbed(text)));
  }

  getDimension(): number {
    return this.dimension;
  }

  /**
   * Generate a mock embedding for testing/fallback
   * Uses a simple hash-based approach to generate deterministic vectors
   */
  private mockEmbed(text: string): EmbeddingResult {
    // Simple hash-based mock embedding (deterministic but not semantically meaningful)
    const embedding: number[] = [];
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }

    // Generate dimension-sized vector using hash
    for (let i = 0; i < this.dimension; i++) {
      const seed = hash + i * 31;
      const value = Math.sin(seed) * 0.5 + 0.5; // Normalize to [0, 1]
      embedding.push(value);
    }

    // Normalize the vector (L2 normalization)
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    const normalized = embedding.map((val) => val / magnitude);

    return {
      embedding: normalized,
      model: `${this.model}-mock`,
    };
  }
}

/**
 * Factory function to create an embedding provider
 * Always returns mock provider (OpenAI SDK removed)
 */
export function createEmbeddingProvider(): EmbeddingProvider {
  const model = process.env.EMBEDDING_MODEL || 'mock-embedding';
  logger.info('Using mock embedding provider (OpenAI SDK removed)');
  return new MockEmbeddingProvider(model);
}




