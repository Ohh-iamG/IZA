import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert, Check } from 'lucide-react';

interface VisualDeletionConfirmationModalProps {
  isOpen: boolean;
  targetDescription: string;
  affectedCount?: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const VisualDeletionConfirmationModal: React.FC<VisualDeletionConfirmationModalProps> = ({
  isOpen,
  targetDescription,
  affectedCount = 1,
  onConfirm,
  onCancel,
}) => {
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const requiresPhrase = affectedCount > 1 || targetDescription.toLowerCase().includes('all');

  const handleExecute = () => {
    if (requiresPhrase && confirmPhrase !== 'DELETE_SELECTION') return;
    setIsDeleting(true);
    setTimeout(() => {
      onConfirm();
      setIsDeleting(false);
      setConfirmPhrase('');
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div 
        className="w-full max-w-md bg-[#0D1B1E] border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1B2B30] pb-3">
          <div className="flex items-center gap-2.5 text-rose-400">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] tracking-widest uppercase font-mono text-[#7A8E96]">Deletion Intercept</span>
              <h3 className="text-base font-medium text-[#F1F5F9]">Confirm Irreversible Purge</h3>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-full text-[#7A8E96] hover:text-[#F1F5F9]"
            aria-label="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Body */}
        <div className="space-y-3 text-xs text-[#94A3B8] leading-relaxed">
          <div className="p-3.5 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-1.5">
            <div className="flex items-center justify-between text-rose-300 font-mono text-[11px]">
              <span>Intercepted Action</span>
              <span>{affectedCount} {affectedCount === 1 ? 'Record' : 'Records'}</span>
            </div>
            <p className="text-[#F1F5F9] font-medium text-xs break-words">
              "{targetDescription}"
            </p>
          </div>

          <p>
            Under your Sovereign Data Policy, executing this command triggers an immediate 
            <strong className="text-rose-400 font-mono"> ON DELETE CASCADE</strong> hard-wipe across PostgreSQL.
            Associated contextual graph links, vector embeddings, and attached file blobs will be permanently destroyed.
          </p>

          {requiresPhrase && (
            <div className="pt-1">
              <label className="block text-[11px] text-[#7A8E96] mb-1 font-mono">
                Type <strong className="text-rose-400 font-mono">DELETE_SELECTION</strong> to confirm:
              </label>
              <input
                type="text"
                autoFocus
                value={confirmPhrase}
                onChange={(e) => setConfirmPhrase(e.target.value)}
                placeholder="DELETE_SELECTION"
                className="w-full px-3 py-2 rounded-xl bg-[#132327] border border-rose-500/40 text-sm text-[#F1F5F9] font-mono focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#1B2B30]">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs text-[#7A8E96] hover:text-[#F1F5F9] transition-colors cursor-pointer"
          >
            Cancel & Keep Data
          </button>

          <button
            type="button"
            disabled={requiresPhrase ? confirmPhrase !== 'DELETE_SELECTION' || isDeleting : isDeleting}
            onClick={handleExecute}
            className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? 'Purging Records...' : 'Execute Hard Wipe'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
