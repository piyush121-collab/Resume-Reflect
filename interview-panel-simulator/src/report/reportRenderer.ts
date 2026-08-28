import {
  AgentOpinion,
  DebateTurn,
  FinalDecision,
  CandidateProfile,
  AgentKeyT,
} from "../types/schemas.js";

// Renders the human-facing markdown report AND (implicitly, via the caller)
// the machine-facing JSON files sit alongside it in the same output folder.
// The "Opinion Change Log" table is the single highest-value section here —
// it is direct, visible proof that this is a real multi-agent debate, not
// four static opinions rendered side by side.
export function renderReport(opts: {
  candidateId: string;
  profile: CandidateProfile;
  independentOpinions: AgentOpinion[];
  debateTurns: DebateTurn[];
  postDebateOpinions: Record<AgentKeyT, AgentOpinion>;
  finalDecision: FinalDecision;
}): string {
  const { candidateId, independentOpinions, postDebateOpinions, finalDecision, debateTurns } = opts;

  const changeRows = independentOpinions
    .map((pre) => {
      const post = postDebateOpinions[pre.agent];
      const changed = post.overall_recommendation !== pre.overall_recommendation;
      const revisionTurn = debateTurns.find(
        (t) => t.agent === pre.agent && t.stance === "revise_own_opinion"
      );
      const why = changed && revisionTurn ? revisionTurn.message.replace(/\|/g, "/") : "—";
      return `| ${pre.agent} | ${pre.overall_recommendation} | ${post.overall_recommendation} | ${
        changed ? "**Yes**" : "No"
      } | ${why} |`;
    })
    .join("\n");

  const strengths =
    finalDecision.key_corroborated_strengths.map((s) => `- ${s}`).join("\n") ||
    "- None identified";
  const concerns =
    finalDecision.key_corroborated_concerns.map((c) => `- ${c}`).join("\n") ||
    "- None identified";
  const flags =
    finalDecision.insufficient_evidence_flags.map((f) => `- ${f}`).join("\n") ||
    "- None";

  const disagreements =
    finalDecision.unresolved_disagreements.length === 0
      ? "None — the panel reached alignment on all major points."
      : finalDecision.unresolved_disagreements
          .map(
            (d) =>
              `- **${d.topic}**\n${Object.entries(d.agent_positions)
                .map(([a, p]) => `  - ${a}: ${p}`)
                .join("\n")}\n  - *Why unresolved:* ${d.why_unresolved}`
          )
          .join("\n");

  const independentAppendix = independentOpinions
    .map(
      (op) => `### ${op.agent}
- Recommendation: **${op.overall_recommendation}** (self-confidence: ${op.self_confidence})
${op.claims
  .map(
    (c) =>
      `  - **Claim:** ${c.claim}\n    - Evidence (${c.evidence_type}, confidence: ${c.confidence}): ${c.evidence}`
  )
  .join("\n")}
${op.unresolved_unknowns.length ? `  - Unresolved unknowns: ${op.unresolved_unknowns.join("; ")}` : ""}`
    )
    .join("\n\n");

  const debateAppendix = debateTurns
    .map(
      (t) =>
        `**Round ${t.round} — ${t.agent}** (${t.stance}${
          t.responds_to_agent ? `, responding to ${t.responds_to_agent}` : ""
        })
${t.message}
${t.evidence ? `> Evidence: ${t.evidence}` : ""}`
    )
    .join("\n\n");

  return `# Interview Panel Report — Candidate ${candidateId}

## Final Recommendation: ${finalDecision.final_recommendation.toUpperCase()} (confidence: ${finalDecision.confidence})

${finalDecision.reasoning_summary}

## Strengths (corroborated by evidence)
${strengths}

## Concerns (corroborated by evidence)
${concerns}

## Unresolved Disagreement
${disagreements}

## Insufficient Evidence Flags
${flags}

## Opinion Change Log (proof of a real debate)
| Agent | Pre-debate | Post-debate | Changed? | Why |
|---|---|---|---|---|
${changeRows}

---

## Appendix A — Independent Agent Opinions (formed before any debate)
${independentAppendix}

## Appendix B — Full Debate Transcript
${debateAppendix}
`;
}
