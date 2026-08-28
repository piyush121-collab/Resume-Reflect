import React, { useEffect, useState } from 'react';
import { AGENT_STEPS } from '../api/evaluateApi.js';
import { Loader2, CheckCircle2, Clock, ShieldCheck, Sparkles, Brain, Cpu, MessageSquare, Scale, BarChart3 } from 'lucide-react';

const AGENT_ICONS = {
  ingest: Cpu,
  profile: Sparkles,
  technical: Brain,
  hr_culture: MessageSquare,
  skeptic: ShieldCheck,
  hiring_manager: BarChart3,
  debate_chair: Scale,
  comparator: BarChart3,
};

export function LoadingPipeline({ progressInfo }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const percentage = progressInfo?.percentage || 0;
  const currentStepIndex = progressInfo?.stepIndex || 0;

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="glass-panel p-8 rounded-3xl border border-indigo-500/20 shadow-2xl space-y-8">
        {/* Header with Live Timer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 animate-pulse">
              <Loader2 size={24} className="animate-spin" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                Evaluating Candidate Resume
              </h3>
              <p className="text-xs text-slate-400">
                Executing 7 sequential LLM API calls with multi-agent debate & consensus.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/90 px-4 py-2 rounded-xl border border-slate-800 text-xs text-slate-300 font-mono">
            <Clock size={15} className="text-indigo-400" />
            <span>Elapsed: <strong>{elapsedSeconds}s</strong> / ~45s est.</span>
          </div>
        </div>

        {/* Non-Blocking Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-indigo-400 flex items-center gap-1.5">
              <Sparkles size={14} /> Stage {currentStepIndex + 1} of {AGENT_STEPS.length}: {AGENT_STEPS[currentStepIndex]?.name}
            </span>
            <span className="text-slate-300 font-mono">{percentage}%</span>
          </div>
          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* 7 Agent Step Status Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {AGENT_STEPS.map((step, idx) => {
            const Icon = AGENT_ICONS[step.id] || Brain;
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div
                key={step.id}
                className={`p-3.5 rounded-xl border transition-all duration-300 ${
                  isCompleted
                    ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-300'
                    : isCurrent
                    ? 'bg-indigo-600/15 border-indigo-500/50 text-white shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/30'
                    : 'bg-slate-900/40 border-slate-800/80 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Icon size={16} className={isCompleted ? 'text-emerald-400' : isCurrent ? 'text-indigo-400 animate-bounce' : 'text-slate-500'} />
                    <span className="text-xs font-semibold">{step.name}</span>
                  </div>
                  {isCompleted ? (
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                  ) : isCurrent ? (
                    <Loader2 size={15} className="text-indigo-400 animate-spin shrink-0" />
                  ) : (
                    <span className="text-[10px] font-mono text-slate-600">Step {idx + 1}</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-tight">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 text-center">
          <p className="text-xs text-slate-400">
            💡 <strong className="text-slate-300">Why does this take 30-90 seconds?</strong> Each agent (Technical, HR, Skeptic, Hiring Manager, Chair) performs independent evidence verification and cross-examines findings during debate rounds to prevent hallucinated recommendations.
          </p>
        </div>
      </div>
    </div>
  );
}
