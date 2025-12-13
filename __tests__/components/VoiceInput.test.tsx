import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { VoiceInput } from '../../components/VoiceInput';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Mic: () => <span data-testid="mic-icon">Mic</span>,
  Square: () => <span data-testid="square-icon">Stop</span>,
  Loader2: () => <span data-testid="loader-icon">Loading</span>,
}));

// Mock the gemini service
jest.mock('../../services/geminiService', () => ({
  transcribeAudio: jest.fn().mockResolvedValue('Transcribed text from audio'),
}));

// Mock the useWakeLock hook
jest.mock('../../hooks/useWakeLock', () => ({
  useWakeLock: () => ({
    requestWakeLock: jest.fn(),
    releaseWakeLock: jest.fn(),
  }),
}));

// Mock MediaRecorder
const mockMediaRecorder = {
  start: jest.fn(),
  stop: jest.fn(),
  ondataavailable: null as ((e: any) => void) | null,
  onstop: null as (() => void) | null,
};

const mockStream = {
  getTracks: () => [{ stop: jest.fn() }],
};

// Mock navigator.mediaDevices
const mockGetUserMedia = jest.fn().mockResolvedValue(mockStream);
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
  },
  writable: true,
});

// Mock MediaRecorder constructor
global.MediaRecorder = jest.fn().mockImplementation(() => mockMediaRecorder) as any;

const createDefaultProps = () => ({
  onTranscription: jest.fn(),
  apiKey: 'test-api-key',
  language: 'en' as const,
});

describe('VoiceInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMediaRecorder.ondataavailable = null;
    mockMediaRecorder.onstop = null;
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      const props = createDefaultProps();
      render(<VoiceInput {...props} />);
      expect(document.body).toBeInTheDocument();
    });

    it('should render microphone icon when not recording', () => {
      const props = createDefaultProps();
      render(<VoiceInput {...props} />);
      expect(screen.getByTestId('mic-icon')).toBeInTheDocument();
    });

    it('should match snapshot in idle state', () => {
      const props = createDefaultProps();
      const { container } = render(<VoiceInput {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot when disabled', () => {
      const props = { ...createDefaultProps(), disabled: true };
      const { container } = render(<VoiceInput {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot with custom className', () => {
      const props = { ...createDefaultProps(), className: 'custom-voice-class' };
      const { container } = render(<VoiceInput {...props} />);
      expect(container).toMatchSnapshot();
    });
  });

  describe('button state', () => {
    it('should be disabled when disabled prop is true', () => {
      const props = { ...createDefaultProps(), disabled: true };
      render(<VoiceInput {...props} />);

      const button = screen.getByTitle('VOICE_INPUT_MODULE');
      expect(button).toBeDisabled();
    });

    it('should not be disabled when disabled prop is false', () => {
      const props = createDefaultProps();
      render(<VoiceInput {...props} />);

      const button = screen.getByTitle('VOICE_INPUT_MODULE');
      expect(button).not.toBeDisabled();
    });
  });

  describe('recording flow', () => {
    it('should start recording when clicked', async () => {
      const props = createDefaultProps();
      render(<VoiceInput {...props} />);

      const button = screen.getByTitle('VOICE_INPUT_MODULE');
      await act(async () => {
        fireEvent.click(button);
      });

      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
    });

    it('should show stop icon when recording', async () => {
      const props = createDefaultProps();
      render(<VoiceInput {...props} />);

      const button = screen.getByTitle('VOICE_INPUT_MODULE');
      await act(async () => {
        fireEvent.click(button);
      });

      expect(screen.getByTestId('square-icon')).toBeInTheDocument();
    });

    it('should show recording indicator dot', async () => {
      const props = createDefaultProps();
      const { container } = render(<VoiceInput {...props} />);

      const button = screen.getByTitle('VOICE_INPUT_MODULE');
      await act(async () => {
        fireEvent.click(button);
      });

      const indicator = container.querySelector('.bg-red-500');
      expect(indicator).toBeInTheDocument();
    });

    it('should stop recording when clicked again', async () => {
      const props = createDefaultProps();
      render(<VoiceInput {...props} />);

      const button = screen.getByTitle('VOICE_INPUT_MODULE');

      // Start recording
      await act(async () => {
        fireEvent.click(button);
      });

      // Stop recording
      await act(async () => {
        fireEvent.click(button);
      });

      expect(mockMediaRecorder.stop).toHaveBeenCalled();
    });
  });

  describe('API key validation', () => {
    it('should alert when API key is missing', async () => {
      const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
      const props = { ...createDefaultProps(), apiKey: '' };
      render(<VoiceInput {...props} />);

      const button = screen.getByTitle('VOICE_INPUT_MODULE');
      await act(async () => {
        fireEvent.click(button);
      });

      expect(alertMock).toHaveBeenCalledWith('KEY_MISSING');
      alertMock.mockRestore();
    });
  });

  describe('transcription', () => {
    it('should call onTranscription after processing audio', async () => {
      const { transcribeAudio } = require('../../services/geminiService');
      const props = createDefaultProps();
      render(<VoiceInput {...props} />);

      const button = screen.getByTitle('VOICE_INPUT_MODULE');

      // Start recording
      await act(async () => {
        fireEvent.click(button);
      });

      // Simulate data available
      if (mockMediaRecorder.ondataavailable) {
        await act(async () => {
          mockMediaRecorder.ondataavailable({ data: new Blob(['test'], { type: 'audio/webm' }) });
        });
      }

      // Stop recording
      await act(async () => {
        fireEvent.click(button);
      });

      // Simulate onstop callback
      if (mockMediaRecorder.onstop) {
        await act(async () => {
          await mockMediaRecorder.onstop();
        });
      }

      await waitFor(() => {
        expect(transcribeAudio).toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('should handle getUserMedia error gracefully', async () => {
      mockGetUserMedia.mockRejectedValueOnce(new Error('Permission denied'));
      const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const props = createDefaultProps();
      render(<VoiceInput {...props} />);

      const button = screen.getByTitle('VOICE_INPUT_MODULE');
      await act(async () => {
        fireEvent.click(button);
      });

      expect(alertMock).toHaveBeenCalledWith('AUDIO HARDWARE NOT DETECTED');

      alertMock.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe('button styling', () => {
    it('should have recording style when recording', async () => {
      const props = createDefaultProps();
      render(<VoiceInput {...props} />);

      const button = screen.getByTitle('VOICE_INPUT_MODULE');
      await act(async () => {
        fireEvent.click(button);
      });

      expect(button).toHaveClass('bg-red-900/50');
      expect(button).toHaveClass('animate-pulse');
    });

    it('should have idle style when not recording', () => {
      const props = createDefaultProps();
      render(<VoiceInput {...props} />);

      const button = screen.getByTitle('VOICE_INPUT_MODULE');
      expect(button).toHaveClass('text-green-700');
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      const props = { ...createDefaultProps(), className: 'my-custom-class' };
      render(<VoiceInput {...props} />);

      const button = screen.getByTitle('VOICE_INPUT_MODULE');
      expect(button).toHaveClass('my-custom-class');
    });
  });
});
