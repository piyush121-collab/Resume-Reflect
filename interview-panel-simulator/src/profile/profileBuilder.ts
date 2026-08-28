import { CandidateProfileSchema, CandidateProfile } from "../types/schemas.js";
import { callModelForJson } from "../lib/openrouter.js";
import { EVIDENCE_RULES } from "../prompts/shared.js";

export async function buildCandidateProfile(opts: {
  candidateId: string;
  jobDescription: string;
  resume: string;
  transcript: string;
  model: string;
}): Promise<CandidateProfile> {
  const systemPrompt = `You are the Candidate Profile Builder for a hiring panel system.

Your job is to extract structured, atomic, evidence-linked FACTS from a resume and interview
transcript, cross-referenced against a job description. You do NOT judge, score, or recommend
anything here — you only extract facts that the four panel agents will later reason over. This
profile is the single shared source of truth for the rest of the system.

CRITICAL REQUIREMENT: You MUST extract AT LEAST 8 to 10 distinct atomic facts total across the categories below (aim for at least 2 detailed facts in skills_claimed, 2 in experience_summary, 2 in projects, 2 in interview_claims, and 1-2 in resume_vs_jd_gaps).
${EVIDENCE_RULES}
Return JSON matching exactly this shape:
{
  "candidate_id": string,
  "skills_claimed": Claim[],        // skills the candidate claims to have, resume and/or transcript (min 2 items)
  "experience_summary": Claim[],    // roles, years, responsibilities (min 2 items)
  "projects": Claim[],              // specific projects mentioned, with what was actually done (min 2 items)
  "interview_claims": Claim[],      // things asserted verbally in the transcript, distinct from the resume (min 2 items)
  "resume_vs_jd_gaps": Claim[]      // JD requirements that are partially or fully unaddressed by resume+transcript (min 1 item)
}
Where each Claim is:
{ "claim": string, "evidence_type": "transcript_quote"|"resume_line"|"job_description_line"|"absence_of_evidence",
  "evidence": string, "confidence": "high"|"medium"|"low" }

Example of one correctly formatted Claim object:
{
  "claim": "Candidate claims 3 years of production React experience",
  "evidence_type": "resume_line",
  "evidence": "\"3+ years building production React applications with Redux\" — Resume, Skills section",
  "confidence": "high"
}
CRITICAL: Every item in all Claim arrays MUST be a full object with all 4 fields (claim, evidence_type, evidence, confidence). Never pass plain strings!`;

  const userPrompt = `JOB DESCRIPTION:
${opts.jobDescription}

RESUME:
${opts.resume}

INTERVIEW TRANSCRIPT:
${opts.transcript}

Extract the structured candidate profile now.`;

  return callModelForJson({
    agentName: "profile_builder",
    model: opts.model,
    systemPrompt,
    userPrompt,
    schema: CandidateProfileSchema,
    sawOtherAgents: false,
  });
}
