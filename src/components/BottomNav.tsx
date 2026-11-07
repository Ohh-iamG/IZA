import React from 'react';
import { Plus } from 'lucide-react';

export type TabType = 'home' | 'recall' | 'people' | 'me';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onOpenCapture: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenCapture,
}) => {
  return (
    <nav 
      aria-label="Main Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#0D1B1E]/95 backdrop-blur-md border-t border-[#1B2B30] px-4 py-2 pb-safe"
    >
      <div className="max-w-md mx-auto flex items-center justify-between relative">
        {/* 1. IZA (Home) */}
        <button
          onClick={() => onTabChange('home')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors cursor-pointer ${
            activeTab === 'home' ? 'text-[#E2E8F0]' : 'text-[#94A3B8] hover:text-[#CBD5E1]'
          }`}
        >
          <span className="font-display tracking-wide text-xs font-medium">IZA</span>
          <span className={`w-1 h-1 rounded-full mt-1 transition-all ${
            activeTab === 'home' ? 'bg-[#E2E8F0]' : 'bg-transparent'
          }`} />
        </button>

        {/* 2. Recall */}
        <button
          onClick={() => onTabChange('recall')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors cursor-pointer ${
            activeTab === 'recall' ? 'text-[#E2E8F0]' : 'text-[#94A3B8] hover:text-[#CBD5E1]'
          }`}
        >
          <span className="font-sans text-xs">Recall</span>
          <span className={`w-1 h-1 rounded-full mt-1 transition-all ${
            activeTab === 'recall' ? 'bg-[#E2E8F0]' : 'bg-transparent'
          }`} />
        </button>

        {/* 3. ＋ (Raised, glowing mint aqua center button) */}
        <div className="flex-1 flex items-center justify-center -mt-6">
          <button
            onClick={onOpenCapture}
            aria-label="Capture Moment"
            className="w-14 h-14 rounded-full bg-[#2DD4BF] text-[#0D1B1E] flex items-center justify-center shadow-[0_0_24px_rgba(45,212,191,0.55)] hover:shadow-[0_0_32px_rgba(45,212,191,0.75)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-7 h-7 stroke-[2.5]" />
          </button>
        </div>

        {/* 4. People */}
        <button
          onClick={() => onTabChange('people')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors cursor-pointer ${
            activeTab === 'people' ? 'text-[#E2E8F0]' : 'text-[#94A3B8] hover:text-[#CBD5E1]'
          }`}
        >
          <span className="font-sans text-xs">People</span>
          <span className={`w-1 h-1 rounded-full mt-1 transition-all ${
            activeTab === 'people' ? 'bg-[#E2E8F0]' : 'bg-transparent'
          }`} />
        </button>

        {/* 5. Me */}
        <button
          onClick={() => onTabChange('me')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors cursor-pointer ${
            activeTab === 'me' ? 'text-[#E2E8F0]' : 'text-[#94A3B8] hover:text-[#CBD5E1]'
          }`}
        >
          <span className="font-sans text-xs">Me</span>
          <span className={`w-1 h-1 rounded-full mt-1 transition-all ${
            activeTab === 'me' ? 'bg-[#E2E8F0]' : 'bg-transparent'
          }`} />
        </button>
      </div>
    </nav>
  );
};
