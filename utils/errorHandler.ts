
import { ErrorType } from '../components/ErrorModal';

interface OpenAIError {
  error?: {
    code?: string;
    type?: string;
    message?: string;
  };
  status?: number;
  message?: string;
}

/**
 * Parses an error from OpenAI API and returns a typed error classification.
 * @param error - The error object from a catch block
 * @returns Object with errorType and optional message
 */
export const parseOpenAIError = (error: any): { errorType: ErrorType; message?: string } => {
  // Handle OpenAI SDK errors
  if (error?.error?.code || error?.error?.type) {
    const code = error.error.code || error.error.type;
    const message = error.error.message;

    switch (code) {
      case 'insufficient_quota':
        return { errorType: 'insufficient_quota', message };
      case 'invalid_api_key':
        return { errorType: 'invalid_key', message };
      case 'rate_limit_exceeded':
        return { errorType: 'rate_limit', message };
      default:
        return { errorType: 'generic', message };
    }
  }

  // Handle HTTP status codes
  if (error?.status) {
    switch (error.status) {
      case 401:
        return { errorType: 'invalid_key', message: 'Invalid API key' };
      case 429:
        // Check if it's quota or rate limit
        if (error.message?.includes('quota')) {
          return { errorType: 'insufficient_quota', message: error.message };
        }
        return { errorType: 'rate_limit', message: error.message };
      case 500:
      case 502:
      case 503:
        return { errorType: 'network', message: 'OpenAI service temporarily unavailable' };
      default:
        return { errorType: 'generic', message: error.message };
    }
  }

  // Handle string errors or messages
  const errorMessage = error?.message || String(error);

  if (errorMessage.includes('insufficient_quota') || errorMessage.includes('exceeded your current quota')) {
    return { errorType: 'insufficient_quota', message: errorMessage };
  }

  if (errorMessage.includes('invalid') && errorMessage.includes('key')) {
    return { errorType: 'invalid_key', message: errorMessage };
  }

  if (errorMessage.includes('rate') && errorMessage.includes('limit')) {
    return { errorType: 'rate_limit', message: errorMessage };
  }

  if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('ECONNREFUSED')) {
    return { errorType: 'network', message: errorMessage };
  }

  return { errorType: 'generic', message: errorMessage };
};

/**
 * Checks if an error is related to billing/quota issues.
 */
export const isQuotaError = (error: any): boolean => {
  const { errorType } = parseOpenAIError(error);
  return errorType === 'insufficient_quota';
};

/**
 * Checks if an error is recoverable (user can retry).
 */
export const isRecoverableError = (error: any): boolean => {
  const { errorType } = parseOpenAIError(error);
  return errorType === 'rate_limit' || errorType === 'network';
};
