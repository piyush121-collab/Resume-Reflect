import React, { useState } from 'react';
import { 
  Sparkles, 
  Brain, 
  MessageSquare, 
  ShieldAlert, 
  Briefcase, 
  Scale, 
  BarChart2, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  FileText,
  MessageCircle,
  TrendingUp,
  Award
} from 'lucide-react';

const AGENTS = [
  { id: 'profile', name: 'Profile Builder', role: 'Fact & Gap Extractor', icon: Sparkles, color: 'indigo' },
  { id: 'technical', name: 'Technical Agent', role: 'Architecture & Code Depth', icon: Brain, color: 'sky' },
  { id: 'hr_culture', name: 'HR / Culture Agent', role: 'Communication & Fit', icon: MessageSquare, color: 'emerald' },
  { id: 'skeptic', name: 'Skeptic Agent', role: 'Red Flags & Contradictions', icon: ShieldAlert, color: 'rose' },
  { id: 'hiring_manager', name: 'Hiring Manager', role: 'Business Impact & Fit', icon: Briefcase, color: 'amber' },
  { id: 'chair', name: 'Panel Chair', role: 'Final Non-Averaged Verdict', icon: Scale, color: 'purple' },
  { id: 'comparator', name: 'Comparator Agent', role: 'Head-to-Head Benchmark', icon: BarChart2, color: 'teal' }
];

