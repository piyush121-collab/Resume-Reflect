import {
  AgentOpinion,
  DebateTurn,
  FinalDecision,
  FinalDecisionSchema,
  AgentKeyT,
} from "../types/schemas.js";
import { callModelForJson } from "../lib/openrouter.js";

// Deliberately NOT an averaging function. There is no numeric score array
// passed to this model that it could average — only qualitative evidence
// bundles, the debate transcript, and instructions to reason about
// corroboration and unresolved conflict. That absence is intentional: you
// cannot "cheat" toward averaging if there is nothing to average.
export async function runPanelChair(opts: {
  candidateId: string;
  model: string;
  independentOpinions: AgentOpinion[];
  debateTurns: DebateTurn[];
  postDebateOpinions: Record<AgentKeyT, AgentOpinion>;
}): Promise<FinalDecision> {
  const systemPrompt = `You are the Panel Chair. You do NOT average scores — there is no score array
here to average, only qualitative evidence. Your job is reasoning:

STRUCTURAL CONSTRAINTS FOR FINAL DECISION:
1. Identify claims that were corroborated independently by multiple agents approaching from different
   lenses (e.g. both the Skeptic and the Technical Agent separately flag the same weak answer). Weight
   these strongly — convergent independent evidence is stronger than any single agent's opinion.
2. Identify claims that were contested during the debate and never resolved. Flag these explicitly in
   "unresolved_disagreements" — do not silently drop them or quietly pick a side without saying so.
3. Weight evidence QUALITY and CONFIDENCE over which agent said it. A high-confidence direct transcript
   quote outweighs a low-confidence inference, regardless of which role produced it.
4. Your "reasoning_summary" MUST be a detailed narrative (3-6 sentences) that explicitly names at least 2 specific corroborating claims (or 1 strength and 1 concern) and at least 1 unresolved conflict (or explains why full consensus was reached).
5. It must read as qualitative evidence weighing, NEVER as a score dump, numeric tally, or majority vote.
6. If the panel genuinely lacked evidence on something material, add it to insufficient_evidence_flags
   rather than deciding it either way.

Return ONLY valid JSON matching the schema given in the user prompt.

Example of one item in unresolved_disagreements:
{
  "topic": "Depth of System Design Experience",
  "agent_positions": {
    "technical": "Demonstrated sufficient knowledge of Raft consensus",
    "skeptic": "Lacks production operational experience with distributed systems"
  },
  "why_unresolved": "Candidate did not have opportunity to discuss live production incident handling."
}`;

  const userPrompt = `CANDIDATE: ${opts.candidateId}

INDEPENDENT OPINIONS (formed before any agent saw another's view):
${JSON.stringify(opts.independentOpinions, null, 2)}

FULL DEBATE TRANSCRIPT:
${JSON.stringify(opts.debateTurns, null, 2)}

POST-DEBATE OPINIONS (final position of each agent after debate):
${JSON.stringify(opts.postDebateOpinions, null, 2)}

Return JSON matching exactly:
{
  "candidate": "${opts.candidateId}",
  "final_recommendation": "hire"|"lean_hire"|"lean_no_hire"|"no_hire",
  "confidence": "high"|"medium"|"low",
  "reasoning_summary": string,
  "key_corroborated_strengths": string[],
  "key_corroborated_concerns": string[],
  "unresolved_disagreements": [
    { "topic": string, "agent_positions": { "<agent_key>": string, ... }, "why_unresolved": string }
  ],
  "insufficient_evidence_flags": string[]
}`;

  return callModelForJson({
    agentName: "panel_chair",
    model: opts.model,
    systemPrompt,
    userPrompt,
    schema: FinalDecisionSchema,
    sawOtherAgents: true,
  });
}
