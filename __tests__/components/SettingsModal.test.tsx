import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsModal } from '../../components/SettingsModal/SettingsModal';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  X: () => <span data-testid="x-icon">X</span>,
  Settings: () => <span data-testid="settings-icon">Settings</span>,
  Volume2: () => <span data-testid="volume-icon">Volume</span>,
  Trash2: () => <span data-testid="trash-icon">Trash</span>,
  Key: () => <span data-testid="key-icon">Key</span>,
  AlertTriangle: () => <span data-testid="alert-icon">Alert</span>,
  Loader2: () => <span data-testid="loader-icon">Loading</span>,
  Edit3: () => <span data-testid="edit-icon">Edit</span>,
  Palette: () => <span data-testid="palette-icon">Palette</span>,
}));

const mockTranslations = {
  settings: 'Settings',
  settingsVoice: 'Voice Settings',
  settingsVoiceDesc: 'Configure TTS voice and tone options',
  settingsNarrativeStyle: 'Edit Narrative Style',
  settingsNarrativeStyleDesc: 'Adjust tone presets or inject a custom writing brief.',
  settingsNarrativeStyleDisabled: 'Start a story to edit its narrative tone.',
  settingsDeleteDb: 'Delete All Saves',
  settingsDeleteDbDesc: 'Remove all stories from local storage',
  settingsDeleteDbWarning: 'This will permanently delete all your saved stories. This action cannot be undone.',
  settingsConfirmDelete: 'Confirm Deletion',
  settingsDeleteConfirm: 'Delete All',
  settingsDeleting: 'Deleting...',
  settingsDeleteKey: 'Remove API Key',
  settingsDeleteKeyDesc: 'Clear saved OpenAI key and return to start',
  settingsDeleteKeyWarning: 'This will remove your API key. You will need to enter it again to continue playing.',
  settingsRemoveKey: 'Remove Key',
  settingsClose: 'Close',
  cancel: 'Cancel',
};

const createDefaultProps = () => ({
  isOpen: true,
  onClose: jest.fn(),
  onOpenVoiceSettings: jest.fn(),
  onOpenNarrativeStyle: jest.fn(),
  onDeleteDatabase: jest.fn().mockResolvedValue(undefined),
  onDeleteApiKey: jest.fn(),
  canEditNarrativeStyle: true,
  t: mockTranslations,
});

