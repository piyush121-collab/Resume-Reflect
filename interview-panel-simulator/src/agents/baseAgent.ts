import {
  AgentOpinionSchema,
  AgentOpinion,
  CandidateProfile,
  AgentKeyT,
} from "../types/schemas.js";
import { callModelForJson } from "../lib/openrouter.js";
import { EVIDENCE_RULES } from "../prompts/shared.js";

export interface AgentDefinition {
  agentKey: AgentKeyT;
  displayName: string;
  rubric: string;
  model: string;
}

// This is the ONLY function that produces a pre-debate opinion, and it is
// called once per agent with nothing but this agent's own rubric, the shared
// candidate profile, the JD, and the raw transcript. No agent output is ever
// passed in here — that is what makes Level 2 genuinely independent, not just
// four differently-worded prompts against the same context.
export async function getIndependentOpinion(opts: {
  def: AgentDefinition;
  candidateId: string;
  jobDescription: string;
  transcript: string;
  profile: CandidateProfile;
}): Promise<AgentOpinion> {
  const { def } = opts;

  const systemPrompt = `You are the ${def.displayName} on a hiring panel, evaluating candidate ${opts.candidateId}.

You are forming your opinion in COMPLETE ISOLATION. You have not seen and must not imagine, guess,
or hedge toward what any other panelist thinks. Judge strictly from your own rubric:

${def.rubric}
${EVIDENCE_RULES}
Return JSON matching exactly this shape:
{
  "agent": "${def.agentKey}",
  "candidate": "${opts.candidateId}",
  "stage": "independent",
  "claims": Claim[],                 // at least 3, each with real evidence
  "unresolved_unknowns": string[],   // things you could not judge due to missing info
  "overall_recommendation": "hire"|"lean_hire"|"lean_no_hire"|"no_hire"|"insufficient_data",
  "self_confidence": number          // 0 to 1
}

Example of one correctly formatted Claim object inside the "claims" array:
{
  "claim": "Candidate claims 3 years of production React experience",
  "evidence_type": "resume_line",
  "evidence": "\"3+ years building production React applications with Redux\" — Resume, Skills section",
  "confidence": "high"
}
CRITICAL: Every item in "claims" MUST be a full object with all 4 fields (claim, evidence_type, evidence, confidence). Never pass strings instead of objects!`;

  const userPrompt = `JOB DESCRIPTION:
${opts.jobDescription}

STRUCTURED CANDIDATE PROFILE (pre-extracted facts, shared across the whole panel):
${JSON.stringify(opts.profile, null, 2)}

FULL INTERVIEW TRANSCRIPT (use this for exact quoting):
${opts.transcript}

Give your independent opinion now, strictly from your role's lens.`;

  return callModelForJson({
    agentName: def.agentKey,
    model: def.model,
    systemPrompt,
    userPrompt,
    schema: AgentOpinionSchema,
    sawOtherAgents: false,
  });
}
