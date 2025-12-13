import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { ProcessingIndicator } from '../../components/ProcessingIndicator/ProcessingIndicator';
import { ThemeColorsProvider } from '../../hooks/useThemeColors';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Brain: () => <span data-testid="brain-icon">Brain</span>,
  BookOpen: () => <span data-testid="book-icon">Book</span>,
  Sparkles: () => <span data-testid="sparkles-icon">Sparkles</span>,
  Loader2: () => <span data-testid="loader-icon">Loading</span>,
}));

// Helper to render with ThemeColorsProvider
const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeColorsProvider>{ui}</ThemeColorsProvider>);
};

describe('ProcessingIndicator', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('rendering', () => {
    it('should render nothing when phase is null', () => {
      const { container } = renderWithTheme(
        <ProcessingIndicator phase={null} language="en" />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render when phase is classifying', () => {
      renderWithTheme(
        <ProcessingIndicator phase="classifying" language="en" />
      );
      expect(screen.getByText(/Processing action/)).toBeInTheDocument();
    });

    it('should render when phase is generating', () => {
      renderWithTheme(
        <ProcessingIndicator phase="generating" language="en" />
      );
      expect(screen.getByText(/Generating response/)).toBeInTheDocument();
    });

    it('should render when phase is updating', () => {
      renderWithTheme(
        <ProcessingIndicator phase="updating" language="en" />
      );
      expect(screen.getByText(/Updating world/)).toBeInTheDocument();
    });
  });

  describe('snapshots', () => {
    it('should match snapshot for classifying phase', () => {
      const { container } = renderWithTheme(
        <ProcessingIndicator phase="classifying" language="en" />
      );
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot for generating phase', () => {
      const { container } = renderWithTheme(
        <ProcessingIndicator phase="generating" language="en" />
      );
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot for updating phase', () => {
      const { container } = renderWithTheme(
        <ProcessingIndicator phase="updating" language="en" />
      );
      expect(container).toMatchSnapshot();
    });
  });

  describe('languages', () => {
    it('should display English labels', () => {
      renderWithTheme(
        <ProcessingIndicator phase="classifying" language="en" />
      );
      expect(screen.getByText(/Processing action/)).toBeInTheDocument();
    });

    it('should display Portuguese labels', () => {
      renderWithTheme(
        <ProcessingIndicator phase="classifying" language="pt" />
      );
      expect(screen.getByText(/Processando ação/)).toBeInTheDocument();
    });

    it('should display Spanish labels', () => {
      renderWithTheme(
        <ProcessingIndicator phase="classifying" language="es" />
      );
      expect(screen.getByText(/Procesando acción/)).toBeInTheDocument();
    });

    it('should fallback to English for unsupported languages', () => {
      renderWithTheme(
        <ProcessingIndicator phase="classifying" language={'fr' as any} />
      );
      expect(screen.getByText(/Processing action/)).toBeInTheDocument();
    });
  });

  describe('progress bar', () => {
    it('should show 20% progress for classifying', () => {
      const { container } = renderWithTheme(
        <ProcessingIndicator phase="classifying" language="en" />
      );
      const progressBar = container.querySelector('[class*="transition-all"]');
      expect(progressBar).toHaveStyle({ width: '20%' });
    });

    it('should show 60% progress for generating', () => {
      const { container } = renderWithTheme(
        <ProcessingIndicator phase="generating" language="en" />
      );
      const progressBar = container.querySelector('[class*="transition-all"][style*="width: 60%"]');
      expect(progressBar).toBeTruthy();
    });

    it('should show 90% progress for updating', () => {
      const { container } = renderWithTheme(
        <ProcessingIndicator phase="updating" language="en" />
      );
      const progressBar = container.querySelector('[class*="transition-all"][style*="width: 90%"]');
      expect(progressBar).toBeTruthy();
    });
  });

  describe('phase indicators', () => {
    it('should display 3 phase indicator dots', () => {
      const { container } = renderWithTheme(
        <ProcessingIndicator phase="classifying" language="en" />
      );
      const dots = container.querySelectorAll('[class*="rounded-full"][class*="w-2"]');
      expect(dots).toHaveLength(3);
    });

    it('should highlight current phase', () => {
      const { container } = renderWithTheme(
        <ProcessingIndicator phase="generating" language="en" />
      );
      const dots = container.querySelectorAll('[class*="rounded-full"][class*="w-2"]');
      // Second dot (generating) should be scaled up
      const scaledDots = Array.from(dots).filter((dot) =>
        dot.className.includes('scale-125')
      );
      expect(scaledDots).toHaveLength(1);
    });
  });

  describe('animated dots', () => {
    it('should animate dots over time', () => {
      renderWithTheme(
        <ProcessingIndicator phase="classifying" language="en" />
      );

      // Initially no dots
      expect(screen.getByText(/Processing action$/)).toBeInTheDocument();

      // After 400ms, one dot
      act(() => {
        jest.advanceTimersByTime(400);
      });
      expect(screen.getByText(/Processing action\./)).toBeInTheDocument();

      // After 800ms, two dots
      act(() => {
        jest.advanceTimersByTime(400);
      });
      expect(screen.getByText(/Processing action\.\./)).toBeInTheDocument();

      // After 1200ms, three dots
      act(() => {
        jest.advanceTimersByTime(400);
      });
      expect(screen.getByText(/Processing action\.\.\./)).toBeInTheDocument();

      // After 1600ms, back to no dots
      act(() => {
        jest.advanceTimersByTime(400);
      });
      expect(screen.getByText(/Processing action$/)).toBeInTheDocument();
    });
  });

  describe('icons', () => {
    it('should display Brain icon for classifying', () => {
      renderWithTheme(
        <ProcessingIndicator phase="classifying" language="en" />
      );
      expect(screen.getByTestId('brain-icon')).toBeInTheDocument();
    });

    it('should display BookOpen icon for generating', () => {
      renderWithTheme(
        <ProcessingIndicator phase="generating" language="en" />
      );
      expect(screen.getByTestId('book-icon')).toBeInTheDocument();
    });

    it('should display Sparkles icon for updating', () => {
      renderWithTheme(
        <ProcessingIndicator phase="updating" language="en" />
      );
      expect(screen.getByTestId('sparkles-icon')).toBeInTheDocument();
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      const { container } = renderWithTheme(
        <ProcessingIndicator
          phase="classifying"
          language="en"
          className="custom-class"
        />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
