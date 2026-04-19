/**
 * RAG (Retrieval-Augmented Generation) Routes
 * 
 * Provides HTTP endpoints for document retrieval from the knowledge base.
 * 
 * Security:
 * - Index/Delete operations require admin authentication
 * - All indexing operations are logged to audit log
 */

import { Router, Response } from 'express';
import Joi from 'joi';
import logger from '../lib/logger';
import { validate } from '../middleware/validation';
import { getRetrieverService } from '../lib/retriever.service';
import { adminAuth, AdminRequest } from '../middleware/admin-auth';
import { logRAGOperation } from '../lib/rag-audit';
import { RAGOperation } from '@prisma/client';

const router = Router();

// Lazy getter for retriever service (only instantiate when needed)
function getRetriever() {
  return getRetrieverService();
}

/**
 * Validation schema for retrieval request
 */
const retrieveSchema = Joi.object({
  query: Joi.string().min(1).max(1000).required(),
  limit: Joi.number().integer().min(1).max(20).optional(),
  minScore: Joi.number().min(0).max(1).optional(),
  source: Joi.string().max(100).optional(),
  documentId: Joi.string().max(255).optional(),
});

/**
 * Validation schema for document indexing
 * Increased max size to 500KB to allow larger documents
 */
const indexDocumentSchema = Joi.object({
  text: Joi.string().min(1).max(500000).required(),
  source: Joi.string().max(100).required(),
  documentId: Joi.string().max(255).optional(),
  metadata: Joi.object().optional(),
});

/**
 * Validation schema for batch indexing
 */
const batchIndexSchema = Joi.object({
  documents: Joi.array().items(
    Joi.object({
      text: Joi.string().min(1).max(500000).required(),
      source: Joi.string().max(100).required(),
      documentId: Joi.string().max(255).optional(),
      metadata: Joi.object().optional(),
    })
  ).min(1).max(100).required(),
});

/**
 * POST /api/rag/retrieve
 * Retrieve relevant documents for a query
 * 
 * Request body:
 * {
 *   query: string,
 *   limit?: number (default: 5),
 *   minScore?: number (default: 0.5),
 *   source?: string,
 *   documentId?: string
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   data: {
 *     documents: Array<{
 *       text: string,
 *       source: string,
 *       score: number,
 *       documentId?: string,
 *       metadata?: object
 *     }>,
 *     query: string,
 *     count: number
 *   }
 * }
 */
