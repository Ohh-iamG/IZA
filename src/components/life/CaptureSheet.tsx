import React, { useState, useRef } from 'react';
import { Mic, Camera, PenLine, FileText, X, Loader2, ArrowRight } from 'lucide-react';

interface CaptureSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onMomentCreated: (moment: { content: string; kind: string; meta?: any }) => void;
  onOpenLiveVoice?: () => void;
}

type CaptureMode = 'menu' | 'talk' | 'see' | 'write' | 'add';

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
  const [talkTranscript, setTalkTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setMode('menu');
    setTextContent('');
    setPhotoPreview(null);
    setDocFile(null);
    setTalkTranscript('');
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }
    setIsListening(false);
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

  const startVoiceRecording = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (onOpenLiveVoice) {
        handleClose();
        onOpenLiveVoice();
      }
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let current = '';
      for (let i = 0; i < event.results.length; i++) {
        current += event.results[i][0].transcript + ' ';
      }
      setTalkTranscript(current.trim());
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }
    setIsListening(false);
  };

  const handleTalkSubmit = async () => {
    if (!talkTranscript.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: talkTranscript.trim(),
          kind: 'conversation',
          salience: 0.85,
          meta: { domain: 'personal', capturedVia: 'talk' }
        })
      });
      const data = await res.json();
      onMomentCreated({
        content: talkTranscript.trim(),
        kind: 'conversation',
        meta: { domain: 'personal', id: data?.item?.id }
      });
      handleClose();
    } catch (err) {
      console.error('Error saving talk moment:', err);
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

  const getClientMetadata = async () => {
    let origin_coordinates: { latitude: number; longitude: number } | null = null;
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
        });
        origin_coordinates = {
          latitude: Number(pos.coords.latitude.toFixed(5)),
          longitude: Number(pos.coords.longitude.toFixed(5)),
        };
      } catch (_) {}
    }

    const device_signature = typeof navigator !== 'undefined' 
      ? `${navigator.platform || 'Client'} (${navigator.userAgent ? (navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop') : 'OS'})`
      : 'IZA-Client';

    return {
      timestamp: new Date().toISOString(),
      origin_coordinates,
      device_signature,
    };
  };

  const handleSeeSubmit = async () => {
    if (!photoPreview || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const promptText = textContent.trim() || 'Visual moment captured for IZA life archive';
      const clientMeta = await getClientMetadata();

      // Post to attachments API to run vision OCR and index in PostgreSQL
      const attachRes = await fetch('/api/attachments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: `capture_${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
          fileData: photoPreview,
          note: promptText,
          meta: clientMeta
        })
      });

      const attachData = await attachRes.json().catch(() => null);

      onMomentCreated({
        content: `[Visual Moment]: ${promptText}`,
        kind: 'visual',
        meta: { 
          id: attachData?.memory_id || Date.now(), 
          attachmentId: attachData?.attachment_id,
          imageUrl: photoPreview,
          domain: 'personal',
          ...clientMeta
        }
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
      const clientMeta = await getClientMetadata();
      const formData = new FormData();
      formData.append('file', docFile);
      formData.append('title', textContent.trim() || docFile.name);
      formData.append('domain', 'work');
      formData.append('metadata', JSON.stringify(clientMeta));

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      onMomentCreated({
        content: `[Document Ingested]: ${textContent.trim() || docFile.name}`,
        kind: 'document',
        meta: { 
          id: data?.document?.id || Date.now(), 
          fileName: docFile.name,
          domain: 'work',
          ...clientMeta
        }
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
        {/* Header with quiet title and close button */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1B2B30]">
          <div className="flex items-center gap-2.5">
            <img 
              src="/assets/aistudio/iza_brand_mark.png" 
              alt="Sleek dark-mode mobile device mockup showing the IZA LIFE capture interface with interactive on-demand options for Talk, See, Write, and Add" 
              className="h-6 w-auto object-contain select-none" 
            />
            <div>
              <span className="text-[10px] tracking-widest uppercase text-[#71F5DB] font-mono font-medium">Capture</span>
              <h3 className="text-base font-light text-[#F1F5F9] font-display">
                {mode === 'menu' && 'New Moment'}
                {mode === 'talk' && 'Talk with IZA'}
                {mode === 'see' && 'See & Inspect'}
                {mode === 'write' && 'Write a Thought'}
                {mode === 'add' && 'Add Document'}
              </h3>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="p-1.5 rounded-full text-[#7A8E96] hover:text-[#F1F5F9] hover:bg-[#1B2B30] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Main Sheet Menu: 4 Options Only */}
        {mode === 'menu' && (
          <div className="py-6 grid grid-cols-2 gap-3">
            {/* Talk */}
            <button
              onClick={() => {
                if (onOpenLiveVoice) {
                  handleClose();
                  onOpenLiveVoice();
                } else {
                  setMode('talk');
                }
              }}
              className="flex flex-col items-start p-4 rounded-2xl bg-[#132327] hover:bg-[#182C31] border border-[#1B2B30] transition-all group text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-[#1B2B30] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform text-[#F1F5F9]">
                <Mic className="w-5 h-5" />
              </div>
              <span className="text-base font-normal text-[#F1F5F9]">Talk</span>
              <span className="text-xs text-[#7A8E96] mt-0.5">Voice or conversation</span>
            </button>

            {/* See */}
            <button
              onClick={() => {
                setMode('see');
                setTimeout(() => fileInputRef.current?.click(), 100);
              }}
              className="flex flex-col items-start p-4 rounded-2xl bg-[#132327] hover:bg-[#182C31] border border-[#1B2B30] transition-all group text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-[#1B2B30] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform text-[#F1F5F9]">
                <Camera className="w-5 h-5" />
              </div>
              <span className="text-base font-normal text-[#F1F5F9]">See</span>
              <span className="text-xs text-[#7A8E96] mt-0.5">Photo or inspection</span>
            </button>

            {/* Write */}
            <button
              onClick={() => setMode('write')}
              className="flex flex-col items-start p-4 rounded-2xl bg-[#132327] hover:bg-[#182C31] border border-[#1B2B30] transition-all group text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-[#1B2B30] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform text-[#F1F5F9]">
                <PenLine className="w-5 h-5" />
              </div>
              <span className="text-base font-normal text-[#F1F5F9]">Write</span>
              <span className="text-xs text-[#7A8E96] mt-0.5">Thought or note</span>
            </button>

            {/* Add */}
            <button
              onClick={() => {
                setMode('add');
                setTimeout(() => docInputRef.current?.click(), 100);
              }}
              className="flex flex-col items-start p-4 rounded-2xl bg-[#132327] hover:bg-[#182C31] border border-[#1B2B30] transition-all group text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-[#1B2B30] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform text-[#F1F5F9]">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-base font-normal text-[#F1F5F9]">Add</span>
              <span className="text-xs text-[#7A8E96] mt-0.5">PDF or document</span>
            </button>
          </div>
        )}

        {/* 2. Talk Screen */}
        {mode === 'talk' && (
          <div className="py-4 space-y-4">
            <div className="bg-[#132327] border border-[#1B2B30] rounded-2xl p-4 min-h-[120px] flex flex-col justify-between">
              <textarea
                value={talkTranscript}
                onChange={(e) => setTalkTranscript(e.target.value)}
                placeholder="Speak or type what you would like to remember..."
                rows={3}
                className="w-full bg-transparent text-[#F1F5F9] placeholder-[#5A6E76] focus:outline-none resize-none text-sm"
              />
              <div className="flex items-center justify-between pt-2 border-t border-[#1B2B30]/60 mt-2">
                <button
                  type="button"
                  onClick={isListening ? stopVoiceRecording : startVoiceRecording}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isListening 
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse' 
                      : 'bg-[#1B2B30] text-[#94A3B8] hover:text-[#F1F5F9]'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>{isListening ? 'Listening...' : 'Tap to speak'}</span>
                </button>

                {onOpenLiveVoice && (
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      onOpenLiveVoice();
                    }}
                    className="text-xs text-[#2DD4BF] hover:underline"
                  >
                    Open Live Duplex →
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setMode('menu')}
                className="text-xs text-[#7A8E96] hover:text-[#F1F5F9]"
              >
                ← Back
              </button>
              <button
                type="button"
                disabled={!talkTranscript.trim() || isSubmitting}
                onClick={handleTalkSubmit}
                className="px-5 py-2 rounded-full bg-[#F1F5F9] text-[#0D1B1E] text-sm font-medium hover:bg-white disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Save Moment</span>}
              </button>
            </div>
          </div>
        )}

        {/* 3. See Screen */}
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
                className="h-44 border-2 border-dashed border-[#1B2B30] hover:border-[#2DD4BF]/50 rounded-2xl flex flex-col items-center justify-center cursor-pointer bg-[#132327]/40 text-[#7A8E96] hover:text-[#F1F5F9] transition-colors"
              >
                <Camera className="w-8 h-8 mb-2 stroke-1" />
                <span className="text-xs">Tap to take photo or choose image</span>
              </div>
            )}

            <input
              type="text"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Add a quiet note or context (optional)..."
              className="w-full px-4 py-2.5 rounded-xl bg-[#132327] border border-[#1B2B30] text-sm text-[#F1F5F9] placeholder-[#5A6E76] focus:outline-none focus:border-[#2DD4BF]/50"
            />

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setMode('menu')}
                className="text-xs text-[#7A8E96] hover:text-[#F1F5F9]"
              >
                ← Back
              </button>
              <button
                type="button"
                disabled={!photoPreview || isSubmitting}
                onClick={handleSeeSubmit}
                className="px-5 py-2 rounded-full bg-[#F1F5F9] text-[#0D1B1E] text-sm font-medium hover:bg-white disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Save Moment</span>}
              </button>
            </div>
          </div>
        )}

        {/* 4. Write Screen */}
        {mode === 'write' && (
          <form onSubmit={handleWriteSubmit} className="py-4 space-y-4">
            <textarea
              autoFocus
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="What is on your mind? A thought, a milestone, a memory..."
              rows={4}
              className="w-full px-4 py-3 rounded-2xl bg-[#132327] border border-[#1B2B30] text-sm text-[#F1F5F9] placeholder-[#5A6E76] focus:outline-none focus:border-[#2DD4BF]/50 resize-none font-sans"
            />

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setMode('menu')}
                className="text-xs text-[#7A8E96] hover:text-[#F1F5F9]"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={!textContent.trim() || isSubmitting}
                className="px-5 py-2 rounded-full bg-[#F1F5F9] text-[#0D1B1E] text-sm font-medium hover:bg-white disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Save Moment</span>}
              </button>
            </div>
          </form>
        )}

        {/* 5. Add Document Screen */}
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
                    <p className="text-sm font-medium text-[#F1F5F9] truncate">{docFile.name}</p>
                    <p className="text-xs text-[#7A8E96]">{(docFile.size / 1024).toFixed(1)} KB</p>
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
                className="h-36 border-2 border-dashed border-[#1B2B30] hover:border-[#2DD4BF]/50 rounded-2xl flex flex-col items-center justify-center cursor-pointer bg-[#132327]/40 text-[#7A8E96] hover:text-[#F1F5F9] transition-colors"
              >
                <FileText className="w-8 h-8 mb-2 stroke-1" />
                <span className="text-xs">Tap to choose PDF, manual or document</span>
              </div>
            )}

            <input
              type="text"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Document title or description..."
              className="w-full px-4 py-2.5 rounded-xl bg-[#132327] border border-[#1B2B30] text-sm text-[#F1F5F9] placeholder-[#5A6E76] focus:outline-none focus:border-[#2DD4BF]/50"
            />

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setMode('menu')}
                className="text-xs text-[#7A8E96] hover:text-[#F1F5F9]"
              >
                ← Back
              </button>
              <button
                type="button"
                disabled={!docFile || isSubmitting}
                onClick={handleDocSubmit}
                className="px-5 py-2 rounded-full bg-[#F1F5F9] text-[#0D1B1E] text-sm font-medium hover:bg-white disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1.5"
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
