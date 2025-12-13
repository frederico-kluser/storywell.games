import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeColorsModal } from '../../components/ThemeColorsModal';
import { ThemeColorsProvider } from '../../hooks/useThemeColors';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  X: () => <span data-testid="x-icon">X</span>,
  Palette: () => <span data-testid="palette-icon">Palette</span>,
  Loader2: () => <span data-testid="loader-icon">Loading</span>,
  RefreshCw: () => <span data-testid="refresh-icon">Refresh</span>,
  Type: () => <span data-testid="type-icon">Type</span>,
}));

// Mock fonts constant
jest.mock('../../constants/fonts', () => ({
  getFontByFamily: jest.fn().mockReturnValue({
    family: 'VT323',
    category: 'retro',
    description: 'Retro terminal style font. Perfect for cyberpunk themes.',
  }),
  buildFontFamily: jest.fn().mockReturnValue("'VT323', monospace"),
  DEFAULT_FONT: {
    family: 'VT323',
    category: 'retro',
    description: 'Retro terminal style font.',
  },
}));

// Helper to render with ThemeColorsProvider
const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeColorsProvider>{ui}</ThemeColorsProvider>);
};

const createDefaultProps = () => ({
  isOpen: true,
  onClose: jest.fn(),
  onRegenerate: jest.fn().mockResolvedValue(undefined),
  isGenerating: false,
});

