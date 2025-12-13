import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NarrativeStyleModal } from '../../components/NarrativeStyleModal/NarrativeStyleModal';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  X: () => <span data-testid="x-icon">X</span>,
  Sparkles: () => <span data-testid="sparkles-icon">Sparkles</span>,
  Info: () => <span data-testid="info-icon">Info</span>,
  BookText: () => <span data-testid="booktext-icon">BookText</span>,
}));

const mockTranslations = {
  narrativeStyleEditorTitle: 'Narrative Style Editor',
  narrativeStyleCurrentLabel: 'Active Narrative Context',
  narrativeStyleModeLabel: 'Mode',
  narrativeStyleGenreLabel: 'Genre',
  narrativeStyleGenreFallback: 'Not defined',
  narrativeStyleLastCustom: 'Last custom brief:',
  narrativeStyleInfoTitle: 'How to describe it',
  narrativeStyleInfoBody: 'Specify cadence, references, and rules such as "present tense, cinematic, focus on sensory details".',
  narrativeStylePlaceholder: 'Describe your narrative style...',
  narrativeStyleRequired: 'Describe your narrative style before continuing.',
  narrativeStyleUpdateError: 'Unable to update narrative style. Try again.',
  cancel: 'Cancel',
  save: 'Save Style',
  saving: 'Saving...',
};

const createDefaultProps = () => ({
  isOpen: true,
  onClose: jest.fn(),
  currentMode: 'auto' as const,
  currentStyle: '',
  genre: 'fantasy' as const,
  onSave: jest.fn().mockResolvedValue(undefined),
  t: mockTranslations,
});

