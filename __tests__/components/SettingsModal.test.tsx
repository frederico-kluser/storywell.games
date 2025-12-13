import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { SettingsModal } from '../../components/SettingsModal/SettingsModal';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  X: ({ className }: any) => <span data-testid="x-icon" className={className}>X</span>,
  Settings: ({ className }: any) => <span data-testid="settings-icon" className={className}>Settings</span>,
  Volume2: ({ className }: any) => <span data-testid="volume-icon" className={className}>Volume</span>,
  Trash2: ({ className }: any) => <span data-testid="trash-icon" className={className}>Trash</span>,
  Key: ({ className }: any) => <span data-testid="key-icon" className={className}>Key</span>,
  AlertTriangle: ({ className }: any) => <span data-testid="alert-icon" className={className}>Alert</span>,
  Loader2: ({ className }: any) => <span data-testid="loader-icon" className={className}>Loader</span>,
  Edit3: ({ className }: any) => <span data-testid="edit-icon" className={className}>Edit</span>,
}));

const mockTranslations = {
  settings: 'Settings',
  settingsNarrativeStyle: 'Edit Narrative Style',
  settingsNarrativeStyleDesc: 'Adjust tone presets or inject a custom writing brief.',
  settingsNarrativeStyleDisabled: 'Start a story to edit its narrative tone.',
  settingsVoice: 'Voice Settings',
  settingsVoiceDesc: 'Configure TTS voice and tone options',
  settingsDeleteDb: 'Delete All Saves',
  settingsDeleteDbDesc: 'Remove all stories from local storage',
  settingsConfirmDelete: 'Confirm Deletion',
  settingsDeleteDbWarning: 'This will permanently delete all your saved stories.',
  settingsDeleting: 'Deleting...',
  settingsDeleteConfirm: 'Delete All',
  settingsDeleteKey: 'Remove API Key',
  settingsDeleteKeyDesc: 'Clear saved OpenAI key and return to start',
  settingsDeleteKeyWarning: 'This will remove your API key.',
  settingsRemoveKey: 'Remove Key',
  settingsClose: 'Close',
  cancel: 'Cancel',
};

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  onOpenVoiceSettings: jest.fn(),
  onOpenNarrativeStyle: jest.fn(),
  onDeleteDatabase: jest.fn().mockResolvedValue(undefined),
  onDeleteApiKey: jest.fn(),
  canEditNarrativeStyle: true,
  t: mockTranslations,
};

