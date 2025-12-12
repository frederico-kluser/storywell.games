import { parseOpenAIError, isQuotaError, isRecoverableError } from '../../utils/errorHandler';

describe('errorHandler', () => {
  describe('parseOpenAIError', () => {
    describe('OpenAI SDK errors (error.error.code)', () => {
      it('should identify insufficient_quota error', () => {
        const error = {
          error: {
            code: 'insufficient_quota',
            message: 'You have exceeded your quota'
          }
        };

        const result = parseOpenAIError(error);

        expect(result.errorType).toBe('insufficient_quota');
        expect(result.message).toBe('You have exceeded your quota');
      });

      it('should identify invalid_api_key error', () => {
        const error = {
          error: {
            code: 'invalid_api_key',
            message: 'Invalid API key provided'
          }
        };

        const result = parseOpenAIError(error);

        expect(result.errorType).toBe('invalid_key');
        expect(result.message).toBe('Invalid API key provided');
      });

      it('should identify rate_limit_exceeded error', () => {
        const error = {
          error: {
            code: 'rate_limit_exceeded',
            message: 'Rate limit exceeded'
          }
        };

        const result = parseOpenAIError(error);

        expect(result.errorType).toBe('rate_limit');
        expect(result.message).toBe('Rate limit exceeded');
      });

      it('should identify generic error for unknown codes', () => {
        const error = {
          error: {
            code: 'unknown_error',
            message: 'Something went wrong'
          }
        };

        const result = parseOpenAIError(error);

        expect(result.errorType).toBe('generic');
        expect(result.message).toBe('Something went wrong');
      });

      it('should use error.type if code is not present', () => {
        const error = {
          error: {
            type: 'insufficient_quota',
            message: 'Quota exceeded'
          }
        };

        const result = parseOpenAIError(error);

        expect(result.errorType).toBe('insufficient_quota');
      });
    });

    describe('HTTP status code errors', () => {
      it('should identify 401 as invalid_key', () => {
        const error = { status: 401 };

        const result = parseOpenAIError(error);

        expect(result.errorType).toBe('invalid_key');
        expect(result.message).toBe('Invalid API key');
      });

      it('should identify 429 with quota message as insufficient_quota', () => {
        const error = {
          status: 429,
          message: 'You have exceeded your quota limit'
        };

        const result = parseOpenAIError(error);

        expect(result.errorType).toBe('insufficient_quota');
      });

      it('should identify 429 without quota message as rate_limit', () => {
        const error = {
          status: 429,
          message: 'Too many requests'
        };

        const result = parseOpenAIError(error);

        expect(result.errorType).toBe('rate_limit');
      });

      it('should identify 500 as network error', () => {
        const error = { status: 500 };

        const result = parseOpenAIError(error);

        expect(result.errorType).toBe('network');
        expect(result.message).toBe('OpenAI service temporarily unavailable');
      });

      it('should identify 502 as network error', () => {
        const error = { status: 502 };

        const result = parseOpenAIError(error);

        expect(result.errorType).toBe('network');
      });

      it('should identify 503 as network error', () => {
        const error = { status: 503 };

        const result = parseOpenAIError(error);

        expect(result.errorType).toBe('network');
      });

      it('should return generic for other status codes', () => {
        const error = { status: 400, message: 'Bad request' };

        const result = parseOpenAIError(error);

        expect(result.errorType).toBe('generic');
        expect(result.message).toBe('Bad request');
      });
    });

    describe('String message errors', () => {
      it('should identify quota errors from message', () => {
        const error = { message: 'You have exceeded your current quota' };

        const result = parseOpenAIError(error);

        expect(result.errorType).toBe('insufficient_quota');
      });

      it('should identify insufficient_quota from message', () => {
        const error = { message: 'Error: insufficient_quota' };

        const result = parseOpenAIError(error);

        expect(result.errorType).toBe('insufficient_quota');
      });

      it('should identify invalid key from message', () => {
        const error = { message: 'The API key is invalid' };

        const result = parseOpenAIError(error);

        expect(result.errorType).toBe('invalid_key');
      });

      it('should identify rate limit from message', () => {
        const error = { message: 'rate limit has been reached' };

        const result = parseOpenAIError(error);

        expect(result.errorType).toBe('rate_limit');
      });

      it('should identify network errors from message', () => {
        const error = { message: 'network error occurred' };

        const result = parseOpenAIError(error);

        expect(result.errorType).toBe('network');
      });

      it('should identify fetch errors as network', () => {
        const error = { message: 'Failed to fetch' };

        const result = parseOpenAIError(error);

        expect(result.errorType).toBe('network');
      });

      it('should identify ECONNREFUSED as network', () => {
        const error = { message: 'connect ECONNREFUSED' };

        const result = parseOpenAIError(error);

        expect(result.errorType).toBe('network');
      });

      it('should return generic for unknown messages', () => {
        const error = { message: 'Something unexpected happened' };

        const result = parseOpenAIError(error);

        expect(result.errorType).toBe('generic');
      });
    });

    describe('Edge cases', () => {
      it('should handle string error', () => {
        const error = 'Simple error string';

        const result = parseOpenAIError(error);

        expect(result.errorType).toBe('generic');
        expect(result.message).toBe('Simple error string');
      });

      it('should handle null error', () => {
        const result = parseOpenAIError(null);

        expect(result.errorType).toBe('generic');
      });

      it('should handle undefined error', () => {
        const result = parseOpenAIError(undefined);

        expect(result.errorType).toBe('generic');
      });

      it('should handle empty object', () => {
        const result = parseOpenAIError({});

        expect(result.errorType).toBe('generic');
      });
    });
  });

  describe('isQuotaError', () => {
    it('should return true for quota errors', () => {
      const error = {
        error: { code: 'insufficient_quota' }
      };

      expect(isQuotaError(error)).toBe(true);
    });

    it('should return false for non-quota errors', () => {
      const error = {
        error: { code: 'rate_limit_exceeded' }
      };

      expect(isQuotaError(error)).toBe(false);
    });

    it('should return false for generic errors', () => {
      const error = { message: 'Unknown error' };

      expect(isQuotaError(error)).toBe(false);
    });

    it('should return true for message-based quota errors', () => {
      const error = { message: 'exceeded your current quota' };

      expect(isQuotaError(error)).toBe(true);
    });
  });

  describe('isRecoverableError', () => {
    it('should return true for rate_limit errors', () => {
      const error = {
        error: { code: 'rate_limit_exceeded' }
      };

      expect(isRecoverableError(error)).toBe(true);
    });

    it('should return true for network errors', () => {
      const error = { status: 503 };

      expect(isRecoverableError(error)).toBe(true);
    });

    it('should return false for quota errors', () => {
      const error = {
        error: { code: 'insufficient_quota' }
      };

      expect(isRecoverableError(error)).toBe(false);
    });

    it('should return false for invalid key errors', () => {
      const error = { status: 401 };

      expect(isRecoverableError(error)).toBe(false);
    });

    it('should return false for generic errors', () => {
      const error = { message: 'Unknown error' };

      expect(isRecoverableError(error)).toBe(false);
    });

    it('should return true for fetch errors', () => {
      const error = { message: 'Failed to fetch' };

      expect(isRecoverableError(error)).toBe(true);
    });
  });
});
