import React, { useState } from 'react';
import { X, Palette, Loader2, RefreshCw } from 'lucide-react';
import { useThemeColors } from '../hooks/useThemeColors';

interface ThemeColorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegenerate: (userConsiderations?: string) => Promise<void>;
  isGenerating: boolean;
}

/**
 * Modal component for regenerating theme colors with optional user input.
 * Allows users to provide custom considerations for the AI color generation.
 */
export const ThemeColorsModal: React.FC<ThemeColorsModalProps> = ({
  isOpen,
  onClose,
  onRegenerate,
  isGenerating
}) => {
  const [userInput, setUserInput] = useState('');
  const { colors } = useThemeColors();

  if (!isOpen) return null;

  const handleRegenerate = async () => {
    await onRegenerate(userInput.trim() || undefined);
    setUserInput('');
    onClose();
  };

  const handleQuickRegenerate = async () => {
    await onRegenerate();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
         style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div
        className="w-full max-w-md relative animate-fade-in"
        style={{
          backgroundColor: colors.backgroundSecondary,
          border: `2px solid ${colors.borderStrong}`,
          boxShadow: `8px 8px 0px ${colors.shadow}`
        }}
      >
        {/* Header */}
        <div
          className="p-4 flex justify-between items-center"
          style={{
            borderBottom: `2px solid ${colors.border}`,
            backgroundColor: colors.backgroundAccent
          }}
        >
          <h2
            className="text-xl font-bold uppercase flex items-center gap-2"
            style={{ color: colors.text }}
          >
            <Palette className="w-5 h-5" />
            Theme Colors
          </h2>
          <button
            onClick={onClose}
            className="p-1 transition-colors hover:opacity-70"
            style={{ color: colors.textSecondary }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Current Colors Preview */}
          <div>
            <label
              className="text-sm font-bold uppercase mb-2 block"
              style={{ color: colors.textSecondary }}
            >
              Current Palette
            </label>
            <div className="flex gap-1 flex-wrap">
              {[
                colors.background,
                colors.backgroundSecondary,
                colors.backgroundAccent,
                colors.text,
                colors.buttonPrimary,
                colors.success,
                colors.warning,
                colors.danger
              ].map((color, idx) => (
                <div
                  key={idx}
                  className="w-8 h-8 rounded-sm"
                  style={{
                    backgroundColor: color,
                    border: `1px solid ${colors.border}`
                  }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* User Input */}
          <div>
            <label
              className="text-sm font-bold uppercase mb-2 block"
              style={{ color: colors.textSecondary }}
            >
              Custom Considerations (Optional)
            </label>
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="e.g., 'darker tones', 'more vibrant colors', 'cyberpunk neon style'..."
              rows={3}
              disabled={isGenerating}
              className="w-full p-3 text-sm resize-none outline-none transition-all"
              style={{
                backgroundColor: colors.background,
                border: `2px solid ${colors.border}`,
                color: colors.text,
                opacity: isGenerating ? 0.5 : 1
              }}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleQuickRegenerate}
              disabled={isGenerating}
              className="flex-1 py-3 font-bold uppercase text-sm flex items-center justify-center gap-2 transition-all"
              style={{
                backgroundColor: colors.buttonSecondary,
                color: colors.buttonSecondaryText,
                border: `2px solid ${colors.borderStrong}`,
                boxShadow: `3px 3px 0px ${colors.shadow}`,
                opacity: isGenerating ? 0.5 : 1
              }}
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Quick Regenerate
            </button>
            <button
              onClick={handleRegenerate}
              disabled={isGenerating || !userInput.trim()}
              className="flex-1 py-3 font-bold uppercase text-sm flex items-center justify-center gap-2 transition-all"
              style={{
                backgroundColor: userInput.trim() ? colors.buttonPrimary : colors.buttonSecondary,
                color: userInput.trim() ? colors.buttonPrimaryText : colors.buttonSecondaryText,
                border: `2px solid ${colors.borderStrong}`,
                boxShadow: `3px 3px 0px ${colors.shadow}`,
                opacity: (isGenerating || !userInput.trim()) ? 0.5 : 1
              }}
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Palette className="w-4 h-4" />
              )}
              Apply Custom
            </button>
          </div>

          <p
            className="text-xs text-center"
            style={{ color: colors.textSecondary }}
          >
            Regenerating will create a new color palette based on the universe theme.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ThemeColorsModal;