router.post(
  '/retrieve',
  validate(retrieveSchema),
  async (req: AdminRequest, res: Response) => {
    try {
      const { query, limit, minScore, source, documentId } = req.body;

      const retrieverService = getRetriever();
      const result = await retrieverService.retrieve(query, {
        limit,
        minScore,
        source,
        documentId,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('RAG retrieve error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve documents',
        error: 'RETRIEVAL_ERROR',
      });
    }
  }
);

/**
 * POST /api/rag/index
 * Index a document into the knowledge base
 * 
 * Auth: Admin required (API key or admin wallet)
 * 
 * Request body:
 * {
 *   text: string,
 *   source: string,
 *   documentId?: string,
 *   metadata?: object
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   message: string,
 *   data: {
 *     documentId: string
 *   }
 * }
 */
router.post(
  '/index',
  adminAuth,
  validate(indexDocumentSchema),
  async (req: AdminRequest, res: Response) => {
    let docId: string | undefined;
    try {
      const { text, source, documentId, metadata } = req.body;

      // Generate document ID if not provided
      docId = documentId || `doc_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      const retrieverService = getRetriever();
      await retrieverService.indexDocument(text, source, docId, metadata);

      // Log successful operation
      await logRAGOperation({
        operation: RAGOperation.INDEX,
        walletAddress: req.wallet?.walletAddress || req.admin?.identifier || null,
        documentId: docId,
        source,
        documentSize: Buffer.byteLength(text, 'utf8'),
        success: true,
        req,
      });

      res.json({
        success: true,
        message: 'Document indexed successfully',
        data: {
          documentId: docId,
        },
      });
    } catch (error: any) {
      logger.error('RAG index error:', error);

      // Log failed operation
      await logRAGOperation({
        operation: RAGOperation.INDEX,
        walletAddress: req.wallet?.walletAddress || req.admin?.identifier || null,
        documentId: docId,
        source: req.body?.source || null,
        documentSize: req.body?.text ? Buffer.byteLength(req.body.text, 'utf8') : null,
        success: false,
        errorMessage: error.message || 'Unknown error',
        req,
      });

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to index document',
        error: 'INDEXING_ERROR',
      });
    }
  }
);

/**
 * POST /api/rag/index/batch
 * Index multiple documents in batch
 * 
 * Auth: Admin required (API key or admin wallet)
 * 
 * Request body:
 * {
 *   documents: Array<{
 *     text: string,
 *     source: string,
 *     documentId?: string,
 *     metadata?: object
 *   }>
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   message: string,
 *   data: {
 *     count: number,
 *     documentIds: string[]
 *   }
 * }
 */
router.post(
  '/index/batch',
  adminAuth,
  validate(batchIndexSchema),
  async (req: AdminRequest, res: Response) => {
    try {
      const { documents } = req.body;

      const retrieverService = getRetriever();
      await retrieverService.indexDocuments(documents);

      const documentIds = documents.map(
        (doc: any) => doc.documentId || `doc_${Date.now()}_${Math.random().toString(36).substring(7)}`
      );

      // Log successful batch operation
      const totalSize = documents.reduce(
        (sum: number, doc: any) => sum + Buffer.byteLength(doc.text, 'utf8'),
        0
      );

      await logRAGOperation({
        operation: RAGOperation.BATCH_INDEX,
        walletAddress: req.wallet?.walletAddress || req.admin?.identifier || null,
        source: documents[0]?.source || null,
        documentSize: totalSize,
        success: true,
        req,
      });

      res.json({
        success: true,
        message: `Successfully indexed ${documents.length} documents`,
        data: {
          count: documents.length,
          documentIds,
        },
      });
    } catch (error: any) {
      logger.error('RAG batch index error:', error);

      // Log failed operation
      await logRAGOperation({
        operation: RAGOperation.BATCH_INDEX,
        walletAddress: req.wallet?.walletAddress || req.admin?.identifier || null,
        success: false,
        errorMessage: error.message || 'Unknown error',
        req,
      });

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to index documents',
        error: 'BATCH_INDEXING_ERROR',
      });
    }
  }
);

/**
 * DELETE /api/rag/document/:documentId
 * Delete a document from the knowledge base
 * 
 * Auth: Admin required (API key or admin wallet)
 */
router.delete('/document/:documentId', adminAuth, async (req: AdminRequest, res: Response) => {
  let documentId: string | undefined;
  try {
    const raw = req.params.documentId;
    documentId = typeof raw === 'string' ? raw : raw?.[0];

    if (!documentId) {
      return res.status(400).json({
        success: false,
        message: 'Document ID is required',
      });
    }

    const retrieverService = getRetriever();
    await retrieverService.deleteDocument(documentId);

    // Log successful operation
    await logRAGOperation({
      operation: RAGOperation.DELETE,
      walletAddress: req.wallet?.walletAddress || req.admin?.identifier || null,
      documentId,
      success: true,
      req,
    });

    res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error: any) {
    logger.error('RAG delete error:', error);

    // Log failed operation
    await logRAGOperation({
      operation: RAGOperation.DELETE,
      walletAddress: req.wallet?.walletAddress || req.admin?.identifier || null,
      documentId,
      success: false,
      errorMessage: error.message || 'Unknown error',
      req,
    });

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete document',
      error: 'DELETION_ERROR',
    });
  }
});

/**
 * GET /api/rag/health
 * Health check for RAG service
 */
router.get('/health', async (_req: AdminRequest, res: Response) => {
  try {
    const retrieverService = getRetriever();
    const health = await retrieverService.healthCheck();

    res.json({
      success: true,
      data: health,
    });
  } catch (error: any) {
    logger.error('RAG health check error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Health check failed',
      data: {
        healthy: false,
        embedding: false,
        qdrant: false,
      },
    });
  }
});

export default router;

