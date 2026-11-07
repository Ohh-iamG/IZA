import React, { useState, useEffect, useRef } from 'react';
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
  Loader2,
  Camera,
  CameraOff,
  SwitchCamera,
  Eye,
  Maximize2,
  Scan,
  CheckCircle2,
  Play,
  AlertCircle,
  History,
  Clock,
  Copy,
  Check,
  Trash2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  FileText
} from 'lucide-react';
import { GeminiLiveClient } from '../lib/live-audio';

export interface VoiceTurn {
  sender: 'user' | 'iza';
  text: string;
  time: string;
}

export interface SavedVoiceSession {
  id: string;
  startedAt: string;
  endedAt: string;
  turns: VoiceTurn[];
  preview: string;
}

const VOICE_HISTORY_STORAGE_KEY = 'iza_recent_voice_sessions';
const MAX_VOICE_SESSIONS = 5;

function loadStoredSessions(): SavedVoiceSession[] {
  try {
    const raw = localStorage.getItem(VOICE_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, MAX_VOICE_SESSIONS);
    }
    return [];
  } catch (err) {
    console.warn('Failed to load voice transcript history:', err);
    return [];
  }
}

function formatSessionDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return 'Recent Session';
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (isToday) {
      return `Today, ${timeStr}`;
    }
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
  } catch {
    return 'Recent Session';
  }
}

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
  const [micActive, setMicActive] = useState(false);
  const [micNotice, setMicNotice] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [lastAnchoredNotice, setLastAnchoredNotice] = useState<string | null>(null);
  const [anchoredMemoriesSet, setAnchoredMemoriesSet] = useState<Set<string>>(new Set());
  const [currentSentiment, setCurrentSentiment] = useState<{ stress_index: number; tone: string } | null>(null);

  // Transcript History State
  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');
  const [savedSessions, setSavedSessions] = useState<SavedVoiceSession[]>(() => loadStoredSessions());
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);
  const [copiedTurnKey, setCopiedTurnKey] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Active Session Tracking Refs
  const currentSessionIdRef = useRef<string>(`session_${Date.now()}`);
  const currentSessionStartRef = useRef<string>(new Date().toISOString());
  const transcriptHistoryRef = useRef<VoiceTurn[]>([]);

  // Mobile Web Audio Unlock State
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const [needsTouchUnlock, setNeedsTouchUnlock] = useState(false);

  // Multimodal Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [framesStreamedCount, setFramesStreamedCount] = useState(0);
  const [dynamicOpening, setDynamicOpening] = useState<string | null>(null);
  const [relationshipSignals, setRelationshipSignals] = useState<any>(null);

  const clientRef = useRef<GeminiLiveClient | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const frameIntervalRef = useRef<number | null>(null);

  // Stop camera helper
  const stopCameraStream = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setCameraLoading(false);
  };

  // Start camera stream helper
  const startCameraStream = async (facing: 'environment' | 'user' = cameraFacingMode) => {
    setCameraLoading(true);
    setCameraError(null);
    try {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      // Try environment rear camera first with fallback
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (firstErr) {
        // Fallback to basic video constraint if ideal facing fails
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      setIsCameraActive(true);
      setCameraFacingMode(facing);

      // Start 1 frame every 1200ms extraction loop to stream to Gemini 3.8 Live
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }

      frameIntervalRef.current = window.setInterval(() => {
        captureAndSendVideoFrame();
      }, 1200);
    } catch (err: any) {
      console.warn('Camera stream request failed:', err);
      setCameraError(err.message || 'Camera permission required for live visual Q&A.');
      setIsCameraActive(false);
    } finally {
      setCameraLoading(false);
    }
  };

  // Extract frame from video to canvas and push across WebSocket
  const captureAndSendVideoFrame = () => {
    if (!videoRef.current || !canvasRef.current || !clientRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    // Scale to max 640 width for ultra-responsive low-bandwidth transport
    const maxWidth = 640;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const targetW = Math.round(video.videoWidth * scale);
    const targetH = Math.round(video.videoHeight * scale);

    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, targetW, targetH);
    const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.65);

    clientRef.current.sendVideoFrame(jpegDataUrl);
    setFramesStreamedCount((c) => c + 1);
  };

  // Toggle camera
  const toggleCamera = () => {
    if (isCameraActive) {
      stopCameraStream();
    } else {
      startCameraStream(cameraFacingMode);
    }
  };

  // Switch facing mode (rear vs front)
  const flipCamera = () => {
    const nextFacing = cameraFacingMode === 'environment' ? 'user' : 'environment';
    startCameraStream(nextFacing);
  };

  // Mobile Audio Unlock handler
  const handleUnlockAudio = async () => {
    if (clientRef.current) {
      await clientRef.current.unlockAudioContext();
      await clientRef.current.enableMicrophone();
      setIsAudioUnlocked(true);
      setNeedsTouchUnlock(false);
      setMicActive(true);
      setMicNotice(null);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
      setSessionStatus('disconnected');
      setMicActive(false);
      setMicNotice(null);
      setLastAnchoredNotice(null);
      setCurrentSentiment(null);
      setFramesStreamedCount(0);
      setDynamicOpening(null);
      setRelationshipSignals(null);
      return;
    }

    // New session initialization
    currentSessionIdRef.current = `session_${Date.now()}`;
    currentSessionStartRef.current = new Date().toISOString();
    setTranscriptHistory([]);
    setSavedSessions(loadStoredSessions());
    setActiveTab('live');
    setExpandedSessionId(null);
    setShowClearConfirm(false);

    const client = new GeminiLiveClient({
      onStatusChange: (status) => {
        setSessionStatus(status);
        if (status === 'connected' || status === 'listening') {
          setErrorMessage(null);
        }
      },
      onAudioUnlockChange: (unlocked) => {
        setIsAudioUnlocked(unlocked);
        if (unlocked) setNeedsTouchUnlock(false);
      },
      onSentimentChange: (sent) => {
        setCurrentSentiment({ stress_index: sent.stress_index, tone: sent.tone });
      },
      onMicStatusChange: (enabled, reason) => {
        setMicActive(enabled);
        setMicNotice(enabled ? null : (reason || 'Microphone access needed'));
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
      onMemoryAnchored: (mem) => {
        setLastAnchoredNotice(mem.content);
        setAnchoredMemoriesSet((prev) => new Set(prev).add(mem.content.trim()));
        if (onLogMemory) {
          onLogMemory(mem.content);
        }
        setTimeout(() => {
          setLastAnchoredNotice((current) => (current === mem.content ? null : current));
        }, 5000);
      },
      onError: (err) => {
        console.error('Live Voice Error:', err);
        if (!err.toLowerCase().includes('microphone')) {
          setErrorMessage(err);
        }
      },
      onVolumeChange: (vol) => {
        setInputVolume(Math.min(1, vol * 6));
      },
      onDynamicOpening: (opening, _isFirstEver, signals) => {
        setDynamicOpening(opening);
        setRelationshipSignals(signals);
      },
    });

    clientRef.current = client;
    client.connect().catch((err) => {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to connect to Live API');
    });

    return () => {
      stopCameraStream();
      client.disconnect();
      clientRef.current = null;
    };
  }, [isOpen]);

  // Synchronize active session transcripts to local storage
  useEffect(() => {
    transcriptHistoryRef.current = transcriptHistory;
    if (transcriptHistory.length === 0) return;

    try {
      const existing = loadStoredSessions();
      const id = currentSessionIdRef.current;
      const firstUserTurn = transcriptHistory.find((t) => t.sender === 'user')?.text || transcriptHistory[0]?.text || '';
      const preview = firstUserTurn.length > 80 ? firstUserTurn.slice(0, 77) + '...' : firstUserTurn;

      const currentSession: SavedVoiceSession = {
        id,
        startedAt: currentSessionStartRef.current || new Date().toISOString(),
        endedAt: new Date().toISOString(),
        turns: transcriptHistory,
        preview: preview || 'Voice conversation with IZA',
      };

      const remaining = existing.filter((s) => s.id !== id);
      const updated = [currentSession, ...remaining].slice(0, MAX_VOICE_SESSIONS);
      localStorage.setItem(VOICE_HISTORY_STORAGE_KEY, JSON.stringify(updated));
      setSavedSessions(updated);
    } catch (err) {
      console.warn('Failed to auto-save voice transcript:', err);
    }
  }, [transcriptHistory]);

  const handleCopySession = (session: SavedVoiceSession) => {
    const formatted = session.turns
      .map((t) => `[${t.time}] ${t.sender === 'user' ? 'YOU' : 'IZA'}: ${t.text}`)
      .join('\n\n');
    navigator.clipboard.writeText(formatted).then(() => {
      setCopiedSessionId(session.id);
      setTimeout(() => setCopiedSessionId((id) => (id === session.id ? null : id)), 2000);
    });
  };

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedTurnKey(key);
      setTimeout(() => setCopiedTurnKey((k) => (k === key ? null : k)), 2000);
    });
  };

  const handleDeleteSession = (id: string) => {
    const updated = savedSessions.filter((s) => s.id !== id);
    localStorage.setItem(VOICE_HISTORY_STORAGE_KEY, JSON.stringify(updated));
    setSavedSessions(updated);
    if (expandedSessionId === id) {
      setExpandedSessionId(null);
    }
  };

  const handleClearHistory = () => {
    localStorage.removeItem(VOICE_HISTORY_STORAGE_KEY);
    setSavedSessions([]);
    setShowClearConfirm(false);
    setExpandedSessionId(null);
  };

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
    setAnchoredMemoriesSet((prev) => new Set(prev).add(text.trim()));
    setLastAnchoredNotice(text);
    if (onLogMemory) {
      onLogMemory(text);
    }
    setTimeout(() => {
      setLastAnchoredNotice((current) => (current === text ? null : current));
    }, 4000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200 font-mono">
      {/* Hidden canvas for video frame extraction */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="bg-slate-900 border border-[#71F5DB]/40 rounded-xl w-full max-w-2xl flex flex-col shadow-[0_0_50px_rgba(113,245,219,0.18)] overflow-hidden max-h-[95vh] relative">
        
        {/* Mobile Web Audio Tap-to-Unlock Overlay */}
        {needsTouchUnlock && !isAudioUnlocked && (
          <div className="absolute inset-0 z-40 bg-slate-950/92 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <div className="p-3 bg-[#71F5DB]/10 border border-[#71F5DB]/40 rounded-xl mb-4 text-[#71F5DB]">
              <Zap className="w-8 h-8 animate-pulse" />
            </div>
            <h3 className="text-base font-bold text-slate-100 uppercase tracking-wider mb-2">
              Microphone & Audio Activation
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
              Tap below to grant microphone access and enable real-time 16kHz speech input with IZA.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={handleUnlockAudio}
                className="flex items-center gap-2 px-6 py-3 bg-[#71F5DB] hover:bg-[#5ae0c7] text-[#0D1B1E] font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-[#71F5DB]/20 active:scale-95 transition cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>ENABLE MICROPHONE</span>
              </button>
              <button
                onClick={() => setNeedsTouchUnlock(false)}
                className="px-4 py-2.5 text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                Type Instead
              </button>
            </div>
            <span className="text-[10px] text-slate-500 mt-4 font-mono">
              Hardware Alignment: 16k Input • 24k Output • Zero Pitch Warp
            </span>
          </div>
        )}

        {/* Modal Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <img 
              src="/assets/aistudio/iza_brand_mark.png" 
              alt="IZA" 
              className="h-6 sm:h-7 w-auto object-contain select-none" 
            />
            <div className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                sessionStatus === 'speaking' ? 'bg-[#71F5DB]' :
                sessionStatus === 'listening' ? 'bg-emerald-400' :
                sessionStatus === 'connecting' ? 'bg-amber-400' : 'bg-slate-500'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${
                sessionStatus === 'speaking' ? 'bg-[#71F5DB]' :
                sessionStatus === 'listening' ? 'bg-emerald-500' :
                sessionStatus === 'connecting' ? 'bg-amber-500' : 'bg-slate-500'
              }`}></span>
            </div>
            <div>
              <div className="font-bold text-slate-100 flex items-center gap-2 text-xs sm:text-sm tracking-wide">
                <span>GEMINI 3.8 LIVE</span>
                <span className="text-[10px] bg-[#71F5DB]/15 text-[#71F5DB] border border-[#71F5DB]/30 px-1.5 py-0.5 rounded font-mono">
                  {isCameraActive ? 'VISION' : 'DUPLEX'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                Sub-second live audio link • Sovereign continuous memory
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            {/* Live Camera Stream Toggle */}
            <button
              onClick={toggleCamera}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition cursor-pointer active:scale-95 ${
                isCameraActive
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 hover:bg-cyan-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title={isCameraActive ? 'Stop Live Camera Stream' : 'Enable Rear Camera for Multimodal Q&A'}
            >
              {isCameraActive ? <Camera className="w-3.5 h-3.5 text-cyan-400" /> : <CameraOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isCameraActive ? 'CAMERA ON' : 'CAMERA'}</span>
            </button>

            {isCameraActive && (
              <button
                onClick={flipCamera}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition cursor-pointer"
                title={`Switch to ${cameraFacingMode === 'environment' ? 'Front' : 'Rear'} Camera`}
              >
                <SwitchCamera className="w-3.5 h-3.5" />
              </button>
            )}

            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation: Live Session vs Transcript History */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-slate-950/80 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('live')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-medium transition cursor-pointer ${
                activeTab === 'live'
                  ? 'bg-[#151E21] text-[#71F5DB] border border-[#303737] shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${sessionStatus === 'connected' || sessionStatus === 'listening' || sessionStatus === 'speaking' ? 'text-[#71F5DB] animate-pulse' : 'text-slate-400'}`} />
              <span>LIVE DUPLEX</span>
              {sessionStatus !== 'disconnected' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-medium transition cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-[#151E21] text-[#71F5DB] border border-[#303737] shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>TRANSCRIPT HISTORY</span>
              {savedSessions.length > 0 && (
                <span className="text-[10px] bg-[#71F5DB]/15 text-[#71F5DB] border border-[#71F5DB]/30 px-1.5 py-0.2 rounded-full font-bold ml-0.5">
                  {savedSessions.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'history' ? (
            <div className="text-[11px] text-slate-400 font-mono hidden sm:flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-[#71F5DB]" />
              <span>Last 5 sessions on device</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {transcriptHistory.length > 0 && (
                <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                  {transcriptHistory.length} turns in call
                </span>
              )}
              {savedSessions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className="text-[10px] text-slate-400 hover:text-[#71F5DB] font-mono flex items-center gap-1 transition cursor-pointer"
                >
                  <History className="w-3 h-3" />
                  <span>Past transcripts ({savedSessions.length})</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Error Message Banner */}
        {errorMessage && (
          <div className="bg-amber-950/90 border-b border-amber-500/50 px-3 py-2 flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center gap-2 truncate">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">{errorMessage}</span>
            </div>
            <button
              onClick={() => {
                setErrorMessage(null);
                if (clientRef.current) {
                  clientRef.current.connect().catch((e) => setErrorMessage(e.message || 'Connection failed'));
                }
              }}
              className="text-[10px] text-amber-400 hover:text-amber-200 underline shrink-0 font-mono ml-2 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Live Memory Anchoring Notice */}
        {lastAnchoredNotice && (
          <div className="bg-emerald-950/90 border-b border-emerald-500/50 px-3 py-1.5 flex items-center justify-between text-xs text-emerald-300 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2 truncate">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="font-bold text-emerald-400 shrink-0">MEMORY ANCHORED:</span>
              <span className="truncate text-emerald-200 font-sans">"{lastAnchoredNotice}"</span>
            </div>
            <span className="text-[10px] bg-emerald-900/80 border border-emerald-600/50 px-2 py-0.5 rounded text-emerald-300 shrink-0 ml-2">
              NEVER FORGOTTEN
            </span>
          </div>
        )}

        {/* TAB VIEW 1: TRANSCRIPT HISTORY */}
        {activeTab === 'history' && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 min-h-[280px] max-h-[460px] bg-slate-900/60 text-xs">
              {/* Top Controls for History */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#71F5DB]" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 tracking-wide font-mono uppercase">
                      Local Session Transcripts
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      Stores the last 5 sessions locally &bull; Reference what was just spoken without leaving voice
                    </p>
                  </div>
                </div>

                {savedSessions.length > 0 && (
                  <div>
                    {showClearConfirm ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-amber-300">Clear all 5?</span>
                        <button
                          onClick={handleClearHistory}
                          className="px-2 py-0.5 bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-red-300 text-[10px] rounded transition cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setShowClearConfirm(false)}
                          className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] rounded transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowClearConfirm(true)}
                        className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-red-400 transition cursor-pointer"
                        title="Clear all stored session transcripts"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Clear History</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Empty State */}
              {savedSessions.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <MessageSquare className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
                  <p className="text-xs text-slate-300 font-medium font-mono uppercase">No Saved Transcripts Yet</p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                    When you speak with IZA or enter thoughts during a session, full dialogue turns are saved right here for your last 5 sessions.
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={() => setActiveTab('live')}
                      className="px-3 py-1.5 bg-[#151E21] hover:bg-slate-800 text-[#71F5DB] border border-[#303737] rounded-lg text-xs font-mono transition cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Radio className="w-3 h-3" />
                      <span>Switch to Live Duplex Session</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Sessions Accordion List */
                <div className="space-y-2.5">
                  {savedSessions.map((session, index) => {
                    const isCurrent = session.id === currentSessionIdRef.current;
                    const isExpanded = expandedSessionId === session.id;

                    return (
                      <div
                        key={session.id}
                        className={`border rounded-xl overflow-hidden transition-all duration-150 ${
                          isCurrent
                            ? 'bg-[#151E21]/90 border-[#71F5DB]/40 shadow-sm'
                            : 'bg-[#151E21] border-[#303737]'
                        }`}
                      >
                        {/* Session Card Header */}
                        <div
                          onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                          className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition select-none"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`p-1.5 rounded-lg shrink-0 ${isCurrent ? 'bg-[#71F5DB]/15 text-[#71F5DB]' : 'bg-slate-800 text-slate-400'}`}>
                              <MessageSquare className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-xs text-[#F3F6F5]">
                                  {formatSessionDate(session.startedAt)}
                                </span>
                                {isCurrent && (
                                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#71F5DB]/20 text-[#71F5DB] border border-[#71F5DB]/40 font-bold uppercase tracking-wider">
                                    Active Call
                                  </span>
                                )}
                                <span className="text-[10px] font-mono text-[#96A3A1] bg-[#0B1012] px-2 py-0.5 rounded border border-[#303737]">
                                  {session.turns.length} {session.turns.length === 1 ? 'turn' : 'turns'}
                                </span>
                              </div>
                              {!isExpanded && (
                                <p className="text-[11px] text-[#96A3A1] truncate mt-0.5 max-w-md font-sans">
                                  {session.preview}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                            {/* Copy Whole Session */}
                            <button
                              type="button"
                              onClick={() => handleCopySession(session)}
                              className="p-1 text-slate-400 hover:text-[#71F5DB] transition cursor-pointer"
                              title="Copy full session transcript to clipboard"
                            >
                              {copiedSessionId === session.id ? (
                                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-0.5">
                                  <Check className="w-3 h-3" />
                                  <span>Copied</span>
                                </span>
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Delete this session */}
                            <button
                              type="button"
                              onClick={() => handleDeleteSession(session.id)}
                              className="p-1 text-slate-500 hover:text-red-400 transition cursor-pointer"
                              title="Delete this session from local storage"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Expand Toggle Chevron */}
                            <button
                              type="button"
                              onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                              className="p-1 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-[#71F5DB]" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Expanded Turns List */}
                        {isExpanded && (
                          <div className="p-3 border-t border-[#303737] bg-[#0B1012]/60 space-y-2.5">
                            {session.turns.map((turn, tIdx) => {
                              const turnKey = `${session.id}_${tIdx}`;
                              const isUser = turn.sender === 'user';
                              const isAnchored = anchoredMemoriesSet.has(turn.text.trim());

                              return (
                                <div
                                  key={tIdx}
                                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                                >
                                  <div className="flex items-center gap-2 text-[10px] text-[#96A3A1] mb-1 font-mono">
                                    <span className={isUser ? 'text-[#96A3A1]' : 'text-[#71F5DB] font-semibold'}>
                                      {isUser ? 'YOU' : 'IZA'}
                                    </span>
                                    <span>{turn.time}</span>
                                  </div>

                                  <div
                                    className={`p-2.5 sm:p-3 rounded-2xl leading-relaxed max-w-[90%] font-sans text-xs sm:text-sm ${
                                      isUser
                                        ? 'bg-[#151E21] text-[#F3F6F5] border border-[#303737]'
                                        : 'bg-[#151E21] text-[#F3F6F5] border border-[#71F5DB]/40'
                                    }`}
                                  >
                                    <p className="whitespace-pre-wrap">{turn.text}</p>

                                    <div className="mt-1.5 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleCopyText(turn.text, turnKey)}
                                        className="text-slate-400 hover:text-slate-200 transition flex items-center gap-1 cursor-pointer"
                                      >
                                        {copiedTurnKey === turnKey ? (
                                          <>
                                            <Check className="w-3 h-3 text-emerald-400" />
                                            <span className="text-emerald-400">Copied</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-3 h-3" />
                                            <span>Copy turn</span>
                                          </>
                                        )}
                                      </button>

                                      {onLogMemory && (
                                        <div>
                                          {isAnchored ? (
                                            <span className="text-emerald-400 flex items-center gap-1 font-semibold text-[9px]">
                                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                              <span>Anchored</span>
                                            </span>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => handleSaveToVault(turn.text)}
                                              className="text-slate-400 hover:text-emerald-400 transition cursor-pointer flex items-center gap-1"
                                            >
                                              <span>+ Anchor to Vault</span>
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* History Footer Bar */}
            <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('live')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#71F5DB] hover:bg-[#5ae0c7] text-[#0D1B1E] font-bold text-xs rounded-lg transition cursor-pointer active:scale-95"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>RETURN TO LIVE DUPLEX</span>
              </button>

              <div className="text-[10px] text-slate-500 font-mono hidden sm:block">
                On-device local storage &bull; Zero external telemetry
              </div>

              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-700 transition cursor-pointer"
              >
                CLOSE
              </button>
            </div>
          </div>
        )}

        {/* TAB VIEW 2: LIVE SESSION */}
        {activeTab === 'live' && (
          <>
            {/* Multimodal Live Camera Viewfinder (When Active) */}
            {isCameraActive && (
              <div className="relative bg-black border-b border-slate-800 flex items-center justify-center overflow-hidden h-48 sm:h-60 group">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Targeting Reticle & HUD Overlays */}
                <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between border border-cyan-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-950/80 border border-cyan-500/50 rounded text-[10px] text-cyan-300">
                      <Scan className="w-3 h-3 text-cyan-400 animate-pulse" />
                      <span>STREAMING REAR SENSOR ({cameraFacingMode === 'environment' ? 'ENVIRONMENT' : 'USER'})</span>
                    </div>
                    <div className="px-2 py-0.5 bg-slate-950/80 border border-slate-800 rounded text-[10px] text-slate-400">
                      <span>{framesStreamedCount} FRAMES • ~1.0 FPS</span>
                    </div>
                  </div>

                  {/* Center Targeting Bracket */}
                  <div className="self-center flex flex-col items-center">
                    <div className="w-28 h-28 border-2 border-dashed border-cyan-400/60 rounded-lg flex items-center justify-center">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
                    </div>
                    <span className="text-[9px] bg-slate-950/90 text-cyan-200 px-2 py-0.5 rounded mt-2 border border-cyan-500/40">
                      Point at error code, part, meter, or notes & ask out loud
                    </span>
                  </div>

                  <div className="text-[9px] text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded self-start border border-slate-800">
                    <span>"IZA, what does this error code say?" • "Summarize this page"</span>
                  </div>
                </div>
              </div>
            )}

            {/* Central Visualizer & Status (When camera is closed or secondary) */}
            {!isCameraActive && (
              <div className="p-5 bg-slate-950/70 border-b border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
                {/* Audio Visualizer Orb */}
                <div className="relative my-2 flex items-center justify-center">
                  <div 
                    className={`absolute rounded-full transition-all duration-300 ${
                      sessionStatus === 'speaking'
                        ? 'w-32 h-32 bg-cyan-500/20 border border-cyan-400/50 animate-pulse'
                        : sessionStatus === 'listening'
                        ? 'w-28 h-28 bg-emerald-500/15 border border-emerald-500/40'
                        : 'w-20 h-20 bg-slate-800/40 border border-slate-700'
                    }`}
                    style={{
                      transform: `scale(${1 + (sessionStatus === 'listening' ? inputVolume * 0.8 : 0.08)})`
                    }}
                  />
                  <div 
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center relative z-10 transition-colors shadow-lg ${
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
                      <Loader2 className="w-7 h-7" />
                    ) : sessionStatus === 'speaking' ? (
                      <Volume2 className="w-7 h-7 animate-bounce" />
                    ) : isMuted ? (
                      <MicOff className="w-7 h-7" />
                    ) : (
                      <Mic className="w-7 h-7" />
                    )}
                  </div>
                </div>

                {/* Dynamic Status Label */}
                <div className="text-center mt-2">
                  <span className={`text-[11px] font-bold tracking-wider px-3 py-1 rounded-full border ${
                    sessionStatus === 'speaking'
                      ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                      : sessionStatus === 'listening'
                      ? isMuted
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : micActive
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      : sessionStatus === 'connecting'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {sessionStatus === 'speaking' && '● IZA TRANSMITTING (24kHz AUDIO)'}
                    {sessionStatus === 'listening' && (
                      isMuted
                        ? '● MICROPHONE MUTED'
                        : micActive
                        ? '● LISTENING (16kHz PCM RESAMPLED)'
                        : '● DUPLEX LIVE READY (TAP UNLOCK OR ENABLE MIC)'
                    )}
                    {sessionStatus === 'connecting' && 'CONNECTING TO GEMINI 3.8 LIVE...'}
                    {sessionStatus === 'disconnected' && 'OFFLINE'}
                  </span>

                  {currentSentiment && (
                    <div className="mt-2 flex items-center justify-center">
                      <span className="text-[10px] tracking-wide px-2.5 py-0.5 rounded bg-slate-900/90 border border-cyan-500/40 text-cyan-300 flex items-center gap-1.5 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                        VOICE TELEMETRY: {currentSentiment.tone.toUpperCase()} &bull; STRESS INDEX: {currentSentiment.stress_index}/10
                      </span>
                    </div>
                  )}
                </div>

                {/* Hint to enable camera */}
                <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
                  <Camera className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Tap <strong className="text-cyan-300">Camera</strong> above to point at machinery, parts, or notes for visual Q&A.</span>
                </div>
              </div>
            )}

            {cameraError && (
              <div className="px-3 py-1.5 bg-red-950/70 border-b border-red-500/40 text-red-300 text-[11px] flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-red-400" />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Live Conversation Transcript Feed */}
            <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-2.5 min-h-[160px] max-h-[260px] bg-slate-900/60 text-xs">
              {transcriptHistory.length === 0 && (
                <div className="text-center py-6 text-[#96A3A1] text-xs font-sans space-y-2.5">
                  <Sparkles className="w-5 h-5 mx-auto text-[#71F5DB]/70" />
                  {dynamicOpening ? (
                    <div className="p-3.5 bg-[#151E21] border border-[#303737] rounded-2xl max-w-sm mx-auto text-[#F3F6F5] text-sm leading-relaxed shadow-sm">
                      <p className="text-[10px] uppercase font-mono tracking-wider text-[#71F5DB] mb-1">IZA Opening</p>
                      <p className="italic">"{dynamicOpening}"</p>
                    </div>
                  ) : (
                    <span>Speak naturally or ask about past moments. IZA responds in voice.</span>
                  )}
                </div>
              )}

              {transcriptHistory.map((item, idx) => (
                <div 
                  key={idx} 
                  className={`flex flex-col ${item.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-2 text-[10px] text-[#96A3A1] mb-1 font-mono">
                    <span className={item.sender === 'user' ? 'text-[#96A3A1]' : 'text-[#71F5DB] font-semibold'}>
                      {item.sender === 'user' ? 'YOU' : 'IZA'}
                    </span>
                    <span>{item.time}</span>
                  </div>
                  <div 
                    className={`p-2.5 sm:p-3 rounded-2xl leading-relaxed max-w-[88%] font-sans text-sm ${
                      item.sender === 'user'
                        ? 'bg-[#151E21] text-[#F3F6F5] border border-[#303737]'
                        : 'bg-[#151E21] text-[#F3F6F5] border border-[#71F5DB]/40'
                    }`}
                  >
                    {item.text}
                    {item.sender === 'user' && onLogMemory && (
                      <div className="mt-1 pt-1 border-t border-slate-700/50 flex items-center justify-between text-[10px] font-mono">
                        {anchoredMemoriesSet.has(item.text.trim()) ? (
                          <span className="text-emerald-400 flex items-center gap-1 font-semibold text-[9px] tracking-wide">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Anchored to Memory</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSaveToVault(item.text)}
                            className="text-slate-400 hover:text-emerald-400 text-[10px] transition-colors cursor-pointer flex items-center gap-1"
                            title="Save this specific spoken turn to Cloud SQL Vault"
                          >
                            <span>+ Save to Vault</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div ref={chatEndRef} />
            </div>

            {/* Bottom Controls */}
            <div className="p-2.5 sm:p-3 border-t border-slate-800 bg-slate-950 flex flex-col gap-2">
              {/* Quick text input for hybrid voice+text testing */}
              <form onSubmit={handleSendText} className="flex gap-2">
                <input 
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Or type a spoken thought / visual question..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                />
                <button 
                  type="submit"
                  disabled={!textInput.trim() || sessionStatus === 'disconnected' || sessionStatus === 'connecting'}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>SEND</span>
                </button>
              </form>

              {/* Action buttons */}
              <div className="flex items-center justify-between text-xs pt-1">
                <button 
                  onClick={toggleMute}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                    isMuted 
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  {isMuted ? <MicOff className="w-3.5 h-3.5 text-amber-400" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>{isMuted ? 'UNMUTE MIC' : 'MUTE MIC'}</span>
                </button>

                <div className="text-[10px] text-slate-500 flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <Radio className="w-3 h-3 text-cyan-400" />
                    <span>ZEPHYR</span>
                  </span>
                  <span>16k / 24k ALIGNED</span>
                </div>

                <button 
                  onClick={onClose}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-700 transition cursor-pointer"
                >
                  DISCONNECT
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
