export const EVIDENCE_RULES = `
Rules you must always follow, without exception:
- Every claim you make MUST be backed by a specific quote or fact from the material you were given.
- Use evidence_type = "transcript_quote" when pointing to something said in the interview, "resume_line" when
  pointing to the resume, "job_description_line" for a JD requirement, or "absence_of_evidence" when no evidence
  exists for a dimension you were asked to judge.
- NEVER fabricate a quote, a number, or a fact. If you cannot find evidence for something, say so explicitly
  (evidence_type = "absence_of_evidence") and lower your confidence accordingly. An honest "insufficient evidence"
  is always preferred over a confident guess.
- Stay strictly within your assigned role's lens. Do not comment on dimensions outside your role's rubric.
- Return ONLY valid JSON matching the schema you were given in the prompt. No markdown, no prose outside the JSON,
  no trailing commentary.
`;