describe('NarrativeStyleModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render nothing when isOpen is false', () => {
      const props = { ...createDefaultProps(), isOpen: false };
      const { container } = render(<NarrativeStyleModal {...props} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render modal when isOpen is true', () => {
      const props = createDefaultProps();
      render(<NarrativeStyleModal {...props} />);
      expect(screen.getByText('Narrative Style Editor')).toBeInTheDocument();
    });

    it('should match snapshot when open in auto mode', () => {
      const props = createDefaultProps();
      const { container } = render(<NarrativeStyleModal {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot when open in custom mode', () => {
      const props = { ...createDefaultProps(), currentMode: 'custom' as const };
      const { container } = render(<NarrativeStyleModal {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot with custom style text', () => {
      const props = {
        ...createDefaultProps(),
        currentMode: 'custom' as const,
        currentStyle: 'Present tense, cinematic style, focus on dialogue.',
      };
      const { container } = render(<NarrativeStyleModal {...props} />);
      expect(container).toMatchSnapshot();
    });
  });

  describe('mode selection', () => {
    it('should display both mode options', () => {
      const props = createDefaultProps();
      render(<NarrativeStyleModal {...props} />);

      // Use getAllByText since "Auto Genre Mode" appears multiple times (in info and as button)
      const autoModeElements = screen.getAllByText('Auto Genre Mode');
      expect(autoModeElements.length).toBeGreaterThan(0);
      expect(screen.getByText('Custom Brief Mode')).toBeInTheDocument();
    });

    it('should highlight the current mode', () => {
      const props = createDefaultProps();
      const { container } = render(<NarrativeStyleModal {...props} />);

      // Auto mode should have bg-stone-900 (selected) - find the button version
      const autoButtons = screen.getAllByText('Auto Genre Mode');
      const autoButton = autoButtons.find(el => el.closest('button'))?.closest('button');
      expect(autoButton).toHaveClass('bg-stone-900');
    });

    it('should switch to custom mode when clicked', () => {
      const props = createDefaultProps();
      render(<NarrativeStyleModal {...props} />);

      fireEvent.click(screen.getByText('Custom Brief Mode'));

      // Should show the textarea for custom style
      expect(screen.getByPlaceholderText('Describe your narrative style...')).toBeInTheDocument();
    });

    it('should hide textarea when auto mode is selected', () => {
      const props = { ...createDefaultProps(), currentMode: 'custom' as const };
      render(<NarrativeStyleModal {...props} />);

      // Initially shows textarea
      expect(screen.getByPlaceholderText('Describe your narrative style...')).toBeInTheDocument();

      // Click auto mode
      fireEvent.click(screen.getByText('Auto Genre Mode'));

      // Textarea should be hidden
      expect(screen.queryByPlaceholderText('Describe your narrative style...')).not.toBeInTheDocument();
    });
  });

  describe('current context display', () => {
    it('should display current mode label', () => {
      const props = createDefaultProps();
      render(<NarrativeStyleModal {...props} />);

      expect(screen.getByText('Mode:')).toBeInTheDocument();
      // "Auto Genre Mode" appears in multiple places
      const autoModeElements = screen.getAllByText('Auto Genre Mode');
      expect(autoModeElements.length).toBeGreaterThan(0);
    });

    it('should display current genre', () => {
      const props = createDefaultProps();
      render(<NarrativeStyleModal {...props} />);

      expect(screen.getByText('Genre:')).toBeInTheDocument();
      expect(screen.getByText('fantasy')).toBeInTheDocument();
    });

    it('should display fallback when no genre', () => {
      const props = { ...createDefaultProps(), genre: undefined };
      render(<NarrativeStyleModal {...props} />);

      expect(screen.getByText('Not defined')).toBeInTheDocument();
    });

    it('should display last custom brief when available', () => {
      const props = {
        ...createDefaultProps(),
        currentStyle: 'My custom narrative style',
      };
      render(<NarrativeStyleModal {...props} />);

      expect(screen.getByText('Last custom brief:')).toBeInTheDocument();
      expect(screen.getByText('My custom narrative style')).toBeInTheDocument();
    });

    it('should NOT display last custom brief when empty', () => {
      const props = createDefaultProps();
      render(<NarrativeStyleModal {...props} />);

      expect(screen.queryByText('Last custom brief:')).not.toBeInTheDocument();
    });
  });

  describe('custom mode textarea', () => {
    it('should display info box in custom mode', () => {
      const props = { ...createDefaultProps(), currentMode: 'custom' as const };
      render(<NarrativeStyleModal {...props} />);

      expect(screen.getByText('How to describe it')).toBeInTheDocument();
      expect(screen.getByText(/Specify cadence, references/)).toBeInTheDocument();
    });

    it('should allow typing in textarea', () => {
      const props = { ...createDefaultProps(), currentMode: 'custom' as const };
      render(<NarrativeStyleModal {...props} />);

      const textarea = screen.getByPlaceholderText('Describe your narrative style...');
      fireEvent.change(textarea, { target: { value: 'New style text' } });

      expect(textarea).toHaveValue('New style text');
    });

    it('should initialize textarea with currentStyle', () => {
      const props = {
        ...createDefaultProps(),
        currentMode: 'custom' as const,
        currentStyle: 'Existing style',
      };
      render(<NarrativeStyleModal {...props} />);

      const textarea = screen.getByPlaceholderText('Describe your narrative style...');
      expect(textarea).toHaveValue('Existing style');
    });
  });

  describe('save functionality', () => {
    it('should call onSave with auto mode', async () => {
      const props = createDefaultProps();
      render(<NarrativeStyleModal {...props} />);

      fireEvent.click(screen.getByText('Save Style'));

      await waitFor(() => {
        expect(props.onSave).toHaveBeenCalledWith('auto', '');
      });
    });

    it('should call onSave with custom mode and style', async () => {
      const props = { ...createDefaultProps(), currentMode: 'custom' as const };
      render(<NarrativeStyleModal {...props} />);

      const textarea = screen.getByPlaceholderText('Describe your narrative style...');
      fireEvent.change(textarea, { target: { value: 'My custom style' } });

      fireEvent.click(screen.getByText('Save Style'));

      await waitFor(() => {
        expect(props.onSave).toHaveBeenCalledWith('custom', 'My custom style');
      });
    });

    it('should show error when custom mode has empty style', async () => {
      const props = { ...createDefaultProps(), currentMode: 'custom' as const };
      render(<NarrativeStyleModal {...props} />);

      fireEvent.click(screen.getByText('Save Style'));

      expect(screen.getByText('Describe your narrative style before continuing.')).toBeInTheDocument();
      expect(props.onSave).not.toHaveBeenCalled();
    });

    it('should show saving state during save', async () => {
      const props = createDefaultProps();
      props.onSave = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      render(<NarrativeStyleModal {...props} />);

      fireEvent.click(screen.getByText('Save Style'));

      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('should close modal after successful save', async () => {
      const props = createDefaultProps();
      render(<NarrativeStyleModal {...props} />);

      fireEvent.click(screen.getByText('Save Style'));

      await waitFor(() => {
        expect(props.onClose).toHaveBeenCalled();
      });
    });

    it('should show error message when save fails', async () => {
      const props = createDefaultProps();
      props.onSave = jest.fn().mockRejectedValue(new Error('Save failed'));
      render(<NarrativeStyleModal {...props} />);

      fireEvent.click(screen.getByText('Save Style'));

      await waitFor(() => {
        expect(screen.getByText('Unable to update narrative style. Try again.')).toBeInTheDocument();
      });
    });
  });

  describe('close functionality', () => {
    it('should call onClose when X button is clicked', () => {
      const props = createDefaultProps();
      render(<NarrativeStyleModal {...props} />);

      const closeButtons = screen.getAllByRole('button');
      const xButton = closeButtons.find(
        (btn) => btn.querySelector('[data-testid="x-icon"]')
      );
      if (xButton) {
        fireEvent.click(xButton);
      }

      expect(props.onClose).toHaveBeenCalled();
    });

    it('should call onClose when Cancel button is clicked', () => {
      const props = createDefaultProps();
      render(<NarrativeStyleModal {...props} />);

      fireEvent.click(screen.getByText('Cancel'));

      expect(props.onClose).toHaveBeenCalled();
    });
  });

  describe('state reset on open', () => {
    it('should reset to currentMode when reopened', () => {
      const props = createDefaultProps();
      const { rerender } = render(<NarrativeStyleModal {...props} />);

      // Switch to custom mode
      fireEvent.click(screen.getByText('Custom Brief Mode'));
      expect(screen.getByPlaceholderText('Describe your narrative style...')).toBeInTheDocument();

      // Close and reopen
      rerender(<NarrativeStyleModal {...props} isOpen={false} />);
      rerender(<NarrativeStyleModal {...props} isOpen={true} />);

      // Should be back to auto mode (no textarea)
      expect(screen.queryByPlaceholderText('Describe your narrative style...')).not.toBeInTheDocument();
    });

    it('should clear error when reopened', async () => {
      const props = { ...createDefaultProps(), currentMode: 'custom' as const };
      const { rerender } = render(<NarrativeStyleModal {...props} />);

      // Trigger error
      fireEvent.click(screen.getByText('Save Style'));
      expect(screen.getByText('Describe your narrative style before continuing.')).toBeInTheDocument();

      // Close and reopen
      rerender(<NarrativeStyleModal {...props} isOpen={false} />);
      rerender(<NarrativeStyleModal {...props} isOpen={true} />);

      // Error should be cleared
      expect(screen.queryByText('Describe your narrative style before continuing.')).not.toBeInTheDocument();
    });
  });

  describe('mode descriptions', () => {
    it('should display Auto Genre Mode description', () => {
      const props = createDefaultProps();
      render(<NarrativeStyleModal {...props} />);

      expect(screen.getByText(/Keeps the current literary genre/)).toBeInTheDocument();
    });

    it('should display Custom Brief Mode description', () => {
      const props = createDefaultProps();
      render(<NarrativeStyleModal {...props} />);

      expect(screen.getByText(/Supply a bespoke writing brief/)).toBeInTheDocument();
    });
  });

  describe('button states', () => {
    it('should disable buttons while saving', async () => {
      const props = createDefaultProps();
      props.onSave = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      render(<NarrativeStyleModal {...props} />);

      fireEvent.click(screen.getByText('Save Style'));

      // Cancel button should be disabled
      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toBeDisabled();
    });
  });
});
