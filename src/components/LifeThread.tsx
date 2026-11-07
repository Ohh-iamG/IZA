import React, { useState } from 'react';
import { Clock, Plus, ChevronRight, X, Home, Heart, Shield, Briefcase } from 'lucide-react';

export type CircleType = 'Family' | 'Friends' | 'Care' | 'Work';

export interface PersonRecord {
  id: number;
  name: string;
  circle: CircleType;
  relationship: string;
  lastMoment?: string;
  momentCount?: number;
}

export interface MomentRecord {
  id: number;
  content: string;
  summary?: string;
  kind: string;
  capturedAt: string;
  meta?: any;
}

interface LifeThreadProps {
  moments: MomentRecord[];
  onAddMomentWithPerson?: (personName: string, text: string) => void;
}

export const LifeThread: React.FC<LifeThreadProps> = ({
  moments,
  onAddMomentWithPerson,
}) => {
  const [activeCircle, setActiveCircle] = useState<'All' | CircleType>('All');
  const [selectedPerson, setSelectedPerson] = useState<PersonRecord | null>(null);
  const [addPersonModalOpen, setAddPersonModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCircle, setNewCircle] = useState<CircleType>('Family');
  const [newRelationship, setNewRelationship] = useState('Close');
  const [newMomentText, setNewMomentText] = useState('');
  const [isAddingMoment, setIsAddingMoment] = useState(false);

  const [people, setPeople] = useState<PersonRecord[]>([
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

  // Moments for selected person
  const personMoments = selectedPerson 
    ? moments.filter(m => 
        m.content.toLowerCase().includes(selectedPerson.name.toLowerCase()) ||
        m.summary?.toLowerCase().includes(selectedPerson.name.toLowerCase())
      )
    : [];

  const handleAddPerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newPerson: PersonRecord = {
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

  const handleSaveMoment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMomentText.trim() || !selectedPerson) return;
    onAddMomentWithPerson?.(selectedPerson.name, newMomentText.trim());
    setNewMomentText('');
    setIsAddingMoment(false);
  };

  return (
    <div className="space-y-6">
      {/* People Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] tracking-widest uppercase text-[#94A3B8] font-medium">Relationships</p>
          <h1 className="text-3xl font-light text-[#E2E8F0] font-display mt-1">
            People.
          </h1>
        </div>
        <button
          onClick={() => setAddPersonModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#132327] hover:bg-[#182C31] border border-[#1B2B30] text-xs font-medium text-[#E2E8F0] transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </div>

      {/* Circle Filters: Family, Friends, Care, Work */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        <button
          onClick={() => setActiveCircle('All')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
            activeCircle === 'All'
              ? 'bg-[#E2E8F0] text-[#0D1B1E]'
              : 'bg-[#132327] text-[#94A3B8] hover:text-[#E2E8F0] border border-[#1B2B30]'
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
                ? 'bg-[#E2E8F0] text-[#0D1B1E]'
                : 'bg-[#132327] text-[#94A3B8] hover:text-[#E2E8F0] border border-[#1B2B30]'
            }`}
          >
            {getCircleIcon(c)}
            <span>{c}</span>
          </button>
        ))}
      </div>

      {/* Short List: Clicking opens the chronological Life Thread */}
      <div className="space-y-2.5">
        {filteredPeople.map((person) => (
          <div
            key={person.id}
            onClick={() => setSelectedPerson(person)}
            className="p-4 rounded-2xl bg-[#132327]/60 hover:bg-[#132327] border border-[#1B2B30] transition-all cursor-pointer flex items-center justify-between group"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base font-normal text-[#E2E8F0]">{person.name}</span>
                <span className="text-xs text-[#94A3B8]">· {person.relationship}</span>
                <span className="text-[10px] uppercase tracking-wider text-[#64748B] px-2 py-0.5 rounded-full bg-[#1B2B30]">
                  {person.circle}
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] line-clamp-1">
                {person.lastMoment}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#64748B]">
              <span>{person.momentCount} moments</span>
              <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#E2E8F0] group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        ))}
      </div>

      {/* Selected Person Life Thread Timeline Modal */}
      {selectedPerson && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
          <div 
            className="w-full max-w-lg bg-[#0D1B1E] border border-[#1B2B30] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[88vh] flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#1B2B30] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] tracking-widest uppercase text-[#94A3B8] font-medium">Life Thread</span>
                  <span className="text-[10px] uppercase tracking-wider text-[#64748B] px-2 py-0.5 rounded-full bg-[#1B2B30]">
                    {selectedPerson.circle}
                  </span>
                </div>
                <h2 className="text-2xl font-light text-[#E2E8F0] font-display mt-0.5">
                  {selectedPerson.name}
                </h2>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  {selectedPerson.relationship} · Timeline of shared moments
                </p>
              </div>
              <button
                onClick={() => setSelectedPerson(null)}
                className="p-1.5 rounded-full text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#1B2B30] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Timeline View */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {isAddingMoment ? (
                <form onSubmit={handleSaveMoment} className="p-4 rounded-2xl bg-[#132327] border border-[#1B2B30] space-y-3">
                  <textarea
                    autoFocus
                    value={newMomentText}
                    onChange={(e) => setNewMomentText(e.target.value)}
                    placeholder={`What happened with ${selectedPerson.name}? A conversation, shared plan, or milestone...`}
                    rows={3}
                    className="w-full bg-transparent text-sm text-[#E2E8F0] placeholder-[#64748B] focus:outline-none resize-none font-sans"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingMoment(false)}
                      className="px-3 py-1.5 text-xs text-[#94A3B8] hover:text-[#E2E8F0]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!newMomentText.trim()}
                      className="px-4 py-1.5 rounded-full bg-[#E2E8F0] text-[#0D1B1E] text-xs font-medium hover:bg-white disabled:opacity-40 transition-all cursor-pointer"
                    >
                      Save to Thread
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setIsAddingMoment(true)}
                  className="w-full py-2.5 px-4 rounded-2xl border border-dashed border-[#1B2B30] hover:border-[#2DD4BF]/50 text-xs text-[#94A3B8] hover:text-[#E2E8F0] transition-all flex items-center justify-center gap-2 cursor-pointer bg-[#132327]/30"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add moment with {selectedPerson.name}</span>
                </button>
              )}

              {/* Chronological Timeline */}
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-[#1B2B30]">
                {/* Milestone 1 */}
                <div className="relative space-y-1">
                  <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#2DD4BF] ring-4 ring-[#0D1B1E]" />
                  <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                    <Clock className="w-3 h-3" />
                    <span>Recent Connection</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#132327]/80 border border-[#1B2B30] space-y-1">
                    <p className="text-sm text-[#E2E8F0] font-light leading-relaxed">
                      {selectedPerson.lastMoment}
                    </p>
                  </div>
                </div>

                {/* Additional moments */}
                {personMoments.map((m) => (
                  <div key={m.id} className="relative space-y-1">
                    <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#94A3B8] ring-4 ring-[#0D1B1E]" />
                    <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(m.capturedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[#132327]/80 border border-[#1B2B30] space-y-1">
                      <p className="text-sm text-[#E2E8F0] font-light leading-relaxed">
                        {m.summary || m.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Person Modal */}
      {addPersonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#0D1B1E] border border-[#1B2B30] rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1B2B30] pb-3">
              <div>
                <span className="text-[10px] tracking-widest uppercase text-[#94A3B8] font-medium">New Person</span>
                <h3 className="text-lg font-light text-[#E2E8F0] font-display">Add to Circle</h3>
              </div>
              <button
                onClick={() => setAddPersonModalOpen(false)}
                className="p-1 rounded-full text-[#94A3B8] hover:text-[#E2E8F0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPerson} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs text-[#94A3B8] mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Maya"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#132327] border border-[#1B2B30] text-sm text-[#E2E8F0] focus:outline-none focus:border-[#2DD4BF]/50"
                />
              </div>

              <div>
                <label className="block text-xs text-[#94A3B8] mb-1">Relationship</label>
                <input
                  type="text"
                  value={newRelationship}
                  onChange={(e) => setNewRelationship(e.target.value)}
                  placeholder="e.g. Sister, Colleague, Doctor"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#132327] border border-[#1B2B30] text-sm text-[#E2E8F0] focus:outline-none focus:border-[#2DD4BF]/50"
                />
              </div>

              <div>
                <label className="block text-xs text-[#94A3B8] mb-1">Circle</label>
                <select
                  value={newCircle}
                  onChange={(e) => setNewCircle(e.target.value as CircleType)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#132327] border border-[#1B2B30] text-sm text-[#E2E8F0] focus:outline-none focus:border-[#2DD4BF]/50"
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
                  className="px-4 py-2 text-xs text-[#94A3B8] hover:text-[#E2E8F0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#E2E8F0] text-[#0D1B1E] text-xs font-medium hover:bg-white transition-all cursor-pointer"
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
