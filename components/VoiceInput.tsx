
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { transcribeAudio } from '../services/geminiService';
import { Language } from '../types';
import { useWakeLock } from '../hooks/useWakeLock';

interface VoiceInputProps {
  onTranscription: (text: string) => void;
  apiKey: string;
  language: Language;
  className?: string;
  disabled?: boolean;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
  onTranscription,
  apiKey,
  language,
  className = "",
  disabled = false
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { requestWakeLock, releaseWakeLock } = useWakeLock();

  // Manage wake lock based on recording state
  useEffect(() => {
    if (isRecording) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
  }, [isRecording, requestWakeLock, releaseWakeLock]);

  const startRecording = async () => {
    if (!apiKey) {
      alert("KEY_MISSING");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);

        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("AUDIO_IO_ERROR:", err);
      alert("AUDIO HARDWARE NOT DETECTED");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const processAudio = async (blob: Blob) => {
    try {
      // Send the blob directly to Whisper API
      const text = await transcribeAudio(apiKey, blob, language);
      if (text) {
        onTranscription(text.trim());
      }
      setIsProcessing(false);
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <button
      onClick={toggleRecording}
      disabled={disabled || isProcessing}
      className={`p-2 transition-all flex-shrink-0 relative border ${className} ${
        isRecording
          ? 'bg-red-900/50 text-red-500 border-red-500 animate-pulse'
          : 'border-transparent hover:border-green-500 text-green-700 hover:text-green-400'
      }`}
      title="VOICE_INPUT_MODULE"
    >
      {isProcessing ? (
        <Loader2 className="w-5 h-5 animate-spin text-green-400" />
      ) : isRecording ? (
        <>
          <Square className="w-5 h-5 fill-current" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500"></span>
        </>
      ) : (
        <Mic className="w-5 h-5" />
      )}
    </button>
  );
};
