import React from 'react';
import { Sparkles, Compass, Plus, Users, User } from 'lucide-react';

export type LifeTab = 'home' | 'recall' | 'people' | 'me';

interface BottomNavigationProps {
  activeTab: LifeTab;
  onTabChange: (tab: LifeTab) => void;
  onOpenCapture: () => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabChange,
  onOpenCapture,
}) => {
  return (
    <nav 
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#0D1B1E]/95 backdrop-blur-md border-t border-[#1B2B30] px-4 py-2 pb-safe"
    >
      <div className="max-w-md mx-auto flex items-center justify-between relative">
        {/* 1. IZA (Home) */}
        <button
          onClick={() => onTabChange('home')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors cursor-pointer ${
            activeTab === 'home' ? 'text-[#F1F5F9]' : 'text-[#7A8E96] hover:text-[#B0C0C6]'
          }`}
        >
          <span className="font-display tracking-wide text-xs font-medium">IZA</span>
          <span className={`w-1 h-1 rounded-full mt-1 transition-all ${
            activeTab === 'home' ? 'bg-[#F1F5F9]' : 'bg-transparent'
          }`} />
        </button>

        {/* 2. Recall */}
        <button
          onClick={() => onTabChange('recall')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors cursor-pointer ${
            activeTab === 'recall' ? 'text-[#F1F5F9]' : 'text-[#7A8E96] hover:text-[#B0C0C6]'
          }`}
        >
          <span className="font-sans text-xs">Recall</span>
          <span className={`w-1 h-1 rounded-full mt-1 transition-all ${
            activeTab === 'recall' ? 'bg-[#F1F5F9]' : 'bg-transparent'
          }`} />
        </button>

        {/* 3. ＋ (Raised, glowing Neon Aqua #71F5DB, centre) */}
        <div className="flex-1 flex items-center justify-center -mt-6">
          <button
            onClick={onOpenCapture}
            aria-label="Capture Moment"
            style={{ backgroundColor: '#71F5DB' }}
            className="w-14 h-14 rounded-full text-[#0D1B1E] flex items-center justify-center shadow-[0_0_26px_rgba(113,245,219,0.6)] hover:shadow-[0_0_36px_rgba(113,245,219,0.85)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-7 h-7 stroke-[2.5]" />
          </button>
        </div>

        {/* 4. People */}
        <button
          onClick={() => onTabChange('people')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors cursor-pointer ${
            activeTab === 'people' ? 'text-[#F1F5F9]' : 'text-[#7A8E96] hover:text-[#B0C0C6]'
          }`}
        >
          <span className="font-sans text-xs">People</span>
          <span className={`w-1 h-1 rounded-full mt-1 transition-all ${
            activeTab === 'people' ? 'bg-[#F1F5F9]' : 'bg-transparent'
          }`} />
        </button>

        {/* 5. Me */}
        <button
          onClick={() => onTabChange('me')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors cursor-pointer ${
            activeTab === 'me' ? 'text-[#F1F5F9]' : 'text-[#7A8E96] hover:text-[#B0C0C6]'
          }`}
        >
          <span className="font-sans text-xs">Me</span>
          <span className={`w-1 h-1 rounded-full mt-1 transition-all ${
            activeTab === 'me' ? 'bg-[#F1F5F9]' : 'bg-transparent'
          }`} />
        </button>
      </div>
    </nav>
  );
};
