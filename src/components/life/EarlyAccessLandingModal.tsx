import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Lock, 
  Mic, 
  Eye, 
  PenTool, 
  FolderPlus, 
  Search, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Cpu, 
  Layers,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

interface EarlyAccessLandingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EarlyAccessLandingModal({ isOpen, onClose }: EarlyAccessLandingModalProps) {
  const [activeTab, setActiveTab] = useState<'talk' | 'see' | 'write' | 'add'>('see');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [vaultPass, setVaultPass] = useState('');
  const [vaultSealed, setVaultSealed] = useState(false);
  const [recallQuery, setRecallQuery] = useState('Where did we park the yellow truck?');

  if (!isOpen) return null;

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) return;
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-fade-in font-sans">
      <div 
        className="w-full max-w-4xl bg-[#0B1012] border border-[#303737] rounded-3xl p-6 sm:p-10 shadow-2xl relative text-[#F3F6F5] my-auto space-y-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-[#96A3A1] hover:text-[#F3F6F5] hover:bg-[#151E21] transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Section: The Sovereign Thinker */}
        <div className="space-y-4 text-center max-w-2xl mx-auto pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#151E21] border border-[#71F5DB]/40 text-[#71F5DB] text-xs font-mono font-medium">
            <span className="w-2 h-2 rounded-full bg-[#71F5DB] animate-ping" />
            <span>SOVEREIGN ARCHITECTURE · PRIVATE BY DESIGN</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-display tracking-tight text-[#F3F6F5]">
            Your life, remembered.<br />
            <span className="text-[#71F5DB]">Zero-knowledge, zero folders.</span>
          </h1>

          <p className="text-sm sm:text-base text-[#96A3A1] leading-relaxed">
            Stop filing, sorting, and tagging. IZA is a premium, private-by-design memory companion that instantly connects your thoughts, audio logs, screenshots, and complex 3D blueprints into a living personal timeline.
          </p>

          {/* Waitlist Form */}
          {!submitted ? (
            <form onSubmit={handleWaitlistSubmit} className="pt-2 max-w-md mx-auto space-y-2.5">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your secure email..."
                  required
                  className="flex-1 px-4 py-3 rounded-2xl bg-[#151E21] border border-[#303737] text-sm text-[#F3F6F5] placeholder-[#5A6E76] focus:outline-none focus:border-[#71F5DB] transition font-sans"
                />
                <button
                  type="submit"
                  className="px-6 py-3 rounded-2xl bg-[#71F5DB] hover:bg-[#5ae6cb] text-[#06201B] font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-[0_0_20px_rgba(113,245,219,0.3)] shrink-0"
                >
                  INITIALISE EARLY ACCESS
                </button>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#96A3A1] font-mono">
                <Lock className="w-3 h-3 text-[#71F5DB]" />
                <span>Zero third-party telemetry. Nothing leaves your device unless you choose it.</span>
              </div>
            </form>
          ) : (
            <div className="p-4 rounded-2xl bg-[#151E21] border border-[#71F5DB]/50 text-center max-w-md mx-auto space-y-1.5 animate-fade-in">
              <div className="flex items-center justify-center gap-2 text-[#71F5DB] font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Your early access is locked in.</span>
              </div>
              <p className="text-xs text-[#96A3A1]">
                Check your inbox at <span className="text-[#F3F6F5] font-mono">{email}</span> for your welcome confirmation copy and cryptographic boundary overview.
              </p>
            </div>
          )}
        </div>

        {/* Layout 1: The Interactive "Four Ways In" Carousel */}
        <div className="space-y-4 pt-4 border-t border-[#1D2A2D]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] tracking-widest uppercase font-mono text-[#71F5DB]">
                Layout 1 · Omni-Capture Engine
              </span>
              <h2 className="text-xl font-semibold text-[#F3F6F5]">
                Four Ways In: Say it. See it. Write it. Add it.
              </h2>
            </div>
            <div className="flex items-center gap-1.5 bg-[#151E21] p-1 rounded-2xl border border-[#303737]">
              {(['talk', 'see', 'write', 'add'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 rounded-xl text-xs font-mono uppercase transition cursor-pointer ${
                    activeTab === tab
                      ? 'bg-[#71F5DB] text-[#06201B] font-bold'
                      : 'text-[#96A3A1] hover:text-[#F3F6F5]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Interactive Cards */}
            <div className="md:col-span-5 space-y-2.5">
              {[
                { id: 'talk', title: 'Talk (Voice Notes)', icon: Mic, desc: 'On-demand spoken thoughts and audio turns. Gemini Live duplex processing with zero covert background loops.' },
                { id: 'see', title: 'See (Draftsman Schematics)', icon: Eye, desc: 'High-tech OCR parsing of 50MB mechanical blueprints, engine schematics, and screenshots with fine vector markers.' },
                { id: 'write', title: 'Write (Quick Capture)', icon: PenTool, desc: 'Immediate unfiltered thought memos without the friction of filing, categorization, or folder nesting.' },
                { id: 'add', title: 'Add (Files & Vault)', icon: FolderPlus, desc: 'Direct ingestion of PDFs, scans, gate codes, and critical documents into your sovereign device timeline.' },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = activeTab === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#151E21] border-[#71F5DB] shadow-[0_0_15px_rgba(113,245,219,0.15)]'
                        : 'bg-[#0B1012] border-[#1D2A2D] hover:border-[#303737]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 mb-1">
                      <div className={`p-1.5 rounded-xl ${isSelected ? 'bg-[#71F5DB]/20 text-[#71F5DB]' : 'bg-[#151E21] text-[#96A3A1]'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <h3 className={`text-sm font-semibold ${isSelected ? 'text-[#71F5DB]' : 'text-[#F3F6F5]'}`}>
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-xs text-[#96A3A1] leading-relaxed pl-8">
                      {item.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Mobile Device Mockup */}
            <div className="md:col-span-7 flex justify-center">
              <div className="w-full max-w-[340px] aspect-[9/18] bg-[#0B1012] rounded-[40px] border-4 border-[#303737] shadow-2xl p-4 flex flex-col justify-between relative overflow-hidden">
                {/* Status Bar */}
                <div className="flex items-center justify-between text-[10px] text-[#96A3A1] font-mono px-2">
                  <span>9:41</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#71F5DB]" />
                    <span>SOVEREIGN</span>
                  </div>
                </div>

                {/* Content Area Based on Active Tab */}
                <div className="my-auto space-y-3">
                  {activeTab === 'see' && (
                    <div className="relative rounded-2xl bg-[#151E21] border border-[#71F5DB]/40 p-3 space-y-2 animate-fade-in overflow-hidden">
                      <div className="flex items-center justify-between text-[11px] font-mono text-[#71F5DB]">
                        <span className="flex items-center gap-1">
                          <Cpu className="w-3.5 h-3.5" />
                          <span>DRAFTSMAN 3D SCHEMATIC</span>
                        </span>
                        <span>OCR 99.8%</span>
                      </div>
                      {/* Schematic Graphic Simulation */}
                      <div className="h-36 rounded-xl bg-[#0B1012] border border-[#303737] relative flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(#71F5DB_1px,transparent_1px)] [background-size:12px_12px] opacity-20" />
                        <div className="relative text-center p-3">
                          <div className="w-16 h-16 mx-auto rounded-full border-2 border-dashed border-[#71F5DB] animate-spin flex items-center justify-center">
                            <span className="text-[9px] font-mono text-[#71F5DB]">CATERPILLAR</span>
                          </div>
                          <span className="text-[10px] font-mono text-[#F3F6F5] block mt-2">CYLINDER HEAD BOLT TORQUE: 185 FT-LB</span>
                        </div>
                        {/* Laser scan line animation */}
                        <div className="absolute inset-x-0 h-0.5 bg-[#71F5DB] shadow-[0_0_8px_#71F5DB] animate-[bounce_3s_infinite]" />
                      </div>
                      <p className="text-[11px] text-[#96A3A1] leading-tight">
                        Captured via "See". Parsed without folders into your mechanical thread.
                      </p>
                    </div>
                  )}

                  {activeTab === 'talk' && (
                    <div className="rounded-2xl bg-[#151E21] border border-[#71F5DB]/40 p-4 text-center space-y-3 animate-fade-in">
                      <div className="w-14 h-14 mx-auto rounded-full bg-[#71F5DB]/20 border border-[#71F5DB] flex items-center justify-center text-[#71F5DB] animate-pulse">
                        <Mic className="w-7 h-7" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-mono text-[#71F5DB]">Live Duplex Turn</span>
                        <p className="text-xs text-[#F3F6F5] mt-1 italic">
                          "Meeting with Sarah shifted to Thursday at 2pm at the Fremantle workshop."
                        </p>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono">
                        ✓ Extracted: Sarah (People) · Thursday 2pm (Calendar)
                      </span>
                    </div>
                  )}

                  {activeTab === 'write' && (
                    <div className="rounded-2xl bg-[#151E21] border border-[#71F5DB]/40 p-4 space-y-2 animate-fade-in">
                      <span className="text-[10px] font-mono uppercase text-[#71F5DB]">Quick Capture Memo</span>
                      <p className="text-xs text-[#F3F6F5] leading-relaxed">
                        Need to pick up the titanium flange gaskets from Welshpool depot before weekend deployment.
                      </p>
                      <div className="flex gap-1.5 pt-1">
                        <span className="px-2 py-0.5 rounded-full bg-[#0B1012] text-[10px] text-[#96A3A1] border border-[#303737]">#Welshpool</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#0B1012] text-[10px] text-[#71F5DB] border border-[#71F5DB]/30">Auto-Linked</span>
                      </div>
                    </div>
                  )}

                  {activeTab === 'add' && (
                    <div className="rounded-2xl bg-[#151E21] border border-[#71F5DB]/40 p-4 space-y-2 animate-fade-in">
                      <div className="flex items-center gap-2 text-xs text-[#71F5DB] font-mono">
                        <FolderPlus className="w-4 h-4" />
                        <span>TRAVEL_INSURANCE_POLICY.PDF</span>
                      </div>
                      <p className="text-xs text-[#96A3A1]">
                        12-page PDF encrypted with AES-256-GCM. Ready for instant conversational recall.
                      </p>
                    </div>
                  )}
                </div>

                {/* Bottom Navigation Mockup */}
                <div className="h-10 rounded-2xl bg-[#151E21] border border-[#303737] flex items-center justify-around px-4">
                  <span className="w-2 h-2 rounded-full bg-[#71F5DB]" />
                  <span className="w-2 h-2 rounded-full bg-[#303737]" />
                  <span className="w-2 h-2 rounded-full bg-[#303737]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Layout 2 & 3: RECALL Conversational Stream & Vault Seal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#1D2A2D]">
          {/* Layout 2: Conversational RECALL */}
          <div className="p-5 rounded-2xl bg-[#151E21] border border-[#303737] space-y-3">
            <span className="text-[10px] tracking-widest uppercase font-mono text-[#71F5DB]">
              Layout 2 · Conversational RECALL
            </span>
            <h3 className="text-base font-semibold text-[#F3F6F5]">
              Just ask your life in plain words.
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#0B1012] border border-[#303737]">
                <Search className="w-4 h-4 text-[#71F5DB]" />
                <input
                  type="text"
                  value={recallQuery}
                  onChange={(e) => setRecallQuery(e.target.value)}
                  className="w-full bg-transparent text-xs text-[#F3F6F5] focus:outline-none font-mono"
                />
              </div>
              <div className="p-3 rounded-xl bg-[#0B1012] border border-[#71F5DB]/30 space-y-1.5 animate-fade-in">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#71F5DB] font-semibold">Bay 4B · Wilson Parking</span>
                  <span className="text-[#96A3A1] font-mono">Yesterday 4:15pm</span>
                </div>
                <p className="text-xs text-[#96A3A1]">
                  "Parked yellow Hilux in Bay 4B, Level 2 near the southern elevator."
                </p>
                <div className="flex items-center gap-2 text-[10px] text-[#71F5DB] pt-1">
                  <span>Linked to: James (Work)</span>
                  <span>•</span>
                  <span>Project Thread</span>
                </div>
              </div>
            </div>
          </div>

          {/* Layout 3: The Vault Security Seal */}
          <div className="p-5 rounded-2xl bg-[#151E21] border border-[#303737] space-y-3">
            <span className="text-[10px] tracking-widest uppercase font-mono text-[#71F5DB]">
              Layout 3 · Client-Side Encryption
            </span>
            <h3 className="text-base font-semibold text-[#F3F6F5]">
              The Vault: AES-256-GCM + Argon2id
            </h3>
            <div className="space-y-2.5">
              <div className="flex gap-2">
                <input
                  type="password"
                  value={vaultPass}
                  onChange={(e) => {
                    setVaultPass(e.target.value);
                    if (e.target.value.length >= 8) setVaultSealed(true);
                  }}
                  placeholder="Type sample passphrase..."
                  className="flex-1 p-2.5 rounded-xl bg-[#0B1012] border border-[#303737] text-xs text-[#F3F6F5] focus:outline-none focus:border-[#71F5DB] font-mono"
                />
              </div>
              <div className={`p-3 rounded-xl border transition-all ${
                vaultSealed
                  ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300'
                  : 'bg-[#0B1012] border-[#303737] text-[#96A3A1]'
              }`}>
                <div className="flex items-center gap-2 text-xs font-semibold">
                  {vaultSealed ? <ShieldCheck className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4" />}
                  <span>{vaultSealed ? 'VAULT SEALED ON-DEVICE' : 'AWAITING LOCAL KEY DERIVATION'}</span>
                </div>
                <p className="text-[11px] mt-1 leading-relaxed">
                  Keys are generated strictly in your browser memory and never leave your hardware.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[#1D2A2D] flex flex-wrap items-center justify-between gap-3 text-xs text-[#96A3A1]">
          <span className="font-mono text-[11px]">
            © 2026 IZA LIFE · EARTH-I ABN 15 698 220 692
          </span>
          <div className="flex items-center gap-4">
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="hover:text-[#71F5DB] transition font-mono">
              Privacy Policy
            </a>
            <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="hover:text-[#71F5DB] transition font-mono">
              Terms of Service
            </a>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-full bg-[#151E21] hover:bg-[#1D2A2D] text-[#F3F6F5] border border-[#303737] font-medium transition cursor-pointer"
            >
              Enter App
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
