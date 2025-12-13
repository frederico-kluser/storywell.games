import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CharacterZoomModal } from '../../components/CharacterZoomModal';
import { ThemeColorsProvider } from '../../hooks/useThemeColors';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  X: () => <span data-testid="x-icon">X</span>,
}));

// Helper to render with ThemeColorsProvider
const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeColorsProvider>{ui}</ThemeColorsProvider>);
};

const createDefaultProps = () => ({
  isOpen: true,
  onClose: jest.fn(),
  imageSrc: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
  characterName: 'Gandalf the Grey',
});

describe('CharacterZoomModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render nothing when isOpen is false', () => {
      const props = { ...createDefaultProps(), isOpen: false };
      const { container } = renderWithTheme(<CharacterZoomModal {...props} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render nothing when imageSrc is null', () => {
      const props = { ...createDefaultProps(), imageSrc: null };
      const { container } = renderWithTheme(<CharacterZoomModal {...props} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render modal when isOpen is true and imageSrc exists', () => {
      const props = createDefaultProps();
      renderWithTheme(<CharacterZoomModal {...props} />);
      expect(screen.getByText('Gandalf the Grey')).toBeInTheDocument();
    });

    it('should match snapshot when open', () => {
      const props = createDefaultProps();
      const { container } = renderWithTheme(<CharacterZoomModal {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot with different character name', () => {
      const props = { ...createDefaultProps(), characterName: 'Aragorn' };
      const { container } = renderWithTheme(<CharacterZoomModal {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot with URL image', () => {
      const props = {
        ...createDefaultProps(),
        imageSrc: 'https://example.com/avatar.png',
      };
      const { container } = renderWithTheme(<CharacterZoomModal {...props} />);
      expect(container).toMatchSnapshot();
    });
  });

  describe('character name', () => {
    it('should display character name in header', () => {
      const props = createDefaultProps();
      renderWithTheme(<CharacterZoomModal {...props} />);
      expect(screen.getByText('Gandalf the Grey')).toBeInTheDocument();
    });

    it('should display different character names', () => {
      const props = { ...createDefaultProps(), characterName: 'Legolas' };
      renderWithTheme(<CharacterZoomModal {...props} />);
      expect(screen.getByText('Legolas')).toBeInTheDocument();
    });
  });

  describe('image display', () => {
    it('should display character image', () => {
      const props = createDefaultProps();
      const { container } = renderWithTheme(<CharacterZoomModal {...props} />);

      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img?.src).toBe('data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==');
      expect(img?.alt).toBe('Gandalf the Grey');
    });

    it('should display image with URL source', () => {
      const props = {
        ...createDefaultProps(),
        imageSrc: 'https://example.com/character.png',
      };
      const { container } = renderWithTheme(<CharacterZoomModal {...props} />);

      const img = container.querySelector('img');
      expect(img?.src).toBe('https://example.com/character.png');
    });
  });

  describe('close functionality', () => {
    it('should call onClose when X button is clicked', () => {
      const props = createDefaultProps();
      renderWithTheme(<CharacterZoomModal {...props} />);

      const closeButtons = screen.getAllByRole('button');
      const xButton = closeButtons.find(
        (btn) => btn.querySelector('[data-testid="x-icon"]')
      );
      if (xButton) {
        fireEvent.click(xButton);
      }

      expect(props.onClose).toHaveBeenCalled();
    });

    it('should call onClose when backdrop is clicked', () => {
      const props = createDefaultProps();
      const { container } = renderWithTheme(<CharacterZoomModal {...props} />);

      // Click on the backdrop (the fixed overlay)
      const backdrop = container.querySelector('.fixed');
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      expect(props.onClose).toHaveBeenCalled();
    });

    it('should NOT call onClose when modal content is clicked', () => {
      const props = createDefaultProps();
      renderWithTheme(<CharacterZoomModal {...props} />);

      // Click on the character name (inside the modal)
      fireEvent.click(screen.getByText('Gandalf the Grey'));

      // onClose should not be called because we stopped propagation
      expect(props.onClose).not.toHaveBeenCalled();
    });

    it('should call onClose when ESC key is pressed', () => {
      const props = createDefaultProps();
      renderWithTheme(<CharacterZoomModal {...props} />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(props.onClose).toHaveBeenCalled();
    });

    it('should not call onClose on other key presses', () => {
      const props = createDefaultProps();
      renderWithTheme(<CharacterZoomModal {...props} />);

      fireEvent.keyDown(window, { key: 'Enter' });
      fireEvent.keyDown(window, { key: 'Space' });
      fireEvent.keyDown(window, { key: 'a' });

      expect(props.onClose).not.toHaveBeenCalled();
    });
  });

  describe('keyboard events cleanup', () => {
    it('should add keydown listener when opened', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      const props = createDefaultProps();
      renderWithTheme(<CharacterZoomModal {...props} />);

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );

      addEventListenerSpy.mockRestore();
    });

    it('should remove keydown listener when closed', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      const props = createDefaultProps();
      const { unmount } = renderWithTheme(<CharacterZoomModal {...props} />);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('styling', () => {
    it('should have backdrop blur', () => {
      const props = createDefaultProps();
      const { container } = renderWithTheme(<CharacterZoomModal {...props} />);

      const backdrop = container.querySelector('.backdrop-blur-sm');
      expect(backdrop).toBeInTheDocument();
    });

    it('should have animation class', () => {
      const props = createDefaultProps();
      const { container } = renderWithTheme(<CharacterZoomModal {...props} />);

      const animatedElements = container.querySelectorAll('.animate-fade-in');
      expect(animatedElements.length).toBeGreaterThan(0);
    });

    it('should have aspect-square for image container', () => {
      const props = createDefaultProps();
      const { container } = renderWithTheme(<CharacterZoomModal {...props} />);

      const imageContainer = container.querySelector('.aspect-square');
      expect(imageContainer).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper alt text for image', () => {
      const props = createDefaultProps();
      const { container } = renderWithTheme(<CharacterZoomModal {...props} />);

      const img = container.querySelector('img');
      expect(img?.alt).toBe('Gandalf the Grey');
    });

    it('should have button for close action', () => {
      const props = createDefaultProps();
      renderWithTheme(<CharacterZoomModal {...props} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
