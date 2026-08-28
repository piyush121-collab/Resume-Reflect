import React from 'react';
import { AlertOctagon, RefreshCw, HelpCircle, ServerOff } from 'lucide-react';

export function ErrorMessage({ error, onRetry }) {
  if (!error) return null;

  const isTimeoutOrRateLimit = error.statusCode === 504 || error.statusCode === 502 || error.message?.toLowerCase().includes('timeout') || error.message?.toLowerCase().includes('rate limit');

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="glass-panel p-8 rounded-3xl border border-rose-500/30 text-center shadow-2xl space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
          {isTimeoutOrRateLimit ? <ServerOff size={32} /> : <AlertOctagon size={32} />}
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-extrabold text-white">
            {isTimeoutOrRateLimit ? 'Pipeline Execution Timed Out / Rate Limited' : 'Evaluation Error Encountered'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            {error.message || 'An error occurred while connecting to the 7-agent LLM pipeline.'}
          </p>
        </div>

        <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 text-left text-xs text-slate-300 space-y-2 font-mono">
          <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
            <span>Status Code: <strong className="text-rose-400">{error.statusCode || '500/504'}</strong></span>
            <span>Agent Pipeline: <strong>Halted</strong></span>
          </div>
          <p className="text-[11px] text-rose-300 pt-1">
            💡 <strong>Why did this happen?</strong> Free-tier LLMs on OpenRouter occasionally hit strict rate limits or respond slowly during multi-step debate sequential calls.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={onRetry}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3.5 px-8 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm shadow-xl shadow-indigo-600/20 transition"
          >
            <RefreshCw size={18} />
            Try Evaluation Again
          </button>
        </div>
      </div>
    </div>
  );
}
