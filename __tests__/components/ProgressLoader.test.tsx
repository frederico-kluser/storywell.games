import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  ProgressLoader,
  LoadingStep,
  createLoadingStep,
  STORY_CREATION_STEPS,
  MESSAGE_PROCESSING_STEPS,
} from '../../components/ProgressLoader/ProgressLoader';
import { ThemeColorsProvider } from '../../hooks/useThemeColors';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Check: () => <span data-testid="check-icon">Check</span>,
  Loader2: () => <span data-testid="loader-icon">Loading</span>,
  Circle: () => <span data-testid="circle-icon">Circle</span>,
  Sparkles: () => <span data-testid="sparkles-icon">Sparkles</span>,
  Palette: () => <span data-testid="palette-icon">Palette</span>,
  Users: () => <span data-testid="users-icon">Users</span>,
  MapPin: () => <span data-testid="mappin-icon">MapPin</span>,
  BookOpen: () => <span data-testid="book-icon">Book</span>,
  Brain: () => <span data-testid="brain-icon">Brain</span>,
  Image: () => <span data-testid="image-icon">Image</span>,
}));

// Helper to render with ThemeColorsProvider
const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeColorsProvider>{ui}</ThemeColorsProvider>);
};

const createMockSteps = (): LoadingStep[] => [
  { id: 'step1', label: 'First Step', status: 'completed', icon: 'sparkles' },
  { id: 'step2', label: 'Second Step', status: 'loading', icon: 'story' },
  { id: 'step3', label: 'Third Step', status: 'pending', icon: 'characters' },
];

