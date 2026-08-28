# Running This Scaffold

This is the TypeScript/Node implementation of the pipeline described in the main hackathon
`README.md`. It is wired end-to-end and **typechecks cleanly** (`npm run typecheck`) — you mainly
need to add your PDFs and an OpenRouter key.

## 1. Install

```bash
npm install
```

## 2. Configure

```bash
cp .env.example .env
# then edit .env and paste your free OpenRouter API key from https://openrouter.ai/keys
```

Before the hackathon, double-check the `:free` model slugs in `.env` against
`https://openrouter.ai/models?max_price=0` — free-tier slugs get renamed/retired over time, and
`.env` is where you swap them without touching code.

## 3. Add the source PDFs

Drop these five files into `data/` (exact filenames matter — `main.ts` looks for them by name):

```
data/02_Job_Description.pdf
data/03_Resume_A.pdf
data/04_Resume_B.pdf
data/05_Transcript_A.pdf
data/06_Transcript_B.pdf
```

## 4. Run

```bash
# dry-run pre-flight check (validates PDFs and API key without calling OpenRouter)
npm run start -- --dry-run

# run lightweight unit/self-check test suite (0 API calls)
npm test

# both candidates, full pipeline (profile → 4 independent agents → debate → panel chair → report)
npm run start -- --candidate both

# or one at a time
npm run candidate:a
npm run candidate:b

# with the bonus voice debate (requires: pip install edge-tts)
npm run start -- --candidate both --voice

# bonus head-to-head comparator (run AFTER both candidates finish)
npm run compare
```

Outputs land in `outputs/candidate_A/` and `outputs/candidate_B/`, each containing:

| File | What it is |
|---|---|
| `profile.json` | Structured, evidence-linked facts extracted from resume + transcript |
| `independent_opinions.json` | The 4 agents' opinions, formed in total isolation |
| `debate_transcript.json` | Every debate turn, across all rounds |
| `final_decision.json` | The Panel Chair's non-averaged final verdict |
| `report.md` | Human-readable report — **open this one first** |
| `run_manifest.json` | Full call log (model, timestamp, whether the call saw other agents) — your independence/audit proof |
| `audio/` | (only with `--voice`) per-turn TTS clips of the debate |

## 5. Where to look for each rubric point

- **"Are the 4 personas really independent?"** → `src/agents/definitions.ts` (distinct rubrics/models)
  + `src/agents/baseAgent.ts` (no other-agent data ever enters this call) + `run_manifest.json`
  (`sawOtherAgents: false` for all Level-2 calls).
- **"Debate quality + final decision reasoning"** → `src/debate/debateOrchestrator.ts` and
  `src/decision/panelChair.ts`. The report's "Opinion Change Log" table is your fastest proof point.
- **"Evidence traceability"** → every `Claim` object (`src/types/schemas.ts`) carries
  `evidence_type` + `evidence`; `callModelForJson` rejects and retries any response missing this.
- **"Handles unclear/missing info"** → `evidence_type: "absence_of_evidence"` +
  `overall_recommendation: "insufficient_data"` are first-class schema values, not afterthoughts.

## 6. Extending

- Change debate depth: `npm run start -- --candidate both --rounds 3`
- Change output location: `--out-dir path/to/dir`
- Swap any agent's model without touching code: edit the relevant `MODEL_*` line in `.env`
- Add a 5th persona: copy the shape of one entry in `src/agents/definitions.ts`, add its
  `AgentKey` value to `src/types/schemas.ts`, and it will automatically join Level 2 and the debate
  loop (both iterate over `AGENT_DEFINITIONS`).
