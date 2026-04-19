/**
 * Utility to provide actionable, context-specific error messages
 */

interface ErrorContext {
  status?: number;
  code?: string;
  originalMessage?: string;
  endpoint?: string;
}

export function getActionableErrorMessage(error: unknown, context: ErrorContext = {}): string {
  const { status, code, originalMessage } = context;

  // Network/Connection errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return 'Connection failed. Please check your internet connection and try again.';
  }

  // HTTP Status-based messages
  if (status) {
    switch (status) {
      case 400:
        if (originalMessage?.toLowerCase().includes('email')) {
          if (originalMessage.toLowerCase().includes('already') || originalMessage.toLowerCase().includes('exists')) {
            return 'This email is already registered. Try signing in or use a different email address.';
          }
          return 'Please enter a valid email address.';
        }
        return originalMessage || 'Invalid request. Please check your input and try again.';
      
      case 401:
        return 'Authentication required. Please sign in and try again.';
      
      case 403:
        return 'You don\'t have permission to perform this action.';
      
      case 404:
        return 'The requested resource was not found. Please check the URL or try again later.';
      
      case 429:
        return 'Too many requests. Please wait a moment before trying again.';
      
      case 500:
        return 'Our servers encountered an error. Please try again in a few moments. If the problem persists, contact support.';
      
      case 503:
        return 'Service temporarily unavailable. We\'re working on it. Please try again soon.';
      
      default:
        if (status >= 500) {
          return 'Server error. Our team has been notified. Please try again later.';
        }
        if (status >= 400) {
          return originalMessage || 'Request failed. Please check your input and try again.';
        }
    }
  }

  // Error code-based messages
  if (code) {
    switch (code) {
      case 'QUOTA_EXCEEDED':
        return 'You\'ve reached your usage limit. Please upgrade to continue.';
      case 'WALLET_NOT_CONNECTED':
        return 'Please connect your wallet to continue.';
      case 'WALLET_NOT_VERIFIED':
        return 'Please verify your wallet signature to continue.';
      case 'NETWORK_ERROR':
        return 'Network connection failed. Please check your internet and try again.';
      case 'TIMEOUT':
        return 'Request timed out. Please try again.';
    }
  }

  // Generic fallback
  if (error instanceof Error) {
    // Check for common error patterns
    if (error.message.toLowerCase().includes('network')) {
      return 'Network error. Check your connection and try again.';
    }
    if (error.message.toLowerCase().includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    if (error.message.toLowerCase().includes('failed to fetch')) {
      return 'Cannot reach the server. Check your connection or try again later.';
    }
    
    // Return sanitized error message
    return error.message || 'An unexpected error occurred. Please try again.';
  }

  return 'Something went wrong. Please try again, or contact support if the problem persists.';
}

/**
 * Enhanced fetch wrapper with better error handling
 */
export async function fetchWithErrorHandling(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      let errorData: any = {};
      try {
        const text = await response.text();
        errorData = text ? JSON.parse(text) : {};
      } catch {
        // Ignore JSON parse errors
      }

      throw new Error(
        getActionableErrorMessage(null, {
          status: response.status,
          code: errorData.code || errorData.error,
          originalMessage: errorData.message,
          endpoint: url,
        })
      );
    }

    return response;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(getActionableErrorMessage(error));
  }
}

