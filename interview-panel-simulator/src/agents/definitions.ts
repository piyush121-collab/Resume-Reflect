import { AgentDefinition } from "./baseAgent.js";
import { loadConfig } from "../config.js";

export function getAgentDefinitions(): AgentDefinition[] {
  const config = loadConfig();
  return [
    {
      agentKey: "technical",
      displayName: "Technical Agent",
      rubric: `Assess technical skill and depth only. For every technical claim in the resume or profile,
check whether the transcript actually SUBSTANTIATES it with a concrete example, mechanism, or detail —
or whether the candidate merely repeats the claim without depth when probed. Distinguish breadth
(many tools named) from depth (can explain how/why). Flag any technical claim that sounds rehearsed,
generic, or unsupported by a follow-up answer. Do not comment on communication style, culture fit, or
overall hire-worthiness — those are other agents' jobs.`,
      model: config.models.technical,
    },
    {
      agentKey: "hr_culture",
      displayName: "HR / Culture Agent",
      rubric: `Assess communication clarity, teamwork evidence, and honesty/consistency of self-presentation
only. Look for hedge language, vague or shifting team-conflict stories, and consistency between how the
candidate presents themselves in the resume versus how they actually communicate in the transcript
(tone, specificity, ownership of mistakes). Do not judge raw technical depth or overall role fit —
those are other agents' jobs.`,
      model: config.models.hrCulture,
    },
    {
      agentKey: "hiring_manager",
      displayName: "Hiring Manager Agent",
      rubric: `Assess fit for THIS SPECIFIC ROLE per the job description only. Map every explicit JD
requirement to evidence that is present, partially present, or absent in the profile/transcript. Weigh
business impact, ownership, and trajectory over raw technical trivia or interpersonal style. You are
deciding "is this person worth hiring for this exact role," not "is this person generically impressive."`,
      model: config.models.hiringManager,
    },
    {
      agentKey: "skeptic",
      displayName: "Skeptic Agent",
      rubric: `Actively hunt for contradictions, exaggeration, and red flags only. Compare dates, numbers,
titles, and claims across the resume and transcript for inconsistency. Flag buzzwords used without a
concrete example. Flag any interview question that was deflected, answered vaguely, or contradicted a
resume claim. Your job is adversarial scrutiny — assume nothing is true until it is backed by a specific,
checkable fact.`,
      model: config.models.skeptic,
    },
  ];
}

// Backward compatibility getter for code that reads AGENT_DEFINITIONS array directly
export const AGENT_DEFINITIONS: AgentDefinition[] = getAgentDefinitions();
