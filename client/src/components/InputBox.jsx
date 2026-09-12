import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import VoiceButton from './VoiceButton.jsx';

export default function InputBox({ onSendMessage, isLoading }) {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleVoiceTranscript = (transcriptText) => {
    setInput(transcriptText);
  };

  return (
    <div className="sticky bottom-0 z-40 glass-panel border-t border-slate-800 p-3 sm:p-4">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          
          {/* Voice Input Button */}
          <VoiceButton
            input={input}
            setInput={setInput}
            onTranscript={handleVoiceTranscript}
            disabled={isLoading}
          />

          {/* Textarea Input */}
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              id="chat-text-input"
              aria-label="Type your road safety question"
              placeholder="Type your road safety question..."
              className="w-full px-4 py-3 bg-slate-900/90 text-slate-100 placeholder-slate-500 rounded-xl border border-slate-700/80 focus:outline-none focus:border-amber-500/80 focus:ring-2 focus:ring-amber-500/20 text-sm transition-all shadow-inner disabled:opacity-50"
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            id="chat-send-button"
            aria-label="Send Message"
            className={`p-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center cursor-pointer ${
              input.trim() && !isLoading
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:from-amber-400 hover:to-orange-400 shadow-md shadow-amber-500/20 active:scale-95'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800'
            }`}
            title="Send Message"
          >

            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>

        </form>

        <p className="text-[10px] text-center text-slate-500 mt-2 font-mono">
          🚦 College IKS Experiment • Rule-based local KB engine checked first before AI fallback.
        </p>
      </div>
    </div>
  );
}
