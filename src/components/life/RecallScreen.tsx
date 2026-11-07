import React, { useState, useRef } from 'react';
import { Search, Loader2, Sparkles, ArrowRight, FileText, User, MessageSquare, Compass, Bookmark, MapPin, CheckCircle2, Mic, MicOff, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { MomentItem } from './HomeScreen';
import { groupMemoriesByDate } from '../../lib/date-groups';
import { MomentDetailModal } from './MomentDetailModal';

interface RecallScreenProps {
  moments: MomentItem[];
  onMomentClick?: (moment: MomentItem) => void;
  onExploreFilter?: (filter: string) => void;
  onOpenInThread?: (moment: MomentItem) => void;
  onDeleteMoment?: (id: number) => void;
  onContinueFromMoment?: (content: string) => void;
}

type ExploreCategory = 'all' | 'Moments' | 'People' | 'Threads' | 'Documents' | 'Places' | 'Decisions';

export const RecallScreen: React.FC<RecallScreenProps> = ({
  moments,
  onMomentClick,
  onOpenInThread,
  onDeleteMoment,
  onContinueFromMoment,
}) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<ExploreCategory>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [recallAnswer, setRecallAnswer] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<MomentItem[] | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [selectedMoment, setSelectedMoment] = useState<MomentItem | null>(null);
  const recognitionRef = useRef<any>(null);

  const categories: ExploreCategory[] = [
    'Moments',
    'People',
    'Threads',
    'Documents',
    'Places',
    'Decisions'
  ];

  const triggerVoiceSearch = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not available in this browser. Please type your query.');
      return;
    }

    if (isVoiceActive) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
      }
      setIsVoiceActive(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsVoiceActive(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setQuery(transcript);
        if (event.results[0]?.isFinal) {
          executeSearch(transcript);
        }
      };

      recognition.onerror = () => {
        setIsVoiceActive(false);
      };

      recognition.onend = () => {
        setIsVoiceActive(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Speech recognition error:', err);
      setIsVoiceActive(false);
    }
  };

  const executeSearch = async (searchTerm: string) => {
    const q = searchTerm.trim();
    if (!q) return;

    setIsSearching(true);
    setRecallAnswer(null);

    try {
      // 1. Fetch search results from universal search endpoint
      const searchRes = await fetch(`/api/search/universal?q=${encodeURIComponent(q)}&domain=all`);
      const searchData = await searchRes.json();
      
      const matchedMoments: MomentItem[] = Array.isArray(searchData) 
        ? searchData.map((d: any) => ({
            id: d.id,
            content: d.content,
            summary: d.summary,
            kind: d.kind || 'note',
            capturedAt: d.capturedAt || new Date().toISOString(),
            meta: { 
              domain: d.domain, 
              sourceChunk: d.sourceChunk, 
              confidence: d.confidence,
              imageUrl: d.meta?.imageUrl || (d.kind === 'visual' && d.meta?.raw_storage_url ? d.meta.raw_storage_url : undefined),
              raw_storage_url: d.meta?.raw_storage_url,
              fileName: d.meta?.fileName,
              origin_coordinates: d.meta?.origin_coordinates,
              device_signature: d.meta?.device_signature,
            }
          }))
        : [];

      setSearchResults(matchedMoments);

      // If exactly 1 highly confident match or top visual/document match, prepare for instant shared detail view preview
      if (matchedMoments.length === 1 && (matchedMoments[0].kind === 'visual' || matchedMoments[0].kind === 'document')) {
        setSelectedMoment(matchedMoments[0]);
      }

      // 2. Synthesize an empathetic direct answer with IZA
      const answerRes = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `The user asked: "${q}". Based on their anchored moments and history: ${JSON.stringify(matchedMoments.slice(0, 5).map(m => m.content))}. Synthesize a calm, direct, supportive 2-sentence response directly answering their question without generic corporate fluff.`
        })
      });
      const answerData = await answerRes.json();
      if (answerData?.reply) {
        setRecallAnswer(answerData.reply);
      }
    } catch (err) {
      console.error('Error during recall search:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query);
  };

  // Filter moments if an explore category is active
  const filteredMoments = activeCategory === 'all'
    ? moments
    : moments.filter(m => {
        if (activeCategory === 'Documents') return m.kind === 'document' || Boolean(m.meta?.fileName);
        if (activeCategory === 'People') return m.kind === 'conversation' || m.content.toLowerCase().includes('talk');
        if (activeCategory === 'Decisions') return m.content.toLowerCase().includes('decision') || m.content.toLowerCase().includes('agreed');
        if (activeCategory === 'Places') return m.content.toLowerCase().includes('at') || m.kind === 'place' || Boolean(m.meta?.origin_coordinates);
        if (activeCategory === 'Moments') return m.kind === 'visual' || m.kind === 'photo' || Boolean(m.meta?.imageUrl);
        return true;
      });

  const displayList = searchResults !== null ? searchResults : filteredMoments;

  const handleItemSelect = (m: MomentItem) => {
    setSelectedMoment(m);
    onMomentClick?.(m);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-28">
      {/* Title */}
      <div>
        <p className="text-[11px] tracking-widest uppercase text-[#7A8E96] font-medium">Memory Retrieval</p>
        <h1 className="text-3xl font-light text-[#F1F5F9] font-display mt-1">
          Recall.
        </h1>
        <p className="text-xs text-[#7A8E96] mt-0.5">
          Ask your life. Search past conversations, visual logs, documents, and decisions.
        </p>
      </div>

      {/* Pathway A Search Field: "What do you want to remember?" + Voice Input */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!e.target.value.trim()) {
              setSearchResults(null);
              setRecallAnswer(null);
            }
          }}
          placeholder="What do you want to remember?"
          className="w-full px-5 py-4 pl-12 pr-24 rounded-2xl bg-[#132327] border border-[#1B2B30] text-base text-[#F1F5F9] placeholder-[#5A6E76] focus:outline-none focus:border-[#2DD4BF]/50 transition-all font-light"
        />
        <Search className="w-5 h-5 text-[#7A8E96] absolute left-4 top-1/2 -translate-y-1/2" />
        
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {/* Microphone button for voice search */}
          <button
            type="button"
            onClick={triggerVoiceSearch}
            title={isVoiceActive ? 'Listening...' : 'Voice Search'}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isVoiceActive 
                ? 'bg-rose-500/20 text-rose-400 animate-pulse border border-rose-500/40' 
                : 'text-[#7A8E96] hover:text-[#F1F5F9] hover:bg-[#1B2B30]'
            }`}
          >
            {isVoiceActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {isSearching ? (
            <div className="p-2">
              <Loader2 className="w-4 h-4 text-[#2DD4BF] animate-spin" />
            </div>
          ) : query.trim() ? (
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-[#F1F5F9] text-[#0D1B1E] text-xs font-medium hover:bg-white transition-all cursor-pointer"
            >
              Ask
            </button>
          ) : null}
        </div>
      </form>

      {/* Explore Categories */}
      <div className="space-y-2">
        <span className="text-[10px] tracking-widest uppercase text-[#7A8E96] font-medium">Explore by</span>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-[#F1F5F9] text-[#0D1B1E]'
                : 'bg-[#132327] text-[#7A8E96] hover:text-[#F1F5F9] border border-[#1B2B30]'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                activeCategory === cat
                  ? 'bg-[#F1F5F9] text-[#0D1B1E]'
                  : 'bg-[#132327] text-[#7A8E96] hover:text-[#F1F5F9] border border-[#1B2B30]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Synthesized Answer Box */}
      {recallAnswer && (
        <div className="p-5 rounded-2xl bg-[#132327] border border-[#1B2B30] space-y-2">
          <div className="flex items-center gap-2 text-xs text-[#2DD4BF]">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="font-medium font-mono text-[11px] tracking-wider uppercase">IZA Recall Synthesis</span>
          </div>
          <p className="text-sm text-[#F1F5F9] font-light leading-relaxed">
            {recallAnswer}
          </p>
        </div>
      )}

      {/* Results / Chronological Items Stream */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] tracking-widest uppercase text-[#7A8E96] font-medium">
            {searchResults !== null ? `Matching Moments (${searchResults.length})` : 'Recent Items'}
          </span>
          {searchResults !== null && (
            <button
              onClick={() => {
                setQuery('');
                setSearchResults(null);
                setRecallAnswer(null);
              }}
              className="text-xs text-[#7A8E96] hover:underline cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {displayList.length === 0 ? (
          <div className="text-center py-10 rounded-2xl border border-dashed border-[#1B2B30] text-[#7A8E96] text-xs">
            {searchResults !== null 
              ? `No moments found for "${query}". Try searching another thought, photo, or document.`
              : 'No items in this category yet.'}
          </div>
        ) : (
          <div className="space-y-4">
            {groupMemoriesByDate<MomentItem>(displayList, (m: MomentItem) => m.capturedAt).map((group) => (
              <div key={group.label} className="space-y-2">
                <div className="flex items-center justify-between px-1 pt-1 border-b border-[#1B2B30] pb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF]" />
                    <span className="text-[11px] font-medium tracking-wider uppercase text-[#F1F5F9] font-mono">
                      {group.label}
                    </span>
                    <span className="text-[10px] text-[#5A6E76] font-mono">
                      ({group.items.length})
                    </span>
                  </div>
                  <span className="text-[10px] text-[#7A8E96]">
                    {group.description}
                  </span>
                </div>

                <div className="space-y-2">
                  {group.items.map((m, idx) => {
                    const hasImage = m.kind === 'visual' || Boolean(m.meta?.imageUrl);
                    const isDoc = m.kind === 'document' || Boolean(m.meta?.fileName);

                    return (
                      <div
                        key={`recall-${m.id}-${idx}`}
                        onClick={() => handleItemSelect(m)}
                        className="p-4 rounded-2xl bg-[#132327]/60 hover:bg-[#132327] border border-[#1B2B30] transition-all cursor-pointer space-y-2.5 group"
                      >
                        <div className="flex items-center justify-between text-xs text-[#7A8E96]">
                          <span className="capitalize font-mono text-[11px] text-[#2DD4BF]">
                            {m.kind.replace('_', ' ')}
                          </span>
                          <span className="font-mono text-[11px] text-[#5A6E76]">
                            {new Date(m.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(m.capturedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>

                        {/* Visual Asset Thumbnail Preview */}
                        {hasImage && m.meta?.imageUrl && (
                          <div className="rounded-xl overflow-hidden max-h-36 bg-[#091214] border border-[#1B2B30]/60">
                            <img 
                              src={m.meta.imageUrl} 
                              alt={m.summary || m.content} 
                              className="w-full h-36 object-cover group-hover:scale-[1.02] transition-transform" 
                            />
                          </div>
                        )}

                        {/* Document Asset Badge Preview */}
                        {isDoc && (
                          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#0F1E22] border border-[#1B2B30] text-xs">
                            <FileText className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                            <span className="font-medium text-[#F1F5F9] truncate">
                              {m.meta?.fileName || 'Ingested Document'}
                            </span>
                          </div>
                        )}

                        <p className="text-sm text-[#F1F5F9] font-light line-clamp-2 leading-relaxed">
                          {m.summary || m.content}
                        </p>

                        {/* Clean quiet metadata string */}
                        <div className="flex items-center gap-2 text-[11px] text-[#5A6E76] font-mono pt-0.5">
                          {m.meta?.domain && <span>Domain: {m.meta.domain}</span>}
                          {m.meta?.origin_coordinates && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-[#7A8E96]" />
                                {m.meta.origin_coordinates.latitude.toFixed(2)}°, {m.meta.origin_coordinates.longitude.toFixed(2)}°
                              </span>
                            </>
                          )}
                          {m.meta?.sourceChunk && (
                            <>
                              <span>·</span>
                              <span className="truncate max-w-[140px]">Source: {m.meta.sourceChunk}</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shared Detail View Modal when an item is selected */}
      {selectedMoment && (
        <MomentDetailModal
          moment={selectedMoment}
          onClose={() => setSelectedMoment(null)}
          onDeleteMoment={(id) => {
            onDeleteMoment?.(id);
            setSelectedMoment(null);
          }}
          onContinueFromMoment={(content) => {
            onContinueFromMoment?.(content);
            setSelectedMoment(null);
          }}
          onOpenInThread={(m) => {
            onOpenInThread?.(m);
            setSelectedMoment(null);
          }}
        />
      )}
    </div>
  );
};
