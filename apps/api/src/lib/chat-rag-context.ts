import logger from './logger';
import { getRetrieverService } from './retriever.service';
import { resolveDrSafeSystemPrompt } from './dr-safe-system-prompt';
import type { ChatCompletionRequest } from './ai-gateway.service';

async function retrieveRelevantContext(query: string): Promise<string> {
  try {
    const retrieverService = getRetrieverService();
    const result = await retrieverService.retrieve(query, {
      limit: 3,
      minScore: 0.5,
      source: undefined,
    });

    if (result.documents.length === 0) {
      return '';
    }

    const contextSections = result.documents.map((doc, index) => {
      const sourceType = doc.source === 'faq' ? 'FAQ' : 'Terms of Service';
      return `[${sourceType} - Reference ${index + 1}]\n${doc.text}`;
    });

    return `\n\nRelevant information from SafePsy FAQs and Terms of Service:\n${contextSections.join('\n\n')}`;
  } catch (error: any) {
    logger.warn('RAG retrieval failed, continuing without context:', error.message);
    return '';
  }
}

/**
 * Enhance chat request with RAG context (FAQs / ToS) into the system message.
 */
export async function enhanceWithRAG(request: ChatCompletionRequest): Promise<ChatCompletionRequest> {
  try {
    const userMessages = request.messages.filter((msg) => msg.role === 'user');
    if (userMessages.length === 0) {
      return request;
    }

    const lastUserMessage = userMessages[userMessages.length - 1];
    const query = lastUserMessage.content;
    const context = await retrieveRelevantContext(query);

    if (!context) {
      return request;
    }

    let systemMessage = request.messages.find((msg) => msg.role === 'system');
    const baseSystemPrompt = resolveDrSafeSystemPrompt(request.mode);

    if (systemMessage) {
      systemMessage = {
        ...systemMessage,
        content: `${systemMessage.content}${context}`,
      };
    } else {
      systemMessage = {
        role: 'system',
        content: `${baseSystemPrompt}${context}`,
      };
      request.messages.unshift(systemMessage);
      return request;
    }

    const systemIndex = request.messages.findIndex((msg) => msg.role === 'system');
    if (systemIndex >= 0) {
      request.messages[systemIndex] = systemMessage;
    }

    return request;
  } catch (error: any) {
    logger.warn('Failed to enhance with RAG, using original request:', error.message);
    return request;
  }
}
