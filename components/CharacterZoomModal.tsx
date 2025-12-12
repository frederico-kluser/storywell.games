
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useThemeColors } from '../hooks/useThemeColors';

interface CharacterZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  characterName: string;
}

/**
 * Modal component for displaying character avatar images in a larger view.
 * Clicking the backdrop or the X button closes the modal.
 * Pressing ESC also closes the modal.
 */
export const CharacterZoomModal: React.FC<CharacterZoomModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  characterName
}) => {
  const { colors } = useThemeColors();

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageSrc) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
      style={{ backgroundColor: `${colors.text}99` }}
      onClick={onClose}
    >
      <div
        className="relative max-w-lg w-full animate-fade-in"
        style={{
          backgroundColor: colors.background,
          border: `2px solid ${colors.borderStrong}`,
          boxShadow: `12px 12px 0px ${colors.shadow}`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-4 flex items-center justify-between"
          style={{
            backgroundColor: colors.backgroundSecondary,
            borderBottom: `2px solid ${colors.border}`
          }}
        >
          <h2
            className="text-lg font-black uppercase tracking-wide truncate"
            style={{ color: colors.text }}
          >
            {characterName}
          </h2>
          <button
            onClick={onClose}
            className="p-1 transition-colors hover:opacity-70"
            style={{ color: colors.text }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image Container */}
        <div className="p-4" style={{ backgroundColor: colors.backgroundAccent }}>
          <div
            className="w-full aspect-square border-2 overflow-hidden"
            style={{
              borderColor: colors.borderStrong,
              boxShadow: `4px 4px 0px ${colors.shadow}`
            }}
          >
            <img
              src={imageSrc}
              alt={characterName}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
