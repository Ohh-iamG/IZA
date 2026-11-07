import React, { useState } from 'react';
import { X, Shield, Lock, Trash2, CheckCircle2, ExternalLink, Scale, FileText, Mail } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'architecture' | 'storage' | 'erasure' | 'consumer'>('all');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
      <div 
        className="w-full max-w-2xl bg-[#0B1012] border border-[#303737] rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col max-h-[90vh] text-[#F3F6F5] relative font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#1D2A2D]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#151E21] border border-[#71F5DB]/30 text-[#71F5DB]">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] tracking-widest uppercase font-mono text-[#71F5DB]">
                Store Compliance · WA Surveillance Act
              </span>
              <h2 className="text-xl font-semibold text-[#F3F6F5] font-display">
                Privacy &amp; Sovereign Data Policy
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#96A3A1] hover:text-[#F3F6F5] hover:bg-[#151E21] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Navigation */}
        <div className="flex items-center gap-2 py-3 border-b border-[#1D2A2D] overflow-x-auto text-xs font-mono">
          {[
            { id: 'all', label: 'Complete Policy' },
            { id: 'architecture', label: '1. Architecture' },
            { id: 'storage', label: '2. Storage Mechanics' },
            { id: 'erasure', label: '3. Data Erasure' },
            { id: 'consumer', label: '4. Consumer Bounds' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1 rounded-full whitespace-nowrap transition cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#71F5DB] text-[#06201B] font-semibold'
                  : 'bg-[#151E21] text-[#96A3A1] hover:text-[#F3F6F5] border border-[#303737]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Policy Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6 text-sm text-[#96A3A1] leading-relaxed pr-2">
          {/* Metadata pill */}
          <div className="p-3 bg-[#151E21] border border-[#303737] rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <span><strong>Effective Date:</strong> 6 November 2026</span>
            <span><strong>Jurisdiction:</strong> Western Australia</span>
            <span className="text-[#71F5DB]">Private by Design</span>
          </div>

          {(activeTab === 'all' || activeTab === 'architecture') && (
            <section className="space-y-3">
              <h3 className="text-base font-semibold text-[#F3F6F5] flex items-center gap-2">
                <span className="text-[#71F5DB] font-mono">1.</span> Core Architecture &amp; "Private by Design" Promise
              </h3>
              <p>
                Unlike traditional applications that actively track user identities or sell behavioral metrics, <strong>IZA LIFE</strong> is built around absolute user agency.
              </p>
              <ul className="list-disc pl-5 space-y-2 text-[#F3F6F5]">
                <li>
                  <strong>User-Initiated Processing Only:</strong> IZA LIFE does not deploy unsolicited background tracking, continuous location mapping, or covert ambient listening. The ecosystem only processes multimedia inputs (audio transcripts, screenshots, or files) when you explicitly tap a capture control button.
                </li>
                <li>
                  <strong>No Marketing or Analytics Tracking:</strong> We maintain a strict zero third-party telemetry standard. This application contains zero advertising SDKs, tracking pixels, or third-party analytic brokers.
                </li>
              </ul>
            </section>
          )}

          {(activeTab === 'all' || activeTab === 'storage') && (
            <section className="space-y-3">
              <h3 className="text-base font-semibold text-[#F3F6F5] flex items-center gap-2">
                <span className="text-[#71F5DB] font-mono">2.</span> Information Ingestion &amp; Storage Mechanics
              </h3>
              <p>
                When you deliberately capture elements into your life, the data is stratified across distinct secure layers:
              </p>
              <div className="space-y-3">
                <div className="p-3.5 bg-[#151E21] border border-[#303737] rounded-2xl space-y-1">
                  <h4 className="font-semibold text-[#71F5DB] text-xs uppercase font-mono flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Episodic Memories &amp; Vector Space
                  </h4>
                  <p className="text-xs text-[#96A3A1]">
                    Text notes, structural descriptions, and voice transcripts are transmitted securely via encrypted HTTPS/WebSockets to our cloud database. For fast semantic search, mathematical representations (768-dimension vector embeddings) are used. These records are strictly isolated on a per-user basis using database Row-Level Security (RLS). Your data can never leak to or be viewed by other accounts.
                  </p>
                </div>

                <div className="p-3.5 bg-[#151E21] border border-[#71F5DB]/40 rounded-2xl space-y-1">
                  <h4 className="font-semibold text-[#71F5DB] text-xs uppercase font-mono flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> The Continuity Vault (Zero-Knowledge)
                  </h4>
                  <p className="text-xs text-[#96A3A1]">
                    Highly sensitive text notes, gate codes, or private credentials are side-encrypted directly on your client device using <strong>AES-256-GCM</strong>. The encryption keys are derived entirely on your device using a locally held passphrase via key-stretching functions (PBKDF2/Argon2id). Plaintext data from your Vault is never sent to cloud servers, never indexed in vector space, and can never be decrypted by IZA LIFE infrastructure.
                  </p>
                </div>

                <div className="p-3.5 bg-[#151E21] border border-[#303737] rounded-2xl space-y-1">
                  <h4 className="font-semibold text-[#71F5DB] text-xs uppercase font-mono flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5" /> On-Demand AI Voice Processing
                  </h4>
                  <p className="text-xs text-[#96A3A1]">
                    Spoken entries via the "Talk" function or hands-free voice sessions utilize Google Cloud APIs (including the Gemini Live API) for real-time model interaction and memory synthesis. All processing is governed under Google Generative AI Additional Terms of Service. Your private inputs are fully isolated and are never used to train global public foundation models.
                  </p>
                </div>
              </div>
            </section>
          )}

          {(activeTab === 'all' || activeTab === 'erasure') && (
            <section className="space-y-3">
              <h3 className="text-base font-semibold text-[#F3F6F5] flex items-center gap-2">
                <span className="text-[#71F5DB] font-mono">3.</span> Absolute Data Erasure &amp; WA Surveillance Act Compliance
              </h3>
              <p>
                In strict compliance with Western Australia privacy standards (Surveillance Devices Act 1998) and surveillance boundaries:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-[#F3F6F5]">
                <li>
                  <strong>Visual Confirmation Steps:</strong> To protect you from accidental data loss through misread voice commands, any administrative instruction that alters or purges your records (e.g., "iza forget") strictly requires a secondary manual confirmation step before executing.
                </li>
                <li>
                  <strong>Sovereign Deletion Cascades:</strong> When you choose to purge a moment or delete your account, our system initiates an irreversible cascading purge. This completely deletes all associated text files, graph entity edges, vector embeddings, and binary assets from both cloud databases and local browser caches (IndexedDB).
                </li>
                <li>
                  <strong>Identity Control:</strong> You retain the explicit right to wipe your entire profile and data history instantly from the application settings menu at any time.
                </li>
              </ul>
            </section>
          )}

          {(activeTab === 'all' || activeTab === 'consumer') && (
            <section className="space-y-3">
              <h3 className="text-base font-semibold text-[#F3F6F5] flex items-center gap-2">
                <span className="text-[#71F5DB] font-mono">4.</span> Consumer Boundaries Under Australian Consumer Law (ACL)
              </h3>
              <ul className="list-disc pl-5 space-y-2 text-[#F3F6F5]">
                <li>
                  <strong>Non-Diagnostic Tooling Status:</strong> IZA LIFE is exclusively an automated self-reflection, personal memory care, and wellness journaling companion. It is not a licensed medical provider, clinical health tracker, or emergency crisis communication channel.
                </li>
                <li>
                  <strong>No Safety Monitoring Liability:</strong> The application does not monitor your physical location, health baselines, or real-time personal safety. Missed user routines do not trigger automated emergency welfare alerts or dispatch actions.
                </li>
              </ul>
            </section>
          )}

          {/* Section 5: Contact Infrastructure */}
          <section className="pt-4 border-t border-[#1D2A2D] space-y-2">
            <h3 className="text-sm font-semibold text-[#F3F6F5] flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#71F5DB]" /> Contact &amp; Sovereign Compliance Infrastructure
            </h3>
            <p className="text-xs">
              For technical inquiries regarding cryptographic keys, localized encryption standards, or complete account purges, reach out directly to our sovereign compliance node:
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs font-mono">
              <a href="mailto:privacy@izalife.app" className="text-[#71F5DB] hover:underline flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> privacy@izalife.app
              </a>
              <span className="text-[#303737]">·</span>
              <a href="https://izalife.app" target="_blank" rel="noreferrer" className="text-[#71F5DB] hover:underline flex items-center gap-1">
                <ExternalLink className="w-3.5 h-3.5" /> https://izalife.app
              </a>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[#1D2A2D] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-[#96A3A1] font-mono text-[11px]">
              © 2026 IZA LIFE · EARTH-I ABN 15 698 220 692
            </span>
            <a 
              href="/privacy.html" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-1 text-[#71F5DB] hover:underline font-mono text-[11px]"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Web HTML</span>
            </a>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[#71F5DB] hover:bg-[#5ae6cb] text-[#06201B] font-semibold text-xs transition cursor-pointer"
          >
            Close Policy
          </button>
        </div>
      </div>
    </div>
  );
}