describe('SettingsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render nothing when isOpen is false', () => {
      const { container } = render(
        <SettingsModal {...defaultProps} isOpen={false} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render when isOpen is true', () => {
      render(<SettingsModal {...defaultProps} />);

      // Use getByRole to find the heading specifically
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });

    it('should display settings icon in header', () => {
      render(<SettingsModal {...defaultProps} />);

      expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
    });

    it('should display all settings options', () => {
      render(<SettingsModal {...defaultProps} />);

      expect(screen.getByText('Edit Narrative Style')).toBeInTheDocument();
      expect(screen.getByText('Voice Settings')).toBeInTheDocument();
      expect(screen.getByText('Delete All Saves')).toBeInTheDocument();
      expect(screen.getByText('Remove API Key')).toBeInTheDocument();
    });

    it('should display option descriptions', () => {
      render(<SettingsModal {...defaultProps} />);

      expect(screen.getByText('Adjust tone presets or inject a custom writing brief.')).toBeInTheDocument();
      expect(screen.getByText('Configure TTS voice and tone options')).toBeInTheDocument();
      expect(screen.getByText('Remove all stories from local storage')).toBeInTheDocument();
      expect(screen.getByText('Clear saved OpenAI key and return to start')).toBeInTheDocument();
    });

    it('should display icons for each option', () => {
      render(<SettingsModal {...defaultProps} />);

      expect(screen.getByTestId('edit-icon')).toBeInTheDocument();
      expect(screen.getByTestId('volume-icon')).toBeInTheDocument();
      expect(screen.getByTestId('trash-icon')).toBeInTheDocument();
      expect(screen.getByTestId('key-icon')).toBeInTheDocument();
    });
  });

  describe('close functionality', () => {
    it('should call onClose when X button is clicked', () => {
      const onClose = jest.fn();
      render(<SettingsModal {...defaultProps} onClose={onClose} />);

      // Find the X button (in the header)
      const closeButtons = screen.getAllByRole('button');
      const xButton = closeButtons.find(btn => btn.querySelector('[data-testid="x-icon"]'));

      if (xButton) {
        fireEvent.click(xButton);
        expect(onClose).toHaveBeenCalledTimes(1);
      }
    });

    it('should call onClose when Close button is clicked', () => {
      const onClose = jest.fn();
      render(<SettingsModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('Close'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('voice settings', () => {
    it('should call onOpenVoiceSettings and onClose when Voice Settings is clicked', () => {
      const onClose = jest.fn();
      const onOpenVoiceSettings = jest.fn();

      render(
        <SettingsModal
          {...defaultProps}
          onClose={onClose}
          onOpenVoiceSettings={onOpenVoiceSettings}
        />
      );

      fireEvent.click(screen.getByText('Voice Settings'));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onOpenVoiceSettings).toHaveBeenCalledTimes(1);
    });
  });

  describe('narrative style', () => {
    it('should call onOpenNarrativeStyle and onClose when Edit Narrative Style is clicked', () => {
      const onClose = jest.fn();
      const onOpenNarrativeStyle = jest.fn();

      render(
        <SettingsModal
          {...defaultProps}
          onClose={onClose}
          onOpenNarrativeStyle={onOpenNarrativeStyle}
          canEditNarrativeStyle={true}
        />
      );

      fireEvent.click(screen.getByText('Edit Narrative Style'));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onOpenNarrativeStyle).toHaveBeenCalledTimes(1);
    });

    it('should not call onOpenNarrativeStyle when canEditNarrativeStyle is false', () => {
      const onClose = jest.fn();
      const onOpenNarrativeStyle = jest.fn();

      render(
        <SettingsModal
          {...defaultProps}
          onClose={onClose}
          onOpenNarrativeStyle={onOpenNarrativeStyle}
          canEditNarrativeStyle={false}
        />
      );

      fireEvent.click(screen.getByText('Edit Narrative Style'));

      expect(onClose).not.toHaveBeenCalled();
      expect(onOpenNarrativeStyle).not.toHaveBeenCalled();
    });

    it('should show disabled message when canEditNarrativeStyle is false', () => {
      render(
        <SettingsModal
          {...defaultProps}
          canEditNarrativeStyle={false}
        />
      );

      expect(screen.getByText('Start a story to edit its narrative tone.')).toBeInTheDocument();
    });

    it('should show enabled description when canEditNarrativeStyle is true', () => {
      render(
        <SettingsModal
          {...defaultProps}
          canEditNarrativeStyle={true}
        />
      );

      expect(screen.getByText('Adjust tone presets or inject a custom writing brief.')).toBeInTheDocument();
    });

    it('should disable narrative style button when canEditNarrativeStyle is false', () => {
      render(
        <SettingsModal
          {...defaultProps}
          canEditNarrativeStyle={false}
        />
      );

      const buttons = screen.getAllByRole('button');
      const narrativeButton = buttons.find(btn => btn.querySelector('[data-testid="edit-icon"]'));

      expect(narrativeButton).toBeDisabled();
    });
  });

  describe('delete database', () => {
    it('should show confirmation when Delete All Saves is clicked', () => {
      render(<SettingsModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Delete All Saves'));

      expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();
      expect(screen.getByText(/permanently delete all your saved stories/)).toBeInTheDocument();
    });

    it('should hide confirmation when Cancel is clicked', () => {
      render(<SettingsModal {...defaultProps} />);

      // Show confirmation
      fireEvent.click(screen.getByText('Delete All Saves'));
      expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();

      // Cancel
      fireEvent.click(screen.getByText('Cancel'));

      // Confirmation should be hidden
      expect(screen.queryByText('Confirm Deletion')).not.toBeInTheDocument();
    });

    it('should call onDeleteDatabase when Delete All is clicked', async () => {
      const onDeleteDatabase = jest.fn().mockResolvedValue(undefined);
      const onClose = jest.fn();

      render(
        <SettingsModal
          {...defaultProps}
          onDeleteDatabase={onDeleteDatabase}
          onClose={onClose}
        />
      );

      // Show confirmation
      fireEvent.click(screen.getByText('Delete All Saves'));

      // Confirm deletion
      fireEvent.click(screen.getByText('Delete All'));

      await waitFor(() => {
        expect(onDeleteDatabase).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });

    it('should show loading state while deleting', async () => {
      const onDeleteDatabase = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <SettingsModal
          {...defaultProps}
          onDeleteDatabase={onDeleteDatabase}
        />
      );

      // Show confirmation
      fireEvent.click(screen.getByText('Delete All Saves'));

      // Confirm deletion
      fireEvent.click(screen.getByText('Delete All'));

      // Should show loading state
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
      expect(screen.getByText('Deleting...')).toBeInTheDocument();
    });

    it('should handle deletion errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      const onDeleteDatabase = jest.fn().mockRejectedValue(new Error('Deletion failed'));

      render(
        <SettingsModal
          {...defaultProps}
          onDeleteDatabase={onDeleteDatabase}
        />
      );

      // Show confirmation
      fireEvent.click(screen.getByText('Delete All Saves'));

      // Confirm deletion
      fireEvent.click(screen.getByText('Delete All'));

      await waitFor(() => {
        expect(onDeleteDatabase).toHaveBeenCalledTimes(1);
      });

      // Loading should stop (button should be re-enabled)
      await waitFor(() => {
        expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument();
      });

      consoleError.mockRestore();
    });
  });

  describe('delete API key', () => {
    it('should show confirmation when Remove API Key is clicked', () => {
      render(<SettingsModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Remove API Key'));

      expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();
      expect(screen.getByText(/This will remove your API key/)).toBeInTheDocument();
    });

    it('should hide confirmation when Cancel is clicked', () => {
      render(<SettingsModal {...defaultProps} />);

      // Show confirmation
      fireEvent.click(screen.getByText('Remove API Key'));
      expect(screen.getByText(/This will remove your API key/)).toBeInTheDocument();

      // Cancel
      fireEvent.click(screen.getByText('Cancel'));

      // Confirmation should be hidden
      expect(screen.queryByText(/This will remove your API key/)).not.toBeInTheDocument();
    });

    it('should call onDeleteApiKey and onClose when Remove Key is clicked', () => {
      const onDeleteApiKey = jest.fn();
      const onClose = jest.fn();

      render(
        <SettingsModal
          {...defaultProps}
          onDeleteApiKey={onDeleteApiKey}
          onClose={onClose}
        />
      );

      // Show confirmation
      fireEvent.click(screen.getByText('Remove API Key'));

      // Confirm deletion
      fireEvent.click(screen.getByText('Remove Key'));

      expect(onDeleteApiKey).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('translations', () => {
    it('should use provided translations', () => {
      const customTranslations = {
        ...mockTranslations,
        settings: 'Configurações',
        settingsVoice: 'Configurações de Voz',
        settingsClose: 'Fechar',
      };

      render(
        <SettingsModal
          {...defaultProps}
          t={customTranslations}
        />
      );

      expect(screen.getByText('Configurações')).toBeInTheDocument();
      expect(screen.getByText('Configurações de Voz')).toBeInTheDocument();
      expect(screen.getByText('Fechar')).toBeInTheDocument();
    });
  });

  describe('snapshots', () => {
    it('should match snapshot for default state', () => {
      const { container } = render(<SettingsModal {...defaultProps} />);
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot when closed', () => {
      const { container } = render(
        <SettingsModal {...defaultProps} isOpen={false} />
      );
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot with delete database confirmation', () => {
      const { container } = render(<SettingsModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Delete All Saves'));

      expect(container).toMatchSnapshot();
    });

    it('should match snapshot with delete API key confirmation', () => {
      const { container } = render(<SettingsModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Remove API Key'));

      expect(container).toMatchSnapshot();
    });

    it('should match snapshot with Portuguese translations', () => {
      const ptTranslations = {
        settings: 'Configurações',
        settingsNarrativeStyle: 'Editar Estilo Narrativo',
        settingsNarrativeStyleDesc: 'Ajuste presets de tom ou injete um briefing personalizado.',
        settingsNarrativeStyleDisabled: 'Inicie uma história para editar seu tom narrativo.',
        settingsVoice: 'Configurações de Voz',
        settingsVoiceDesc: 'Configure voz e tom do TTS',
        settingsDeleteDb: 'Excluir Todos os Saves',
        settingsDeleteDbDesc: 'Remover todas as histórias do armazenamento local',
        settingsConfirmDelete: 'Confirmar Exclusão',
        settingsDeleteDbWarning: 'Isso excluirá permanentemente todas as suas histórias salvas.',
        settingsDeleting: 'Excluindo...',
        settingsDeleteConfirm: 'Excluir Tudo',
        settingsDeleteKey: 'Remover Chave API',
        settingsDeleteKeyDesc: 'Limpar chave OpenAI salva e voltar ao início',
        settingsDeleteKeyWarning: 'Isso removerá sua chave API.',
        settingsRemoveKey: 'Remover Chave',
        settingsClose: 'Fechar',
        cancel: 'Cancelar',
      };

      const { container } = render(
        <SettingsModal {...defaultProps} t={ptTranslations} />
      );

      expect(container).toMatchSnapshot();
    });

    it('should match snapshot with narrative style disabled', () => {
      const { container } = render(
        <SettingsModal {...defaultProps} canEditNarrativeStyle={false} />
      );

      expect(container).toMatchSnapshot();
    });
  });
});
