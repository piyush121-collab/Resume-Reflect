import { AgentOpinion, DebateTurn, DebateTurnSchema, AgentKeyT } from "../types/schemas.js";
import { callModelForJson } from "../lib/openrouter.js";
import { AGENT_DEFINITIONS } from "../agents/definitions.js";
import { EVIDENCE_RULES } from "../prompts/shared.js";

export interface DebateResult {
  turns: DebateTurn[];
  // Post-debate opinion per agent — always present for all 4 agents, whether
  // or not that agent actually changed its mind (unchanged ones just carry
  // stage: "post_debate" with the same recommendation as before).
  postDebateOpinions: Record<AgentKeyT, AgentOpinion>;
}

// Round-robin, sequential debate. Every agent, on its turn, is shown:
//   1) its own latest opinion,
//   2) every other agent's ORIGINAL independent opinion (so the anchor for
//      "did someone else's independent view change my mind" stays stable),
//   3) the full debate transcript so far this session.
// This is what makes it a real debate rather than four monologues: each turn
// must name another agent and a specific claim, and pick an explicit stance.
export async function runDebate(opts: {
  candidateId: string;
  independentOpinions: AgentOpinion[];
  rounds?: number;
}): Promise<DebateResult> {
  const rounds = opts.rounds ?? 2;
  const turns: DebateTurn[] = [];

  const latestOpinionByAgent = {} as Record<AgentKeyT, AgentOpinion>;
  for (const op of opts.independentOpinions) latestOpinionByAgent[op.agent] = op;

  for (let round = 1; round <= rounds; round++) {
    for (const def of AGENT_DEFINITIONS) {
      const ownOpinion = latestOpinionByAgent[def.agentKey];
      const otherIndependentOpinions = opts.independentOpinions.filter(
        (o) => o.agent !== def.agentKey
      );

      const systemPrompt = `You are the ${def.displayName} in a live panel debate about candidate ${opts.candidateId}.
This is round ${round} of ${rounds}. You can now see every panelist's independent opinion and the
debate turns taken so far this session.
${EVIDENCE_RULES}
You must produce exactly ONE debate turn. You MUST reference a specific other agent (by role key:
technical, hr_culture, hiring_manager, or skeptic) and a specific claim of theirs — quote or closely
paraphrase which claim you are responding to in "responds_to_claim".

STRICT ROUND INSTRUCTIONS:
- Round 1: Focus on direct cross-referencing. Identify a claim from another agent that either reinforces or conflicts with your perspective, and respond with specific evidence.
- Round 2: You MUST explicitly evaluate whether the debate turns in Round 1 changed your perspective, confidence, or risk assessment. If another panelist raised a valid point or pointed out missing evidence, set stance = "revise_own_opinion" and state your new recommendation and confidence. Do not silently pass through.

Pick exactly one stance:
- "agree_and_reinforce": you agree with their point and add supporting evidence of your own.
- "disagree_with_rebuttal": you push back, with a specific reason and evidence.
- "revise_own_opinion": another agent's point or evidence changed your own recommendation or confidence. You MUST set updated_recommendation and updated_confidence to your new values.
- "no_change": use only if your opinion is completely unshaken after evaluating all debate points.

Return JSON matching exactly:
{
  "round": ${round},
  "agent": "${def.agentKey}",
  "responds_to_agent": "technical"|"hr_culture"|"hiring_manager"|"skeptic"|null,
  "responds_to_claim": string|null,
  "stance": "agree_and_reinforce"|"disagree_with_rebuttal"|"revise_own_opinion"|"no_change",
  "message": string,
  "evidence": string|null,
  "updated_recommendation": "hire"|"lean_hire"|"lean_no_hire"|"no_hire"|"insufficient_data"|null,
  "updated_confidence": number|null
}
Set updated_recommendation/updated_confidence ONLY when stance is "revise_own_opinion", otherwise null.

Example of one correctly formatted DebateTurn object:
{
  "round": ${round},
  "agent": "${def.agentKey}",
  "responds_to_agent": "technical",
  "responds_to_claim": "Candidate claims 3 years of React experience",
  "stance": "disagree_with_rebuttal",
  "message": "The candidate mentioned React on their resume but during Q3 of the interview they struggled to explain React hooks or state management.",
  "evidence": "\"I used React a bit in 2021 but mainly did backend Python recently\" — Transcript A, Q3",
  "updated_recommendation": null,
  "updated_confidence": null
}`;

      const userPrompt = `YOUR OWN LATEST OPINION:
${JSON.stringify(ownOpinion, null, 2)}

OTHER PANELISTS' INDEPENDENT OPINIONS (formed before any debate):
${JSON.stringify(otherIndependentOpinions, null, 2)}

DEBATE SO FAR THIS SESSION:
${JSON.stringify(turns, null, 2)}

Produce your round ${round} debate turn now.`;

      const turn = await callModelForJson({
        agentName: `${def.agentKey}_debate_round${round}`,
        model: def.model,
        systemPrompt,
        userPrompt,
        schema: DebateTurnSchema,
        sawOtherAgents: true,
      });

      turns.push(turn);

      if (turn.stance === "revise_own_opinion" && turn.updated_recommendation) {
        latestOpinionByAgent[def.agentKey] = {
          ...ownOpinion,
          stage: "post_debate",
          overall_recommendation: turn.updated_recommendation,
          self_confidence: turn.updated_confidence ?? ownOpinion.self_confidence,
        };
      }
    }
  }

  // Every agent gets an explicit post_debate record, even if nothing changed —
  // this is what powers the "Opinion Change Log" table in the final report.
  for (const def of AGENT_DEFINITIONS) {
    const current = latestOpinionByAgent[def.agentKey];
    if (current.stage !== "post_debate") {
      latestOpinionByAgent[def.agentKey] = { ...current, stage: "post_debate" };
    }
  }

  return { turns, postDebateOpinions: latestOpinionByAgent };
}
