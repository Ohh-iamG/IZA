import React from 'react';
import { X, Clock, MessageSquare, Trash2, ArrowRight, Sparkles, MapPin, Laptop, FileText, Image as ImageIcon, ExternalLink, GitBranch } from 'lucide-react';
import { MomentItem } from './HomeScreen';

interface MomentDetailModalProps {
  moment: MomentItem | null;
  onClose: () => void;
  onDeleteMoment: (id: number) => void;
  onContinueFromMoment: (content: string) => void;
  onOpenInThread?: (moment: MomentItem) => void;
}

export const MomentDetailModal: React.FC<MomentDetailModalProps> = ({
  moment,
  onClose,
  onDeleteMoment,
  onContinueFromMoment,
  onOpenInThread,
}) => {
  if (!moment) return null;

  const imageUrl = moment.meta?.imageUrl || (moment.kind === 'visual' && moment.meta?.raw_storage_url ? moment.meta.raw_storage_url : null);
  const isDocument = moment.kind === 'document' || Boolean(moment.meta?.fileName);
  const fileName = moment.meta?.fileName || 'Document File';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
      <div 
        className="w-full max-w-lg bg-[#0D1B1E] border border-[#1B2B30] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1B2B30] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] tracking-widest uppercase text-[#7A8E96] font-medium">Shared Detail View</span>
            <span className="text-xs text-[#5A6E76]">·</span>
            <span className="text-xs font-mono capitalize text-[#2DD4BF]">
              {moment.kind.replace('_', ' ')}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#7A8E96] hover:text-[#F1F5F9] cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visual Asset Preview if image */}
        {imageUrl && (
          <div className="rounded-2xl overflow-hidden border border-[#1B2B30] bg-[#091214]">
            <img 
              src={imageUrl} 
              alt={moment.summary || moment.content} 
              className="w-full max-h-72 object-cover object-center"
            />
          </div>
        )}

        {/* Document Asset Preview if document */}
        {isDocument && (
          <div className="p-4 rounded-2xl bg-[#132327] border border-[#1B2B30] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1B2B30] flex items-center justify-center text-[#2DD4BF]">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#F1F5F9] truncate max-w-[200px] sm:max-w-xs">{fileName}</p>
                <p className="text-[11px] text-[#7A8E96]">Parsed & Vector Indexed</p>
              </div>
            </div>
            {moment.meta?.raw_storage_url && (
              <a
                href={moment.meta.raw_storage_url}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg bg-[#1B2B30] hover:bg-[#25383E] text-xs text-[#F1F5F9] flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open</span>
              </a>
            )}
          </div>
        )}

        {/* Content Body */}
        <div className="space-y-3 py-1">
          <p className="text-base text-[#F1F5F9] font-light leading-relaxed whitespace-pre-wrap">
            {moment.content}
          </p>

          {moment.summary && (
            <div className="p-3.5 rounded-2xl bg-[#132327] border border-[#1B2B30] space-y-1">
              <span className="text-[10px] tracking-widest uppercase text-[#2DD4BF] font-medium">Synthesized Summary</span>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                {moment.summary}
              </p>
            </div>
          )}

          {/* Client Metadata Header Tags */}
          <div className="pt-2 border-t border-[#1B2B30] space-y-1.5 text-[11px] text-[#7A8E96]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#5A6E76]" />
                <span className="font-mono">{new Date(moment.capturedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </div>
              {moment.meta?.domain && (
                <span className="font-mono capitalize text-[#5A6E76]">Domain: {moment.meta.domain}</span>
              )}
            </div>

            {moment.meta?.origin_coordinates && (
              <div className="flex items-center gap-1.5 font-mono text-[#5A6E76]">
                <MapPin className="w-3.5 h-3.5 text-[#2DD4BF]" />
                <span>
                  Coordinates: {moment.meta.origin_coordinates.latitude}°N, {moment.meta.origin_coordinates.longitude}°E
                </span>
              </div>
            )}

            {moment.meta?.device_signature && (
              <div className="flex items-center gap-1.5 font-mono text-[#5A6E76]">
                <Laptop className="w-3.5 h-3.5 text-[#7A8E96]" />
                <span className="truncate">Device: {moment.meta.device_signature}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-[#1B2B30]">
          <button
            type="button"
            onClick={() => {
              onDeleteMoment(moment.id);
              onClose();
            }}
            className="p-2 text-[#7A8E96] hover:text-rose-400 rounded-lg transition-colors flex items-center gap-1.5 text-xs cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>

          <div className="flex items-center gap-2">
            {onOpenInThread && (
              <button
                type="button"
                onClick={() => {
                  onOpenInThread(moment);
                  onClose();
                }}
                className="px-3 py-2 rounded-xl bg-[#1B2B30] hover:bg-[#25383E] text-xs text-[#F1F5F9] font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <GitBranch className="w-3.5 h-3.5 text-[#2DD4BF]" />
                <span>Life Thread</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onContinueFromMoment(moment.content);
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-[#F1F5F9] text-[#0D1B1E] text-xs font-medium hover:bg-white transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Continue with IZA</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
