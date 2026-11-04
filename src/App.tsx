import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Activity, 
  BatteryCharging, 
  Shield, 
  Database, 
  Cpu, 
  Eye, 
  Fingerprint, 
  Zap, 
  Network,
  Volume2,
  VolumeX,
  Terminal,
  Lock,
  Unlock,
  Key,
  Users,
  Radio,
  MessageSquare,
  AlertTriangle,
  Mic,
  Send,
  Loader2,
  Sparkles
} from 'lucide-react';
import { audioEngine } from './lib/audio';
import { LiveVoiceModal } from './components/LiveVoiceModal';
import { SpeedInsights } from '@vercel/speed-insights/react';

export default function App() {
  const [time, setTime] = useState(new Date());
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [telemetry, setTelemetry] = useState({
    orr: 98.4,
    teg: 14.2,
    teng: 8.7,
    hr: 62,
    stress: 12
  });

  // IZA Phase 0 State
  const [commandInput, setCommandInput] = useState('');
  const [vaultMemories, setVaultMemories] = useState([
    { id: 1, type: 'event', content: 'Talked to Dave next door about fixing the back fence before winter.', time: '10:42 AM' },
    { id: 2, type: 'idea', content: 'Fleeting idea for new corporate structure utilizing 13-share veto rules.', time: '09:15 AM' }
  ]);
  const [secretsUnlocked, setSecretsUnlocked] = useState(false);
  const [secretsData, setSecretsData] = useState([
    { id: 1, label: 'Bank PIN', value: '0000' },
    { id: 2, label: 'Medical Allergy', value: 'Penicillin' }
  ]);
  const [circleMembers, setCircleMembers] = useState([
    { id: 1, name: 'Sam', relation: 'Wife', status: 'SYNCED', statusColor: 'text-emerald-500' },
    { id: 2, name: 'Tom', relation: 'Mate', status: 'NUDGE: OVERDUE', statusColor: 'text-amber-500' }
  ]);
  const [sosActive, setSosActive] = useState(false);
  const [confidantActive, setConfidantActive] = useState(false);
  const [threatActive, setThreatActive] = useState(false);
  const [liveVoiceOpen, setLiveVoiceOpen] = useState(false);

  // Confidant dynamic AI chat state
  const [confidantMessages, setConfidantMessages] = useState<Array<{ role: 'user' | 'model'; text: string }>>([
    { role: 'model', text: "I am IZA, your sovereign confidant. What cognitive thread shall we untangle or secure today?" }
  ]);
  const [confidantInput, setConfidantInput] = useState('');
  const [confidantLoading, setConfidantLoading] = useState(false);

  // Simulate real-time telemetry fluctuations
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
      setTelemetry(prev => ({
        orr: Math.min(100, Math.max(90, prev.orr + (Math.random() - 0.5) * 0.5)),
        teg: Math.max(10, prev.teg + (Math.random() - 0.5) * 0.2),
        teng: Math.max(5, prev.teng + (Math.random() - 0.5) * 0.1),
        hr: Math.round(Math.max(55, Math.min(85, prev.hr + (Math.random() - 0.5) * 2))),
        stress: Math.max(5, Math.min(30, prev.stress + (Math.random() - 0.5)))
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (audioEnabled) {
      audioEngine.start();
    } else {
      audioEngine.stop();
    }
    return () => audioEngine.stop();
  }, [audioEnabled]);

  // Randomly trigger threat overlay
  useEffect(() => {
    const triggerThreat = () => {
      setThreatActive(true);
      const nextTime = Math.random() * 30000 + 15000;
      setTimeout(triggerThreat, nextTime);
    };
    
    const initialTimeout = setTimeout(triggerThreat, Math.random() * 20000 + 10000);
    return () => clearTimeout(initialTimeout);
  }, []);

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;

    const cmd = commandInput.trim();
    if (cmd.startsWith('iza capture')) {
      const contentMatch = cmd.match(/iza capture ["'](.*?)["']/);
      if (contentMatch && contentMatch[1]) {
        setVaultMemories(prev => [
          { id: Date.now(), type: 'note', content: contentMatch[1], time: time.toISOString().split('T')[1].slice(0, 5) },
          ...prev
        ]);
      }
    } else if (cmd.startsWith('iza secret-put')) {
      const labelMatch = cmd.match(/iza secret-put ["'](.*?)["']/);
      if (labelMatch && labelMatch[1]) {
        setSecretsData(prev => [
          ...prev,
          { id: Date.now(), label: labelMatch[1], value: '**********' }
        ]);
      }
    } else if (cmd.startsWith('iza circle-add')) {
      const nameMatch = cmd.match(/iza circle-add ["'](.*?)["']/);
      if (nameMatch && nameMatch[1]) {
        setCircleMembers(prev => [
          ...prev,
          { id: Date.now(), name: nameMatch[1], relation: 'Trusted', status: 'SYNCED', statusColor: 'text-emerald-500' }
        ]);
      }
    } else if (cmd.startsWith('iza sos')) {
      setSosActive(true);
    } else if (cmd.startsWith('iza talk')) {
      setConfidantActive(true);
    }
    
    setCommandInput('');
  };

  return (
    <div className="h-screen w-screen bg-slate-900 text-slate-400 font-mono flex flex-col uppercase text-xs tracking-wider overflow-hidden">
      {/* Top Navigation / Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-700 p-4 sm:px-6 sm:py-3 bg-slate-900/80 backdrop-blur-md z-10 shrink-0"
      >
        <div>
          <h1 className="font-display text-lg font-bold text-slate-50 tracking-tight flex items-center gap-3">
            <Fingerprint className="w-6 h-6 text-blue-500" />
            IZA // MASTER UI
          </h1>
          <p className="text-slate-500 mt-1 hidden sm:block">Interpersonal Zen-Enmity Agent &bull; Human Singularity</p>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-blue-500 font-bold flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            BIOPHYSICAL SYNC: ACTIVE
          </div>
          <div className="text-slate-500 mt-1">
            UTC {time.toISOString().split('T')[1].slice(0, -5)}
          </div>
        </div>
      </motion.header>

      {/* Main Grid: Three Loops */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] flex-1 overflow-hidden">
        
        {/* LOOP 1: Internal */}
        <motion.section 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          className="flex flex-col gap-6 lg:border-r border-slate-700 bg-slate-800 p-4 sm:p-6 overflow-y-auto"
        >
          <div className="flex items-center gap-2 text-slate-50 border-b border-slate-700 pb-2">
            <Activity className="w-4 h-4" />
            <h2 className="font-display text-sm font-bold">1. Internal Loop</h2>
          </div>
          <p className="text-slate-400 leading-relaxed normal-case">
            Biological telemetry and biophysical energy harvesting matrix. Infinite power plant engaged.
          </p>

          <div className="bg-slate-900 border border-blue-500 p-4 rounded-lg flex flex-col gap-4 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center gap-2 text-[10px] font-bold uppercase"><Zap className="w-3 h-3 text-blue-500"/> ORR Saturation</span>
              <span className="text-blue-500 font-bold">{telemetry.orr.toFixed(2)}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1 mt-1 rounded">
              <div className="bg-blue-500 h-1 rounded transition-all duration-1000 ease-linear" style={{ width: `${telemetry.orr}%` }}></div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <div className="text-slate-500 mb-1">TEG Output</div>
                <div className="text-slate-200 text-lg">{telemetry.teg.toFixed(1)} <span className="text-[10px] text-slate-500">μW</span></div>
              </div>
              <div>
                <div className="text-slate-500 mb-1">TENG Yield</div>
                <div className="text-slate-200 text-lg">{telemetry.teng.toFixed(1)} <span className="text-[10px] text-slate-500">μW</span></div>
              </div>
            </div>

            <div className="pt-4 mt-2 border-t border-slate-700 flex justify-between items-end">
              <div>
                <div className="text-slate-500 mb-1 flex items-center gap-2">Cognitive Load <Cpu className="w-3 h-3"/></div>
                <div className="text-slate-200">{telemetry.stress.toFixed(0)} / 100</div>
              </div>
              <div className="text-right">
                <div className="text-slate-500 mb-1">BPM</div>
                <div className="text-slate-200">{telemetry.hr}</div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* LOOP 2: Ambient */}
        <motion.section 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="flex flex-col gap-6 p-4 sm:p-6 main-canvas relative overflow-y-auto overflow-x-hidden"
        >
          <div className="flex items-center gap-2 text-slate-50 border-b border-slate-700 pb-2 bg-slate-900/50 backdrop-blur-sm p-2 rounded z-10">
            <Shield className="w-4 h-4" />
            <h2 className="font-display text-sm font-bold">2. Ambient Loop</h2>
          </div>
          <p className="text-slate-400 leading-relaxed normal-case bg-slate-900/50 backdrop-blur-sm p-2 rounded z-10">
            Interpersonal Zen Shield active. Filtering external narrative variables and emotional drift.
          </p>

          <div className="bg-slate-800 border border-amber-500 p-4 rounded-lg flex flex-col gap-5 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] relative z-10 w-full max-w-sm mx-auto">
            <div>
              <div className="text-amber-500 mb-2 flex justify-between items-center text-[10px] font-bold uppercase">
                <span className="flex items-center gap-2"><Eye className="w-3 h-3" /> Adaptive Tone Profiling</span>
                <span>●</span>
              </div>
              <div className="text-[#94a3b8] normal-case bg-slate-900 p-3 border border-slate-700 rounded text-[13px]">
                <span className="text-slate-500 font-mono text-xs uppercase mb-1 block">Threat Assessment [Rank 28]</span>
                No immediate emotional escalation detected. External conversational environment stable. Empathy layer buffering.
              </div>
            </div>

            <div className="flex-1 mt-4">
              <div className="text-slate-500 mb-3 flex items-center justify-between text-[10px] font-bold uppercase">
                <div className="flex items-center gap-2">
                  <Database className="w-3 h-3 text-emerald-500" /> 
                  <span className="text-emerald-500">Immutable Memory Vault</span>
                </div>
                <span>Phase 0</span>
              </div>
              <ul className="space-y-3 max-h-48 overflow-y-auto pr-2">
                {vaultMemories.map((log) => (
                  <li key={log.id} className="flex flex-col gap-1 border-l-2 border-slate-600 pl-3 py-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-emerald-500/70">[{log.type.toUpperCase()}]</span>
                      <span className="text-slate-500">{log.time}</span>
                    </div>
                    <span className="text-slate-300 normal-case leading-snug">{log.content}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          {threatActive && (
            <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-sm p-6 flex flex-col justify-center border-x-4 border-red-500/80 m-2 sm:m-4 rounded">
              <div className="flex items-center gap-3 text-red-500 mb-4 animate-pulse">
                <AlertTriangle className="w-8 h-8 shrink-0" />
                <h3 className="font-display text-lg sm:text-xl font-bold leading-tight">SYSTEM INTEGRITY COMPROMISE</h3>
              </div>
              <div className="text-slate-300 normal-case text-[13px] mb-6 font-mono bg-red-950/40 p-4 rounded border border-red-900/50 shadow-inner">
                <span className="text-red-400 font-bold block mb-2 uppercase text-[10px] tracking-widest border-b border-red-900/50 pb-1">Threat Vector: Cognitive Interference</span>
                Unauthorized attempt to alter episodic memory context detected. Interpersonal Zen Shield intercepting narrative rewrite sequence.
              </div>
              <button
                onClick={() => setThreatActive(false)}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 py-3 rounded uppercase font-bold text-xs tracking-wider transition-colors cursor-pointer w-full shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:shadow-[0_0_25px_rgba(239,68,68,0.4)]"
              >
                NEUTRALIZE & PURGE THREAT
              </button>
            </div>
          )}
        </motion.section>

        {/* LOOP 3: Execution */}
        <motion.section 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="flex flex-col gap-6 lg:border-l border-slate-700 bg-slate-800 p-4 sm:p-6 overflow-y-auto"
        >
          <div className="flex items-center justify-between text-slate-50 border-b border-slate-700 pb-2">
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4" />
              <h2 className="font-display text-sm font-bold">3. Execution Loop</h2>
            </div>
            <span className="text-slate-500 text-[10px]">ID: #8821</span>
          </div>
          
          <div className="bg-slate-900 border border-emerald-500 p-4 rounded-lg flex flex-col gap-4 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase text-emerald-500">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span>Rank 5 Diplomacy Matrix</span>
              </div>
              <span>●</span>
            </div>

            <div className="space-y-4 mt-2 normal-case text-[13px] text-[#94a3b8]">
              <div>
                <div className="text-slate-400 mb-1 flex justify-between uppercase text-[10px]">
                  <span>Logic Exception Routing</span>
                  <span className="text-slate-200">Active</span>
                </div>
                <div className="w-full bg-slate-800 h-1 rounded">
                  <div className="bg-slate-500 h-1 w-full rounded"></div>
                </div>
              </div>
              
              <div>
                <div className="text-slate-400 mb-1 flex justify-between uppercase text-[10px]">
                  <span>Task Auto-Decline</span>
                  <span className="text-slate-200">9 requests blocked</span>
                </div>
                <div className="w-full bg-slate-800 h-1 rounded">
                  <div className="bg-slate-500 h-1 w-3/4 rounded"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-purple-500/50 p-4 rounded-lg flex flex-col gap-4 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase text-purple-400">
              <div className="flex items-center gap-2">
                <Key className="w-3 h-3" />
                <span>Continuity Secrets</span>
              </div>
              <button 
                onClick={() => setSecretsUnlocked(!secretsUnlocked)}
                className="hover:text-purple-300 transition-colors cursor-pointer"
                title={secretsUnlocked ? "Lock Vault" : "Unlock Vault"}
              >
                {secretsUnlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              </button>
            </div>

            <div className="space-y-3 mt-1 text-[13px]">
              {secretsData.map((secret) => (
                <div key={secret.id} className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-slate-400">{secret.label}</span>
                  {secretsUnlocked ? (
                    <span className="text-slate-200 normal-case tracking-normal">{secret.value}</span>
                  ) : (
                    <span className="text-slate-600 bg-slate-800 px-2 py-0.5 rounded text-[10px]">ENCRYPTED</span>
                  )}
                </div>
              ))}
            </div>
            {!secretsUnlocked && (
              <div className="text-[10px] text-slate-500 normal-case italic mt-2">
                Secrets are encrypted app-side. IZA cannot read them without your explicit passphrase.
              </div>
            )}
          </div>

          <div className={`bg-slate-900 border ${sosActive ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 'border-rose-500/50'} p-4 rounded-lg flex flex-col gap-4 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] transition-all duration-500`}>
            <div className={`flex items-center justify-between text-[10px] font-bold uppercase ${sosActive ? 'text-red-500' : 'text-rose-400'}`}>
              <div className="flex items-center gap-2">
                {sosActive ? <AlertTriangle className="w-3 h-3 animate-pulse" /> : <Users className="w-3 h-3" />}
                <span>The Circle</span>
              </div>
              <span className="flex h-2 w-2 relative">
                 <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${sosActive ? 'bg-red-400' : 'bg-rose-400'}`}></span>
                 <span className={`relative inline-flex rounded-full h-2 w-2 ${sosActive ? 'bg-red-500' : 'bg-rose-500'}`}></span>
              </span>
            </div>

            <div className="space-y-3 mt-1 text-[13px]">
              {circleMembers.map(member => (
                <div key={member.id} className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-slate-400">{member.name} <span className="text-slate-600">({member.relation})</span></span>
                  <span className={`${member.statusColor} text-[10px]`}>{member.status}</span>
                </div>
              ))}
            </div>
            
            <button 
              onClick={() => setSosActive(!sosActive)}
              className={`w-full border rounded py-1.5 text-[10px] transition-colors flex items-center justify-center gap-2 mt-2 font-bold ${sosActive ? 'bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30 cursor-pointer' : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30 cursor-pointer'}`}
            >
              <Radio className="w-3 h-3" />
              {sosActive ? 'CANCEL SOS BROADCAST' : 'INITIATE SOS'}
            </button>
            {sosActive && (
              <div className="text-[10px] text-red-400/80 normal-case italic text-center">
                Broadcasting emergency coordinates and biometric payload to trusted circle.
              </div>
            )}
          </div>

          {confidantActive && (
            <div className="bg-slate-900 border border-blue-500/50 p-4 rounded-lg flex flex-col gap-4 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase text-blue-400">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-3 h-3" />
                  <span>The Confidant</span>
                </div>
                <button onClick={() => setConfidantActive(false)} className="text-slate-500 hover:text-slate-300 cursor-pointer">✕</button>
              </div>
              <div className="flex flex-col gap-3 text-[12px] normal-case mt-2 h-32 overflow-y-auto pr-2">
                <div className="bg-slate-800/50 p-2 rounded-r-lg rounded-bl-lg text-slate-300 border-l-2 border-blue-500 w-[90%]">
                  <span className="text-[10px] text-blue-400 font-mono uppercase block mb-1">IZA</span>
                  I'm here. I see Dave's fence is still an open loop. Would you like me to draft an SMS to him offering a hand this weekend?
                </div>
                <div className="bg-slate-800 p-2 rounded-l-lg rounded-br-lg text-slate-200 border-r-2 border-slate-500 w-[90%] self-end">
                  <span className="text-[10px] text-slate-500 font-mono uppercase block mb-1 text-right">You</span>
                  Yeah, that would be good. Remind him I have the post-hole digger.
                </div>
              </div>
            </div>
          )}
          
        </motion.section>

      </div>
      
      {/* CLI Input Bar */}
      <div className="bg-slate-950 border-t border-slate-700 px-4 py-2 shrink-0 z-20">
        <form onSubmit={handleCommand} className="flex items-center gap-3">
          <Terminal className="w-4 h-4 text-emerald-500" />
          <input 
            type="text" 
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder="Try: iza capture 'my new idea' | iza secret-put 'PIN' | iza talk | iza sos" 
            className="flex-1 bg-transparent border-none outline-none text-slate-300 placeholder:text-slate-600 normal-case font-mono text-sm"
          />
        </form>
      </div>

      {/* Footer / Status Bar */}
      <footer className="border-t border-slate-800 bg-slate-900 flex items-center p-2 px-4 sm:px-6 text-[11px] text-slate-500 gap-4 sm:gap-6 shrink-0 flex-wrap z-10">
        <span>STATUS: {sosActive ? 'EMERGENCY OVERRIDE' : 'READY'}</span>
        <span>LATENCY: {sosActive ? '2ms' : '12ms'}</span>
        <span>RAM: 4.2GB / 16GB</span>
        <button 
          onClick={() => setAudioEnabled(!audioEnabled)}
          className={`flex items-center gap-2 px-2 py-1 rounded transition-colors cursor-pointer ${audioEnabled ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-slate-800 text-slate-400'}`}
          title="Toggle Data Stream Audio"
        >
          {audioEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
          <span>DATA_STREAM</span>
        </button>
        <span className="ml-auto hidden sm:inline">UTF-8</span>
        <span className="hidden sm:inline">Ln 24, Col 12</span>
      </footer>
      <SpeedInsights />
    </div>
  );
}
