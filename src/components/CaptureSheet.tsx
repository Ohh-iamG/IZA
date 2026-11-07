import React, { useState, useRef } from 'react';
import { Mic, Camera, PenLine, FileText, X, Loader2 } from 'lucide-react';

interface CaptureSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onMomentCreated: (moment: { content: string; kind: string; meta?: any }) => void;
  onOpenLiveVoice: () => void;
}

type CaptureMode = 'menu' | 'see' | 'write' | 'add';

export const CaptureSheet: React.FC<CaptureSheetProps> = ({
  isOpen,
  onClose,
  onMomentCreated,
  onOpenLiveVoice,
}) => {
  const [mode, setMode] = useState<CaptureMode>('menu');
  const [textContent, setTextContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setMode('menu');
    setTextContent('');
    setPhotoPreview(null);
    setDocFile(null);
    onClose();
  };

  const handleWriteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textContent.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: textContent.trim(),
          kind: 'thought',
          salience: 0.8,
          meta: { domain: 'personal', capturedVia: 'write' }
        })
      });
      const data = await res.json();
      onMomentCreated({
        content: textContent.trim(),
        kind: 'thought',
        meta: { domain: 'personal', id: data?.item?.id }
      });
      handleClose();
    } catch (err) {
      console.error('Error saving thought moment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setPhotoPreview(evt.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSeeSubmit = async () => {
    if (!photoPreview || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const promptText = textContent.trim() || 'Visual moment captured for IZA life archive';
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `[Visual Moment]: ${promptText}`,
          kind: 'visual',
          salience: 0.85,
          meta: { domain: 'personal', capturedVia: 'see', hasImage: true }
        })
      });
      const data = await res.json();
      onMomentCreated({
        content: `[Visual Moment]: ${promptText}`,
        kind: 'visual',
        meta: { id: data?.item?.id }
      });
      handleClose();
    } catch (err) {
      console.error('Error saving visual moment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocFile(file);
      if (!textContent) {
        setTextContent(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleDocSubmit = async () => {
    if (!docFile || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('document', docFile);
      formData.append('title', textContent.trim() || docFile.name);
      formData.append('domain', 'work');

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      onMomentCreated({
        content: `[Document Ingested]: ${textContent.trim() || docFile.name}`,
        kind: 'document',
        meta: { id: data?.document?.id, fileName: docFile.name }
      });
      handleClose();
    } catch (err) {
      console.error('Error uploading document moment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-md bg-[#0D1B1E] border border-[#1B2B30] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1B2B30]">
          <div>
            <span className="text-[10px] tracking-widest uppercase text-[#94A3B8] font-medium">Capture</span>
            <h3 className="text-lg font-light text-[#E2E8F0] font-display">
              {mode === 'menu' && 'New Moment'}
              {mode === 'see' && 'See & Inspect'}
              {mode === 'write' && 'Write a Thought'}
              {mode === 'add' && 'Add Document'}
            </h3>
          </div>
          <button 
            onClick={handleClose}
            className="p-1.5 rounded-full text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#1B2B30] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Options Only */}
        {mode === 'menu' && (
          <div className="py-6 grid grid-cols-2 gap-3">
            {/* 1. Talk (Gemini Live Voice) */}
            <button
              onClick={() => {
                handleClose();
                onOpenLiveVoice();
              }}
              className="flex flex-col items-start p-4 rounded-2xl bg-[#132327] hover:bg-[#182C31] border border-[#1B2B30] transition-all group text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-[#1B2B30] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform text-[#E2E8F0]">
                <Mic className="w-5 h-5" />
              </div>
              <span className="text-base font-normal text-[#E2E8F0]">Talk</span>
              <span className="text-xs text-[#94A3B8] mt-0.5">Gemini Live Voice</span>
            </button>

            {/* 2. See (Camera & Visual Inspection) */}
            <button
              onClick={() => {
                setMode('see');
                setTimeout(() => fileInputRef.current?.click(), 100);
              }}
              className="flex flex-col items-start p-4 rounded-2xl bg-[#132327] hover:bg-[#182C31] border border-[#1B2B30] transition-all group text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-[#1B2B30] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform text-[#E2E8F0]">
                <Camera className="w-5 h-5" />
              </div>
              <span className="text-base font-normal text-[#E2E8F0]">See</span>
              <span className="text-xs text-[#94A3B8] mt-0.5">Camera & visual</span>
            </button>

            {/* 3. Write (Text & Journal Note Capture) */}
            <button
              onClick={() => setMode('write')}
              className="flex flex-col items-start p-4 rounded-2xl bg-[#132327] hover:bg-[#182C31] border border-[#1B2B30] transition-all group text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-[#1B2B30] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform text-[#E2E8F0]">
                <PenLine className="w-5 h-5" />
              </div>
              <span className="text-base font-normal text-[#E2E8F0]">Write</span>
              <span className="text-xs text-[#94A3B8] mt-0.5">Thought & journal</span>
            </button>

            {/* 4. Add (Document & File Ingestion) */}
            <button
              onClick={() => {
                setMode('add');
                setTimeout(() => docInputRef.current?.click(), 100);
              }}
              className="flex flex-col items-start p-4 rounded-2xl bg-[#132327] hover:bg-[#182C31] border border-[#1B2B30] transition-all group text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-[#1B2B30] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform text-[#E2E8F0]">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-base font-normal text-[#E2E8F0]">Add</span>
              <span className="text-xs text-[#94A3B8] mt-0.5">Document & file</span>
            </button>
          </div>
        )}

        {/* See Form */}
        {mode === 'see' && (
          <div className="py-4 space-y-4">
            <input 
              ref={fileInputRef} 
              type="file" 
              accept="image/*" 
              capture="environment" 
              className="hidden" 
              onChange={handlePhotoSelect} 
            />

            {photoPreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-[#1B2B30] bg-[#132327]">
                <img src={photoPreview} alt="Captured" className="w-full max-h-56 object-cover" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 px-3 py-1 bg-black/60 backdrop-blur rounded-full text-xs text-white"
                >
                  Retake
                </button>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="h-44 border-2 border-dashed border-[#1B2B30] hover:border-[#2DD4BF]/50 rounded-2xl flex flex-col items-center justify-center cursor-pointer bg-[#132327]/40 text-[#94A3B8] hover:text-[#E2E8F0] transition-colors"
              >
                <Camera className="w-8 h-8 mb-2 stroke-1" />
                <span className="text-xs">Tap to take photo or choose image</span>
              </div>
            )}

            <input
              type="text"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Add context or notes (optional)..."
              className="w-full px-4 py-2.5 rounded-xl bg-[#132327] border border-[#1B2B30] text-sm text-[#E2E8F0] placeholder-[#64748B] focus:outline-none focus:border-[#2DD4BF]/50"
            />

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setMode('menu')}
                className="text-xs text-[#94A3B8] hover:text-[#E2E8F0]"
              >
                ← Back
              </button>
              <button
                type="button"
                disabled={!photoPreview || isSubmitting}
                onClick={handleSeeSubmit}
                className="px-5 py-2 rounded-full bg-[#E2E8F0] text-[#0D1B1E] text-sm font-medium hover:bg-white disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Save Moment</span>}
              </button>
            </div>
          </div>
        )}

        {/* Write Form */}
        {mode === 'write' && (
          <form onSubmit={handleWriteSubmit} className="py-4 space-y-4">
            <textarea
              autoFocus
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="What is on your mind? A thought, a milestone, a memory..."
              rows={4}
              className="w-full px-4 py-3 rounded-2xl bg-[#132327] border border-[#1B2B30] text-sm text-[#E2E8F0] placeholder-[#64748B] focus:outline-none focus:border-[#2DD4BF]/50 resize-none font-sans"
            />

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setMode('menu')}
                className="text-xs text-[#94A3B8] hover:text-[#E2E8F0]"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={!textContent.trim() || isSubmitting}
                className="px-5 py-2 rounded-full bg-[#E2E8F0] text-[#0D1B1E] text-sm font-medium hover:bg-white disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Save Moment</span>}
              </button>
            </div>
          </form>
        )}

        {/* Add Document Form */}
        {mode === 'add' && (
          <div className="py-4 space-y-4">
            <input 
              ref={docInputRef} 
              type="file" 
              accept=".pdf,.txt,.md,.doc,.docx" 
              className="hidden" 
              onChange={handleDocSelect} 
            />

            {docFile ? (
              <div className="p-4 rounded-2xl border border-[#1B2B30] bg-[#132327] flex items-center justify-between">
                <div className="flex items-center gap-3 truncate">
                  <FileText className="w-6 h-6 text-[#2DD4BF] flex-shrink-0" />
                  <div className="truncate">
                    <p className="text-sm font-medium text-[#E2E8F0] truncate">{docFile.name}</p>
                    <p className="text-xs text-[#94A3B8]">{(docFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => docInputRef.current?.click()}
                  className="text-xs text-[#2DD4BF] hover:underline flex-shrink-0 ml-2"
                >
                  Change
                </button>
              </div>
            ) : (
              <div 
                onClick={() => docInputRef.current?.click()}
                className="h-36 border-2 border-dashed border-[#1B2B30] hover:border-[#2DD4BF]/50 rounded-2xl flex flex-col items-center justify-center cursor-pointer bg-[#132327]/40 text-[#94A3B8] hover:text-[#E2E8F0] transition-colors"
              >
                <FileText className="w-8 h-8 mb-2 stroke-1" />
                <span className="text-xs">Tap to choose PDF or document</span>
              </div>
            )}

            <input
              type="text"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Document title or description..."
              className="w-full px-4 py-2.5 rounded-xl bg-[#132327] border border-[#1B2B30] text-sm text-[#E2E8F0] placeholder-[#64748B] focus:outline-none focus:border-[#2DD4BF]/50"
            />

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setMode('menu')}
                className="text-xs text-[#94A3B8] hover:text-[#E2E8F0]"
              >
                ← Back
              </button>
              <button
                type="button"
                disabled={!docFile || isSubmitting}
                onClick={handleDocSubmit}
                className="px-5 py-2 rounded-full bg-[#E2E8F0] text-[#0D1B1E] text-sm font-medium hover:bg-white disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Add to Moments</span>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
