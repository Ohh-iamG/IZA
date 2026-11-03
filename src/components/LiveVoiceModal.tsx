import { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Radio, 
  X, 
  Volume2, 
  Zap, 
  Sparkles, 
  ShieldAlert,
  Send,
  Loader2
} from 'lucide-react';
import { GeminiLiveClient } from '../lib/live-audio';

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogMemory?: (memory: string) => void;
}

export function LiveVoiceModal({ isOpen, onClose, onLogMemory }: LiveVoiceModalProps) {
  const [sessionStatus, setSessionStatus] = useState<
    'disconnected' | 'connecting' | 'connected' | 'speaking' | 'listening'
  >('disconnected');
  const [isMuted, setIsMuted] = useState(false);
  const [inputTranscript, setInputTranscript] = useState('');
  const [outputTranscript, setOutputTranscript] = useState('');
  const [transcriptHistory, setTranscriptHistory] = useState<
    Array<{ sender: 'user' | 'iza'; text: string; time: string }>
  >([]);
  const [inputVolume, setInputVolume] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');

  const clientRef = useRef<GeminiLiveClient | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
      setSessionStatus('disconnected');
      return;
    }

    const client = new GeminiLiveClient({
      onStatusChange: (status) => {
        setSessionStatus(status);
        if (status === 'connected' || status === 'listening') {
          setErrorMessage(null);
        }
      },
      onInputTranscript: (text) => {
        setInputTranscript(text);
        setTranscriptHistory((prev) => {
          const last = prev[prev.length - 1];
          const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          if (last && last.sender === 'user') {
            return [...prev.slice(0, -1), { sender: 'user', text, time }];
          }
          return [...prev, { sender: 'user', text, time }];
        });
      },
      onOutputTranscript: (text) => {
        setOutputTranscript(text);
        setTranscriptHistory((prev) => {
          const last = prev[prev.length - 1];
          const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          if (last && last.sender === 'iza') {
            return [...prev.slice(0, -1), { sender: 'iza', text, time }];
          }
          return [...prev, { sender: 'iza', text, time }];
        });
      },
      onError: (err) => {
        console.error('Live Voice Error:', err);
        setErrorMessage(err);
      },
      onVolumeChange: (vol) => {
        setInputVolume(Math.min(1, vol * 6));
      },
    });

    clientRef.current = client;
    client.connect().catch((err) => {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to connect to Live API');
    });

    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, [isOpen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptHistory, inputTranscript, outputTranscript]);

  const toggleMute = () => {
    if (!clientRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    clientRef.current.setMicMuted(newMuted);
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || !clientRef.current) return;
    clientRef.current.sendText(textInput);
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setTranscriptHistory((prev) => [...prev, { sender: 'user', text: textInput, time }]);
    setTextInput('');
  };

  const handleSaveToVault = (text: string) => {
    if (onLogMemory) {
      onLogMemory(text);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-blue-500/60 rounded-xl w-full max-w-2xl flex flex-col shadow-[0_0_50px_rgba(59,130,246,0.25)] overflow-hidden max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                sessionStatus === 'speaking' ? 'bg-cyan-400' :
                sessionStatus === 'listening' ? 'bg-emerald-400' :
                sessionStatus === 'connecting' ? 'bg-amber-400' : 'bg-slate-500'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${
                sessionStatus === 'speaking' ? 'bg-cyan-500' :
                sessionStatus === 'listening' ? 'bg-emerald-500' :
                sessionStatus === 'connecting' ? 'bg-amber-500' : 'bg-slate-500'
              }`}></span>
            </div>
            <div>
              <div className="font-display font-bold text-slate-100 flex items-center gap-2 text-sm tracking-wide">
                <span>GEMINI 3.8 LIVE</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/40 px-1.5 py-0.5 rounded font-mono">
                  LIVE API &bull; 24kHz DUPLEX
                </span>
              </div>
              <p className="text-[11px] text-slate-500 normal-case font-mono mt-0.5">
                Low-latency, real-time bidirectional vocal link with IZA sovereign agent.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Central Visualizer & Status */}
        <div className="p-6 bg-slate-950/70 border-b border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
          {/* Audio Visualizer Orb */}
          <div className="relative my-3 flex items-center justify-center">
            {/* Pulsing rings */}
            <div 
              className={`absolute rounded-full transition-all duration-300 ${
                sessionStatus === 'speaking'
                  ? 'w-36 h-36 bg-cyan-500/20 border border-cyan-400/50 animate-pulse'
                  : sessionStatus === 'listening'
                  ? 'w-32 h-32 bg-emerald-500/15 border border-emerald-500/40'
                  : 'w-24 h-24 bg-slate-800/40 border border-slate-700'
              }`}
              style={{
                transform: `scale(${1 + (sessionStatus === 'listening' ? inputVolume * 0.8 : 0.1)})`
              }}
            />
            <div 
              className={`w-20 h-20 rounded-full flex items-center justify-center relative z-10 transition-colors shadow-lg ${
                sessionStatus === 'speaking'
                  ? 'bg-cyan-600 text-white shadow-cyan-500/50'
                  : sessionStatus === 'listening'
                  ? isMuted ? 'bg-amber-700 text-amber-200' : 'bg-emerald-600 text-white shadow-emerald-500/50'
                  : sessionStatus === 'connecting'
                  ? 'bg-amber-600 text-white animate-spin'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {sessionStatus === 'connecting' ? (
                <Loader2 className="w-8 h-8" />
              ) : sessionStatus === 'speaking' ? (
                <Volume2 className="w-8 h-8 animate-bounce" />
              ) : isMuted ? (
                <MicOff className="w-8 h-8" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </div>
          </div>

          {/* Dynamic Status Label */}
          <div className="text-center mt-2">
            <span className={`text-xs font-bold font-mono tracking-wider px-3 py-1 rounded-full border ${
              sessionStatus === 'speaking'
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                : sessionStatus === 'listening'
                ? isMuted
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : sessionStatus === 'connecting'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {sessionStatus === 'speaking' && '● IZA TRANSMITTING (24kHz AUDIO)'}
              {sessionStatus === 'listening' && (isMuted ? '● MICROPHONE MUTED' : '● LISTENING TO HUMAN VOICE (16kHz PCM)')}
              {sessionStatus === 'connecting' && 'INITIALIZING LIVE WEBSOCKET SESSION...'}
              {sessionStatus === 'disconnected' && 'OFFLINE'}
            </span>
          </div>

          {errorMessage && (
            <div className="mt-3 p-2 bg-red-950/60 border border-red-500/50 rounded text-red-300 text-xs flex items-center gap-2 max-w-md">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
              <span className="normal-case">{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Live Conversation Transcript Feed */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[200px] max-h-[300px] bg-slate-900/60">
          {transcriptHistory.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-xs normal-case">
              <Sparkles className="w-6 h-6 mx-auto mb-2 text-blue-500/50" />
              Start speaking naturally. Gemini 3.8 Live processes speech with sub-second latency and responds with natural voice.
            </div>
          )}

          {transcriptHistory.map((item, idx) => (
            <div 
              key={idx} 
              className={`flex flex-col ${item.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mb-1">
                <span className={item.sender === 'user' ? 'text-slate-400' : 'text-blue-400 font-bold'}>
                  {item.sender === 'user' ? 'YOU (VOICE)' : 'IZA (SOVEREIGN VOICE)'}
                </span>
                <span>{item.time}</span>
              </div>
              <div 
                className={`p-3 rounded-lg text-xs leading-relaxed max-w-[85%] normal-case font-sans border ${
                  item.sender === 'user'
                    ? 'bg-slate-800 text-slate-200 border-slate-700'
                    : 'bg-blue-950/40 text-blue-100 border-blue-500/30'
                }`}
              >
                {item.text}
                {item.sender === 'user' && onLogMemory && (
                  <button
                    onClick={() => handleSaveToVault(item.text)}
                    className="block mt-2 text-[10px] font-mono text-emerald-400 hover:text-emerald-300 underline uppercase tracking-wider cursor-pointer"
                  >
                    + Save to IZA Memory Vault
                  </button>
                )}
              </div>
            </div>
          ))}

          <div ref={chatEndRef} />
        </div>

        {/* Bottom Controls */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex flex-col gap-2">
          {/* Quick text input for hybrid voice+text testing */}
          <form onSubmit={handleSendText} className="flex gap-2">
            <input 
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Or type a spoken thought to Gemini 3.8 Live..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 normal-case font-mono"
            />
            <button 
              type="submit"
              disabled={!textInput.trim() || sessionStatus === 'disconnected' || sessionStatus === 'connecting'}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded text-xs flex items-center gap-1 font-mono cursor-pointer transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>SEND</span>
            </button>
          </form>

          {/* Action buttons */}
          <div className="flex items-center justify-between text-xs font-mono pt-1">
            <button 
              onClick={toggleMute}
              className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-colors cursor-pointer ${
                isMuted 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              <span>{isMuted ? 'UNMUTE MIC' : 'MUTE MIC'}</span>
            </button>

            <div className="text-[11px] text-slate-500 flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Radio className="w-3 h-3 text-cyan-400" />
                <span>VOICE: ZEPHYR</span>
              </span>
              <span>16k IN / 24k OUT</span>
            </div>

            <button 
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded border border-slate-700 transition-colors cursor-pointer"
            >
              DISCONNECT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
