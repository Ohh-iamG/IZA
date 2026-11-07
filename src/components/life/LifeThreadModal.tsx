import React, { useState } from 'react';
import { X, Plus, Calendar, Clock, MessageSquare, ArrowRight, Sparkles, MapPin, Laptop, FileText, Image as ImageIcon, Database, CheckCircle2 } from 'lucide-react';
import { PersonItem } from './PeopleScreen';
import { MomentItem } from './HomeScreen';

interface LifeThreadModalProps {
  person?: PersonItem | null;
  moment?: MomentItem | null;
  threadTitle?: string;
  onClose: () => void;
  moments: MomentItem[];
  onAddMomentWithPerson?: (personName: string, text: string) => void;
  onContinueInChat?: (prompt: string) => void;
}

export const LifeThreadModal: React.FC<LifeThreadModalProps> = ({
  person,
  moment,
  threadTitle,
  onClose,
  moments,
  onAddMomentWithPerson,
  onContinueInChat,
}) => {
  const [newMomentInput, setNewMomentInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  if (!person && !moment && !threadTitle) return null;

  // Determine title and subtitle
  const title = person?.name 
    ? person.name 
    : moment 
      ? (moment.meta?.fileName || moment.summary || moment.content.slice(0, 40)) 
      : (threadTitle || 'Life Thread');

  const domain = person?.circle || moment?.meta?.domain || 'personal';

  // Filter moments that are related
  const relatedMoments = moments.filter(m => {
    if (person) {
      return (
        m.content.toLowerCase().includes(person.name.toLowerCase()) ||
        m.summary?.toLowerCase().includes(person.name.toLowerCase())
      );
    }
    if (moment) {
      if (m.id === moment.id) return false;
      // Match same domain or similar keywords
      if (moment.meta?.domain && m.meta?.domain === moment.meta.domain) return true;
      if (moment.kind === m.kind) return true;
      return false;
    }
    return true;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMomentInput.trim()) return;
    if (person && onAddMomentWithPerson) {
      onAddMomentWithPerson(person.name, newMomentInput.trim());
    } else if (onContinueInChat) {
      onContinueInChat(`Adding to thread [${title}]: ${newMomentInput.trim()}`);
    }
    setNewMomentInput('');
    setIsAdding(false);
  };

  const activeMeta = moment?.meta;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
      <div 
        className="w-full max-w-lg bg-[#0D1B1E] border border-[#1B2B30] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[88vh] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Life Thread */}
        <div className="flex items-start justify-between border-b border-[#1B2B30] pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[10px] tracking-widest uppercase text-[#7A8E96] font-medium font-mono">Life Thread</span>
              <span className="text-[#5A6E76]">·</span>
              <span className="text-[11px] uppercase font-mono text-[#2DD4BF]">{domain}</span>
            </div>
            <h2 className="text-2xl font-light text-[#F1F5F9] font-display mt-0.5 truncate max-w-sm sm:max-w-md">
              {title}
            </h2>
            <p className="text-xs text-[#7A8E96] mt-0.5">
              {person ? `${person.relationship} · ${relatedMoments.length + (person.momentCount || 0)} shared moments` : `${relatedMoments.length + (moment ? 1 : 0)} connected storylines`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#7A8E96] hover:text-[#F1F5F9] hover:bg-[#1B2B30] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timeline of Shared Moments */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Quick inline capture */}
          {isAdding ? (
            <form onSubmit={handleAddSubmit} className="p-4 rounded-2xl bg-[#132327] border border-[#1B2B30] space-y-3">
              <textarea
                autoFocus
                value={newMomentInput}
                onChange={(e) => setNewMomentInput(e.target.value)}
                placeholder={`Capture a reflection, detail, or milestone for ${title}...`}
                rows={3}
                className="w-full bg-transparent text-sm text-[#F1F5F9] placeholder-[#5A6E76] focus:outline-none resize-none font-sans"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 text-xs text-[#7A8E96] hover:text-[#F1F5F9]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newMomentInput.trim()}
                  className="px-4 py-1.5 rounded-full bg-[#F1F5F9] text-[#0D1B1E] text-xs font-medium hover:bg-white disabled:opacity-40 transition-all cursor-pointer"
                >
                  Save to Thread
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full py-2.5 px-4 rounded-2xl border border-dashed border-[#1B2B30] hover:border-[#2DD4BF]/50 text-xs text-[#7A8E96] hover:text-[#F1F5F9] transition-all flex items-center justify-center gap-2 cursor-pointer bg-[#132327]/30"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add to this Life Thread</span>
            </button>
          )}

          {/* Timeline Stream */}
          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-[#1B2B30]">
            {/* Primary active moment if launched from a moment */}
            {moment && (
              <div className="relative space-y-1">
                <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#2DD4BF] ring-4 ring-[#0D1B1E]" />
                <div className="flex items-center gap-2 text-xs text-[#7A8E96]">
                  <Clock className="w-3 h-3 text-[#2DD4BF]" />
                  <span className="text-[#2DD4BF] font-mono text-[11px]">Primary Anchored Moment</span>
                  <span>·</span>
                  <span className="font-mono text-[11px]">{new Date(moment.capturedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                </div>

                {/* Thumbnail if image */}
                {moment.meta?.imageUrl && (
                  <div className="rounded-xl overflow-hidden max-h-40 border border-[#1B2B30] my-2 bg-[#091214]">
                    <img src={moment.meta.imageUrl} alt={moment.summary || moment.content} className="w-full h-40 object-cover" />
                  </div>
                )}

                <div className="p-3.5 rounded-2xl bg-[#132327] border border-[#2DD4BF]/30 space-y-1">
                  <p className="text-sm text-[#F1F5F9] font-light leading-relaxed">
                    {moment.content}
                  </p>
                  {moment.summary && (
                    <p className="text-xs text-[#7A8E96] border-t border-[#1B2B30] pt-1.5 mt-1.5">
                      {moment.summary}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Seeded initial moment if person */}
            {person && (
              <div className="relative space-y-1">
                <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#2DD4BF] ring-4 ring-[#0D1B1E]" />
                <div className="flex items-center gap-2 text-xs text-[#7A8E96]">
                  <Clock className="w-3 h-3" />
                  <span>Initial Connection</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#132327]/80 border border-[#1B2B30] space-y-1">
                  <p className="text-sm text-[#F1F5F9] font-light leading-relaxed">
                    {person.lastMoment || `Connected with ${person.name} in circle`}
                  </p>
                </div>
              </div>
            )}

            {/* Related connected moments */}
            {relatedMoments.map((m) => (
              <div key={m.id} className="relative space-y-1">
                <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#7A8E96] ring-4 ring-[#0D1B1E]" />
                <div className="flex items-center gap-2 text-xs text-[#7A8E96]">
                  <Clock className="w-3 h-3" />
                  <span className="font-mono text-[11px]">{new Date(m.capturedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  <span>·</span>
                  <span className="capitalize font-mono text-[11px]">{m.kind.replace('_', ' ')}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#132327]/80 border border-[#1B2B30] space-y-1">
                  <p className="text-sm text-[#F1F5F9] font-light leading-relaxed">
                    {m.summary || m.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM OF VIEWPORT: All related context strings accessible */}
        <div className="border-t border-[#1B2B30] pt-3 mt-1 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-[#7A8E96]">
            <span className="uppercase tracking-widest font-mono text-[10px]">Context Vector Strings</span>
            <span className="font-mono text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>pgvector 768-dim Synced</span>
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-[#091214] border border-[#1B2B30] space-y-1.5 text-xs">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[#7A8E96] font-mono text-[11px]">
              <span>Domain: <strong className="text-[#F1F5F9] font-normal capitalize">{domain}</strong></span>
              <span>·</span>
              <span>Owner: <strong className="text-[#F1F5F9] font-normal">Sovereign Cloud SQL</strong></span>
              {activeMeta?.origin_coordinates && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#2DD4BF]" />
                    {activeMeta.origin_coordinates.latitude}°N, {activeMeta.origin_coordinates.longitude}°E
                  </span>
                </>
              )}
            </div>

            {activeMeta?.device_signature && (
              <p className="text-[11px] text-[#5A6E76] font-mono truncate">
                Device Signature: {activeMeta.device_signature}
              </p>
            )}

            {activeMeta?.sourceChunk && (
              <p className="text-[11px] text-[#2DD4BF] font-mono truncate">
                Matched Sub-string: "{activeMeta.sourceChunk}"
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
