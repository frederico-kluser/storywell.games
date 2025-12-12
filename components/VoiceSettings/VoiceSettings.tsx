
import React, { useState } from 'react';
import { X, Volume2, Play, Loader2, Check } from 'lucide-react';
import { generateSpeechWithTTS, TTSVoice } from '../../utils/ai';
import { playMP3Audio } from '../../utils/ai';

interface VoiceSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  selectedVoice: TTSVoice;
  onVoiceChange: (voice: TTSVoice) => void;
  useTone: boolean;
  onUseToneChange: (useTone: boolean) => void;
  previewText?: string;
}

/**
 * Voice descriptions for each available TTS voice.
 */
const voiceDescriptions: Record<TTSVoice, { name: string; description: string }> = {
  alloy: { name: 'Alloy', description: 'Neutral, balanced, versatile' },
  ash: { name: 'Ash', description: 'Warm, conversational, friendly' },
  ballad: { name: 'Ballad', description: 'Expressive, melodic, storytelling' },
  coral: { name: 'Coral', description: 'Clear, professional, engaging' },
  echo: { name: 'Echo', description: 'Warm, soft, comforting' },
  fable: { name: 'Fable', description: 'Dramatic, British accent, theatrical' },
  nova: { name: 'Nova', description: 'Energetic, bright, youthful' },
  onyx: { name: 'Onyx', description: 'Deep, authoritative, masculine' },
  sage: { name: 'Sage', description: 'Calm, wise, measured' },
  shimmer: { name: 'Shimmer', description: 'Gentle, soft, feminine' },
  verse: { name: 'Verse', description: 'Poetic, artistic, expressive' },
};

const allVoices: TTSVoice[] = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse'];

export const VoiceSettings: React.FC<VoiceSettingsProps> = ({
  isOpen,
  onClose,
  apiKey,
  selectedVoice,
  onVoiceChange,
  useTone,
  onUseToneChange,
  previewText = 'Hello! This is a preview of how I sound. Each voice has its own unique character and personality.',
}) => {
  const [previewingVoice, setPreviewingVoice] = useState<TTSVoice | null>(null);
  const [customPreviewText, setCustomPreviewText] = useState(previewText);

  if (!isOpen) return null;

  const handlePreview = async (voice: TTSVoice) => {
    if (previewingVoice) return; // Already previewing

    setPreviewingVoice(voice);
    try {
      // Use tone instructions only if useTone is enabled
      const instructions = useTone ? 'Speak naturally and clearly, as if introducing yourself.' : undefined;
      const audio = await generateSpeechWithTTS(
        apiKey,
        customPreviewText,
        voice,
        instructions,
        useTone
      );

      if (audio) {
        await playMP3Audio(audio);
      }
    } catch (e) {
      console.error('Preview failed:', e);
    } finally {
      setPreviewingVoice(null);
    }
  };

  const handleSelectVoice = (voice: TTSVoice) => {
    onVoiceChange(voice);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#f5f5f4] border-2 border-stone-900 w-full max-w-2xl shadow-[12px_12px_0px_rgba(0,0,0,1)] relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b-2 border-stone-900 bg-stone-800 flex justify-between items-center">
          <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
            <Volume2 className="w-6 h-6" />
            Voice Settings
          </h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tone Mode Toggle */}
        <div className="p-4 bg-white border-b-2 border-stone-300">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                Voice Tone
              </label>
              <p className="text-xs text-stone-500">
                {useTone
                  ? 'Expressive voice with emotional tones (gpt-4o-mini-tts)'
                  : 'Standard voice without tone (tts-1)'}
              </p>
            </div>
            <button
              onClick={() => onUseToneChange(!useTone)}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                useTone ? 'bg-stone-800' : 'bg-stone-300'
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow ${
                  useTone ? 'translate-x-8' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Preview Text Input */}
        <div className="p-4 bg-white border-b-2 border-stone-300">
          <label className="block text-xs font-bold text-stone-600 uppercase mb-2">
            Preview Text
          </label>
          <input
            type="text"
            value={customPreviewText}
            onChange={(e) => setCustomPreviewText(e.target.value)}
            placeholder="Type text to preview..."
            className="w-full bg-stone-50 border-2 border-stone-300 p-3 text-stone-900 focus:border-stone-900 outline-none font-mono text-sm"
          />
        </div>

        {/* Voice List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid gap-3">
            {allVoices.map((voice) => {
              const info = voiceDescriptions[voice];
              const isSelected = voice === selectedVoice;
              const isPreviewing = voice === previewingVoice;

              return (
                <div
                  key={voice}
                  className={`p-4 border-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-stone-800 border-stone-800 text-white shadow-[4px_4px_0px_#a8a29e]'
                      : 'bg-white border-stone-300 hover:border-stone-900 text-stone-700'
                  }`}
                  onClick={() => handleSelectVoice(voice)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isSelected && (
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div>
                        <h3 className={`font-bold uppercase text-lg ${isSelected ? 'text-white' : 'text-stone-900'}`}>
                          {info.name}
                        </h3>
                        <p className={`text-xs ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>
                          {info.description}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(voice);
                      }}
                      disabled={previewingVoice !== null}
                      className={`p-3 transition-colors ${
                        isSelected
                          ? 'bg-white/20 hover:bg-white/30 text-white'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                      } disabled:opacity-50`}
                      title="Preview voice"
                    >
                      {isPreviewing ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Play className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t-2 border-stone-300 bg-stone-50 flex justify-between items-center">
          <p className="text-xs text-stone-500 font-mono">
            Selected: <span className="font-bold text-stone-900">{voiceDescriptions[selectedVoice].name}</span>
          </p>
          <button
            onClick={onClose}
            className="py-2 px-6 bg-stone-900 text-white font-bold uppercase tracking-widest hover:bg-stone-700 transition-colors text-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
