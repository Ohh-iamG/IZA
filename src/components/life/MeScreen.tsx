import React, { useState } from 'react';
import { 
  User, 
  Layers, 
  GitBranch, 
  Users, 
  Calendar, 
  Lock, 
  Shield, 
  Download, 
  Trash2, 
  ChevronRight, 
  Info,
  CheckCircle2,
  FileCheck,
  AlertTriangle,
  Image as ImageIcon,
  FileText,
  MapPin,
  Clock,
  ArrowRight
} from 'lucide-react';
import { MomentItem } from './HomeScreen';
import { groupMemoriesByDate } from '../../lib/date-groups';
import { LifeThreadModal } from './LifeThreadModal';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';

interface MeScreenProps {
  moments: MomentItem[];
  onOpenVault: () => void;
  onOpenMedicalDisclaimer: () => void;
  onPurgeAccount: () => void;
  onViewCategory?: (cat: string) => void;
  onOpenInThread?: (moment: MomentItem) => void;
}

export const MeScreen: React.FC<MeScreenProps> = ({
  moments,
  onOpenVault,
  onOpenMedicalDisclaimer,
  onPurgeAccount,
  onViewCategory,
  onOpenInThread,
}) => {
  const [activeDetailModal, setActiveDetailModal] = useState<string | null>(null);
  const [purgeConfirmOpen, setPurgeConfirmOpen] = useState(false);
  const [purgePhrase, setPurgePhrase] = useState('');
  const [isPurging, setIsPurging] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [selectedThreadMoment, setSelectedThreadMoment] = useState<MomentItem | null>(null);
  const [privacyPolicyOpen, setPrivacyPolicyOpen] = useState(false);

  const menuItems = [
    { id: 'my_life', label: 'My Life', desc: 'Core anchors, life goals & values', icon: User, count: 'Grounded' },
    { id: 'moments', label: 'Moments', desc: 'Complete sovereign memory archive & multi-modal grid', icon: Layers, count: `${moments.length} entries` },
    { id: 'threads', label: 'Threads', desc: 'Connected life storylines & themes', icon: GitBranch, count: '4 Active' },
    { id: 'circles', label: 'Circles', desc: 'Family, Friends, Care & Work boundaries', icon: Users, count: '4 Circles' },
    { id: 'future', label: 'Future', desc: 'Commitments, upcoming rhythms & aspirations', icon: Calendar, count: 'Scheduled' },
    { id: 'vault', label: 'Vault', desc: 'Zero-knowledge encrypted secrets & PINs', icon: Lock, isVault: true, count: 'Locked' },
  ];

  const handleExportData = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
        appName: 'IZA Life',
        exportDate: new Date().toISOString(),
        moments,
      }, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `iza-life-export-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const executePurge = async () => {
    if (purgePhrase !== 'DELETE_SELECTION') return;
    setIsPurging(true);
    try {
      await fetch('/api/user/purge', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true, phrase: 'DELETE_SELECTION' })
      });
      onPurgeAccount();
      setPurgeConfirmOpen(false);
    } catch (err) {
      console.error('Purge error:', err);
    } finally {
      setIsPurging(false);
    }
  };

  const handleItemClick = (m: MomentItem) => {
    setSelectedThreadMoment(m);
    onOpenInThread?.(m);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-28">
      {/* Profile Header */}
      <div>
        <p className="text-[11px] tracking-widest uppercase text-[#7A8E96] font-medium font-mono">Sovereign Profile</p>
        <h1 className="text-3xl font-light text-[#F1F5F9] font-display mt-1">
          Me.
        </h1>
        <p className="text-xs text-[#7A8E96] mt-1">
          Your life, your data. Isolated in PostgreSQL with zero external model training.
        </p>
      </div>

      {/* The 6-Item Short List */}
      <div className="space-y-2.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              onClick={() => {
                if (item.isVault) {
                  onOpenVault();
                } else {
                  setActiveDetailModal(item.id);
                  onViewCategory?.(item.id);
                }
              }}
              className="p-4 rounded-2xl bg-[#132327]/60 hover:bg-[#132327] border border-[#1B2B30] transition-all cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-3.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                  item.isVault 
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                    : 'bg-[#1B2B30] text-[#F1F5F9]'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-[#F1F5F9] group-hover:text-white transition-colors">
                    {item.label}
                  </h4>
                  <p className="text-xs text-[#7A8E96]">
                    {item.desc}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#5A6E76]">
                <span className="font-mono text-[11px]">{item.count}</span>
                <ChevronRight className="w-4 h-4 text-[#7A8E96] group-hover:text-[#F1F5F9] group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Privacy and Boundaries Section */}
      <div className="space-y-3 pt-4 border-t border-[#1B2B30]">
        <span className="text-[10px] tracking-widest uppercase text-[#7A8E96] font-medium font-mono">Privacy & Boundaries</span>
        
        <div className="p-4 rounded-2xl bg-[#132327]/40 border border-[#1B2B30] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-[#F1F5F9]">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Data Sovereignty</span>
            </div>
            <span className="text-[11px] text-emerald-400 font-mono">ENFORCED</span>
          </div>
          <p className="text-xs text-[#7A8E96] leading-relaxed">
            All your moments are stored strictly in your dedicated Cloud SQL database instance.
          </p>

          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => setPrivacyPolicyOpen(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-[#151E21] hover:bg-[#1D2A2D] border border-[#303737] text-xs text-[#F3F6F5] font-medium transition-colors flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-[#71F5DB]" />
                <span>Production Privacy Policy (WA Surveillance Act)</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#96A3A1] group-hover:text-[#F3F6F5] group-hover:translate-x-0.5 transition-all" />
            </button>

            <button
              onClick={handleExportData}
              className="w-full py-2.5 px-4 rounded-xl bg-[#1B2B30] hover:bg-[#25383E] text-xs text-[#F1F5F9] font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#2DD4BF]" />
              <span>{exportSuccess ? 'Archive Exported Successfully' : 'Download Complete Data Archive'}</span>
            </button>

            <button
              onClick={onOpenMedicalDisclaimer}
              className="w-full py-2 px-4 rounded-xl text-xs text-[#7A8E96] hover:text-[#F1F5F9] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Medical & Health Boundary Notice</span>
            </button>

            <button
              onClick={() => setPurgeConfirmOpen(true)}
              className="w-full py-2 px-4 rounded-xl text-xs text-rose-400/80 hover:text-rose-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Purge Account & All Memories</span>
            </button>
          </div>
        </div>
      </div>

      {/* Purge Confirmation Modal */}
      {purgeConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#0D1B1E] border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-medium text-[#F1F5F9]">Permanent Purge</h3>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              This will permanently erase all your moments, documents, entities, and health logs from PostgreSQL. This action cannot be reversed.
            </p>
            <div>
              <label className="block text-[11px] text-[#7A8E96] mb-1">
                Type <strong className="text-rose-400 font-mono">DELETE_SELECTION</strong> to confirm:
              </label>
              <input
                type="text"
                value={purgePhrase}
                onChange={(e) => setPurgePhrase(e.target.value)}
                placeholder="DELETE_SELECTION"
                className="w-full px-3 py-2 rounded-xl bg-[#132327] border border-rose-500/40 text-sm text-[#F1F5F9] font-mono focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPurgeConfirmOpen(false)}
                className="px-4 py-2 text-xs text-[#7A8E96] hover:text-[#F1F5F9]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={purgePhrase !== 'DELETE_SELECTION' || isPurging}
                onClick={executePurge}
                className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium disabled:opacity-40 transition-all cursor-pointer"
              >
                {isPurging ? 'Purging...' : 'Confirm Purge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Detail Modal (My Life, Moments Grid, Threads, Circles, Future) */}
      {activeDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#0D1B1E] border border-[#1B2B30] rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1B2B30] pb-3">
              <h3 className="text-lg font-light text-[#F1F5F9] font-display capitalize">
                {activeDetailModal.replace('_', ' ')}
              </h3>
              <button
                onClick={() => setActiveDetailModal(null)}
                className="text-xs text-[#7A8E96] hover:text-[#F1F5F9] cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Pathway B: Moments Chronological Multi-Modal Image Logging Grid */}
            {activeDetailModal === 'moments' && (
              <div className="space-y-4">
                <p className="text-xs text-[#7A8E96]">
                  Chronological multi-modal image & memory logging grid. Tap any item to push into the Life Thread view.
                </p>

                {moments.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-[#1B2B30] rounded-2xl text-xs text-[#7A8E96]">
                    No moments recorded yet.
                  </div>
                ) : (
                  <div className="space-y-5">
                    {groupMemoriesByDate<MomentItem>(moments, (m: MomentItem) => m.capturedAt).map((group) => (
                      <div key={group.label} className="space-y-2.5">
                        <div className="flex items-center justify-between border-b border-[#1B2B30] pb-1">
                          <span className="text-[11px] font-mono uppercase tracking-wider text-[#F1F5F9]">
                            {group.label}
                          </span>
                          <span className="text-[10px] text-[#5A6E76] font-mono">
                            {group.items.length} items
                          </span>
                        </div>

                        {/* Multi-Modal Grid */}
                        <div className="grid grid-cols-2 gap-2.5">
                          {group.items.map((m, idx) => {
                            const hasImage = m.kind === 'visual' || Boolean(m.meta?.imageUrl);
                            const isDoc = m.kind === 'document' || Boolean(m.meta?.fileName);

                            return (
                              <div
                                key={`me-moment-${m.id}-${idx}`}
                                onClick={() => handleItemClick(m)}
                                className="group relative rounded-2xl overflow-hidden border border-[#1B2B30] bg-[#132327]/70 hover:bg-[#132327] hover:border-[#2DD4BF]/50 transition-all cursor-pointer p-3 flex flex-col justify-between min-h-[110px]"
                              >
                                {hasImage && m.meta?.imageUrl ? (
                                  <div className="absolute inset-0">
                                    <img 
                                      src={m.meta.imageUrl} 
                                      alt={m.summary || m.content} 
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform opacity-75 group-hover:opacity-90"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0D1B1E] via-[#0D1B1E]/40 to-transparent" />
                                  </div>
                                ) : null}

                                <div className="relative z-10 flex items-center justify-between text-[10px] text-[#7A8E96]">
                                  <span className="font-mono text-[#2DD4BF] uppercase">
                                    {m.kind.replace('_', ' ')}
                                  </span>
                                  <span className="font-mono text-[#5A6E76]">
                                    {new Date(m.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>

                                <div className="relative z-10 pt-2 space-y-1">
                                  {isDoc && (
                                    <div className="flex items-center gap-1.5 text-xs text-[#2DD4BF]">
                                      <FileText className="w-3.5 h-3.5" />
                                      <span className="truncate text-[11px] font-mono">{m.meta?.fileName || 'Doc'}</span>
                                    </div>
                                  )}
                                  <p className="text-xs text-[#F1F5F9] font-light line-clamp-2 leading-relaxed">
                                    {m.summary || m.content}
                                  </p>
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
            )}

            {activeDetailModal === 'my_life' && (
              <div className="space-y-3 text-xs text-[#94A3B8] leading-relaxed">
                <p>
                  <strong className="text-[#F1F5F9]">Core Principle:</strong> IZA is dedicated strictly to you, functioning with zero amnesia and total boundary integrity.
                </p>
                <div className="p-3.5 rounded-2xl bg-[#132327] border border-[#1B2B30] space-y-2">
                  <span className="text-[10px] tracking-widest uppercase text-[#7A8E96] font-medium font-mono">Life Values</span>
                  <ul className="list-disc pl-4 space-y-1 text-[#F1F5F9]">
                    <li>Clarity of thought over frantic productivity</li>
                    <li>Sovereign data ownership & personal dignity</li>
                    <li>Restorative rhythm between work and care</li>
                  </ul>
                </div>
              </div>
            )}

            {activeDetailModal === 'threads' && (
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-[#132327] border border-[#1B2B30]">
                  <p className="font-medium text-[#F1F5F9]">Personal Wellbeing & Rest</p>
                  <p className="text-[#7A8E96] mt-0.5">Focusing on evening wind-down rituals and restful pacing.</p>
                </div>
                <div className="p-3 rounded-xl bg-[#132327] border border-[#1B2B30]">
                  <p className="font-medium text-[#F1F5F9]">Work & Technical Knowledge</p>
                  <p className="text-[#7A8E96] mt-0.5">Connected to uploaded operating manuals and SOPs.</p>
                </div>
                <div className="p-3 rounded-xl bg-[#132327] border border-[#1B2B30]">
                  <p className="font-medium text-[#F1F5F9]">Family & Trusted Circle</p>
                  <p className="text-[#7A8E96] mt-0.5">Tracking mutual milestones and check-in commitments.</p>
                </div>
              </div>
            )}

            {activeDetailModal === 'circles' && (
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-[#132327] border border-[#1B2B30]">
                  <p className="font-medium text-[#F1F5F9]">Family Circle</p>
                  <p className="text-[#7A8E96] mt-0.5">High trust, mutual emergency check-ins, medical proxy awareness.</p>
                </div>
                <div className="p-3 rounded-xl bg-[#132327] border border-[#1B2B30]">
                  <p className="font-medium text-[#F1F5F9]">Care Circle</p>
                  <p className="text-[#7A8E96] mt-0.5">Physicians and caregivers with strict HIPAA-aligned data boundaries.</p>
                </div>
                <div className="p-3 rounded-xl bg-[#132327] border border-[#1B2B30]">
                  <p className="font-medium text-[#F1F5F9]">Work & Friends Circles</p>
                  <p className="text-[#7A8E96] mt-0.5">Isolated projects, deliverables, and social cadences.</p>
                </div>
              </div>
            )}

            {activeDetailModal === 'future' && (
              <div className="space-y-3 text-xs text-[#94A3B8] leading-relaxed">
                <p className="text-[#F1F5F9]">
                  Upcoming Rhythms & Goals:
                </p>
                <ul className="space-y-2">
                  <li className="p-3 rounded-xl bg-[#132327] border border-[#1B2B30] text-[#F1F5F9]">
                    Daily 8:00 PM: Evening closure & thought dump
                  </li>
                  <li className="p-3 rounded-xl bg-[#132327] border border-[#1B2B30] text-[#F1F5F9]">
                    End of month: Comprehensive life & knowledge review
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Life Thread Modal when an item in the logging grid is tapped */}
      {selectedThreadMoment && (
        <LifeThreadModal
          moment={selectedThreadMoment}
          moments={moments}
          onClose={() => setSelectedThreadMoment(null)}
          onContinueInChat={(prompt) => {
            setSelectedThreadMoment(null);
          }}
        />
      )}

      {/* Production Privacy Policy (Document 1) */}
      <PrivacyPolicyModal
        isOpen={privacyPolicyOpen}
        onClose={() => setPrivacyPolicyOpen(false)}
      />
    </div>
  );
};
