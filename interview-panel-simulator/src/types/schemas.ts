import { z } from "zod";

export const EvidenceType = z.enum([
  "transcript_quote",
  "resume_line",
  "job_description_line",
  "absence_of_evidence",
]);

export const Confidence = z.enum(["high", "medium", "low"]);

export const Recommendation = z.enum([
  "hire",
  "lean_hire",
  "lean_no_hire",
  "no_hire",
  "insufficient_data",
]);

export const AgentKey = z.enum([
  "technical",
  "hr_culture",
  "hiring_manager",
  "skeptic",
]);
export type AgentKeyT = z.infer<typeof AgentKey>;

export const ClaimSchema = z.object({
  claim: z.string().min(1),
  evidence_type: EvidenceType,
  // Exact quote/paraphrase pointer, or an explicit "no evidence found for X" statement.
  evidence: z.string().min(1),
  confidence: Confidence,
});
export type Claim = z.infer<typeof ClaimSchema>;

export const CandidateProfileSchema = z.object({
  candidate_id: z.string(),
  skills_claimed: z.array(ClaimSchema),
  experience_summary: z.array(ClaimSchema),
  projects: z.array(ClaimSchema),
  interview_claims: z.array(ClaimSchema),
  resume_vs_jd_gaps: z.array(ClaimSchema),
});
export type CandidateProfile = z.infer<typeof CandidateProfileSchema>;

export const AgentOpinionSchema = z.object({
  agent: AgentKey,
  candidate: z.string(),
  stage: z.enum(["independent", "post_debate"]),
  claims: z.array(ClaimSchema).min(1),
  unresolved_unknowns: z.array(z.string()).default([]),
  overall_recommendation: Recommendation,
  self_confidence: z.number().min(0).max(1),
});
export type AgentOpinion = z.infer<typeof AgentOpinionSchema>;

export const DebateTurnSchema = z.object({
  round: z.number().int().min(1),
  agent: AgentKey,
  responds_to_agent: AgentKey.nullable(),
  responds_to_claim: z.string().nullable(),
  stance: z.enum([
    "agree_and_reinforce",
    "disagree_with_rebuttal",
    "revise_own_opinion",
    "no_change",
  ]),
  message: z.string().min(1),
  evidence: z.string().nullable(),
  updated_recommendation: Recommendation.nullable(),
  updated_confidence: z.number().min(0).max(1).nullable(),
});
export type DebateTurn = z.infer<typeof DebateTurnSchema>;

export const FinalDecisionSchema = z.object({
  candidate: z.string(),
  final_recommendation: z.enum([
    "hire",
    "lean_hire",
    "lean_no_hire",
    "no_hire",
  ]),
  confidence: Confidence,
  // Must be a reasoning narrative, not a score dump — enforced by min length;
  // the real enforcement is structural (see decision/panelChair.ts prompt).
  reasoning_summary: z.string().min(50),
  key_corroborated_strengths: z.array(z.string()),
  key_corroborated_concerns: z.array(z.string()),
  unresolved_disagreements: z.array(
    z.object({
      topic: z.string(),
      agent_positions: z.record(z.string()),
      why_unresolved: z.string(),
    })
  ),
  insufficient_evidence_flags: z.array(z.string()),
});
export type FinalDecision = z.infer<typeof FinalDecisionSchema>;

export const ComparisonSchema = z.object({
  preferred_candidate: z.enum(["A", "B", "too_close_to_call"]),
  reasoning: z.string().min(30),
  key_differentiators: z.array(z.string()),
});
export type Comparison = z.infer<typeof ComparisonSchema>;
