import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Volume2,
  Database,
  Cpu,
  Layers,
  Search,
  Upload,
  Trash2,
  Copy,
  Check,
  Play,
  Loader2,
  Sparkles,
  RefreshCw,
  Clock,
  Radio,
  Sliders,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { apiFetch } from '../lib/api';

interface GeminiPlatformSuiteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'files' | 'tts' | 'caching' | 'tokens' | 'embeddings' | 'batches' | 'search';

export function GeminiPlatformSuiteModal({ isOpen, onClose }: GeminiPlatformSuiteModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('files');
  const [loading, setLoading] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 1. Files API State
  const [filesList, setFilesList] = useState<any[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  // 2. TTS / Voices State
  const [ttsMode, setTtsMode] = useState<'single' | 'multi'>('multi');
  const [ttsVoice, setTtsVoice] = useState('Kore');
  const [ttsStyle, setTtsStyle] = useState('warm and articulate');
  const [ttsSingleText, setTtsSingleText] = useState('Welcome to IZA Life. Your sovereign memory vault is active.');
  const [ttsTurns, setTtsTurns] = useState([
    { speaker: 'Dr. Anya', voice: 'Kore', style: 'whispered urgently', text: 'Wait... <short pause> look under that fallen log! Is that a blue-spotted salamander?' },
    { speaker: 'Liam', voice: 'Puck', style: 'warm and enthusiastic', text: '<gasp> No way! <laugh> We\'ve been searching for this species all season!' }
  ]);
  const [synthesizedAudioUrl, setSynthesizedAudioUrl] = useState<string | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  // 3. Caching State
  const [cachesList, setCachesList] = useState<any[]>([]);
  const [cacheName, setCacheName] = useState('sovereign_identity_cache');
  const [cacheTtl, setCacheTtl] = useState('300s');
  const [cacheContent, setCacheContent] = useState('IZA Sovereign Assistant System Identity: Always enforce row-level memory isolation.');
  const [isCreatingCache, setIsCreatingCache] = useState(false);

  // 4. Token Counter State
  const [tokenText, setTokenText] = useState('The person should experience the memory, not the memory system. Never narrate the database or retrieval queries.');
  const [tokenModel, setTokenModel] = useState('gemini-3.8-flash');
  const [tokenResult, setTokenResult] = useState<{ totalTokens: number; totalBillableCharacters: number } | null>(null);
  const [isCountingTokens, setIsCountingTokens] = useState(false);

  // 5. Embeddings State
  const [embedText, setEmbedText] = useState('Memory: Visited family in Perth on sunny weekend.');
  const [embedResult, setEmbedResult] = useState<number[] | null>(null);
  const [isEmbedding, setIsEmbedding] = useState(false);

  // 6. Batch API State
  const [batchesList, setBatchesList] = useState<any[]>([]);

  // 7. File Search Grounding State
  const [searchQuery, setSearchQuery] = useState('What maintenance procedure is required for hydraulic filter #3?');
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const notify = (msg: string, isError = false) => {
    if (isError) {
      setErrorNotice(msg);
      setTimeout(() => setErrorNotice(null), 4000);
    } else {
      setSuccessNotice(msg);
      setTimeout(() => setSuccessNotice(null), 3000);
    }
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  // Load initial data based on active tab
  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === 'files') fetchFiles();
    if (activeTab === 'caching') fetchCaches();
    if (activeTab === 'batches') fetchBatches();
  }, [isOpen, activeTab]);

  // Fetch Files
  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/gemini/files');
      const data = await res.json();
      setFilesList(data.files || []);
    } catch (e: any) {
      notify(e.message || 'Failed to fetch files', true);
    } finally {
      setLoading(false);
    }
  };

  // Upload to Gemini Files API
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('displayName', file.name);

    try {
      const res = await apiFetch('/api/gemini/files/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      notify(`Uploaded "${file.name}" to Gemini Files API`);
      fetchFiles();
    } catch (err: any) {
      notify(err.message, true);
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  // Delete Gemini File
  const handleDeleteFile = async (name: string) => {
    try {
      const res = await apiFetch(`/api/gemini/files/${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      notify('File deleted from Gemini API');
      fetchFiles();
    } catch (err: any) {
      notify(err.message, true);
    }
  };

  // Fetch Caches
  const fetchCaches = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/gemini/caching');
      const data = await res.json();
      setCachesList(data.caches || []);
    } catch (e: any) {
      notify(e.message || 'Failed to fetch caches', true);
    } finally {
      setLoading(false);
    }
  };

  // Create Cache
  const handleCreateCache = async () => {
    if (!cacheContent.trim()) return;
    setIsCreatingCache(true);
    try {
      const res = await apiFetch('/api/gemini/caching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-3.8-flash',
          displayName: cacheName,
          ttl: cacheTtl,
          contents: cacheContent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cache creation failed');
      notify('Context pinned in Gemini cache successfully');
      fetchCaches();
    } catch (err: any) {
      notify(err.message, true);
    } finally {
      setIsCreatingCache(false);
    }
  };

  // Delete Cache
  const handleDeleteCache = async (name: string) => {
    try {
      const res = await apiFetch(`/api/gemini/caching/${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete cache failed');
      notify('Cache removed');
      fetchCaches();
    } catch (err: any) {
      notify(err.message, true);
    }
  };

  // Synthesize Speech with gemini-3.8-flash-tts
  const handleSynthesizeTTS = async () => {
    setIsSynthesizing(true);
    setSynthesizedAudioUrl(null);
    try {
      const payload: any = {
        model: ttsMode === 'multi' ? 'gemini-3.8-flash-tts' : 'gemini-3.8-flash-lite-tts',
      };

      if (ttsMode === 'multi') {
        payload.speakers = [
          { speaker: ttsTurns[0].speaker, voice: ttsTurns[0].voice },
          { speaker: ttsTurns[1].speaker, voice: ttsTurns[1].voice }
        ];
        payload.turns = ttsTurns;
      } else {
        payload.text = ttsSingleText;
        payload.voice = ttsVoice;
        payload.style = ttsStyle;
      }

      const res = await apiFetch('/api/gemini/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'TTS synthesis failed');

      if (data.audio) {
        const audioUrl = `data:audio/wav;base64,${data.audio}`;
        setSynthesizedAudioUrl(audioUrl);
        notify('Speech synthesized successfully!');
      }
    } catch (err: any) {
      notify(err.message, true);
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Count Tokens
  const handleCountTokens = async () => {
    if (!tokenText.trim()) return;
    setIsCountingTokens(true);
    try {
      const res = await apiFetch('/api/gemini/tokens/count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: tokenText,
          model: tokenModel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Token calculation failed');
      setTokenResult({
        totalTokens: data.totalTokens,
        totalBillableCharacters: data.totalBillableCharacters,
      });
      notify(`Counted ${data.totalTokens} tokens`);
    } catch (err: any) {
      notify(err.message, true);
    } finally {
      setIsCountingTokens(false);
    }
  };

  // Generate Embeddings
  const handleGenerateEmbeddings = async () => {
    if (!embedText.trim()) return;
    setIsEmbedding(true);
    try {
      const res = await apiFetch('/api/gemini/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: embedText,
          model: 'gemini-embedding-2-preview',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Embedding generation failed');
      const emb = data.embeddings?.[0]?.values || data.embeddings?.[0] || [];
      setEmbedResult(Array.isArray(emb) ? emb : []);
      notify(`Generated ${emb.length || 768}-dim vector embedding`);
    } catch (err: any) {
      notify(err.message, true);
    } finally {
      setIsEmbedding(false);
    }
  };

  // Fetch Batches
  const fetchBatches = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/gemini/batches');
      const data = await res.json();
      setBatchesList(data.batches || []);
    } catch (e: any) {
      notify(e.message || 'Failed to list batch jobs', true);
    } finally {
      setLoading(false);
    }
  };

  // Run File Search Grounding
  const handleFileSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResult(null);
    try {
      const res = await apiFetch('/api/gemini/file-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          fileUris: filesList.map((f) => f.uri).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'File search failed');
      setSearchResult(data.answer);
      notify('Search grounded in documents');
    } catch (err: any) {
      notify(err.message, true);
    } finally {
      setIsSearching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 font-mono animate-in fade-in duration-150">
      <div className="bg-[#151E21] border border-[#303737] rounded-xl w-full max-w-4xl flex flex-col shadow-2xl max-h-[92vh] overflow-hidden text-xs text-[#F3F6F5]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-[#303737] bg-[#0B1012]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#71F5DB]/15 text-[#71F5DB] border border-[#71F5DB]/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-wide text-[#F3F6F5] flex items-center gap-2">
                <span>GEMINI PLATFORM SUITE</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#71F5DB]/20 text-[#71F5DB] border border-[#71F5DB]/40 uppercase">
                  @google/genai v2.32
                </span>
              </div>
              <p className="text-[10px] text-[#96A3A1] font-sans">
                Native endpoints for Files API, Voices (TTS), Context Caching, Tokens, Embeddings, Batches &amp; File Search
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#96A3A1] hover:text-[#F3F6F5] rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notices */}
        {successNotice && (
          <div className="px-3.5 py-1.5 bg-emerald-950/80 border-b border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successNotice}</span>
          </div>
        )}
        {errorNotice && (
          <div className="px-3.5 py-1.5 bg-red-950/80 border-b border-red-500/50 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorNotice}</span>
          </div>
        )}

        {/* Nav Tabs Bar */}
        <div className="flex items-center gap-1 p-2 bg-[#0B1012] border-b border-[#303737] overflow-x-auto select-none">
          <button
            onClick={() => setActiveTab('files')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer shrink-0 ${
              activeTab === 'files'
                ? 'bg-[#151E21] text-[#71F5DB] border border-[#71F5DB]/40 font-bold'
                : 'text-[#96A3A1] hover:text-[#F3F6F5]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Files API</span>
            {filesList.length > 0 && (
              <span className="text-[10px] bg-[#71F5DB]/15 px-1.5 rounded-full text-[#71F5DB]">
                {filesList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('tts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer shrink-0 ${
              activeTab === 'tts'
                ? 'bg-[#151E21] text-[#71F5DB] border border-[#71F5DB]/40 font-bold'
                : 'text-[#96A3A1] hover:text-[#F3F6F5]'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Voices &amp; TTS</span>
          </button>

          <button
            onClick={() => setActiveTab('caching')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer shrink-0 ${
              activeTab === 'caching'
                ? 'bg-[#151E21] text-[#71F5DB] border border-[#71F5DB]/40 font-bold'
                : 'text-[#96A3A1] hover:text-[#F3F6F5]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Caching</span>
            {cachesList.length > 0 && (
              <span className="text-[10px] bg-[#71F5DB]/15 px-1.5 rounded-full text-[#71F5DB]">
                {cachesList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('tokens')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer shrink-0 ${
              activeTab === 'tokens'
                ? 'bg-[#151E21] text-[#71F5DB] border border-[#71F5DB]/40 font-bold'
                : 'text-[#96A3A1] hover:text-[#F3F6F5]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Token Counter</span>
          </button>

          <button
            onClick={() => setActiveTab('embeddings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer shrink-0 ${
              activeTab === 'embeddings'
                ? 'bg-[#151E21] text-[#71F5DB] border border-[#71F5DB]/40 font-bold'
                : 'text-[#96A3A1] hover:text-[#F3F6F5]'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Embeddings</span>
          </button>

          <button
            onClick={() => setActiveTab('batches')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer shrink-0 ${
              activeTab === 'batches'
                ? 'bg-[#151E21] text-[#71F5DB] border border-[#71F5DB]/40 font-bold'
                : 'text-[#96A3A1] hover:text-[#F3F6F5]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Batch API</span>
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer shrink-0 ${
              activeTab === 'search'
                ? 'bg-[#151E21] text-[#71F5DB] border border-[#71F5DB]/40 font-bold'
                : 'text-[#96A3A1] hover:text-[#F3F6F5]'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>File Search</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* TAB 1: FILES API */}
          {activeTab === 'files' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-[#0B1012] rounded-xl border border-[#303737]">
                <div>
                  <h3 className="font-bold text-[#F3F6F5] text-xs uppercase font-mono">
                    Files API (POST /v1beta/files)
                  </h3>
                  <p className="text-[11px] text-[#96A3A1] font-sans">
                    Upload and manage large audio, image, video, and documents to reuse across prompts without repeated transfers.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-[#71F5DB] hover:bg-[#5ae0c7] text-[#0D1B1E] font-bold text-xs rounded-lg transition cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingFile ? 'UPLOADING...' : 'UPLOAD MEDIA FILE'}</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                    />
                  </label>
                  <button
                    onClick={fetchFiles}
                    className="p-1.5 text-[#96A3A1] hover:text-[#F3F6F5] rounded border border-[#303737] hover:bg-slate-800 transition cursor-pointer"
                    title="Refresh file list"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {filesList.length === 0 ? (
                <div className="py-12 text-center text-[#96A3A1] space-y-2">
                  <FileText className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-xs text-[#F3F6F5]">No Files Uploaded to Gemini Yet</p>
                  <p className="text-[11px] max-w-sm mx-auto">
                    Upload PDF manuals, audio recordings, schematics, or video clips to persist on the Gemini API storage.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filesList.map((file) => (
                    <div
                      key={file.name}
                      className="p-3 bg-[#0B1012] rounded-xl border border-[#303737] flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[#F3F6F5] text-xs truncate">
                            {file.displayName || file.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-[#71F5DB] border border-[#303737]">
                            {file.mimeType}
                          </span>
                          <span className="text-[10px] text-[#96A3A1]">
                            {file.sizeBytes ? `${(file.sizeBytes / 1024).toFixed(1)} KB` : ''}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#96A3A1] font-mono truncate mt-1 flex items-center gap-2">
                          <span>URI: {file.uri}</span>
                          <button
                            onClick={() => copyText(file.uri, file.name)}
                            className="text-[#71F5DB] hover:underline cursor-pointer"
                          >
                            {copiedKey === file.name ? 'Copied URI' : 'Copy URI'}
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteFile(file.name)}
                        className="p-1.5 text-slate-500 hover:text-red-400 transition cursor-pointer"
                        title="Delete file from Gemini Files API"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: VOICES & TTS */}
          {activeTab === 'tts' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#0B1012] rounded-xl border border-[#303737]">
                <h3 className="font-bold text-[#F3F6F5] text-xs uppercase font-mono">
                  Gemini 3.8 Flash TTS &amp; Multi-Speaker Dialogue
                </h3>
                <p className="text-[11px] text-[#96A3A1] font-sans mt-0.5">
                  Dual-speaker voice config (`speech_config.speakers`), turn annotations (`speech_metadata.style`), and in-line vocal tags (`&lt;short pause&gt;`, `&lt;gasp&gt;`, `&lt;laugh&gt;`).
                </p>
              </div>

              {/* Mode Switcher */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTtsMode('multi')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                    ttsMode === 'multi'
                      ? 'bg-[#71F5DB] text-[#0D1B1E] font-bold'
                      : 'bg-[#0B1012] text-[#96A3A1] border border-[#303737]'
                  }`}
                >
                  Dual-Speaker Screenplay (gemini-3.8-flash-tts)
                </button>
                <button
                  onClick={() => setTtsMode('single')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                    ttsMode === 'single'
                      ? 'bg-[#71F5DB] text-[#0D1B1E] font-bold'
                      : 'bg-[#0B1012] text-[#96A3A1] border border-[#303737]'
                  }`}
                >
                  Single Speaker Voice (gemini-3.8-flash-lite-tts)
                </button>
              </div>

              {ttsMode === 'multi' ? (
                <div className="space-y-3">
                  {ttsTurns.map((turn, idx) => (
                    <div key={idx} className="p-3 bg-[#0B1012] rounded-xl border border-[#303737] space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#71F5DB] text-xs font-mono">
                          Speaker {idx + 1}: {turn.speaker} ({turn.voice})
                        </span>
                        <input
                          type="text"
                          value={turn.style}
                          onChange={(e) => {
                            const updated = [...ttsTurns];
                            updated[idx].style = e.target.value;
                            setTtsTurns(updated);
                          }}
                          placeholder="Style (e.g. whispered urgently)"
                          className="bg-[#151E21] border border-[#303737] px-2 py-1 text-[11px] rounded text-[#F3F6F5] font-mono w-48"
                        />
                      </div>
                      <textarea
                        value={turn.text}
                        onChange={(e) => {
                          const updated = [...ttsTurns];
                          updated[idx].text = e.target.value;
                          setTtsTurns(updated);
                        }}
                        rows={2}
                        className="w-full bg-[#151E21] border border-[#303737] rounded-lg p-2 text-xs text-[#F3F6F5] font-mono focus:outline-none focus:border-[#71F5DB]"
                      />
                    </div>
                  ))}

                  {/* Vocal Burst Tag Injectors */}
                  <div className="flex items-center gap-1.5 text-[10px] text-[#96A3A1] flex-wrap">
                    <span>Quick tags:</span>
                    {['<short pause>', '<laugh>', '<gasp>', '<sigh>', '<breath>'].map((tag) => (
                      <button
                        key={tag}
                        onClick={() => {
                          const updated = [...ttsTurns];
                          updated[1].text += ` ${tag}`;
                          setTtsTurns(updated);
                        }}
                        className="px-2 py-0.5 bg-[#0B1012] border border-[#303737] rounded hover:border-[#71F5DB] text-[#71F5DB] transition cursor-pointer"
                      >
                        +{tag}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 bg-[#0B1012] p-3 rounded-xl border border-[#303737]">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-[#96A3A1]">Voice Persona</label>
                      <select
                        value={ttsVoice}
                        onChange={(e) => setTtsVoice(e.target.value)}
                        className="w-full bg-[#151E21] border border-[#303737] p-2 rounded text-xs text-[#F3F6F5] mt-1"
                      >
                        <option value="Kore">Kore (Clear, Professional)</option>
                        <option value="Puck">Puck (Bright, Friendly)</option>
                        <option value="Fenrir">Fenrir (Authoritative, Deep)</option>
                        <option value="Aoede">Aoede (Warm, Expressive)</option>
                        <option value="Zephyr">Zephyr (Neutral, Fast)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-[#96A3A1]">Turn Style Delivery</label>
                      <input
                        type="text"
                        value={ttsStyle}
                        onChange={(e) => setTtsStyle(e.target.value)}
                        className="w-full bg-[#151E21] border border-[#303737] p-2 rounded text-xs text-[#F3F6F5] mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#96A3A1]">Transcript Text</label>
                    <textarea
                      value={ttsSingleText}
                      onChange={(e) => setTtsSingleText(e.target.value)}
                      rows={2}
                      className="w-full bg-[#151E21] border border-[#303737] rounded-lg p-2 text-xs text-[#F3F6F5] font-mono mt-1"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSynthesizeTTS}
                  disabled={isSynthesizing}
                  className="px-4 py-2 bg-[#71F5DB] hover:bg-[#5ae0c7] disabled:opacity-50 text-[#0D1B1E] font-bold text-xs rounded-lg transition cursor-pointer flex items-center gap-1.5"
                >
                  {isSynthesizing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>SYNTHESIZING (24kHz WAV)...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>SYNTHESIZE SPEECH WITH GEMINI TTS</span>
                    </>
                  )}
                </button>

                {synthesizedAudioUrl && (
                  <audio controls autoPlay src={synthesizedAudioUrl} className="h-8 flex-1" />
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CONTEXT CACHING */}
          {activeTab === 'caching' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#0B1012] rounded-xl border border-[#303737]">
                <h3 className="font-bold text-[#F3F6F5] text-xs uppercase font-mono">
                  Context Caching API (POST /v1beta/cachedContents)
                </h3>
                <p className="text-[11px] text-[#96A3A1] font-sans mt-0.5">
                  Pin shared prompt instructions and system context to reduce repeated input token consumption and cost.
                </p>
              </div>

              {/* Cache Creation Form */}
              <div className="p-3 bg-[#0B1012] rounded-xl border border-[#303737] space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#96A3A1]">Display Name</label>
                    <input
                      type="text"
                      value={cacheName}
                      onChange={(e) => setCacheName(e.target.value)}
                      className="w-full bg-[#151E21] border border-[#303737] p-2 rounded text-xs text-[#F3F6F5] mt-1 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#96A3A1]">TTL Duration (e.g. 300s, 3600s)</label>
                    <input
                      type="text"
                      value={cacheTtl}
                      onChange={(e) => setCacheTtl(e.target.value)}
                      className="w-full bg-[#151E21] border border-[#303737] p-2 rounded text-xs text-[#F3F6F5] mt-1 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[#96A3A1]">Shared Context / Tokens to Pin</label>
                  <textarea
                    value={cacheContent}
                    onChange={(e) => setCacheContent(e.target.value)}
                    rows={3}
                    className="w-full bg-[#151E21] border border-[#303737] rounded-lg p-2 text-xs text-[#F3F6F5] font-mono mt-1"
                  />
                </div>

                <button
                  onClick={handleCreateCache}
                  disabled={isCreatingCache}
                  className="px-4 py-2 bg-[#71F5DB] hover:bg-[#5ae0c7] disabled:opacity-50 text-[#0D1B1E] font-bold text-xs rounded-lg transition cursor-pointer flex items-center gap-1.5"
                >
                  {isCreatingCache ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Layers className="w-3.5 h-3.5" />
                  )}
                  <span>PIN CONTEXT CACHE</span>
                </button>
              </div>

              {/* Active Caches List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-[#96A3A1]">
                  <span>Active Pinned Caches ({cachesList.length})</span>
                  <button onClick={fetchCaches} className="hover:text-[#71F5DB]">
                    Refresh
                  </button>
                </div>
                {cachesList.length === 0 ? (
                  <p className="text-[11px] text-[#96A3A1] italic">No active caches currently pinned.</p>
                ) : (
                  cachesList.map((c) => (
                    <div
                      key={c.name}
                      className="p-3 bg-[#0B1012] rounded-xl border border-[#303737] flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-bold text-[#F3F6F5] text-xs font-mono">{c.displayName || c.name}</div>
                        <div className="text-[10px] text-[#96A3A1] mt-0.5">
                          Model: {c.model} &bull; Expires: {c.expireTime || 'Standard TTL'}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteCache(c.name)}
                        className="p-1.5 text-slate-500 hover:text-red-400 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: TOKEN COUNTER */}
          {activeTab === 'tokens' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#0B1012] rounded-xl border border-[#303737]">
                <h3 className="font-bold text-[#F3F6F5] text-xs uppercase font-mono">
                  Token Counter API (POST /v1beta/models/countTokens)
                </h3>
                <p className="text-[11px] text-[#96A3A1] font-sans mt-0.5">
                  Accurately count input tokens and compute costs before dispatching requests.
                </p>
              </div>

              <div className="p-3 bg-[#0B1012] rounded-xl border border-[#303737] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-[#96A3A1]">Target Model</label>
                  <select
                    value={tokenModel}
                    onChange={(e) => setTokenModel(e.target.value)}
                    className="bg-[#151E21] border border-[#303737] p-1.5 rounded text-xs text-[#F3F6F5] font-mono"
                  >
                    <option value="gemini-3.8-flash">gemini-3.8-flash</option>
                    <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite</option>
                    <option value="gemini-4-argon">gemini-4-argon</option>
                  </select>
                </div>

                <textarea
                  value={tokenText}
                  onChange={(e) => setTokenText(e.target.value)}
                  rows={4}
                  className="w-full bg-[#151E21] border border-[#303737] rounded-lg p-2 text-xs text-[#F3F6F5] font-mono"
                />

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={handleCountTokens}
                    disabled={isCountingTokens}
                    className="px-4 py-2 bg-[#71F5DB] hover:bg-[#5ae0c7] disabled:opacity-50 text-[#0D1B1E] font-bold text-xs rounded-lg transition cursor-pointer flex items-center gap-1.5"
                  >
                    {isCountingTokens ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cpu className="w-3.5 h-3.5" />}
                    <span>CALCULATE TOKENS</span>
                  </button>

                  {tokenResult && (
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div>
                        <span className="text-[#96A3A1]">Total Tokens: </span>
                        <span className="text-[#71F5DB] font-bold text-sm">{tokenResult.totalTokens}</span>
                      </div>
                      <div>
                        <span className="text-[#96A3A1]">Billable Chars: </span>
                        <span className="text-slate-200">{tokenResult.totalBillableCharacters}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: EMBEDDINGS */}
          {activeTab === 'embeddings' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#0B1012] rounded-xl border border-[#303737]">
                <h3 className="font-bold text-[#F3F6F5] text-xs uppercase font-mono">
                  Embeddings API (POST /v1beta/models/:embedContent)
                </h3>
                <p className="text-[11px] text-[#96A3A1] font-sans mt-0.5">
                  Generate vector embeddings using `gemini-embedding-2-preview` for semantic memory retrieval and clustering.
                </p>
              </div>

              <div className="p-3 bg-[#0B1012] rounded-xl border border-[#303737] space-y-3">
                <textarea
                  value={embedText}
                  onChange={(e) => setEmbedText(e.target.value)}
                  rows={3}
                  className="w-full bg-[#151E21] border border-[#303737] rounded-lg p-2 text-xs text-[#F3F6F5] font-mono"
                />

                <button
                  onClick={handleGenerateEmbeddings}
                  disabled={isEmbedding}
                  className="px-4 py-2 bg-[#71F5DB] hover:bg-[#5ae0c7] disabled:opacity-50 text-[#0D1B1E] font-bold text-xs rounded-lg transition cursor-pointer flex items-center gap-1.5"
                >
                  {isEmbedding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                  <span>GENERATE VECTOR EMBEDDING</span>
                </button>

                {embedResult && (
                  <div className="p-3 bg-[#151E21] rounded-lg border border-[#303737] space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#71F5DB] font-bold font-mono">
                        Vector Dimensions: {embedResult.length}
                      </span>
                      <button
                        onClick={() => copyText(JSON.stringify(embedResult), 'embedding')}
                        className="text-xs text-[#96A3A1] hover:text-[#71F5DB] cursor-pointer"
                      >
                        {copiedKey === 'embedding' ? 'Copied Vector' : 'Copy Vector Array'}
                      </button>
                    </div>
                    <p className="text-[10px] text-[#96A3A1] font-mono truncate">
                      [{embedResult.slice(0, 8).map((v) => v.toFixed(5)).join(', ')}, ...]
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: BATCH API */}
          {activeTab === 'batches' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#0B1012] rounded-xl border border-[#303737]">
                <h3 className="font-bold text-[#F3F6F5] text-xs uppercase font-mono">
                  Batch API (POST /v1beta/batches)
                </h3>
                <p className="text-[11px] text-[#96A3A1] font-sans mt-0.5">
                  Submit asynchronous content generation and embedding jobs at lower cost.
                </p>
              </div>

              <div className="p-3 bg-[#0B1012] rounded-xl border border-[#303737] space-y-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span>Active Batch Operations</span>
                  <button onClick={fetchBatches} className="text-[#71F5DB] hover:underline cursor-pointer">
                    Refresh
                  </button>
                </div>
                {batchesList.length === 0 ? (
                  <div className="py-8 text-center text-[#96A3A1] space-y-1">
                    <Clock className="w-6 h-6 mx-auto text-slate-600" />
                    <p className="text-xs text-slate-300">No active batch jobs</p>
                    <p className="text-[11px]">Asynchronous bulk embedding and processing tasks appear here.</p>
                  </div>
                ) : (
                  batchesList.map((b) => (
                    <div key={b.name} className="p-3 bg-[#151E21] rounded-lg border border-[#303737]">
                      <div className="font-bold text-xs">{b.displayName || b.name}</div>
                      <div className="text-[10px] text-[#96A3A1]">{b.state || 'SUBMITTED'}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 7: FILE SEARCH GROUNDING */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#0B1012] rounded-xl border border-[#303737]">
                <h3 className="font-bold text-[#F3F6F5] text-xs uppercase font-mono">
                  File Search &amp; Retrieval Grounding
                </h3>
                <p className="text-[11px] text-[#96A3A1] font-sans mt-0.5">
                  Chunk, index, and query uploaded documents in the Gemini Files API for managed retrieval grounding.
                </p>
              </div>

              <div className="p-3 bg-[#0B1012] rounded-xl border border-[#303737] space-y-3">
                <div>
                  <label className="text-[10px] text-[#96A3A1]">Search / Question Query</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#151E21] border border-[#303737] p-2 rounded text-xs text-[#F3F6F5] font-mono mt-1"
                  />
                </div>

                <div className="text-[10px] text-[#96A3A1]">
                  Connected files in Gemini storage: {filesList.length} files available for grounding.
                </div>

                <button
                  onClick={handleFileSearch}
                  disabled={isSearching}
                  className="px-4 py-2 bg-[#71F5DB] hover:bg-[#5ae0c7] disabled:opacity-50 text-[#0D1B1E] font-bold text-xs rounded-lg transition cursor-pointer flex items-center gap-1.5"
                >
                  {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>GROUND QUERY IN DOCUMENTS</span>
                </button>

                {searchResult && (
                  <div className="p-3 bg-[#151E21] rounded-xl border border-[#71F5DB]/40 space-y-1">
                    <span className="text-[10px] uppercase font-mono text-[#71F5DB] font-bold">
                      Grounded Response
                    </span>
                    <p className="text-xs text-[#F3F6F5] leading-relaxed whitespace-pre-wrap font-sans">
                      {searchResult}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#303737] bg-[#0B1012] flex items-center justify-between text-xs">
          <span className="text-[10px] text-[#96A3A1] font-mono">
            Powered by Google GenAI SDK &bull; Server-side Proxied
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-[#151E21] hover:bg-slate-800 text-slate-300 rounded-lg border border-[#303737] transition cursor-pointer"
          >
            CLOSE
          </button>
        </div>

      </div>
    </div>
  );
}
