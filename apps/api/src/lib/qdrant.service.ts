/**
 * Qdrant Vector Database Service
 * 
 * Provides a clean abstraction for Qdrant vector database operations.
 * Handles collection management, vector insertion, and similarity search.
 */

import logger from './logger';

// Lazy import QdrantClient to avoid issues if package is not available
let QdrantClient: any = null;
let qdrantImportError: Error | null = null;

async function ensureQdrantClient() {
  if (QdrantClient) {
    return QdrantClient;
  }
  
  if (qdrantImportError) {
    throw qdrantImportError;
  }
  
  try {
    const qdrantModule = await import('@qdrant/js-client-rest');
    QdrantClient = qdrantModule.QdrantClient;
    return QdrantClient;
  } catch (error: any) {
    qdrantImportError = new Error('@qdrant/js-client-rest is required for RAG functionality. Please install it: npm install @qdrant/js-client-rest');
    logger.error('Failed to import @qdrant/js-client-rest:', error.message);
    throw qdrantImportError;
  }
}

/**
 * Configuration for Qdrant service
 */
export interface QdrantConfig {
  url?: string;
  apiKey?: string;
  timeout?: number;
}

/**
 * Point payload stored in Qdrant
 */
export interface DocumentPayload {
  /** Document text content */
  text: string;
  /** Document source/type (e.g., 'psychoeducation', 'legal', 'product') */
  source: string;
  /** Optional document ID or reference */
  documentId?: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Search result from Qdrant
 */
export interface SearchResult {
  /** Document ID in Qdrant */
  id: string | number;
  /** Similarity score (higher is more similar) */
  score: number;
  /** Document payload */
  payload: DocumentPayload;
}

/**
 * Qdrant Vector Database Service
 */
export class QdrantService {
  private readonly defaultCollectionName = 'safepsy_kb';
  private readonly defaultVectorSize = 1536; // text-embedding-3-small dimension

  private client: any = null;
  private config: QdrantConfig | undefined;

  constructor(config?: QdrantConfig) {
    this.config = config;
    // Don't initialize client immediately - do it lazily
  }

  private async getClient() {
    if (!this.client) {
      const QdrantClientClass = await ensureQdrantClient();
      const url = this.config?.url || process.env.QDRANT_URL || 'http://localhost:6333';
      const apiKey = this.config?.apiKey || process.env.QDRANT_API_KEY;

      this.client = new QdrantClientClass({
        url,
        apiKey,
        timeout: this.config?.timeout || 30000,
      });

      logger.info(`Qdrant client initialized: ${url}`);
    }
    return this.client;
  }

  /**
   * Ensure a collection exists, create if it doesn't
   * @param collectionName - Name of the collection
   * @param vectorSize - Dimension of vectors
   */
  async ensureCollection(
    collectionName: string = this.defaultCollectionName,
    vectorSize: number = this.defaultVectorSize
  ): Promise<void> {
    try {
      const client = await this.getClient();
      const collections = await client.getCollections();
      const exists = collections.collections.some((c: { name: string }) => c.name === collectionName);

      if (!exists) {
        const client = await this.getClient();
        await client.createCollection(collectionName, {
          vectors: {
            size: vectorSize,
            distance: 'Cosine', // Cosine similarity for embeddings
          },
        });
        logger.info(`Created Qdrant collection: ${collectionName}`);
      } else {
        logger.debug(`Collection ${collectionName} already exists`);
      }
    } catch (error: any) {
      logger.error(`Error ensuring collection ${collectionName}:`, error);
      throw new Error(`Failed to ensure collection: ${error.message}`);
    }
  }

