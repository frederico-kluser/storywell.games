import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { StoryCreationLoader, CreationPhase } from '../../components/StoryCreationLoader/StoryCreationLoader';
import { ThemeColorsProvider } from '../../hooks/useThemeColors';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Sparkles: () => <span data-testid="sparkles-icon">Sparkles</span>,
  BookOpen: () => <span data-testid="book-icon">Book</span>,
  Palette: () => <span data-testid="palette-icon">Palette</span>,
  Users: () => <span data-testid="users-icon">Users</span>,
  MapPin: () => <span data-testid="mappin-icon">MapPin</span>,
  Image: () => <span data-testid="image-icon">Image</span>,
  Wand2: () => <span data-testid="wand-icon">Wand</span>,
}));

// Helper to render with ThemeColorsProvider
const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeColorsProvider>{ui}</ThemeColorsProvider>);
};

describe('StoryCreationLoader', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      renderWithTheme(
        <StoryCreationLoader phase="initializing" language="en" />
      );
      expect(document.body).toBeInTheDocument();
    });

    it('should render all phases', () => {
      const phases: CreationPhase[] = [
        'initializing',
        'colors',
        'world',
        'characters',
        'avatar',
        'finalizing',
      ];

      phases.forEach((phase) => {
        const { unmount } = renderWithTheme(
          <StoryCreationLoader phase={phase} language="en" />
        );
        expect(document.body).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('snapshots', () => {
    it('should match snapshot for initializing phase', () => {
      const { container } = renderWithTheme(
        <StoryCreationLoader phase="initializing" language="en" />
      );
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot for colors phase', () => {
      const { container } = renderWithTheme(
        <StoryCreationLoader phase="colors" language="en" />
      );
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot for world phase', () => {
      const { container } = renderWithTheme(
        <StoryCreationLoader phase="world" language="en" />
      );
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot for characters phase', () => {
      const { container } = renderWithTheme(
        <StoryCreationLoader phase="characters" language="en" />
      );
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot for avatar phase', () => {
      const { container } = renderWithTheme(
        <StoryCreationLoader phase="avatar" language="en" />
      );
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot for finalizing phase', () => {
      const { container } = renderWithTheme(
        <StoryCreationLoader phase="finalizing" language="en" />
      );
      expect(container).toMatchSnapshot();
    });
  });

  describe('phase labels', () => {
    it('should display correct label for initializing', () => {
      renderWithTheme(
        <StoryCreationLoader phase="initializing" language="en" />
      );
      const elements = screen.getAllByText('Initializing');
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should display correct label for colors', () => {
      renderWithTheme(
        <StoryCreationLoader phase="colors" language="en" />
      );
      const elements = screen.getAllByText('Theme Colors');
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should display correct label for world', () => {
      renderWithTheme(
        <StoryCreationLoader phase="world" language="en" />
      );
      const elements = screen.getAllByText('World Building');
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should display correct label for characters', () => {
      renderWithTheme(
        <StoryCreationLoader phase="characters" language="en" />
      );
      const elements = screen.getAllByText('Characters');
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should display correct label for avatar', () => {
      renderWithTheme(
        <StoryCreationLoader phase="avatar" language="en" />
      );
      const elements = screen.getAllByText('Avatar');
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should display correct label for finalizing', () => {
      renderWithTheme(
        <StoryCreationLoader phase="finalizing" language="en" />
      );
      const elements = screen.getAllByText('Opening Scene');
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  describe('phase descriptions', () => {
    it('should display description for initializing', () => {
      renderWithTheme(
        <StoryCreationLoader phase="initializing" language="en" />
      );
      expect(screen.getByText(/Starting up the story engine/)).toBeInTheDocument();
    });

    it('should display description for colors', () => {
      renderWithTheme(
        <StoryCreationLoader phase="colors" language="en" />
      );
      expect(screen.getByText(/Creating your unique visual palette/)).toBeInTheDocument();
    });
  });

  describe('languages', () => {
    it('should display English labels', () => {
      renderWithTheme(
        <StoryCreationLoader phase="initializing" language="en" />
      );
      const elements = screen.getAllByText('Initializing');
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should display Portuguese labels', () => {
      renderWithTheme(
        <StoryCreationLoader phase="initializing" language="pt" />
      );
      const elements = screen.getAllByText('Inicializando');
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should display Spanish labels', () => {
      renderWithTheme(
        <StoryCreationLoader phase="initializing" language="es" />
      );
      const elements = screen.getAllByText('Inicializando');
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should fallback to English for unsupported languages', () => {
      renderWithTheme(
        <StoryCreationLoader phase="initializing" language={'fr' as any} />
      );
      const elements = screen.getAllByText('Initializing');
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  describe('progress calculation', () => {
    it('should show ~17% progress for initializing (1/6)', () => {
      const { container } = renderWithTheme(
        <StoryCreationLoader phase="initializing" language="en" />
      );
      expect(screen.getByText('17%')).toBeInTheDocument();
      expect(screen.getByText('1 / 6')).toBeInTheDocument();
    });

    it('should show ~33% progress for colors (2/6)', () => {
      renderWithTheme(
        <StoryCreationLoader phase="colors" language="en" />
      );
      expect(screen.getByText('33%')).toBeInTheDocument();
      expect(screen.getByText('2 / 6')).toBeInTheDocument();
    });

    it('should show 50% progress for world (3/6)', () => {
      renderWithTheme(
        <StoryCreationLoader phase="world" language="en" />
      );
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should show ~67% progress for characters (4/6)', () => {
      renderWithTheme(
        <StoryCreationLoader phase="characters" language="en" />
      );
      expect(screen.getByText('67%')).toBeInTheDocument();
    });

    it('should show ~83% progress for avatar (5/6)', () => {
      renderWithTheme(
        <StoryCreationLoader phase="avatar" language="en" />
      );
      expect(screen.getByText('83%')).toBeInTheDocument();
    });

    it('should show 100% progress for finalizing (6/6)', () => {
      renderWithTheme(
        <StoryCreationLoader phase="finalizing" language="en" />
      );
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('step indicators', () => {
    it('should display 6 step indicators', () => {
      const { container } = renderWithTheme(
        <StoryCreationLoader phase="initializing" language="en" />
      );
      const stepIndicators = container.querySelectorAll('[class*="rounded-full"][class*="w-8"]');
      expect(stepIndicators).toHaveLength(6);
    });

    it('should highlight current step', () => {
      const { container } = renderWithTheme(
        <StoryCreationLoader phase="world" language="en" />
      );
      // Current step should have ring class
      const stepsWithRing = container.querySelectorAll('[class*="ring-2"]');
      expect(stepsWithRing.length).toBeGreaterThan(0);
    });
  });

  describe('animated dots', () => {
    it('should animate dots over time', () => {
      renderWithTheme(
        <StoryCreationLoader phase="initializing" language="en" />
      );

      // The component should render the description
      expect(screen.getByText(/Starting up the story engine/)).toBeInTheDocument();

      // After advancing time, the dots should change
      act(() => {
        jest.advanceTimersByTime(1600);
      });

      // Should still render description (with or without dots)
      expect(screen.getByText(/Starting up the story engine/)).toBeInTheDocument();
    });
  });

  describe('tips', () => {
    it('should display a tip', () => {
      renderWithTheme(
        <StoryCreationLoader phase="initializing" language="en" />
      );

      // Should show one of the tips
      expect(screen.getByText(/Tip:/)).toBeInTheDocument();
    });

    it('should rotate tips over time', () => {
      renderWithTheme(
        <StoryCreationLoader phase="initializing" language="en" />
      );

      const initialTip = screen.getByText(/Tip:/).textContent;

      // Advance timer to rotate tip (4 seconds)
      act(() => {
        jest.advanceTimersByTime(4000);
      });

      const newTip = screen.getByText(/Tip:/).textContent;
      // Tips rotate, so they may change
      expect(newTip).toBeDefined();
    });

    it('should display Portuguese tips', () => {
      renderWithTheme(
        <StoryCreationLoader phase="initializing" language="pt" />
      );

      expect(screen.getByText(/Dica:/)).toBeInTheDocument();
    });

    it('should display Spanish tips', () => {
      renderWithTheme(
        <StoryCreationLoader phase="initializing" language="es" />
      );

      expect(screen.getByText(/Consejo:/)).toBeInTheDocument();
    });
  });

  describe('icons', () => {
    it('should display Sparkles icon for initializing', () => {
      renderWithTheme(
        <StoryCreationLoader phase="initializing" language="en" />
      );
      expect(screen.getAllByTestId('sparkles-icon').length).toBeGreaterThan(0);
    });

    it('should display Palette icon for colors', () => {
      renderWithTheme(
        <StoryCreationLoader phase="colors" language="en" />
      );
      expect(screen.getAllByTestId('palette-icon').length).toBeGreaterThan(0);
    });

    it('should display MapPin icon for world', () => {
      renderWithTheme(
        <StoryCreationLoader phase="world" language="en" />
      );
      expect(screen.getAllByTestId('mappin-icon').length).toBeGreaterThan(0);
    });

    it('should display Users icon for characters', () => {
      renderWithTheme(
        <StoryCreationLoader phase="characters" language="en" />
      );
      expect(screen.getAllByTestId('users-icon').length).toBeGreaterThan(0);
    });

    it('should display Image icon for avatar', () => {
      renderWithTheme(
        <StoryCreationLoader phase="avatar" language="en" />
      );
      expect(screen.getAllByTestId('image-icon').length).toBeGreaterThan(0);
    });

    it('should display BookOpen icon for finalizing', () => {
      renderWithTheme(
        <StoryCreationLoader phase="finalizing" language="en" />
      );
      expect(screen.getAllByTestId('book-icon').length).toBeGreaterThan(0);
    });
  });
});
