import React, { useState } from 'react';
import { Users, Plus, Heart, Briefcase, Home, Shield, ChevronRight, X, Clock, MessageSquare, ArrowRight } from 'lucide-react';
import { MomentItem } from './HomeScreen';

export type CircleType = 'Family' | 'Friends' | 'Care' | 'Work';

export interface PersonItem {
  id: number;
  name: string;
  circle: CircleType;
  relationship: string;
  lastMoment?: string;
  momentCount?: number;
}

interface PeopleScreenProps {
  moments: MomentItem[];
  onPersonSelect: (person: PersonItem) => void;
}

export const PeopleScreen: React.FC<PeopleScreenProps> = ({
  moments,
  onPersonSelect,
}) => {
  const [activeCircle, setActiveCircle] = useState<'All' | CircleType>('All');
  const [addPersonModalOpen, setAddPersonModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCircle, setNewCircle] = useState<CircleType>('Family');
  const [newRelationship, setNewRelationship] = useState('Close');

  const [people, setPeople] = useState<PersonItem[]>([
    { id: 1, name: 'Sarah', circle: 'Family', relationship: 'Partner', lastMoment: 'Decided on weekend travel plans', momentCount: 14 },
    { id: 2, name: 'Dr. Evelyn', circle: 'Care', relationship: 'Physician', lastMoment: 'Reviewed annual health checkup results', momentCount: 5 },
    { id: 3, name: 'Marcus', circle: 'Work', relationship: 'Project Lead', lastMoment: 'Discussed architectural boundaries and roadmap', momentCount: 8 },
    { id: 4, name: 'Leo', circle: 'Friends', relationship: 'Close Friend', lastMoment: 'Shared hiking trail route and coffee', momentCount: 6 },
  ]);

  const circles: CircleType[] = ['Family', 'Friends', 'Care', 'Work'];

  const getCircleIcon = (circle: CircleType) => {
    switch (circle) {
      case 'Family': return <Home className="w-3.5 h-3.5" />;
      case 'Friends': return <Heart className="w-3.5 h-3.5" />;
      case 'Care': return <Shield className="w-3.5 h-3.5" />;
      case 'Work': return <Briefcase className="w-3.5 h-3.5" />;
    }
  };

  const filteredPeople = activeCircle === 'All'
    ? people
    : people.filter(p => p.circle === activeCircle);

  const handleAddPerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newPerson: PersonItem = {
      id: Date.now(),
      name: newName.trim(),
      circle: newCircle,
      relationship: newRelationship.trim() || 'Connected',
      lastMoment: 'Added to your circle',
      momentCount: 1,
    };

    setPeople(prev => [newPerson, ...prev]);
    setNewName('');
    setNewRelationship('Close');
    setAddPersonModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] tracking-widest uppercase text-[#7A8E96] font-medium">Relationships</p>
          <h1 className="text-3xl font-light text-[#F1F5F9] font-display mt-1">
            People.
          </h1>
        </div>
        <button
          onClick={() => setAddPersonModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#132327] hover:bg-[#182C31] border border-[#1B2B30] text-xs font-medium text-[#F1F5F9] transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </div>

      {/* Circles Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        <button
          onClick={() => setActiveCircle('All')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
            activeCircle === 'All'
              ? 'bg-[#F1F5F9] text-[#0D1B1E]'
              : 'bg-[#132327] text-[#7A8E96] hover:text-[#F1F5F9] border border-[#1B2B30]'
          }`}
        >
          All Circles
        </button>
        {circles.map((c) => (
          <button
            key={c}
            onClick={() => setActiveCircle(c)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeCircle === c
                ? 'bg-[#F1F5F9] text-[#0D1B1E]'
                : 'bg-[#132327] text-[#7A8E96] hover:text-[#F1F5F9] border border-[#1B2B30]'
            }`}
          >
            {getCircleIcon(c)}
            <span>{c}</span>
          </button>
        ))}
      </div>

      {/* People Short List */}
      <div className="space-y-2.5">
        {filteredPeople.map((p) => (
          <div
            key={p.id}
            onClick={() => onPersonSelect(p)}
            className="p-4 rounded-2xl bg-[#132327]/60 hover:bg-[#132327] border border-[#1B2B30] transition-all cursor-pointer flex items-center justify-between group"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base font-normal text-[#F1F5F9]">{p.name}</span>
                <span className="text-xs text-[#7A8E96]">· {p.relationship}</span>
                <span className="text-[10px] uppercase tracking-wider text-[#5A6E76] px-2 py-0.5 rounded-full bg-[#1B2B30]">
                  {p.circle}
                </span>
              </div>
              <p className="text-xs text-[#7A8E96] line-clamp-1">
                {p.lastMoment}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#5A6E76]">
              <span>{p.momentCount} moments</span>
              <ChevronRight className="w-4 h-4 text-[#7A8E96] group-hover:text-[#F1F5F9] group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        ))}
      </div>

      {/* Add Person Modal */}
      {addPersonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#0D1B1E] border border-[#1B2B30] rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1B2B30] pb-3">
              <div>
                <span className="text-[10px] tracking-widest uppercase text-[#7A8E96] font-medium">New Person</span>
                <h3 className="text-lg font-light text-[#F1F5F9] font-display">Add to Circle</h3>
              </div>
              <button
                onClick={() => setAddPersonModalOpen(false)}
                className="p-1 rounded-full text-[#7A8E96] hover:text-[#F1F5F9]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPerson} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs text-[#7A8E96] mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Maya"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#132327] border border-[#1B2B30] text-sm text-[#F1F5F9] focus:outline-none focus:border-[#2DD4BF]/50"
                />
              </div>

              <div>
                <label className="block text-xs text-[#7A8E96] mb-1">Relationship</label>
                <input
                  type="text"
                  value={newRelationship}
                  onChange={(e) => setNewRelationship(e.target.value)}
                  placeholder="e.g. Sister, Colleague, Doctor"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#132327] border border-[#1B2B30] text-sm text-[#F1F5F9] focus:outline-none focus:border-[#2DD4BF]/50"
                />
              </div>

              <div>
                <label className="block text-xs text-[#7A8E96] mb-1">Circle</label>
                <select
                  value={newCircle}
                  onChange={(e) => setNewCircle(e.target.value as CircleType)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#132327] border border-[#1B2B30] text-sm text-[#F1F5F9] focus:outline-none focus:border-[#2DD4BF]/50"
                >
                  <option value="Family">Family</option>
                  <option value="Friends">Friends</option>
                  <option value="Care">Care</option>
                  <option value="Work">Work</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setAddPersonModalOpen(false)}
                  className="px-4 py-2 text-xs text-[#7A8E96] hover:text-[#F1F5F9]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#F1F5F9] text-[#0D1B1E] text-xs font-medium hover:bg-white transition-all cursor-pointer"
                >
                  Save Person
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