  /**
   * Upsert vectors into the collection
   * @param points - Array of points to upsert
   * @param collectionName - Name of the collection
   */
  async upsertVectors(
    points: Array<{
      id: string | number;
      vector: number[];
      payload: DocumentPayload;
    }>,
    collectionName: string = this.defaultCollectionName
  ): Promise<void> {
    try {
      const client = await this.getClient();
      await client.upsert(collectionName, {
        wait: true,
        points: points.map((point) => ({
          id: point.id,
          vector: point.vector,
          payload: { ...(point.payload as object) } as Record<string, unknown>,
        })),
      });
      logger.info(`Upserted ${points.length} vectors into ${collectionName}`);
    } catch (error: any) {
      logger.error(`Error upserting vectors:`, error);
      throw new Error(`Failed to upsert vectors: ${error.message}`);
    }
  }

  /**
   * Search for similar vectors
   * @param queryVector - Query embedding vector
   * @param limit - Maximum number of results
   * @param collectionName - Name of the collection
   * @param filter - Optional filter for payload fields
   * @returns Array of search results
   */
  async search(
    queryVector: number[],
    limit: number = 5,
    collectionName: string = this.defaultCollectionName,
    filter?: {
      source?: string;
      documentId?: string;
      [key: string]: unknown;
    }
  ): Promise<SearchResult[]> {
    try {
      // Build filter if provided
      let qdrantFilter: Record<string, unknown> | undefined;
      if (filter) {
        const must: Array<Record<string, unknown>> = [];
        if (filter.source) {
          must.push({ key: 'source', match: { value: filter.source } });
        }
        if (filter.documentId) {
          must.push({ key: 'documentId', match: { value: filter.documentId } });
        }
        // Add other filter fields
        Object.entries(filter).forEach(([key, value]) => {
          if (key !== 'source' && key !== 'documentId' && value !== undefined) {
            must.push({ key, match: { value } });
          }
        });
        if (must.length > 0) {
          qdrantFilter = { must };
        }
      }

      const client = await this.getClient();
      const searchResult = await client.search(collectionName, {
        vector: queryVector,
        limit,
        filter: qdrantFilter,
        with_payload: true,
      });

      return searchResult.map((result: { id: string | number; score?: number; payload?: unknown }) => ({
        id: result.id,
        score: result.score || 0,
        payload: result.payload as DocumentPayload,
      }));
    } catch (error: any) {
      logger.error(`Error searching vectors:`, error);
      throw new Error(`Failed to search vectors: ${error.message}`);
    }
  }

  /**
   * Delete points from the collection
   * @param pointIds - Array of point IDs to delete
   * @param collectionName - Name of the collection
   */
  async deletePoints(
    pointIds: (string | number)[],
    collectionName: string = this.defaultCollectionName
  ): Promise<void> {
    try {
      const client = await this.getClient();
      await client.delete(collectionName, {
        wait: true,
        points: pointIds,
      });
      logger.info(`Deleted ${pointIds.length} points from ${collectionName}`);
    } catch (error: any) {
      logger.error(`Error deleting points:`, error);
      throw new Error(`Failed to delete points: ${error.message}`);
    }
  }

  /**
   * Get collection info
   * @param collectionName - Name of the collection
   */
  async getCollectionInfo(collectionName: string = this.defaultCollectionName) {
    try {
      const client = await this.getClient();
      return await client.getCollection(collectionName);
    } catch (error: any) {
      logger.error(`Error getting collection info:`, error);
      throw new Error(`Failed to get collection info: ${error.message}`);
    }
  }

  /**
   * Check if Qdrant is accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Qdrant client doesn't have a direct health check, so we try to list collections
      const client = await this.getClient();
      await client.getCollections();
      return true;
    } catch (error: any) {
      logger.error('Qdrant health check failed:', error);
      return false;
    }
  }
}

/**
 * Singleton instance of QdrantService
 */
let qdrantServiceInstance: QdrantService | null = null;

/**
 * Get or create the singleton QdrantService instance
 */
export function getQdrantService(config?: QdrantConfig): QdrantService {
  if (!qdrantServiceInstance) {
    qdrantServiceInstance = new QdrantService(config);
  }
  return qdrantServiceInstance;
}

