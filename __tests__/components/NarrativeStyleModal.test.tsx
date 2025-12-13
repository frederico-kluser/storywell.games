import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NarrativeStyleModal } from '../../components/NarrativeStyleModal/NarrativeStyleModal';

const mockVoiceInput = jest.fn(() => null);

jest.mock('../../components/VoiceInput', () => ({
  VoiceInput: (props: any) => mockVoiceInput(props),
}));

// Mock openaiClient
jest.mock('../../services/ai/openaiClient', () => ({
  processNarrativeStyleStep: jest.fn(),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  X: () => <span data-testid="x-icon">X</span>,
  Sparkles: () => <span data-testid="sparkles-icon">Sparkles</span>,
  Info: () => <span data-testid="info-icon">Info</span>,
  Loader2: () => <span data-testid="loader-icon">Loading</span>,
  Check: () => <span data-testid="check-icon">Check</span>,
  Edit3: () => <span data-testid="edit-icon">Edit</span>,
  ArrowLeft: () => <span data-testid="arrow-left-icon">Back</span>,
  ArrowRight: () => <span data-testid="arrow-right-icon">Forward</span>,
  MessageSquare: () => <span data-testid="message-icon">Message</span>,
  RotateCcw: () => <span data-testid="reset-icon">Reset</span>,
}));

const mockTranslations = {
  narrativeStyleEditorTitle: 'Narrative Style Editor',
  narrativeStyleAutoTitle: 'Auto Mode',
  narrativeStyleAutoDesc: 'AI adapts to each scene automatically',
  narrativeStyleCustomTitle: 'Custom Style',
  narrativeStyleCustomDesc: 'Define your preferred writing style',
  narrativeStyleInfoTitle: 'How to describe your style',
  narrativeStyleInfoBody: 'Describe how you want the story to be told.',
  narrativeStylePlaceholder: 'Describe your narrative style...',
  narrativeStyleRequired: 'Describe your narrative style before continuing.',
  narrativeStyleUpdateError: 'Unable to update narrative style. Try again.',
  narrativeStyleRefineBtn: 'Refine Style',
  narrativeStyleRefiningTitle: 'Refining Your Style',
  narrativeStyleYourDescription: 'Your description',
  narrativeStyleAnalyzing: 'Analyzing your style...',
  narrativeStyleComplete: 'Style Defined',
  narrativeStyleCompleteFirst: 'Complete the style refinement first.',
  reset: 'Reset',
  cancel: 'Cancel',
  save: 'Save',
  otherOption: 'Other...',
  backToOptions: 'Back to options',
  typeYourAnswer: 'Type your answer...',
};

const createDefaultProps = () => ({
  isOpen: true,
  onClose: jest.fn(),
  currentMode: 'auto' as const,
  currentStyle: '',
  genre: 'fantasy' as const,
  universeName: 'Test Universe',
  onSave: jest.fn().mockResolvedValue(undefined),
  t: mockTranslations,
  apiKey: 'test-key',
  language: 'en' as any,
});

