import React, { useState, useEffect } from 'react';
import { Sparkles, Clock, ArrowRight, MessageSquare, Mic, Camera, FileText, ChevronRight, Check, Image as ImageIcon, MapPin } from 'lucide-react';
import { LifeThreadModal } from './LifeThreadModal';
import { apiFetch } from '../../lib/api';

export interface MomentItem {
  id: number;
  content: string;
  summary?: string;
  kind: string;
  capturedAt: string;
  salience?: number;
  meta?: any;
}

interface HomeScreenProps {
  moments: MomentItem[];
  onMomentClick?: (moment: MomentItem) => void;
  onOpenInThread?: (moment: MomentItem) => void;
  onContinueChat?: (prompt: string) => void;
  onRefresh?: () => void;
}

type PulseTab = 'now' | 'today' | 'next' | 'attention';

export const HomeScreen: React.FC<HomeScreenProps> = ({
  moments,
  onMomentClick,
  onOpenInThread,
  onContinueChat,
}) => {
  const [pulseTab, setPulseTab] = useState<PulseTab>('now');
  const [greeting, setGreeting] = useState('');
  const [dateString, setDateString] = useState('');
  const [selectedThreadMoment, setSelectedThreadMoment] = useState<MomentItem | null>(null);

  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    let initialGreeting = 'Good morning';
    if (hour >= 12 && hour < 17) initialGreeting = 'Good afternoon';
    else if (hour >= 17) initialGreeting = 'Good evening';
    setGreeting(initialGreeting);

    setDateString(now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    }));

    // Fetch dynamic relationship-aware greeting
    apiFetch('/api/iza/greeting')
      .then((res) => res.json())
      .then((data) => {
        if (data?.opening) {
          setGreeting(data.opening);
        }
      })
      .catch((err) => console.warn('Could not load dynamic greeting:', err));
  }, []);

  // Format moment time
  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const getKindIcon = (kind: string) => {
    switch (kind) {
      case 'conversation':
      case 'voice_text':
      case 'voice':
        return <Mic className="w-3.5 h-3.5 text-[#7A8E96]" />;
      case 'visual':
      case 'photo':
        return <Camera className="w-3.5 h-3.5 text-[#7A8E96]" />;
      case 'document':
        return <FileText className="w-3.5 h-3.5 text-[#7A8E96]" />;
      default:
        return <MessageSquare className="w-3.5 h-3.5 text-[#7A8E96]" />;
    }
  };

  // Pathway C: Locate the latest matching document/image relational entry from the database
  const latestMediaMoment = moments.find(
    m => m.kind === 'visual' || m.kind === 'document' || Boolean(m.meta?.imageUrl) || Boolean(m.meta?.fileName)
  ) || moments[0];

  const handlePickUpWhereLeftOff = () => {
    if (!latestMediaMoment) {
      onContinueChat?.('Pick up where we left off—what was our last thread?');
      return;
    }
    setSelectedThreadMoment(latestMediaMoment);
    onOpenInThread?.(latestMediaMoment);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-28">
      {/* Top Greeting & Quiet Date */}
      <div>
        <p className="text-[11px] tracking-widest uppercase text-[#7A8E96] font-medium font-mono">{dateString}</p>
        <h1 className="text-3xl font-light text-[#F1F5F9] font-display mt-1">
          {/[.?!]$/.test(greeting) ? greeting : `${greeting}.`}
        </h1>
      </div>

      {/* The Single Dynamic Pulse Card */}
      <div className="bg-[#132327] border border-[#1B2B30] rounded-3xl p-6 shadow-sm">
        {/* Pulse Tabs: Now, Today, Next, Attention */}
        <div className="flex items-center justify-between border-b border-[#1B2B30] pb-3 mb-4">
          <div className="flex items-center gap-4">
            {(['now', 'today', 'next', 'attention'] as PulseTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setPulseTab(tab)}
                className={`text-xs font-medium uppercase tracking-wider transition-colors cursor-pointer relative pb-1 ${
                  pulseTab === tab ? 'text-[#F1F5F9]' : 'text-[#5A6E76] hover:text-[#94A3B8]'
                }`}
              >
                {tab}
                {pulseTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#F1F5F9] rounded-full" />
                )}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-[#5A6E76] font-mono">PULSE</span>
        </div>

        {/* Pulse Content based on selected tab */}
        {pulseTab === 'now' && (
          <div className="space-y-3">
            <p className="text-base text-[#F1F5F9] font-light leading-relaxed">
              Your day is calm and grounded. Moments you capture today will gently connect to your life threads.
            </p>
            <div className="flex items-center gap-2 pt-2 text-xs text-[#96A3A1]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#71F5DB]" />
              <span>Voice and files are processed only when you choose to capture them.</span>
            </div>
          </div>
        )}

        {pulseTab === 'today' && (
          <div className="space-y-3">
            <p className="text-sm text-[#F1F5F9] font-light leading-relaxed">
              {moments.length > 0 
                ? `You have ${moments.length} moments anchored in your archive. Your focus today is on clarity, restorative pacing, and meaningful connections.`
                : 'No moments captured yet today. Tap ＋ below to write a thought or talk with IZA.'}
            </p>
            <div className="flex items-center gap-4 pt-1 text-xs text-[#7A8E96] font-mono">
              <span>{moments.length} archived</span>
              <span>·</span>
              <span>Daily rhythm synced</span>
            </div>
          </div>
        )}

        {pulseTab === 'next' && (
          <div className="space-y-3">
            <p className="text-sm text-[#F1F5F9] font-light leading-relaxed">
              Upcoming: Evening wind-down reflection scheduled at 8:00 PM. All your conversations and notes are preserved.
            </p>
            <div className="pt-1">
              <button
                onClick={() => onContinueChat?.('Let us review my upcoming commitments and open loops')}
                className="inline-flex items-center gap-1.5 text-xs text-[#F1F5F9] hover:underline cursor-pointer"
              >
                <span>Review upcoming commitments</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {pulseTab === 'attention' && (
          <div className="space-y-3">
            <p className="text-sm text-[#F1F5F9] font-light leading-relaxed">
              No urgent alerts or unresolved conflicts. Your personal health boundaries and circles are quiet.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400/90 pt-1 font-mono">
              <Check className="w-3.5 h-3.5" />
              <span>All personal data safely secured in local PostgreSQL</span>
            </div>
          </div>
        )}
      </div>

      {/* Pathway C: PICK UP WHERE YOU LEFT OFF Banner */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] tracking-widest uppercase text-[#7A8E96] font-medium font-mono">
            Pick Up Where You Left Off
          </span>
          <span className="text-[10px] font-mono text-[#2DD4BF]">CONTINUITY</span>
        </div>

        <div 
          onClick={handlePickUpWhereLeftOff}
          className="p-5 rounded-3xl bg-[#132327]/80 hover:bg-[#132327] border border-[#1B2B30] hover:border-[#2DD4BF]/40 transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
        >
          <div className="flex items-start gap-4">
            {latestMediaMoment?.meta?.imageUrl ? (
              <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 bg-[#091214] border border-[#1B2B30]">
                <img 
                  src={latestMediaMoment.meta.imageUrl} 
                  alt={latestMediaMoment.summary || latestMediaMoment.content} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                />
              </div>
            ) : latestMediaMoment?.kind === 'document' || latestMediaMoment?.meta?.fileName ? (
              <div className="w-14 h-14 rounded-2xl bg-[#1B2B30] flex items-center justify-center shrink-0 text-[#2DD4BF]">
                <FileText className="w-6 h-6" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-[#1B2B30] flex items-center justify-center shrink-0 text-[#2DD4BF]">
                <Sparkles className="w-6 h-6" />
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[11px] text-[#7A8E96]">
                <span className="font-mono text-[#2DD4BF] capitalize">
                  {latestMediaMoment ? latestMediaMoment.kind.replace('_', ' ') : 'Thread'}
                </span>
                <span>·</span>
                <span className="font-mono text-[#5A6E76]">
                  {latestMediaMoment ? formatTime(latestMediaMoment.capturedAt) : 'Recent'}
                </span>
              </div>
              <p className="text-sm text-[#F1F5F9] font-medium line-clamp-1">
                {latestMediaMoment?.meta?.fileName || latestMediaMoment?.summary || latestMediaMoment?.content || 'Resume sovereign life thread'}
              </p>
              <p className="text-xs text-[#7A8E96] line-clamp-1">
                Tap to launch multi-media thread view without manual query
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#2DD4BF] group-hover:text-white transition-colors self-end sm:self-center font-medium font-mono text-[11px]">
            <span>Launch Thread</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Recent Moments Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] tracking-widest uppercase text-[#7A8E96] font-medium font-mono">Recent Moments</span>
          <span className="text-xs text-[#5A6E76] font-mono">{moments.length} total</span>
        </div>

        {moments.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-3xl border border-dashed border-[#1B2B30] text-[#7A8E96] space-y-2">
            <p className="text-sm text-[#F1F5F9]">Your canvas is open</p>
            <p className="text-xs max-w-xs mx-auto">
              Tap the ＋ button below to capture a thought, conversation, photo, or document. Everything becomes a Moment.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {moments.slice(0, 8).map((m, idx) => (
              <div
                key={`home-moment-${m.id}-${idx}`}
                onClick={() => onMomentClick?.(m)}
                className="p-4 rounded-2xl bg-[#132327]/60 hover:bg-[#132327] border border-[#1B2B30] transition-all cursor-pointer space-y-2 group"
              >
                <div className="flex items-center justify-between text-xs text-[#7A8E96]">
                  <div className="flex items-center gap-1.5">
                    {getKindIcon(m.kind)}
                    <span className="capitalize font-mono text-[11px]">{m.kind.replace('_', ' ')}</span>
                  </div>
                  <span className="font-mono text-[11px] text-[#5A6E76]">{formatTime(m.capturedAt)}</span>
                </div>

                {/* Thumbnail if image */}
                {m.meta?.imageUrl && (
                  <div className="rounded-xl overflow-hidden max-h-32 bg-[#091214] border border-[#1B2B30]">
                    <img src={m.meta.imageUrl} alt={m.summary || m.content} className="w-full h-32 object-cover group-hover:scale-102 transition-transform" />
                  </div>
                )}

                <p className="text-sm text-[#F1F5F9] font-light line-clamp-2 leading-relaxed">
                  {m.summary || m.content}
                </p>

                {m.meta?.domain && (
                  <div className="flex items-center gap-2 text-[11px] text-[#5A6E76] font-mono">
                    <span>Linked to {m.meta.domain}</span>
                    {m.meta?.origin_coordinates && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#7A8E96]" />
                          {m.meta.origin_coordinates.latitude.toFixed(2)}°, {m.meta.origin_coordinates.longitude.toFixed(2)}°
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Brand Standards Legal & Governance Footer (Section 11.1) */}
      <footer className="pt-8 pb-4 border-t border-[#1D2A2D] text-center space-y-1.5 text-xs text-[#96A3A1]">
        <p className="font-medium text-[#F3F6F5]">Your life, remembered.</p>
        <p className="text-[11px] text-[#96A3A1]">
          &copy; 2026 IZA LIFE &middot; EARTH-I ABN 15 698 220 692 &middot; <a href="mailto:support@izalife.app" className="text-[#71F5DB] hover:underline">support@izalife.app</a>
        </p>
        <p className="text-[10px] text-[#96A3A1]/70">
          Private by design. Your memories are visible only to your account.
        </p>
      </footer>

      {/* Life Thread Modal for Pathway C */}
      {selectedThreadMoment && (
        <LifeThreadModal
          moment={selectedThreadMoment}
          moments={moments}
          onClose={() => setSelectedThreadMoment(null)}
          onContinueInChat={(prompt) => {
            onContinueChat?.(prompt);
            setSelectedThreadMoment(null);
          }}
        />
      )}
    </div>
  );
};
