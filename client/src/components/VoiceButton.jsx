import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, AlertCircle } from 'lucide-react';

export default function VoiceButton({
  input,
  setInput,
  onTranscript,
  disabled,
  initialText = ''
}) {
  const [isListening, setIsListening] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const restartingRef = useRef(false);
  const restartTimeoutRef = useRef(null);
  const errorTimeoutRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const lastFinalIndexRef = useRef(-1);

  // Keep input reference fresh for when listening starts
  const inputRef = useRef(input !== undefined ? input : initialText);
  useEffect(() => {
    inputRef.current = input !== undefined ? input : initialText;
  }, [input, initialText]);

  // Keep update callback fresh
  const updateTranscript = useCallback((text) => {
    if (typeof setInput === 'function') {
      setInput(text);
    }
    if (typeof onTranscript === 'function') {
      onTranscript(text);
    }
  }, [setInput, onTranscript]);

  const updateTranscriptRef = useRef(updateTranscript);
  useEffect(() => {
    updateTranscriptRef.current = updateTranscript;
  }, [updateTranscript]);

  const showError = (msg) => {
    setErrorMsg(msg);
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    errorTimeoutRef.current = setTimeout(() => {
      setErrorMsg(null);
      errorTimeoutRef.current = null;
    }, 4500);
  };

  // Initialize SpeechRecognition once
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      isListeningRef.current = true;
      restartingRef.current = false;
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          if (i > lastFinalIndexRef.current) {
            lastFinalIndexRef.current = i;
            const trimmed = transcript.trim();
            if (trimmed) {
              finalTranscriptRef.current = (
                finalTranscriptRef.current
                  ? finalTranscriptRef.current.trim() + ' '
                  : ''
              ) + trimmed + ' ';
            }
          }
        } else {
          interimTranscript += transcript;
        }
      }

      const currentFinal = finalTranscriptRef.current;
      const currentInterim = interimTranscript.trim();
      const fullText = currentInterim
        ? (currentFinal ? currentFinal.trim() + ' ' : '') + currentInterim
        : currentFinal.trim();

      if (updateTranscriptRef.current) {
        updateTranscriptRef.current(fullText);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed' || event.error === 'permission-denied') {
        isListeningRef.current = false;
        setIsListening(false);
        restartingRef.current = false;
        if (restartTimeoutRef.current) {
          clearTimeout(restartTimeoutRef.current);
          restartTimeoutRef.current = null;
        }
        showError('Microphone permission was denied. Please allow microphone access in browser settings.');
      } else if (event.error === 'audio-capture') {
        isListeningRef.current = false;
        setIsListening(false);
        restartingRef.current = false;
        if (restartTimeoutRef.current) {
          clearTimeout(restartTimeoutRef.current);
          restartTimeoutRef.current = null;
        }
        showError('No microphone was detected. Please check your audio input device.');
      } else if (event.error === 'network') {
        // Do not immediately disable listening unless permanent.
        console.warn('Speech recognition network issue encountered.');
      } else if (event.error === 'no-speech') {
        // Do NOT automatically stop listening.
        // Allow onend to restart recognition so user can continue speaking after pause.
      } else if (event.error === 'aborted') {
        // Normal stop/abort; do nothing.
      }
    };

    recognition.onend = () => {
      // If user still wants voice input active, restart recognition
      if (isListeningRef.current && !restartingRef.current) {
        restartingRef.current = true;
        lastFinalIndexRef.current = -1;

        restartTimeoutRef.current = setTimeout(() => {
          if (isListeningRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (err) {
              // Ignore "already started" or similar transition errors
              console.warn('Recognition restart skipped or already running:', err);
            }
          }
          restartingRef.current = false;
          restartTimeoutRef.current = null;
        }, 200);
      } else if (!isListeningRef.current) {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      isListeningRef.current = false;
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  // Automatically stop listening if disabled (e.g. while submitting/loading)
  useEffect(() => {
    if (disabled && isListeningRef.current) {
      stopListening();
    }
  }, [disabled]);

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showError(
        'Voice input is not supported in this browser. Please use Chrome or another supported browser, or type your question.'
      );
      return;
    }

    // Preserve existing typed text
    const existingText = (inputRef.current || '').trim();
    finalTranscriptRef.current = existingText ? existingText + ' ' : '';
    lastFinalIndexRef.current = -1;

    isListeningRef.current = true;
    setIsListening(true);
    setErrorMsg(null);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        // Recognition already started; ignore
        console.log('Recognition already started:', error);
      }
    }
  };

  const stopListening = () => {
    isListeningRef.current = false;
    setIsListening(false);
    restartingRef.current = false;

    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        // Ignore if already stopped
      }
    }
    // Note: Do NOT clear finalTranscriptRef.current, input, or submit message
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="relative flex items-center gap-1.5">
      {/* Speech Error Feedback Tooltip */}
      {errorMsg && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-2 rounded-xl bg-rose-950/95 border border-rose-500/50 text-xs text-rose-200 font-medium whitespace-nowrap shadow-xl flex items-center gap-2 z-50 animate-bounce">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Microphone Toggle Button */}
      <button
        type="button"
        onClick={toggleListening}
        disabled={disabled}
        id="voice-mic-button"
        aria-label={isListening ? 'Listening...' : 'Start voice input'}
        title={isListening ? 'Listening... Click to stop voice input' : 'Start voice input'}
        className={`relative px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all duration-200 cursor-pointer flex items-center gap-2 ${
          isListening
            ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/40 ring-2 ring-rose-400/50 animate-pulse'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
      >
        {isListening ? (
          <>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-200 animate-ping shrink-0" />
            <span className="text-sm leading-none" role="img" aria-label="Active recording">🔴</span>
            <Mic className="w-4 h-4 text-rose-100" />
            <span className="font-bold text-xs tracking-wide">Listening...</span>
          </>
        ) : (
          <>
            <Mic className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline text-xs">Start voice input</span>
          </>
        )}
      </button>
    </div>
  );
}

