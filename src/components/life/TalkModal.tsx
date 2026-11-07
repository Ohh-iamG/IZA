import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Mic, Sparkles, Loader2, Volume2, VolumeX } from 'lucide-react';

interface TalkModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
  onMomentSaved?: (content: string) => void;
  onOpenLiveVoice?: () => void;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

export const TalkModal: React.FC<TalkModalProps> = ({
  isOpen,
  onClose,
  initialPrompt = '',
  onMomentSaved,
  onOpenLiveVoice,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: "What's on your mind?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialPrompt && isOpen) {
      handleSend(initialPrompt);
    }
  }, [initialPrompt, isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
          }))
        })
      });

      const data = await res.json();
      const reply = data?.reply || "I have anchored this into your sovereign memory.";
      setMessages(prev => [...prev, { role: 'model', text: reply }]);
      onMomentSaved?.(text);

      if (ttsEnabled) {
        try {
          const ttsRes = await fetch('/api/gemini/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: reply,
              voice: 'Kore',
              model: 'gemini-3.8-flash-lite-tts',
              style: 'warm, calm and articulate sovereign companion'
            })
          });
          const ttsData = await ttsRes.json();
          if (ttsData.audio) {
            const audio = new Audio(`data:audio/wav;base64,${ttsData.audio}`);
            audio.play().catch(() => {});
          } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(reply);
            window.speechSynthesis.speak(utterance);
          }
        } catch (_) {
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            try {
              const utterance = new SpeechSynthesisUtterance(reply);
              window.speechSynthesis.speak(utterance);
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, { role: 'model', text: "I ran into an issue connecting to your memory store, but your thought is noted." }]);
    } finally {
      setLoading(false);
    }
  };

  const startListening = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      handleSend(transcript);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }
    setIsListening(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
      <div 
        className="w-full max-w-lg bg-[#0D1B1E] border border-[#1B2B30] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl h-[90vh] sm:h-[600px] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1B2B30] pb-3">
          <div>
            <span className="text-[10px] tracking-widest uppercase text-[#7A8E96] font-medium">Dialogue</span>
            <h3 className="text-xl font-light text-[#F1F5F9] font-display">Talk with IZA</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTtsEnabled(!ttsEnabled)}
              title={ttsEnabled ? 'Voice output on' : 'Voice output muted'}
              className="p-1.5 rounded-full text-[#7A8E96] hover:text-[#F1F5F9] transition-colors"
            >
              {ttsEnabled ? <Volume2 className="w-4 h-4 text-[#2DD4BF]" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-[#7A8E96] hover:text-[#F1F5F9] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[#182C31] text-[#F1F5F9] border border-[#25383E]'
                    : 'bg-[#132327] text-[#E2E8F0] border border-[#1B2B30] font-light'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-[#132327] border border-[#1B2B30] rounded-2xl px-4 py-3 flex items-center gap-2 text-xs text-[#7A8E96]">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2DD4BF]" />
                <span>Reflecting...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="pt-3 border-t border-[#1B2B30]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`p-2.5 rounded-xl border transition-colors ${
                isListening
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  : 'bg-[#132327] text-[#7A8E96] hover:text-[#F1F5F9] border-[#1B2B30]'
              }`}
            >
              <Mic className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Talk with IZA..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#132327] border border-[#1B2B30] text-sm text-[#F1F5F9] placeholder-[#5A6E76] focus:outline-none focus:border-[#2DD4BF]/50"
            />

            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2.5 rounded-xl bg-[#F1F5F9] text-[#0D1B1E] disabled:opacity-40 hover:bg-white transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
