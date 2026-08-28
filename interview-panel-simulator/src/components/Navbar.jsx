import React from 'react';
import { Users, Sparkles, RefreshCw, Cpu } from 'lucide-react';

export function Navbar({ onReset, hasResults }) {
  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <Users size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">
                Interview Panel Simulator
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full uppercase">
                7 AI Agents
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Multi-Persona AI Debate & Non-Averaged Consensus Evaluation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
            <Cpu size={14} className="text-indigo-400" />
            <span>Pipeline: <strong>7 Sequential Models</strong></span>
          </div>

          {hasResults && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg transition border border-slate-700"
            >
              <RefreshCw size={14} />
              Evaluate Another Candidate
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
