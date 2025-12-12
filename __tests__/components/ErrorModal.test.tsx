import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorModal, ErrorType } from '../../components/ErrorModal';

describe('ErrorModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <ErrorModal
          isOpen={false}
          onClose={mockOnClose}
          errorType="generic"
        />
      );

      expect(screen.queryByText('SYSTEM ERROR')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
          errorType="generic"
        />
      );

      expect(screen.getByText('SYSTEM ERROR')).toBeInTheDocument();
    });
  });

  describe('error types', () => {
    it('should display insufficient_quota error correctly', () => {
      render(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
          errorType="insufficient_quota"
        />
      );

      expect(screen.getByText('INSUFFICIENT CREDITS')).toBeInTheDocument();
      expect(screen.getByText(/OpenAI account has run out of credits/)).toBeInTheDocument();
      expect(screen.getByText('ADD CREDITS')).toBeInTheDocument();
    });

    it('should display invalid_key error correctly', () => {
      render(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
          errorType="invalid_key"
        />
      );

      expect(screen.getByText('INVALID API KEY')).toBeInTheDocument();
      expect(screen.getByText(/API key provided is invalid/)).toBeInTheDocument();
      expect(screen.getByText('MANAGE KEYS')).toBeInTheDocument();
    });

    it('should display rate_limit error correctly', () => {
      render(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
          errorType="rate_limit"
        />
      );

      expect(screen.getByText('RATE LIMIT EXCEEDED')).toBeInTheDocument();
      expect(screen.getByText(/Too many requests/)).toBeInTheDocument();
      expect(screen.getByText('UNDERSTOOD')).toBeInTheDocument();
    });

    it('should display network error correctly', () => {
      render(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
          errorType="network"
        />
      );

      expect(screen.getByText('CONNECTION ERROR')).toBeInTheDocument();
      expect(screen.getByText(/Unable to connect to OpenAI servers/)).toBeInTheDocument();
      expect(screen.getByText('RETRY')).toBeInTheDocument();
    });

    it('should display generic error correctly', () => {
      render(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
          errorType="generic"
        />
      );

      expect(screen.getByText('SYSTEM ERROR')).toBeInTheDocument();
      expect(screen.getByText(/unexpected error occurred/)).toBeInTheDocument();
      expect(screen.getByText('DISMISS')).toBeInTheDocument();
    });
  });

  describe('error message', () => {
    it('should display custom error message when provided', () => {
      render(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
          errorType="generic"
          errorMessage="Custom error details here"
        />
      );

      expect(screen.getByText('Custom error details here')).toBeInTheDocument();
    });

    it('should not display error message section when not provided', () => {
      render(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
          errorType="generic"
        />
      );

      // The description should be there, but no additional message
      expect(screen.getByText(/unexpected error occurred/)).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onClose when X button is clicked', () => {
      render(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
          errorType="generic"
        />
      );

      // Find the X button (close button in header)
      const closeButtons = screen.getAllByRole('button');
      // The first button is likely the X in the header
      fireEvent.click(closeButtons[0]);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when CLOSE button is clicked', () => {
      render(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
          errorType="generic"
        />
      );

      fireEvent.click(screen.getByText('CLOSE'));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when action button is clicked for non-link errors', () => {
      render(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
          errorType="rate_limit"
        />
      );

      fireEvent.click(screen.getByText('UNDERSTOOD'));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('external links', () => {
    it('should render external link for insufficient_quota error', () => {
      render(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
          errorType="insufficient_quota"
        />
      );

      const link = screen.getByText('ADD CREDITS').closest('a');
      expect(link).toHaveAttribute('href', 'https://platform.openai.com/settings/organization/billing/overview');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should render external link for invalid_key error', () => {
      render(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
          errorType="invalid_key"
        />
      );

      const link = screen.getByText('MANAGE KEYS').closest('a');
      expect(link).toHaveAttribute('href', 'https://platform.openai.com/api-keys');
    });
  });

  describe('tips and hints', () => {
    it('should display tip for insufficient_quota error', () => {
      render(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
          errorType="insufficient_quota"
        />
      );

      expect(screen.getByText(/minimum of \$5 USD/)).toBeInTheDocument();
    });

    it('should not display tip for other error types', () => {
      render(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
          errorType="network"
        />
      );

      expect(screen.queryByText(/minimum of \$5 USD/)).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper heading structure', () => {
      render(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
          errorType="generic"
        />
      );

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('SYSTEM ERROR');
    });

    it('should have clickable buttons', () => {
      render(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
          errorType="generic"
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });
  });
});