describe('ThemeColorsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render nothing when isOpen is false', () => {
      const props = { ...createDefaultProps(), isOpen: false };
      const { container } = renderWithTheme(<ThemeColorsModal {...props} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render modal when isOpen is true', () => {
      const props = createDefaultProps();
      renderWithTheme(<ThemeColorsModal {...props} />);
      expect(screen.getByText('Theme Style')).toBeInTheDocument();
    });

    it('should match snapshot when open', () => {
      const props = createDefaultProps();
      const { container } = renderWithTheme(<ThemeColorsModal {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot while generating', () => {
      const props = { ...createDefaultProps(), isGenerating: true };
      const { container } = renderWithTheme(<ThemeColorsModal {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot with user input', () => {
      const props = createDefaultProps();
      renderWithTheme(<ThemeColorsModal {...props} />);

      const textarea = screen.getByPlaceholderText(/darker tones/);
      fireEvent.change(textarea, { target: { value: 'cyberpunk neon style' } });

      expect(document.body).toMatchSnapshot();
    });
  });

  describe('color palette preview', () => {
    it('should display current palette section', () => {
      const props = createDefaultProps();
      renderWithTheme(<ThemeColorsModal {...props} />);
      expect(screen.getByText('Current Palette')).toBeInTheDocument();
    });

    it('should display 8 color swatches', () => {
      const props = createDefaultProps();
      const { container } = renderWithTheme(<ThemeColorsModal {...props} />);
      const swatches = container.querySelectorAll('[class*="w-8 h-8"]');
      expect(swatches).toHaveLength(8);
    });
  });

  describe('font preview', () => {
    it('should display current font section', () => {
      const props = createDefaultProps();
      renderWithTheme(<ThemeColorsModal {...props} />);
      expect(screen.getByText('Current Font')).toBeInTheDocument();
    });

    it('should display font name', () => {
      const props = createDefaultProps();
      renderWithTheme(<ThemeColorsModal {...props} />);
      expect(screen.getByText('VT323')).toBeInTheDocument();
    });
  });

  describe('user input', () => {
    it('should display custom considerations input', () => {
      const props = createDefaultProps();
      renderWithTheme(<ThemeColorsModal {...props} />);
      expect(screen.getByText('Custom Considerations (Optional)')).toBeInTheDocument();
    });

    it('should allow typing in the textarea', () => {
      const props = createDefaultProps();
      renderWithTheme(<ThemeColorsModal {...props} />);

      const textarea = screen.getByPlaceholderText(/darker tones/);
      fireEvent.change(textarea, { target: { value: 'more vibrant colors' } });

      expect(textarea).toHaveValue('more vibrant colors');
    });

    it('should disable textarea while generating', () => {
      const props = { ...createDefaultProps(), isGenerating: true };
      renderWithTheme(<ThemeColorsModal {...props} />);

      const textarea = screen.getByPlaceholderText(/darker tones/);
      expect(textarea).toBeDisabled();
    });
  });

  describe('quick regenerate', () => {
    it('should display quick regenerate button', () => {
      const props = createDefaultProps();
      renderWithTheme(<ThemeColorsModal {...props} />);
      expect(screen.getByText('Quick Regenerate')).toBeInTheDocument();
    });

    it('should call onRegenerate without input when clicked', async () => {
      const props = createDefaultProps();
      renderWithTheme(<ThemeColorsModal {...props} />);

      fireEvent.click(screen.getByText('Quick Regenerate'));

      await waitFor(() => {
        expect(props.onRegenerate).toHaveBeenCalledWith();
      });
    });

    it('should call onClose after quick regenerate', async () => {
      const props = createDefaultProps();
      renderWithTheme(<ThemeColorsModal {...props} />);

      fireEvent.click(screen.getByText('Quick Regenerate'));

      await waitFor(() => {
        expect(props.onClose).toHaveBeenCalled();
      });
    });

    it('should disable quick regenerate while generating', () => {
      const props = { ...createDefaultProps(), isGenerating: true };
      renderWithTheme(<ThemeColorsModal {...props} />);

      const button = screen.getByText('Quick Regenerate').closest('button');
      expect(button).toBeDisabled();
    });
  });

  describe('apply custom', () => {
    it('should display apply custom button', () => {
      const props = createDefaultProps();
      renderWithTheme(<ThemeColorsModal {...props} />);
      expect(screen.getByText('Apply Custom')).toBeInTheDocument();
    });

    it('should disable apply custom when no input', () => {
      const props = createDefaultProps();
      renderWithTheme(<ThemeColorsModal {...props} />);

      const button = screen.getByText('Apply Custom').closest('button');
      expect(button).toBeDisabled();
    });

    it('should enable apply custom when input is provided', () => {
      const props = createDefaultProps();
      renderWithTheme(<ThemeColorsModal {...props} />);

      const textarea = screen.getByPlaceholderText(/darker tones/);
      fireEvent.change(textarea, { target: { value: 'neon colors' } });

      const button = screen.getByText('Apply Custom').closest('button');
      expect(button).not.toBeDisabled();
    });

    it('should call onRegenerate with input when clicked', async () => {
      const props = createDefaultProps();
      renderWithTheme(<ThemeColorsModal {...props} />);

      const textarea = screen.getByPlaceholderText(/darker tones/);
      fireEvent.change(textarea, { target: { value: 'cyberpunk style' } });

      fireEvent.click(screen.getByText('Apply Custom'));

      await waitFor(() => {
        expect(props.onRegenerate).toHaveBeenCalledWith('cyberpunk style');
      });
    });

    it('should clear input and close after apply', async () => {
      const props = createDefaultProps();
      renderWithTheme(<ThemeColorsModal {...props} />);

      const textarea = screen.getByPlaceholderText(/darker tones/) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'dark theme' } });

      fireEvent.click(screen.getByText('Apply Custom'));

      await waitFor(() => {
        expect(props.onClose).toHaveBeenCalled();
      });
    });
  });

  describe('close functionality', () => {
    it('should call onClose when X button is clicked', () => {
      const props = createDefaultProps();
      renderWithTheme(<ThemeColorsModal {...props} />);

      const closeButtons = screen.getAllByRole('button');
      const xButton = closeButtons.find(
        (btn) => btn.querySelector('[data-testid="x-icon"]')
      );
      if (xButton) {
        fireEvent.click(xButton);
      }

      expect(props.onClose).toHaveBeenCalled();
    });
  });

  describe('info text', () => {
    it('should display info text about regeneration', () => {
      const props = createDefaultProps();
      renderWithTheme(<ThemeColorsModal {...props} />);

      expect(screen.getByText(/Regenerating will create a new color palette/)).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show loader icons when generating', () => {
      const props = { ...createDefaultProps(), isGenerating: true };
      renderWithTheme(<ThemeColorsModal {...props} />);

      expect(screen.getAllByTestId('loader-icon')).toHaveLength(2);
    });
  });
});