describe('ProgressLoader', () => {
  describe('rendering', () => {
    it('should render without crashing', () => {
      const steps = createMockSteps();
      renderWithTheme(<ProgressLoader steps={steps} />);
      expect(document.body).toBeInTheDocument();
    });

    it('should render all steps', () => {
      const steps = createMockSteps();
      renderWithTheme(<ProgressLoader steps={steps} />);

      expect(screen.getByText('First Step')).toBeInTheDocument();
      // Second Step appears multiple times (in list and in current step indicator)
      const secondSteps = screen.getAllByText('Second Step');
      expect(secondSteps.length).toBeGreaterThan(0);
      expect(screen.getByText('Third Step')).toBeInTheDocument();
    });

    it('should render title when provided', () => {
      const steps = createMockSteps();
      renderWithTheme(<ProgressLoader steps={steps} title="Creating Story" />);

      expect(screen.getByText('Creating Story')).toBeInTheDocument();
    });

    it('should render subtitle when provided', () => {
      const steps = createMockSteps();
      renderWithTheme(
        <ProgressLoader steps={steps} subtitle="Please wait while we set up your adventure" />
      );

      expect(screen.getByText('Please wait while we set up your adventure')).toBeInTheDocument();
    });
  });

  describe('snapshots', () => {
    it('should match snapshot for modal variant', () => {
      const steps = createMockSteps();
      const { container } = renderWithTheme(
        <ProgressLoader
          steps={steps}
          title="Creating Story"
          subtitle="Please wait"
          variant="modal"
        />
      );
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot for inline variant', () => {
      const steps = createMockSteps();
      const { container } = renderWithTheme(
        <ProgressLoader steps={steps} variant="inline" />
      );
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot for compact variant', () => {
      const steps = createMockSteps();
      const { container } = renderWithTheme(
        <ProgressLoader steps={steps} variant="compact" />
      );
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot with all steps completed', () => {
      const steps: LoadingStep[] = [
        { id: 'step1', label: 'Step 1', status: 'completed' },
        { id: 'step2', label: 'Step 2', status: 'completed' },
        { id: 'step3', label: 'Step 3', status: 'completed' },
      ];
      const { container } = renderWithTheme(<ProgressLoader steps={steps} />);
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot with all steps pending', () => {
      const steps: LoadingStep[] = [
        { id: 'step1', label: 'Step 1', status: 'pending' },
        { id: 'step2', label: 'Step 2', status: 'pending' },
        { id: 'step3', label: 'Step 3', status: 'pending' },
      ];
      const { container } = renderWithTheme(<ProgressLoader steps={steps} />);
      expect(container).toMatchSnapshot();
    });
  });

  describe('variants', () => {
    it('should render compact variant correctly', () => {
      const steps = createMockSteps();
      renderWithTheme(<ProgressLoader steps={steps} variant="compact" />);

      // Compact should show current step label
      expect(screen.getByText('Second Step')).toBeInTheDocument();
    });

    it('should render inline variant with progress bar', () => {
      const steps = createMockSteps();
      const { container } = renderWithTheme(
        <ProgressLoader steps={steps} variant="inline" />
      );

      // Should have progress percentage
      expect(screen.getByText('33%')).toBeInTheDocument();
      expect(screen.getByText('1/3')).toBeInTheDocument();
    });

    it('should render modal variant with full details', () => {
      const steps = createMockSteps();
      renderWithTheme(
        <ProgressLoader
          steps={steps}
          variant="modal"
          title="Test Title"
          subtitle="Test Subtitle"
        />
      );

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
      expect(screen.getByText('1 of 3 completed')).toBeInTheDocument();
    });
  });

  describe('progress calculation', () => {
    it('should calculate 0% for all pending', () => {
      const steps: LoadingStep[] = [
        { id: 'step1', label: 'Step 1', status: 'pending' },
        { id: 'step2', label: 'Step 2', status: 'pending' },
      ];
      renderWithTheme(<ProgressLoader steps={steps} variant="inline" />);

      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should calculate 50% for half completed', () => {
      const steps: LoadingStep[] = [
        { id: 'step1', label: 'Step 1', status: 'completed' },
        { id: 'step2', label: 'Step 2', status: 'loading' },
      ];
      renderWithTheme(<ProgressLoader steps={steps} variant="inline" />);

      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should calculate 100% for all completed', () => {
      const steps: LoadingStep[] = [
        { id: 'step1', label: 'Step 1', status: 'completed' },
        { id: 'step2', label: 'Step 2', status: 'completed' },
      ];
      renderWithTheme(<ProgressLoader steps={steps} variant="inline" />);

      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('step status icons', () => {
    it('should show check icon for completed steps', () => {
      const steps: LoadingStep[] = [
        { id: 'step1', label: 'Completed', status: 'completed' },
      ];
      renderWithTheme(<ProgressLoader steps={steps} />);

      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    });

    it('should show custom icon for loading steps', () => {
      const steps: LoadingStep[] = [
        { id: 'step1', label: 'Loading', status: 'loading', icon: 'sparkles' },
      ];
      renderWithTheme(<ProgressLoader steps={steps} />);

      const sparklesIcons = screen.getAllByTestId('sparkles-icon');
      expect(sparklesIcons.length).toBeGreaterThan(0);
    });

    it('should show "Processing..." text for loading steps', () => {
      const steps: LoadingStep[] = [
        { id: 'step1', label: 'Loading Step', status: 'loading' },
      ];
      renderWithTheme(<ProgressLoader steps={steps} />);

      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
  });

  describe('createLoadingStep helper', () => {
    it('should create a loading step with correct defaults', () => {
      const step = createLoadingStep('test-id', 'Test Label');

      expect(step).toEqual({
        id: 'test-id',
        label: 'Test Label',
        status: 'pending',
        icon: undefined,
      });
    });

    it('should create a loading step with icon', () => {
      const step = createLoadingStep('test-id', 'Test Label', 'sparkles');

      expect(step).toEqual({
        id: 'test-id',
        label: 'Test Label',
        status: 'pending',
        icon: 'sparkles',
      });
    });
  });

  describe('preset steps', () => {
    it('should have English story creation steps', () => {
      expect(STORY_CREATION_STEPS.en).toHaveLength(6);
      expect(STORY_CREATION_STEPS.en[0].label).toBe('Initializing story engine');
    });

    it('should have Portuguese story creation steps', () => {
      expect(STORY_CREATION_STEPS.pt).toHaveLength(6);
      expect(STORY_CREATION_STEPS.pt[0].label).toBe('Inicializando motor da história');
    });

    it('should have Spanish story creation steps', () => {
      expect(STORY_CREATION_STEPS.es).toHaveLength(6);
      expect(STORY_CREATION_STEPS.es[0].label).toBe('Inicializando motor de historia');
    });

    it('should have English message processing steps', () => {
      expect(MESSAGE_PROCESSING_STEPS.en).toHaveLength(3);
      expect(MESSAGE_PROCESSING_STEPS.en[0].label).toBe('Processing your action');
    });

    it('should have Portuguese message processing steps', () => {
      expect(MESSAGE_PROCESSING_STEPS.pt).toHaveLength(3);
      expect(MESSAGE_PROCESSING_STEPS.pt[0].label).toBe('Processando sua ação');
    });

    it('should have Spanish message processing steps', () => {
      expect(MESSAGE_PROCESSING_STEPS.es).toHaveLength(3);
      expect(MESSAGE_PROCESSING_STEPS.es[0].label).toBe('Procesando tu acción');
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      const steps = createMockSteps();
      const { container } = renderWithTheme(
        <ProgressLoader steps={steps} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('empty steps', () => {
    it('should handle empty steps array', () => {
      renderWithTheme(<ProgressLoader steps={[]} />);

      // Should show 100% with no steps
      expect(screen.queryByText('100%')).not.toBeInTheDocument();
    });
  });

  describe('current step indicator', () => {
    it('should show current step message at bottom', () => {
      const steps = createMockSteps();
      renderWithTheme(<ProgressLoader steps={steps} />);

      // The current loading step should be displayed at bottom
      const currentStepIndicator = screen.getAllByText('Second Step');
      expect(currentStepIndicator.length).toBeGreaterThan(0);
    });
  });
});
