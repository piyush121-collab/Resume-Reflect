import React from 'react';
import { Award, CheckCircle2, AlertTriangle, XCircle, HelpCircle, Star, ShieldCheck, Sparkles, TrendingUp, ThumbsUp, ThumbsDown } from 'lucide-react';

export function CandidateSummaryDashboard({ evaluationData }) {
  if (!evaluationData) return null;

  const { finalDecision, profile, candidateName } = evaluationData;

  const recommendation = finalDecision?.final_recommendation || 'lean_hire';
  const confidence = finalDecision?.confidence || 'medium';
  const reasoning = finalDecision?.reasoning_summary || '';
  const strengths = finalDecision?.key_corroborated_strengths || [];
  const concerns = finalDecision?.key_corroborated_concerns || [];

  // Compute visual rating score out of 100 & stars out of 5 based on consensus recommendation + confidence
  let ratingScore = 75;
  let recommendationLabel = 'LEAN HIRE';
  let badgeColor = 'emerald';

  switch (recommendation) {
    case 'hire':
      ratingScore = confidence === 'high' ? 95 : confidence === 'medium' ? 88 : 82;
      recommendationLabel = 'STRONG HIRE';
      badgeColor = 'emerald';
      break;
    case 'lean_hire':
      ratingScore = confidence === 'high' ? 78 : confidence === 'medium' ? 74 : 68;
      recommendationLabel = 'LEAN HIRE';
      badgeColor = 'emerald';
      break;
    case 'lean_no_hire':
      ratingScore = confidence === 'high' ? 42 : confidence === 'medium' ? 48 : 54;
      recommendationLabel = 'LEAN NO HIRE';
      badgeColor = 'amber';
      break;
    case 'no_hire':
      ratingScore = confidence === 'high' ? 20 : confidence === 'medium' ? 30 : 38;
      recommendationLabel = 'DO NOT HIRE';
      badgeColor = 'rose';
      break;
    default:
      ratingScore = 50;
      recommendationLabel = 'INSUFFICIENT DATA';
      badgeColor = 'slate';
  }

  const starRating = (ratingScore / 20).toFixed(1);

  // Take top 3 bullet points for executive summary as required by spec
  const executiveStrengths = strengths.slice(0, 3);
  const executiveConcerns = concerns.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Top Banner Card: Candidate Consensus & Score */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Ambient background glow */}
        <div className={`absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none ${
          badgeColor === 'emerald' ? 'bg-emerald-500' : badgeColor === 'rose' ? 'bg-rose-500' : 'bg-amber-500'
        }`} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          {/* Candidate Info & Hire/No Hire Consensus */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Candidate Consensus Evaluation
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                Confidence: <span className="capitalize font-bold text-white">{confidence}</span>
              </span>
            </div>

            <h2 className="text-3xl font-black text-white tracking-tight">
              {candidateName || profile?.candidate_id || 'Candidate Evaluation'}
            </h2>

            {/* Consensus Verdict Badge */}
            <div className="pt-1">
              <div className={`inline-flex items-center gap-3 px-5 py-3 rounded-2xl border font-bold text-lg shadow-lg ${
                badgeColor === 'emerald'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 glow-emerald'
                  : badgeColor === 'rose'
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 glow-rose'
                  : 'bg-amber-500/15 border-amber-500/40 text-amber-300 glow-amber'
              }`}>
                {badgeColor === 'emerald' ? (
                  <CheckCircle2 size={24} className="text-emerald-400 shrink-0" />
                ) : badgeColor === 'rose' ? (
                  <XCircle size={24} className="text-rose-400 shrink-0" />
                ) : (
                  <AlertTriangle size={24} className="text-amber-400 shrink-0" />
                )}
                <span>Final Decision: {recommendationLabel}</span>
              </div>
            </div>

            <p className="text-slate-300 text-sm leading-relaxed line-clamp-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
              "{reasoning}"
            </p>
          </div>

          {/* Visual Rating Gauge / Score Card */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-slate-900/80 rounded-2xl border border-slate-800 text-center">
            <div className="relative w-36 h-36 flex items-center justify-center mb-3">
              {/* Circular Gauge */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-slate-800"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={264}
                  strokeDashoffset={264 - (264 * ratingScore) / 100}
                  strokeLinecap="round"
                  className={`transition-all duration-1000 ease-out ${
                    badgeColor === 'emerald'
                      ? 'text-emerald-400'
                      : badgeColor === 'rose'
                      ? 'text-rose-400'
                      : 'text-amber-400'
                  }`}
                  fill="transparent"
                />
              </svg>

              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-black text-white font-mono">{ratingScore}</span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Out of 100</span>
              </div>
            </div>

            <div className="flex items-center gap-1 text-amber-400 mb-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={16}
                  fill={star <= Math.round(ratingScore / 20) ? 'currentColor' : 'none'}
                  className={star <= Math.round(ratingScore / 20) ? 'text-amber-400' : 'text-slate-700'}
                />
              ))}
              <span className="text-xs text-slate-300 font-mono ml-1">({starRating}/5)</span>
            </div>

            <span className="text-xs text-slate-400 font-medium">
              Multi-Agent Corroboration Index
            </span>
          </div>
        </div>
      </div>

      {/* Executive Summary 3-Bullet Points (Strengths & Weaknesses) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Executive Strengths */}
        <div className="glass-panel p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.02]">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-emerald-500/20 text-emerald-400">
            <ThumbsUp size={18} />
            <h3 className="font-bold text-base text-white">Top 3 Executive Strengths</h3>
          </div>

          <ul className="space-y-3">
            {executiveStrengths.map((item, idx) => (
              <li key={idx} className="flex items-start gap-3 text-xs text-slate-200 leading-relaxed">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[10px] shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
            {executiveStrengths.length === 0 && (
              <li className="text-xs text-slate-400 italic">No explicit corroborated strengths extracted.</li>
            )}
          </ul>
        </div>

        {/* Executive Concerns / Weaknesses */}
        <div className="glass-panel p-6 rounded-2xl border border-rose-500/20 bg-rose-500/[0.02]">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-rose-500/20 text-rose-400">
            <ThumbsDown size={18} />
            <h3 className="font-bold text-base text-white">Top 3 Executive Concerns</h3>
          </div>

          <ul className="space-y-3">
            {executiveConcerns.map((item, idx) => (
              <li key={idx} className="flex items-start gap-3 text-xs text-slate-200 leading-relaxed">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-[10px] shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
            {executiveConcerns.length === 0 && (
              <li className="text-xs text-slate-400 italic">No major corroborated concerns flagged.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
