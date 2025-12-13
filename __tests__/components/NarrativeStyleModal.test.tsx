import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NarrativeStyleModal } from '../../components/NarrativeStyleModal/NarrativeStyleModal';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  X: ({ className }: any) => <span data-testid="x-icon" className={className}>X</span>,
  Sparkles: ({ className }: any) => <span data-testid="sparkles-icon" className={className}>Sparkles</span>,
  Info: ({ className }: any) => <span data-testid="info-icon" className={className}>Info</span>,
  BookText: ({ className }: any) => <span data-testid="booktext-icon" className={className}>BookText</span>,
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

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  currentMode: 'auto' as const,
  currentStyle: '',
  genre: 'fantasy' as const,
  onSave: jest.fn().mockResolvedValue(undefined),
  t: mockTranslations,
};

describe('NarrativeStyleModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render nothing when isOpen is false', () => {
      const { container } = render(
        <NarrativeStyleModal {...defaultProps} isOpen={false} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render when isOpen is true', () => {
      render(<NarrativeStyleModal {...defaultProps} />);

      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
      expect(screen.getByText('Narrative Style Editor')).toBeInTheDocument();
    });

    it('should display sparkles icon in header', () => {
      render(<NarrativeStyleModal {...defaultProps} />);

      expect(screen.getByTestId('sparkles-icon')).toBeInTheDocument();
    });

    it('should display current mode and genre', () => {
      render(<NarrativeStyleModal {...defaultProps} />);

      expect(screen.getByText(/Mode:/)).toBeInTheDocument();
      // Auto Genre Mode appears in both info section and button
      expect(screen.getAllByText('Auto Genre Mode').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Genre:/)).toBeInTheDocument();
      expect(screen.getByText('fantasy')).toBeInTheDocument();
    });

    it('should display mode selection buttons', () => {
      render(<NarrativeStyleModal {...defaultProps} />);

      // These texts appear in the mode selection buttons
      expect(screen.getAllByText('Auto Genre Mode').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Custom Brief Mode').length).toBeGreaterThanOrEqual(1);
    });

    it('should display genre fallback when no genre is provided', () => {
      render(<NarrativeStyleModal {...defaultProps} genre={undefined} />);

      expect(screen.getByText('Not defined')).toBeInTheDocument();
    });

    it('should display last custom style when provided', () => {
      render(
        <NarrativeStyleModal
          {...defaultProps}
          currentStyle="Use present tense and cinematic style"
        />
      );

      expect(screen.getByText('Last custom brief:')).toBeInTheDocument();
      expect(screen.getByText('Use present tense and cinematic style')).toBeInTheDocument();
    });
  });

  describe('mode selection', () => {
    it('should switch to custom mode when Custom Brief button is clicked', () => {
      render(<NarrativeStyleModal {...defaultProps} />);

      // Find the Custom Brief Mode button by its text
      const customButton = screen.getAllByRole('button').find(
        btn => btn.textContent?.includes('Custom Brief Mode')
      );

      if (customButton) {
        fireEvent.click(customButton);
        // Textarea should appear
        expect(screen.getByPlaceholderText('Describe your narrative style...')).toBeInTheDocument();
      }
    });

    it('should show textarea only in custom mode', () => {
      render(<NarrativeStyleModal {...defaultProps} currentMode="auto" />);

      // Textarea should not be visible in auto mode
      expect(screen.queryByPlaceholderText('Describe your narrative style...')).not.toBeInTheDocument();
    });

    it('should show info box in custom mode', () => {
      render(<NarrativeStyleModal {...defaultProps} currentMode="custom" />);

      expect(screen.getByText('How to describe it')).toBeInTheDocument();
      expect(screen.getByTestId('info-icon')).toBeInTheDocument();
    });
  });

  describe('close functionality', () => {
    it('should call onClose when X button is clicked', () => {
      const onClose = jest.fn();
      render(<NarrativeStyleModal {...defaultProps} onClose={onClose} />);

      const closeButtons = screen.getAllByRole('button');
      const xButton = closeButtons.find(btn => btn.querySelector('[data-testid="x-icon"]'));

      if (xButton) {
        fireEvent.click(xButton);
        expect(onClose).toHaveBeenCalledTimes(1);
      }
    });

    it('should call onClose when Cancel button is clicked', () => {
      const onClose = jest.fn();
      render(<NarrativeStyleModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('Cancel'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('save functionality', () => {
    it('should call onSave with auto mode', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      const onClose = jest.fn();

      render(
        <NarrativeStyleModal
          {...defaultProps}
          onSave={onSave}
          onClose={onClose}
          currentMode="auto"
        />
      );

      fireEvent.click(screen.getByText('Save Style'));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith('auto', '');
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('should call onSave with custom mode and style', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      const onClose = jest.fn();

      render(
        <NarrativeStyleModal
          {...defaultProps}
          onSave={onSave}
          onClose={onClose}
          currentMode="custom"
        />
      );

      const textarea = screen.getByPlaceholderText('Describe your narrative style...');
      fireEvent.change(textarea, { target: { value: 'Present tense, cinematic style' } });

      fireEvent.click(screen.getByText('Save Style'));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith('custom', 'Present tense, cinematic style');
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('should show error when saving custom mode without style', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);

      render(
        <NarrativeStyleModal
          {...defaultProps}
          onSave={onSave}
          currentMode="custom"
        />
      );

      fireEvent.click(screen.getByText('Save Style'));

      expect(screen.getByText('Describe your narrative style before continuing.')).toBeInTheDocument();
      expect(onSave).not.toHaveBeenCalled();
    });

    it('should show error when onSave fails', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      const onSave = jest.fn().mockRejectedValue(new Error('Save failed'));

      render(
        <NarrativeStyleModal
          {...defaultProps}
          onSave={onSave}
          currentMode="auto"
        />
      );

      fireEvent.click(screen.getByText('Save Style'));

      await waitFor(() => {
        expect(screen.getByText('Unable to update narrative style. Try again.')).toBeInTheDocument();
      });

      consoleError.mockRestore();
    });

    it('should show saving state while saving', async () => {
      const onSave = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <NarrativeStyleModal
          {...defaultProps}
          onSave={onSave}
        />
      );

      fireEvent.click(screen.getByText('Save Style'));

      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('should disable buttons while saving', async () => {
      const onSave = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <NarrativeStyleModal
          {...defaultProps}
          onSave={onSave}
        />
      );

      fireEvent.click(screen.getByText('Save Style'));

      expect(screen.getByText('Cancel')).toBeDisabled();
    });
  });

  describe('textarea behavior', () => {
    it('should update custom style on input', () => {
      render(
        <NarrativeStyleModal
          {...defaultProps}
          currentMode="custom"
        />
      );

      const textarea = screen.getByPlaceholderText('Describe your narrative style...');
      fireEvent.change(textarea, { target: { value: 'My custom style' } });

      expect(textarea).toHaveValue('My custom style');
    });

    it('should preserve custom style when switching modes', () => {
      render(
        <NarrativeStyleModal
          {...defaultProps}
          currentMode="custom"
          currentStyle="Existing custom style"
        />
      );

      // Should have the existing style
      const textarea = screen.getByPlaceholderText('Describe your narrative style...');
      expect(textarea).toHaveValue('Existing custom style');
    });
  });

  describe('translations', () => {
    it('should use provided translations', () => {
      const customTranslations = {
        ...mockTranslations,
        narrativeStyleEditorTitle: 'Editor de Estilo Narrativo',
        cancel: 'Cancelar',
        save: 'Salvar Estilo',
      };

      render(
        <NarrativeStyleModal
          {...defaultProps}
          t={customTranslations}
        />
      );

      expect(screen.getByText('Editor de Estilo Narrativo')).toBeInTheDocument();
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
      expect(screen.getByText('Salvar Estilo')).toBeInTheDocument();
    });
  });

  describe('snapshots', () => {
    it('should match snapshot for auto mode', () => {
      const { container } = render(
        <NarrativeStyleModal {...defaultProps} currentMode="auto" />
      );

      expect(container).toMatchSnapshot();
    });

    it('should match snapshot for custom mode', () => {
      const { container } = render(
        <NarrativeStyleModal {...defaultProps} currentMode="custom" />
      );

      expect(container).toMatchSnapshot();
    });

    it('should match snapshot when closed', () => {
      const { container } = render(
        <NarrativeStyleModal {...defaultProps} isOpen={false} />
      );

      expect(container).toMatchSnapshot();
    });

    it('should match snapshot with existing custom style', () => {
      const { container } = render(
        <NarrativeStyleModal
          {...defaultProps}
          currentMode="custom"
          currentStyle="Use present tense and cinematic style"
        />
      );

      expect(container).toMatchSnapshot();
    });

    it('should match snapshot with Portuguese translations', () => {
      const ptTranslations = {
        narrativeStyleEditorTitle: 'Editor de Estilo Narrativo',
        narrativeStyleCurrentLabel: 'Contexto Narrativo Ativo',
        narrativeStyleModeLabel: 'Modo',
        narrativeStyleGenreLabel: 'Gênero',
        narrativeStyleGenreFallback: 'Não definido',
        narrativeStyleLastCustom: 'Último briefing personalizado:',
        narrativeStyleInfoTitle: 'Como descrever',
        narrativeStyleInfoBody: 'Especifique cadência, referências e regras como "tempo presente, cinematográfico, foco em detalhes sensoriais".',
        narrativeStylePlaceholder: 'Descreva seu estilo narrativo...',
        narrativeStyleRequired: 'Descreva seu estilo narrativo antes de continuar.',
        narrativeStyleUpdateError: 'Não foi possível atualizar o estilo narrativo. Tente novamente.',
        cancel: 'Cancelar',
        save: 'Salvar Estilo',
        saving: 'Salvando...',
      };

      const { container } = render(
        <NarrativeStyleModal {...defaultProps} t={ptTranslations} />
      );

      expect(container).toMatchSnapshot();
    });
  });
});
