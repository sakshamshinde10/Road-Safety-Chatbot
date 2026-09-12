import React, { useState } from 'react';
import Header from './components/Header.jsx';
import ChatWindow from './components/ChatWindow.jsx';
import InputBox from './components/InputBox.jsx';
import EmergencyModal from './components/EmergencyModal.jsx';
import IksExplanationModal from './components/IksExplanationModal.jsx';
import { AlertCircle, X } from 'lucide-react';

const rawApiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'https://road-safety-chatbot.onrender.com');
const API_BASE_URL = (rawApiUrl || '').replace(/\/+$/, '');

export default function App() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState(null);

  // Modal open states
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [isIksOpen, setIsIksOpen] = useState(false);

  const handleSendMessage = async (text) => {
    if (!text.trim()) {
      showError('Please enter a road-safety question.');
      return;
    }

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = {
      sender: 'user',
      text: text.trim(),
      timestamp
    };

    const historyPayload = messages.slice(-8).map(m => ({
      sender: m.sender,
      text: m.text
    }));

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setErrorBanner(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history: historyPayload
        })
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Received unexpected HTML response. The backend might be waking up or unreachable. Please try again.');
      }

      const data = await response.json();


      if (!response.ok) {
        throw new Error(data.error || 'Server error occurred');
      }

      const botMsg = {
        sender: 'bot',
        msgId: Date.now(),
        text: data.response,
        source: data.source,
        type: data.type,
        intent: data.intent,
        reasoning: data.reasoning,
        decisionFlow: data.decisionFlow,
        notice: data.notice,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);

    } catch (err) {
      console.error('Error communicating with backend:', err);
      let userFriendlyError = 'Unable to connect to the safety service. Please try again.';

      if (err.message && err.message.includes('AI safety advice')) {
        userFriendlyError = 'AI safety advice is temporarily unavailable. Please follow basic road-safety precautions and try again.';
      } else if (err.message) {
        userFriendlyError = err.message;
      }

      showError(userFriendlyError);

      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: `⚠️ ${userFriendlyError}`,
          source: 'local',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Interactive Decision Option Handler
  const handleSelectDecisionOption = async (decisionFlowId, optionId, label, msgId) => {
    // 1. Mark decision option as selected in UI
    setMessages(prev =>
      prev.map(msg => (msg.msgId === msgId ? { ...msg, selectedOption: optionId } : msg))
    );

    // 2. Append User's choice to chat feed
    const userMsg = {
      sender: 'user',
      text: label,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisionFlowId, optionId })
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Received unexpected response from server. Please try again.');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process decision response');
      }

      const botMsg = {
        sender: 'bot',
        msgId: Date.now(),
        text: data.response,
        source: data.source || 'decision',
        intent: data.intent,
        reasoning: data.reasoning,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error('Error sending decision option:', err);
      showError('Failed to process decision choice.');
    } finally {
      setIsLoading(false);
    }
  };

  const showError = (msg) => {
    setErrorBanner(msg);
    setTimeout(() => setErrorBanner(null), 5000);
  };

  const handleNewChat = () => {
    setMessages([]);
    setErrorBanner(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">

      {/* Top Header */}
      <Header
        onNewChat={handleNewChat}
        onOpenEmergency={() => setIsEmergencyOpen(true)}
        onOpenIks={() => setIsIksOpen(true)}
        messageCount={messages.length}
      />

      {/* Floating Global Error Banner */}
      {errorBanner && (
        <div className="bg-rose-500/10 border-b border-rose-500/30 px-4 py-2.5 text-xs text-rose-300 flex items-center justify-between z-40 animate-fade-in">
          <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button
            onClick={() => setErrorBanner(null)}
            className="text-rose-400 hover:text-rose-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Chat Feed Container */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          onSelectPrompt={handleSendMessage}
          onSelectDecisionOption={handleSelectDecisionOption}
          onOpenEmergency={() => setIsEmergencyOpen(true)}
          onOpenIks={() => setIsIksOpen(true)}
        />
      </main>

      {/* Bottom Sticky Input Control */}
      <InputBox
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      />

      {/* Modals */}
      <EmergencyModal
        isOpen={isEmergencyOpen}
        onClose={() => setIsEmergencyOpen(false)}
      />

      <IksExplanationModal
        isOpen={isIksOpen}
        onClose={() => setIsIksOpen(false)}
      />

    </div>
  );
}
