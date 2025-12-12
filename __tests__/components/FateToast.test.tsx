import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { FateToast } from '../../components/FateToast/FateToast';
import { FateEventType } from '../../types';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Sparkles: ({ className }: any) => <span data-testid="sparkles-icon" className={className}>Sparkles</span>,
  AlertTriangle: ({ className }: any) => <span data-testid="alert-icon" className={className}>AlertTriangle</span>,
  X: ({ className }: any) => <span data-testid="x-icon" className={className}>X</span>
}));

describe('FateToast', () => {
  const mockOnClose = jest.fn();
  const defaultLabels = {
    fateGood: 'GOOD FORTUNE',
    fateBad: 'MISFORTUNE'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('rendering', () => {
    it('should render good toast with sparkles icon', () => {
      render(
        <FateToast
          type="good"
          onClose={mockOnClose}
          labels={defaultLabels}
        />
      );

      expect(screen.getByTestId('sparkles-icon')).toBeInTheDocument();
      expect(screen.getByText('GOOD FORTUNE')).toBeInTheDocument();
    });

    it('should render bad toast with alert icon', () => {
      render(
        <FateToast
          type="bad"
          onClose={mockOnClose}
          labels={defaultLabels}
        />
      );

      expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
      expect(screen.getByText('MISFORTUNE')).toBeInTheDocument();
    });

    it('should not render neutral toast', () => {
      const { container } = render(
        <FateToast
          type="neutral"
          onClose={mockOnClose}
          labels={defaultLabels}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should display hint when provided', () => {
      render(
        <FateToast
          type="good"
          hint="You found a treasure!"
          onClose={mockOnClose}
          labels={defaultLabels}
        />
      );

      expect(screen.getByText('You found a treasure!')).toBeInTheDocument();
    });

    it('should not display hint section when not provided', () => {
      render(
        <FateToast
          type="good"
          onClose={mockOnClose}
          labels={defaultLabels}
        />
      );

      expect(screen.getByText('GOOD FORTUNE')).toBeInTheDocument();
      // No hint text should be present
      const spans = screen.getAllByText(/./);
      expect(spans.some(s => s.textContent === 'You found')).toBe(false);
    });
  });

  describe('styling', () => {
    it('should have green/emerald styling for good toast', () => {
      const { container } = render(
        <FateToast
          type="good"
          onClose={mockOnClose}
          labels={defaultLabels}
        />
      );

      // Check for emerald classes in the container
      const innerDiv = container.querySelector('.bg-emerald-50');
      expect(innerDiv).toBeInTheDocument();
    });

    it('should have red styling for bad toast', () => {
      const { container } = render(
        <FateToast
          type="bad"
          onClose={mockOnClose}
          labels={defaultLabels}
        />
      );

      // Check for red classes in the container
      const innerDiv = container.querySelector('.bg-red-50');
      expect(innerDiv).toBeInTheDocument();
    });
  });

  describe('auto-close behavior', () => {
    it('should auto-close after 4 seconds', async () => {
      render(
        <FateToast
          type="good"
          onClose={mockOnClose}
          labels={defaultLabels}
        />
      );

      // Fast forward past the 4 second timer
      act(() => {
        jest.advanceTimersByTime(4000);
      });

      // Fast forward past the 300ms exit animation
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose before 4 seconds', () => {
      render(
        <FateToast
          type="good"
          onClose={mockOnClose}
          labels={defaultLabels}
        />
      );

      // Fast forward only 3 seconds
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('manual close', () => {
    it('should close when close button is clicked', () => {
      render(
        <FateToast
          type="good"
          onClose={mockOnClose}
          labels={defaultLabels}
        />
      );

      const closeButton = screen.getByRole('button');
      fireEvent.click(closeButton);

      // Wait for exit animation (300ms)
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should trigger exit animation before calling onClose', () => {
      render(
        <FateToast
          type="good"
          onClose={mockOnClose}
          labels={defaultLabels}
        />
      );

      const closeButton = screen.getByRole('button');
      fireEvent.click(closeButton);

      // onClose should not be called immediately
      expect(mockOnClose).not.toHaveBeenCalled();

      // After exit animation duration
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('different types', () => {
    const types: FateEventType[] = ['good', 'bad', 'neutral'];

    types.forEach(type => {
      it(`should handle type "${type}" correctly`, () => {
        const { container } = render(
          <FateToast
            type={type}
            onClose={mockOnClose}
            labels={defaultLabels}
          />
        );

        if (type === 'neutral') {
          expect(container.firstChild).toBeNull();
        } else {
          expect(container.firstChild).not.toBeNull();
        }
      });
    });
  });

  describe('accessibility', () => {
    it('should have a clickable close button', () => {
      render(
        <FateToast
          type="good"
          onClose={mockOnClose}
          labels={defaultLabels}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });
});
