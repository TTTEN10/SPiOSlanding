/**
 * RAG Retriever Service
 * 
 * Combines embedding generation and vector search to provide
 * retrieval-augmented generation capabilities.
 * 
 * This service handles:
 * - Converting queries to embeddings
 * - Searching the knowledge base
 * - Filtering and ranking results
 */

import { EmbeddingProvider, createEmbeddingProvider } from './embedding-provider';
import { QdrantService, getQdrantService, SearchResult, DocumentPayload } from './qdrant.service';
import logger from './logger';

/**
 * Retrieval options
 */
export interface RetrieveOptions {
  /** Maximum number of results to return */
  limit?: number;
  /** Minimum similarity score threshold (0-1) */
  minScore?: number;
  /** Filter by document source */
  source?: string;
  /** Filter by document ID */
  documentId?: string;
  /** Additional metadata filters */
  metadata?: Record<string, unknown>;
}

/**
 * Retrieved document with context
 */
export interface RetrievedDocument {
  /** Document text content */
  text: string;
  /** Document source */
  source: string;
  /** Similarity score */
  score: number;
  /** Document ID */
  documentId?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Retrieval result
 */
export interface RetrievalResult {
  /** Retrieved documents */
  documents: RetrievedDocument[];
  /** Query that was used */
  query: string;
  /** Number of results found */
  count: number;
}

/**
 * RAG Retriever Service
 * 
 * Orchestrates embedding generation and vector search for RAG operations.
 */
export class RetrieverService {
  private embeddingProvider: EmbeddingProvider;
  private qdrantService: QdrantService;
  private readonly defaultCollectionName = 'safepsy_kb';
  private readonly defaultLimit = 5;
  private readonly defaultMinScore = 0.5;
  private initialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  constructor(
    embeddingProvider?: EmbeddingProvider,
    qdrantService?: QdrantService
  ) {
    this.embeddingProvider = embeddingProvider || createEmbeddingProvider();
    this.qdrantService = qdrantService || getQdrantService();
  }

  /**
   * Initialize the retriever service
   * Ensures the Qdrant collection exists with correct vector size
   * This method is idempotent and can be called multiple times safely
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        const vectorSize = this.embeddingProvider.getDimension();
        await this.qdrantService.ensureCollection(this.defaultCollectionName, vectorSize);
        this.initialized = true;
        logger.info('Retriever service initialized');
      } catch (error: any) {
        logger.error('Failed to initialize retriever service:', error);
        this.initializationPromise = null; // Allow retry
        throw new Error(`Retriever initialization failed: ${error.message}`);
      }
    })();

    return this.initializationPromise;
  }

  /**
   * Ensure the service is initialized before performing operations
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Retrieve relevant documents for a query
   * @param query - Text query to search for
   * @param options - Retrieval options
   * @returns Retrieval result with documents
   */
  async retrieve(query: string, options: RetrieveOptions = {}): Promise<RetrievalResult> {
    try {
      await this.ensureInitialized();

      // Generate embedding for the query
      const embeddingResult = await this.embeddingProvider.embed(query);
      const queryVector = embeddingResult.embedding;

      // Build filter from options
      const filter: Record<string, unknown> = {};
      if (options.source) {
        filter.source = options.source;
      }
      if (options.documentId) {
        filter.documentId = options.documentId;
      }
      if (options.metadata) {
        Object.assign(filter, options.metadata);
      }

      // Search Qdrant
      const limit = options.limit || this.defaultLimit;
      const searchResults = await this.qdrantService.search(
        queryVector,
        limit,
        this.defaultCollectionName,
        Object.keys(filter).length > 0 ? filter : undefined
      );

      // Filter by minimum score and convert to RetrievedDocument format
      const minScore = options.minScore ?? this.defaultMinScore;
      const documents: RetrievedDocument[] = searchResults
        .filter((result) => result.score >= minScore)
        .map((result) => ({
          text: result.payload.text,
          source: result.payload.source,
          score: result.score,
          documentId: result.payload.documentId,
          metadata: result.payload.metadata,
        }));

      logger.info(`Retrieved ${documents.length} documents for query: "${query.substring(0, 50)}..."`);

      return {
        documents,
        query,
        count: documents.length,
      };
    } catch (error: any) {
      logger.error('Retrieval error:', error);
      throw new Error(`Retrieval failed: ${error.message}`);
    }
  }

  /**
   * Index a document into the knowledge base
   * @param text - Document text content
   * @param source - Document source (e.g., 'psychoeducation', 'legal', 'product')
   * @param documentId - Optional document ID
   * @param metadata - Optional metadata
   * @returns Promise resolving when document is indexed
   */
  async indexDocument(
    text: string,
    source: string,
    documentId?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.ensureInitialized();

      // Generate embedding for the document
      const embeddingResult = await this.embeddingProvider.embed(text);
      const vector = embeddingResult.embedding;

      // Generate a unique ID if not provided
      const id = documentId || `doc_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Create payload
      const payload: DocumentPayload = {
        text,
        source,
        documentId: id,
        metadata,
      };

      // Upsert into Qdrant
      await this.qdrantService.upsertVectors([
        {
          id,
          vector,
          payload,
        },
      ]);

      logger.info(`Indexed document: ${id} (source: ${source})`);
    } catch (error: any) {
      logger.error('Document indexing error:', error);
      throw new Error(`Failed to index document: ${error.message}`);
    }
  }

  /**
   * Index multiple documents in batch
   * @param documents - Array of documents to index
   */
  async indexDocuments(
    documents: Array<{
      text: string;
      source: string;
      documentId?: string;
      metadata?: Record<string, unknown>;
    }>
  ): Promise<void> {
    try {
      await this.ensureInitialized();

      // Generate embeddings for all documents
      const texts = documents.map((doc) => doc.text);
      const embeddingResults = await this.embeddingProvider.embedBatch(texts);

      // Prepare points for Qdrant
      const points = documents.map((doc, index) => {
        const id = doc.documentId || `doc_${Date.now()}_${index}_${Math.random().toString(36).substring(7)}`;
        return {
          id,
          vector: embeddingResults[index].embedding,
          payload: {
            text: doc.text,
            source: doc.source,
            documentId: id,
            metadata: doc.metadata,
          } as DocumentPayload,
        };
      });

      // Upsert all points
      await this.qdrantService.upsertVectors(points);

      logger.info(`Indexed ${documents.length} documents in batch`);
    } catch (error: any) {
      logger.error('Batch document indexing error:', error);
      throw new Error(`Failed to index documents: ${error.message}`);
    }
  }

  /**
   * Delete a document from the knowledge base
   * @param documentId - Document ID to delete
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      await this.qdrantService.deletePoints([documentId]);
      logger.info(`Deleted document: ${documentId}`);
    } catch (error: any) {
      logger.error('Document deletion error:', error);
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  }

  /**
   * Health check for the retriever service
   */
  async healthCheck(): Promise<{ healthy: boolean; embedding: boolean; qdrant: boolean }> {
    const embeddingHealthy = this.embeddingProvider.getDimension() > 0;
    const qdrantHealthy = await this.qdrantService.healthCheck();

    return {
      healthy: embeddingHealthy && qdrantHealthy,
      embedding: embeddingHealthy,
      qdrant: qdrantHealthy,
    };
  }
}

/**
 * Singleton instance of RetrieverService
 */
let retrieverServiceInstance: RetrieverService | null = null;

/**
 * Get or create the singleton RetrieverService instance
 */
export function getRetrieverService(): RetrieverService {
  if (!retrieverServiceInstance) {
    retrieverServiceInstance = new RetrieverService();
  }
  return retrieverServiceInstance;
}