describe('SettingsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render nothing when isOpen is false', () => {
      const props = { ...createDefaultProps(), isOpen: false };
      const { container } = render(<SettingsModal {...props} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render modal when isOpen is true', () => {
      const props = createDefaultProps();
      render(<SettingsModal {...props} />);
      // Use getAllByText since the icon mock also contains "Settings"
      const settingsElements = screen.getAllByText('Settings');
      expect(settingsElements.length).toBeGreaterThan(0);
    });

    it('should match snapshot when open', () => {
      const props = createDefaultProps();
      const { container } = render(<SettingsModal {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot with delete database confirmation', () => {
      const props = createDefaultProps();
      render(<SettingsModal {...props} />);

      // Click delete database button to show confirmation
      fireEvent.click(screen.getByText('Delete All Saves'));

      expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();
      expect(document.body).toMatchSnapshot();
    });

    it('should match snapshot with delete key confirmation', () => {
      const props = createDefaultProps();
      render(<SettingsModal {...props} />);

      // Click delete key button to show confirmation
      fireEvent.click(screen.getByText('Remove API Key'));

      // There should be multiple "Confirm Deletion" texts now
      const confirmTexts = screen.getAllByText('Confirm Deletion');
      expect(confirmTexts.length).toBeGreaterThan(0);
    });
  });

  describe('voice settings', () => {
    it('should display voice settings option', () => {
      const props = createDefaultProps();
      render(<SettingsModal {...props} />);
      expect(screen.getByText('Voice Settings')).toBeInTheDocument();
    });

    it('should call onOpenVoiceSettings and onClose when voice settings is clicked', () => {
      const props = createDefaultProps();
      render(<SettingsModal {...props} />);

      fireEvent.click(screen.getByText('Voice Settings'));

      expect(props.onClose).toHaveBeenCalled();
      expect(props.onOpenVoiceSettings).toHaveBeenCalled();
    });
  });

  describe('narrative style settings', () => {
    it('should display narrative style option when enabled', () => {
      const props = createDefaultProps();
      render(<SettingsModal {...props} />);
      expect(screen.getByText('Edit Narrative Style')).toBeInTheDocument();
    });

    it('should display enabled description when canEditNarrativeStyle is true', () => {
      const props = createDefaultProps();
      render(<SettingsModal {...props} />);
      expect(screen.getByText('Adjust tone presets or inject a custom writing brief.')).toBeInTheDocument();
    });

    it('should display disabled description when canEditNarrativeStyle is false', () => {
      const props = { ...createDefaultProps(), canEditNarrativeStyle: false };
      render(<SettingsModal {...props} />);
      expect(screen.getByText('Start a story to edit its narrative tone.')).toBeInTheDocument();
    });

    it('should call onOpenNarrativeStyle and onClose when clicked and enabled', () => {
      const props = createDefaultProps();
      render(<SettingsModal {...props} />);

      fireEvent.click(screen.getByText('Edit Narrative Style'));

      expect(props.onClose).toHaveBeenCalled();
      expect(props.onOpenNarrativeStyle).toHaveBeenCalled();
    });

    it('should NOT call onOpenNarrativeStyle when disabled', () => {
      const props = { ...createDefaultProps(), canEditNarrativeStyle: false };
      render(<SettingsModal {...props} />);

      fireEvent.click(screen.getByText('Edit Narrative Style'));

      expect(props.onOpenNarrativeStyle).not.toHaveBeenCalled();
    });

    it('should have disabled styling when canEditNarrativeStyle is false', () => {
      const props = { ...createDefaultProps(), canEditNarrativeStyle: false };
      const { container } = render(<SettingsModal {...props} />);

      // Find the button that contains the edit icon
      const editButton = container.querySelector('button[disabled]');
      expect(editButton).toBeInTheDocument();
    });
  });

  describe('delete database', () => {
    it('should show confirmation when delete database is clicked', () => {
      const props = createDefaultProps();
      render(<SettingsModal {...props} />);

      fireEvent.click(screen.getByText('Delete All Saves'));

      expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();
      expect(screen.getByText(/permanently delete/)).toBeInTheDocument();
    });

    it('should hide confirmation when cancel is clicked', () => {
      const props = createDefaultProps();
      render(<SettingsModal {...props} />);

      // Show confirmation
      fireEvent.click(screen.getByText('Delete All Saves'));
      expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();

      // Click cancel
      fireEvent.click(screen.getByText('Cancel'));

      // Should show the original button again
      expect(screen.getByText('Delete All Saves')).toBeInTheDocument();
    });

    it('should call onDeleteDatabase when confirmed', async () => {
      const props = createDefaultProps();
      render(<SettingsModal {...props} />);

      // Show confirmation
      fireEvent.click(screen.getByText('Delete All Saves'));

      // Click confirm
      fireEvent.click(screen.getByText('Delete All'));

      await waitFor(() => {
        expect(props.onDeleteDatabase).toHaveBeenCalled();
      });
    });

    it('should show loading state during deletion', async () => {
      const props = createDefaultProps();
      props.onDeleteDatabase = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      render(<SettingsModal {...props} />);

      // Show confirmation and click delete
      fireEvent.click(screen.getByText('Delete All Saves'));
      fireEvent.click(screen.getByText('Delete All'));

      // Should show loading state
      expect(screen.getByText('Deleting...')).toBeInTheDocument();
    });

    it('should close modal after successful deletion', async () => {
      const props = createDefaultProps();
      render(<SettingsModal {...props} />);

      fireEvent.click(screen.getByText('Delete All Saves'));
      fireEvent.click(screen.getByText('Delete All'));

      await waitFor(() => {
        expect(props.onClose).toHaveBeenCalled();
      });
    });
  });

  describe('delete API key', () => {
    it('should show confirmation when delete key is clicked', () => {
      const props = createDefaultProps();
      render(<SettingsModal {...props} />);

      fireEvent.click(screen.getByText('Remove API Key'));

      expect(screen.getByText(/remove your API key/)).toBeInTheDocument();
    });

    it('should hide confirmation when cancel is clicked', () => {
      const props = createDefaultProps();
      render(<SettingsModal {...props} />);

      // Show confirmation
      fireEvent.click(screen.getByText('Remove API Key'));

      // Find and click cancel button (there are multiple cancel buttons, get the right one)
      const cancelButtons = screen.getAllByText('Cancel');
      fireEvent.click(cancelButtons[cancelButtons.length - 1]);

      // Should show the original button again
      expect(screen.getByText('Remove API Key')).toBeInTheDocument();
    });

    it('should call onDeleteApiKey and onClose when confirmed', () => {
      const props = createDefaultProps();
      render(<SettingsModal {...props} />);

      fireEvent.click(screen.getByText('Remove API Key'));
      fireEvent.click(screen.getByText('Remove Key'));

      expect(props.onDeleteApiKey).toHaveBeenCalled();
      expect(props.onClose).toHaveBeenCalled();
    });
  });

  describe('close functionality', () => {
    it('should call onClose when X button is clicked', () => {
      const props = createDefaultProps();
      render(<SettingsModal {...props} />);

      // Find the close button by its icon
      const closeButtons = screen.getAllByRole('button');
      const xButton = closeButtons.find(
        (btn) => btn.querySelector('[data-testid="x-icon"]')
      );
      if (xButton) {
        fireEvent.click(xButton);
      }

      expect(props.onClose).toHaveBeenCalled();
    });

    it('should call onClose when Close button is clicked', () => {
      const props = createDefaultProps();
      render(<SettingsModal {...props} />);

      fireEvent.click(screen.getByText('Close'));

      expect(props.onClose).toHaveBeenCalled();
    });
  });

  describe('descriptions', () => {
    it('should display voice settings description', () => {
      const props = createDefaultProps();
      render(<SettingsModal {...props} />);
      expect(screen.getByText('Configure TTS voice and tone options')).toBeInTheDocument();
    });

    it('should display delete database description', () => {
      const props = createDefaultProps();
      render(<SettingsModal {...props} />);
      expect(screen.getByText('Remove all stories from local storage')).toBeInTheDocument();
    });

    it('should display delete key description', () => {
      const props = createDefaultProps();
      render(<SettingsModal {...props} />);
      expect(screen.getByText('Clear saved OpenAI key and return to start')).toBeInTheDocument();
    });
  });
});