export function DetailedAgentOutput({ evaluationData }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [openClaimIdx, setOpenClaimIdx] = useState(null);

  if (!evaluationData) return null;

  const { profile, independentOpinions = [], finalDecision, comparison, debateTurns = [] } = evaluationData;

  // Helper to extract specific agent opinion
  const getAgentOpinion = (agentKey) => {
    return independentOpinions.find(op => op.agent === agentKey) || null;
  };

  const currentAgent = AGENTS.find(a => a.id === activeTab) || AGENTS[0];

  return (
    <div className="space-y-6 pt-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Award className="text-indigo-400" size={22} /> Detailed 7-Agent Feedback Breakdown
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Inspect individual evidence claims, confidence ratings, and reasoning across all 7 specialized AI agents.
          </p>
        </div>
      </div>

      {/* 7 Agents Tab Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {AGENTS.map((agent) => {
          const Icon = agent.icon;
          const isActive = activeTab === agent.id;

          return (
            <button
              key={agent.id}
              onClick={() => setActiveTab(agent.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all duration-200 border ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/30 scale-[1.02]'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Icon size={16} />
              <span>{agent.name}</span>
            </button>
          );
        })}
      </div>

      {/* Main Agent Details Display Box */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl">

        {/* 1. Profile Builder View */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Profile Builder Agent</h4>
                  <p className="text-xs text-slate-400">Extracted facts & evidence-backed resume vs JD gaps</p>
                </div>
              </div>
            </div>

            {/* Resume vs JD Gaps */}
            <div>
              <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <AlertCircle size={15} className="text-amber-400" /> Resume vs Job Description Gaps
              </h5>
              <div className="space-y-3">
                {profile?.resume_vs_jd_gaps?.map((gap, idx) => (
                  <div key={idx} className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
                    <p className="text-xs font-semibold text-amber-300">{gap.claim}</p>
                    <p className="text-[11px] font-mono text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-850">
                      <strong>Evidence ({gap.evidence_type}):</strong> {gap.evidence}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Skills & Experience Claim Facts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800">
                <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Skills Claimed</h5>
                <ul className="space-y-2">
                  {profile?.skills_claimed?.map((sc, i) => (
                    <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="text-indigo-400 mt-0.5">•</span>
                      <span>{sc.claim}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800">
                <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Interview Claims</h5>
                <ul className="space-y-2">
                  {profile?.interview_claims?.map((ic, i) => (
                    <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">•</span>
                      <span>{ic.claim}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 2-5: Independent Agent Opinions (Technical, HR, Skeptic, Hiring Manager) */}
        {['technical', 'hr_culture', 'skeptic', 'hiring_manager'].includes(activeTab) && (() => {
          const opinion = getAgentOpinion(activeTab);
          if (!opinion) {
            return (
              <div className="text-center py-10 text-slate-400 text-xs">
                No independent opinion data found for {currentAgent.name}.
              </div>
            );
          }

          const rec = opinion.overall_recommendation;
          const confidencePct = Math.round((opinion.self_confidence || 0.8) * 100);

          return (
            <div className="space-y-6">
              {/* Agent Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <currentAgent.icon size={20} />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">{currentAgent.name}</h4>
                    <p className="text-xs text-slate-400">{currentAgent.role}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border ${
                    rec.includes('hire')
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                  }`}>
                    Recommendation: {rec.replace('_', ' ')}
                  </span>
                  <span className="px-3 py-1.5 rounded-xl text-xs font-mono bg-slate-900 text-slate-300 border border-slate-800">
                    Self Confidence: <strong>{confidencePct}%</strong>
                  </span>
                </div>
              </div>

              {/* Claims Breakdown with Evidence Pointers */}
              <div>
                <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  Independent Evidence Claims ({opinion.claims?.length || 0})
                </h5>
                <div className="space-y-3">
                  {opinion.claims?.map((claim, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2 hover:border-slate-700 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-100">{claim.claim}</p>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold capitalize shrink-0 ${
                          claim.confidence === 'high'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {claim.confidence} confidence
                        </span>
                      </div>
                      <div className="p-3 bg-slate-950/70 rounded-xl text-[11px] font-mono text-slate-300 border border-slate-850">
                        <span className="text-indigo-400 font-bold uppercase text-[10px] block mb-1">
                          Pointer [{claim.evidence_type}]:
                        </span>
                        "{claim.evidence}"
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Unresolved Unknowns */}
              {opinion.unresolved_unknowns?.length > 0 && (
                <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                  <h5 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <HelpCircle size={15} /> Unresolved Unknowns
                  </h5>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {opinion.unresolved_unknowns.map((unk, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-400">•</span>
                        <span>{unk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })()}

        {/* 6. Panel Chair View */}
        {activeTab === 'chair' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Scale size={20} />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Panel Chair Arbiter Agent</h4>
                  <p className="text-xs text-slate-400">Non-averaging weighted reasoning & debate synthesis</p>
                </div>
              </div>

              <span className="px-3 py-1.5 rounded-xl text-xs font-bold uppercase bg-purple-500/10 text-purple-300 border border-purple-500/30">
                Final Consensus Verdict: {finalDecision?.final_recommendation?.replace('_', ' ')}
              </span>
            </div>

            {/* Unresolved Disagreements Matrix */}
            <div>
              <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <AlertCircle size={15} className="text-amber-400" /> Unresolved Panel Disagreements
              </h5>
              <div className="space-y-4">
                {finalDecision?.unresolved_disagreements?.map((dis, i) => (
                  <div key={i} className="p-4 bg-slate-900/90 rounded-2xl border border-amber-500/30 space-y-3">
                    <h6 className="text-xs font-bold text-amber-300">{dis.topic}</h6>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      {Object.entries(dis.agent_positions || {}).map(([agent, pos], j) => (
                        <div key={j} className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800">
                          <span className="font-bold text-indigo-400 capitalize block mb-0.5">{agent.replace('_', ' ')}:</span>
                          <span className="text-slate-300">{pos}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400 italic bg-slate-950/40 p-2 rounded-lg border border-slate-850">
                      <strong>Why Unresolved:</strong> {dis.why_unresolved}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Insufficient Evidence Flags */}
            <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800">
              <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                Insufficient Evidence Flags ({finalDecision?.insufficient_evidence_flags?.length || 0})
              </h5>
              <ul className="space-y-2 text-xs text-slate-300">
                {finalDecision?.insufficient_evidence_flags?.map((flag, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* 7. Comparator Agent View */}
        {activeTab === 'comparator' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                  <BarChart2 size={20} />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Comparator Agent</h4>
                  <p className="text-xs text-slate-400">Head-to-head benchmarking & key differentiators</p>
                </div>
              </div>
            </div>

            <div className="p-5 bg-slate-900/80 rounded-2xl border border-teal-500/20 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Preferred Candidate Benchmark:</span>
                <span className="px-3 py-1 bg-teal-500/10 text-teal-300 border border-teal-500/30 rounded-lg text-xs font-bold">
                  Candidate {comparison?.preferred_candidate || 'A'}
                </span>
              </div>

              <p className="text-xs text-slate-200 leading-relaxed">
                {comparison?.reasoning}
              </p>

              <div>
                <h5 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-2">Key Differentiators</h5>
                <ul className="space-y-2">
                  {comparison?.key_differentiators?.map((diff, i) => (
                    <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                      <CheckCircle2 size={14} className="text-teal-400 shrink-0 mt-0.5" />
                      <span>{diff}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
