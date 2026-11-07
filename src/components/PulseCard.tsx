import React, { useState } from 'react';
import { Check, ArrowRight } from 'lucide-react';

export type PulseState = 'NOW' | 'TODAY' | 'NEXT' | 'ATTENTION';

interface PulseCardProps {
  momentCount: number;
  onContinueAction?: (prompt: string) => void;
}

export const PulseCard: React.FC<PulseCardProps> = ({
  momentCount,
  onContinueAction,
}) => {
  const [activeState, setActiveState] = useState<PulseState>('NOW');
  const states: PulseState[] = ['NOW', 'TODAY', 'NEXT', 'ATTENTION'];

  return (
    <div className="bg-[#132327] border border-[#1B2B30] rounded-3xl p-6 shadow-sm">
      {/* State Switcher Bar */}
      <div className="flex items-center justify-between border-b border-[#1B2B30] pb-3 mb-4">
        <div className="flex items-center gap-4">
          {states.map((state) => (
            <button
              key={state}
              onClick={() => setActiveState(state)}
              className={`text-xs font-medium uppercase tracking-wider transition-colors cursor-pointer relative pb-1 ${
                activeState === state ? 'text-[#E2E8F0]' : 'text-[#64748B] hover:text-[#94A3B8]'
              }`}
            >
              {state}
              {activeState === state && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#E2E8F0] rounded-full" />
              )}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-[#64748B] font-mono tracking-wider">PULSE</span>
      </div>

      {/* State Content */}
      {activeState === 'NOW' && (
        <div className="space-y-3">
          <p className="text-base text-[#E2E8F0] font-light leading-relaxed">
            Your space is calm and grounded. Every thought or note you capture is securely linked in your sovereign store.
          </p>
          <div className="flex items-center gap-2 pt-2 text-xs text-[#94A3B8]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>IZA is listening and ready</span>
          </div>
        </div>
      )}

      {activeState === 'TODAY' && (
        <div className="space-y-3">
          <p className="text-sm text-[#E2E8F0] font-light leading-relaxed">
            {momentCount > 0 
              ? `You have ${momentCount} moments anchored in your archive today. Keep your pace steady and restorative.`
              : 'No moments captured yet today. Tap ＋ below to write a thought or talk with IZA.'}
          </p>
          <div className="flex items-center gap-4 pt-1 text-xs text-[#94A3B8]">
            <span>3 core focus items</span>
            <span>·</span>
            <span>Daily rhythm aligned</span>
          </div>
        </div>
      )}

      {activeState === 'NEXT' && (
        <div className="space-y-3">
          <p className="text-sm text-[#E2E8F0] font-light leading-relaxed">
            Upcoming: Evening reflection window. Clear open loops and store thoughts securely overnight.
          </p>
          <div className="pt-1">
            <button
              onClick={() => onContinueAction?.('What are my upcoming priorities and open loops?')}
              className="inline-flex items-center gap-1.5 text-xs text-[#E2E8F0] hover:underline cursor-pointer"
            >
              <span>Review priorities with IZA</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {activeState === 'ATTENTION' && (
        <div className="space-y-3">
          <p className="text-sm text-[#E2E8F0] font-light leading-relaxed">
            No urgent alerts. Personal data isolation and safety guardrails are active and verified.
          </p>
          <div className="flex items-center gap-2 text-xs text-emerald-400/90 pt-1">
            <Check className="w-3.5 h-3.5" />
            <span>PostgreSQL tenant security verified</span>
          </div>
        </div>
      )}
    </div>
  );
};