describe('NarrativeStyleModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVoiceInput.mockImplementation(() => null);
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

      expect(screen.getByText('Auto Mode')).toBeInTheDocument();
      expect(screen.getByText('Custom Style')).toBeInTheDocument();
    });

    it('should highlight auto mode when currentMode is auto', () => {
      const props = createDefaultProps();
      render(<NarrativeStyleModal {...props} />);

      const autoButton = screen.getByText('Auto Mode').closest('button');
      expect(autoButton).toHaveClass('bg-stone-900');
    });

    it('should highlight custom mode when currentMode is custom', () => {
      const props = { ...createDefaultProps(), currentMode: 'custom' as const };
      render(<NarrativeStyleModal {...props} />);

      const customButton = screen.getByText('Custom Style').closest('button');
      expect(customButton).toHaveClass('bg-stone-700');
    });

    it('should switch to custom mode when clicked', () => {
      const props = createDefaultProps();
      render(<NarrativeStyleModal {...props} />);

      fireEvent.click(screen.getByText('Custom Style'));

      // Should show the textarea for custom style
      expect(screen.getByPlaceholderText('Describe your narrative style...')).toBeInTheDocument();
    });

    it('should hide textarea when auto mode is selected', () => {
      const props = { ...createDefaultProps(), currentMode: 'custom' as const };
      render(<NarrativeStyleModal {...props} />);

      // Initially shows textarea
      expect(screen.getByPlaceholderText('Describe your narrative style...')).toBeInTheDocument();

      // Click auto mode
      fireEvent.click(screen.getByText('Auto Mode'));

      // Textarea should be hidden
      expect(screen.queryByPlaceholderText('Describe your narrative style...')).not.toBeInTheDocument();
    });
  });

  describe('custom mode textarea', () => {
    it('should display info box in custom mode', () => {
      const props = { ...createDefaultProps(), currentMode: 'custom' as const };
      render(<NarrativeStyleModal {...props} />);

      expect(screen.getByText('How to describe your style')).toBeInTheDocument();
      expect(screen.getByText(/Describe how you want/)).toBeInTheDocument();
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

    it('should show refine button in custom mode', () => {
      const props = { ...createDefaultProps(), currentMode: 'custom' as const };
      render(<NarrativeStyleModal {...props} />);

      expect(screen.getByText('Refine Style')).toBeInTheDocument();
    });

    it('should disable refine button when textarea is empty', () => {
      const props = { ...createDefaultProps(), currentMode: 'custom' as const };
      render(<NarrativeStyleModal {...props} />);

      const refineButton = screen.getByText('Refine Style').closest('button');
      expect(refineButton).toBeDisabled();
    });
  });

  describe('save functionality', () => {
    it('should call onSave with auto mode', async () => {
      const props = createDefaultProps();
      render(<NarrativeStyleModal {...props} />);

      fireEvent.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(props.onSave).toHaveBeenCalledWith('auto', undefined);
      });
    });

    it('should disable save button when custom mode has no completed refinement', async () => {
      const props = { ...createDefaultProps(), currentMode: 'custom' as const };
      render(<NarrativeStyleModal {...props} />);

      // Save button should be disabled in custom mode without completed refinement
      const saveButton = screen.getByText('Save').closest('button');
      expect(saveButton).toBeDisabled();
      expect(props.onSave).not.toHaveBeenCalled();
    });

    it('should close modal after successful auto save', async () => {
      const props = createDefaultProps();
      render(<NarrativeStyleModal {...props} />);

      fireEvent.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(props.onClose).toHaveBeenCalled();
      });
    });

    it('should show error message when save fails', async () => {
      const props = createDefaultProps();
      props.onSave = jest.fn().mockRejectedValue(new Error('Save failed'));
      render(<NarrativeStyleModal {...props} />);

      fireEvent.click(screen.getByText('Save'));

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
      fireEvent.click(screen.getByText('Custom Style'));
      expect(screen.getByPlaceholderText('Describe your narrative style...')).toBeInTheDocument();

      // Close and reopen
      rerender(<NarrativeStyleModal {...props} isOpen={false} />);
      rerender(<NarrativeStyleModal {...props} isOpen={true} />);

      // Should be back to auto mode (no textarea)
      expect(screen.queryByPlaceholderText('Describe your narrative style...')).not.toBeInTheDocument();
    });

    it('should reset textarea content when reopened', () => {
      const props = { ...createDefaultProps(), currentMode: 'custom' as const };
      const { rerender } = render(<NarrativeStyleModal {...props} />);

      // Type something in the textarea
      const textarea = screen.getByPlaceholderText('Describe your narrative style...');
      fireEvent.change(textarea, { target: { value: 'Some custom text' } });
      expect(textarea).toHaveValue('Some custom text');

      // Close and reopen
      rerender(<NarrativeStyleModal {...props} isOpen={false} />);
      rerender(<NarrativeStyleModal {...props} isOpen={true} />);

      // Textarea should be reset to empty (currentStyle is empty)
      const newTextarea = screen.getByPlaceholderText('Describe your narrative style...');
      expect(newTextarea).toHaveValue('');
    });
  });

  describe('mode descriptions', () => {
    it('should display Auto Mode description', () => {
      const props = createDefaultProps();
      render(<NarrativeStyleModal {...props} />);

      expect(screen.getByText('AI adapts to each scene automatically')).toBeInTheDocument();
    });

    it('should display Custom Style description', () => {
      const props = createDefaultProps();
      render(<NarrativeStyleModal {...props} />);

      expect(screen.getByText('Define your preferred writing style')).toBeInTheDocument();
    });
  });

  describe('button states', () => {
    it('should disable cancel button while saving', async () => {
      const props = createDefaultProps();
      props.onSave = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      render(<NarrativeStyleModal {...props} />);

      fireEvent.click(screen.getByText('Save'));

      // Cancel button should be disabled
      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toBeDisabled();
    });

    it('should disable save button in custom mode without completed refinement', () => {
      const props = { ...createDefaultProps(), currentMode: 'custom' as const };
      render(<NarrativeStyleModal {...props} />);

      const saveButton = screen.getByText('Save').closest('button');
      expect(saveButton).toBeDisabled();
    });
  });
});
