import React, { useState } from 'react';
import { MessageSquare, ArrowRight, RefreshCw, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

export function DebateViewer({ debateTurns = [] }) {
  const [selectedRound, setSelectedRound] = useState('all');
  const [expandedTurn, setExpandedTurn] = useState(null);

  if (!debateTurns || debateTurns.length === 0) return null;

  const rounds = [...new Set(debateTurns.map(t => t.round))];
  const filteredTurns = selectedRound === 'all' ? debateTurns : debateTurns.filter(t => t.round === Number(selectedRound));

  // Identify moments where an agent revised their opinion
  const opinionChanges = debateTurns.filter(t => t.stance === 'revise_own_opinion' || t.updated_recommendation);

  return (
    <div className="space-y-6 pt-4">
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <MessageSquare className="text-indigo-400" size={22} /> Multi-Agent Debate Transcript
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live sequential cross-examination across {rounds.length || 2} debate rounds.
            </p>
          </div>

          {/* Filter by Round */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Round:</span>
            <button
              onClick={() => setSelectedRound('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                selectedRound === 'all' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              All
            </button>
            {rounds.map(r => (
              <button
                key={r}
                onClick={() => setSelectedRound(String(r))}
                className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                  selectedRound === String(r) ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                Round {r}
              </button>
            ))}
          </div>
        </div>

        {/* Opinion Change Log Summary Table */}
        {opinionChanges.length > 0 && (
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-2">
              <RefreshCw size={15} className="text-indigo-400 animate-spin-slow" /> Opinion Change Log (Debate Proof)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-indigo-500/20 text-[11px] text-indigo-300 uppercase tracking-wider">
                    <th className="py-2 px-3">Round</th>
                    <th className="py-2 px-3">Agent</th>
                    <th className="py-2 px-3">Stance Action</th>
                    <th className="py-2 px-3">Updated Recommendation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-500/10 font-mono text-[11px]">
                  {opinionChanges.map((change, idx) => (
                    <tr key={idx} className="hover:bg-indigo-500/5">
                      <td className="py-2 px-3">Round {change.round}</td>
                      <td className="py-2 px-3 capitalize font-bold text-white">{change.agent.replace('_', ' ')}</td>
                      <td className="py-2 px-3 text-amber-400 font-semibold">{change.stance.replace(/_/g, ' ')}</td>
                      <td className="py-2 px-3 text-emerald-400 font-bold">{change.updated_recommendation || 'Revised Confidence'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Debate Turn Timeline */}
        <div className="space-y-4 relative">
          <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-slate-800 hidden sm:block" />

          {filteredTurns.map((turn, index) => {
            const isExpanded = expandedTurn === index;
            const isRevision = turn.stance === 'revise_own_opinion';

            return (
              <div key={index} className="relative sm:pl-12">
                {/* Timeline node */}
                <div className={`absolute left-4 top-4 w-4 h-4 rounded-full border-2 transform -translate-x-1/2 hidden sm:block ${
                  isRevision ? 'bg-amber-500 border-amber-300 animate-pulse' : 'bg-slate-900 border-indigo-500'
                }`} />

                <div className={`p-5 rounded-2xl border transition-all ${
                  isRevision
                    ? 'bg-slate-900/90 border-amber-500/40 shadow-lg shadow-amber-500/5'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-indigo-400 border border-slate-700">
                        R{turn.round} · Turn {index + 1}
                      </span>
                      <h4 className="text-sm font-bold text-white capitalize">
                        {turn.agent.replace('_', ' ')}
                      </h4>
                      {turn.responds_to_agent && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <ArrowRight size={12} /> responds to <strong className="text-slate-200 capitalize">{turn.responds_to_agent.replace('_', ' ')}</strong>
                        </span>
                      )}
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      turn.stance === 'agree_and_reinforce'
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                        : turn.stance === 'disagree_with_rebuttal'
                        ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                        : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                    }`}>
                      {turn.stance.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed font-sans mt-2">
                    "{turn.message}"
                  </p>

                  {turn.evidence && (
                    <div className="mt-3 p-3 bg-slate-950/80 rounded-xl border border-slate-850 text-[11px] font-mono text-slate-400">
                      <strong className="text-indigo-400 block mb-0.5">Cited Evidence:</strong>
                      "{turn.evidence}"
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
