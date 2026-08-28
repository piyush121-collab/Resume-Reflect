# Multi-Agent AI Interview Panel Simulator

**A hiring-decision system built from 4 independent AI personas that form opinions in isolation, debate each other on evidence, and reach a non-averaged final verdict — grounded entirely in quotes from the resume and transcript.**

Built for a hackathon using **OpenCode** (terminal coding agent) driving **free models on OpenRouter**.

---

## 0. Read This First — What Actually Gets Judged

Before writing a line of code, internalize the rubric. Every hour you spend should map to one of these:

| # | Criterion | Points | The thing that actually earns it |
|---|---|---|---|
| 1 | 4 personas truly independent | 20 | Separate LLM calls, zero shared context, provably different prompts/outputs |
| 2 | Debate quality + final decision reasoning | 20 | A real back-and-forth + a non-averaging arbiter step |
| 3 | Evidence traceability | 15 | Every claim carries a quote/fact pointer, enforced by schema |
| 4 | Code/system quality | 15 | Clean modular pipeline, not a notebook of spaghetti |
| 5 | Handling unclear/missing info | 10 | Explicit "insufficient evidence" states, never a guessed score |
| 6 | Ease of use | 10 | One command runs both candidates end-to-end, readable report |
| 7 | Creativity/extra | 10 | Bonus: voice debate, cross-candidate ranking, disagreement visualizer |

**The single most common failure mode (per the problem statement's own tip): teams over-engineer the 4 agents and rush the debate + final-decision step.** Budget your time in reverse: lock the debate + arbiter design *first*, then build agents to feed it.

---

## 1. System Architecture (Mental Model)

```
                    ┌─────────────────────────┐
  PDFs  ───────────▶│  1. Ingestion Layer      │
 (JD, Resume,        │  (extract text from PDFs)│
  Transcript)         └───────────┬──────────────┘
                                  ▼
                    ┌─────────────────────────┐
                    │ 2. Candidate Profile     │
                    │    Builder (1 LLM call)  │
                    │  → structured JSON facts │
                    └───────────┬──────────────┘
                                  │  (same profile.json fed to all 4)
              ┌───────────────────┼───────────────────┬──────────────────┐
              ▼                   ▼                   ▼                  ▼
     ┌────────────────┐ ┌────────────────┐ ┌────────────────────┐ ┌────────────────┐
     │ Technical Agent │ │  HR/Culture     │ │ Hiring Manager      │ │ Skeptic Agent   │
     │ (independent    │ │  Agent          │ │ Agent               │ │ (independent    │
     │  LLM call)      │ │  (independent   │ │ (independent        │ │  LLM call)      │
     │                 │ │   LLM call)     │ │  LLM call)          │ │                 │
     └────────┬────────┘ └────────┬────────┘ └──────────┬──────────┘ └────────┬────────┘
              │                   │                       │                     │
              └───────────────────┴─────────┬─────────────┴─────────────────────┘
                                              ▼
                                ┌─────────────────────────┐
                                │ 3. Debate Orchestrator   │
                                │  (multi-round, sequential│
                                │   LLM calls per agent,   │
                                │   each SEES the others'  │
                                │   independent opinions)  │
                                └───────────┬──────────────┘
                                              ▼
                                ┌─────────────────────────┐
                                │ 4. Panel Chair /         │
                                │    Arbiter Agent         │
                                │  (weighted reasoning,    │
                                │   NOT averaging)         │
                                └───────────┬──────────────┘
                                              ▼
                                ┌─────────────────────────┐
                                │ 5. Final Report Renderer │
                                │  (markdown/HTML/JSON)    │
                                └─────────────────────────┘
```

Run this whole pipeline **twice** — once per candidate — then optionally do a bonus 6th "Comparator" step.

---

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Orchestration / dev environment | **OpenCode** (terminal agent) | You're already using it; also usable to *write* the pipeline code interactively |
| LLM inference | **OpenRouter free-tier models** (`:free` suffix) | No cost; swap models per agent for variety |
| Language | Python 3.11+ (recommended) or Node/TS | Python has the best PDF + JSON tooling for a fast build |
| PDF parsing | `pypdf` / `pdfplumber` (Python) | Reliable text extraction from the 4 PDFs |
| Schema enforcement | `pydantic` (Python) or `zod` (TS) | Forces every agent output into a strict, evidence-carrying JSON shape |
| Output | Markdown + JSON report per candidate | Markdown for humans, JSON for auditability/scoring |
| Bonus | Any free TTS (e.g., `edge-tts`, browser Web Speech API) | For the voice-debate bonus |

### OpenRouter free models worth assigning (rotate to reduce rate-limit collisions and to genuinely diversify "reasoning styles" across agents)

> Exact free-model slugs change over time — **check `https://openrouter.ai/models?max_price=0` right before the hackathon** and pin the slugs you actually got working. As of this build, good candidates in the free tier include models from Meta Llama, Mistral, Qwen, Google Gemma/Gemini-flash-free, and DeepSeek families. Assign a **different model family to each agent** if the free quota allows — this is a legitimate, judge-visible way to make the 4 personas *architecturally* independent, not just prompt-independent.

---

## 3. Project Structure

```
interview-panel-simulator/
├── README.md
├── .env                          # OPENROUTER_API_KEY
├── opencode.json                 # OpenCode provider config (see §4)
├── data/
│   ├── 02_Job_Description.pdf
│   ├── 03_Resume_A.pdf
│   ├── 04_Resume_B.pdf
│   ├── 05_Transcript_A.pdf
│   └── 06_Transcript_B.pdf
├── src/
│   ├── ingest/
│   │   └── pdf_extract.py        # PDF → raw text
│   ├── profile/
│   │   └── profile_builder.py    # raw text → structured candidate_profile.json
│   ├── agents/
│   │   ├── base_agent.py         # shared LLM-call wrapper + schema validation
│   │   ├── technical_agent.py
│   │   ├── hr_culture_agent.py
│   │   ├── hiring_manager_agent.py
│   │   └── skeptic_agent.py
│   ├── debate/
│   │   └── debate_orchestrator.py
│   ├── decision/
│   │   └── panel_chair.py        # non-averaging arbiter
│   ├── report/
│   │   └── report_renderer.py
│   ├── bonus/
│   │   ├── voice_debate.py       # TTS bonus
│   │   └── comparator.py         # A vs B ranking bonus
│   └── main.py                   # CLI entrypoint, runs full pipeline per candidate
├── prompts/
│   ├── profile_builder.md
│   ├── technical_agent.md
│   ├── hr_culture_agent.md
│   ├── hiring_manager_agent.md
│   ├── skeptic_agent.md
│   ├── debate_turn.md
│   └── panel_chair.md
├── outputs/
│   ├── candidate_A/
│   │   ├── profile.json
│   │   ├── independent_opinions.json
│   │   ├── debate_transcript.json
│   │   ├── final_decision.json
│   │   └── report.md
│   └── candidate_B/
│       └── (same structure)
└── tests/
    └── test_schema_validation.py
```

Keeping `prompts/` as standalone `.md` files (not hardcoded strings) is a cheap "code quality" win — judges can read your agent design without digging through Python.

---

## 4. Setup — OpenCode + OpenRouter (do this first, ~10 minutes)

1. Install OpenCode:
   ```bash
   curl -fsSL https://opencode.ai/install | bash
   opencode --version
   ```
2. Get a free OpenRouter API key at `https://openrouter.ai/keys`.
3. Connect OpenRouter as a provider inside OpenCode:
   ```bash
   opencode
   /connect
   # choose OpenRouter → paste your key
   ```
   This writes credentials to OpenCode's local auth store and makes every OpenRouter model addressable as `openrouter/<provider>/<model>`.
4. In your project root, add an `opencode.json` pinning the models you'll use per agent, e.g.:
   ```json
   {
     "provider": {
       "openrouter": {
         "models": {
           "technical-agent-model": "meta-llama/llama-3.3-70b-instruct:free",
           "hr-agent-model": "mistralai/mistral-small-3.1-24b-instruct:free",
           "hiring-manager-model": "qwen/qwen-2.5-72b-instruct:free",
           "skeptic-model": "deepseek/deepseek-chat-v3-0324:free",
           "chair-model": "google/gemma-3-27b-it:free"
         }
       }
     }
   }
   ```
   (Swap in whatever `:free` slugs are live when you build — verify at `openrouter.ai/models?max_price=0`.)
5. Also export `OPENROUTER_API_KEY` in `.env` for your Python/Node code to call the OpenRouter REST API **directly** (`POST https://openrouter.ai/api/v1/chat/completions`) — you do not have to route every agent call through the OpenCode TUI; OpenCode is your build assistant, your *pipeline* calls OpenRouter itself at runtime. This distinction matters: OpenCode helps you **write** the multi-agent system; your **Python script** is what actually **runs** it during a demo.

---

## 5. Build Levels (do them in this order — each level is a working checkpoint)

### **Level 0 — Foundations (30–45 min)**
- [ ] Repo scaffolded per §3.
- [ ] PDF → text extraction working for all 5 PDFs (`pdf_extract.py`), verified by printing raw text lengths.
- [ ] OpenRouter call wrapper (`base_agent.py`) that takes `(system_prompt, user_prompt, model)` → returns raw text, with retry + timeout.
- [ ] Decide your JSON schema for "an opinion" now (see §6) — every later level depends on this being locked.

**Exit test:** you can run one hardcoded OpenRouter call from Python and print a response.

### **Level 1 — Candidate Profile Builder (30–45 min)**
- [ ] One LLM call (or deterministic parsing + one LLM call for claims) that reads `job_description + resume + transcript` and outputs a structured `candidate_profile.json`:
  - skills claimed (with source: resume line or transcript quote)
  - years/roles of experience
  - projects mentioned
  - specific claims made *in the interview* (things said verbally, separate from resume)
  - notable gaps between resume and JD requirements
- [ ] This file is the **single shared source of truth** — no agent touches the raw PDFs directly after this point, they all read `profile.json` (+ raw transcript for exact quoting).

**Exit test:** `profile.json` for Candidate A and B both validate against your schema and contain at least 8–10 atomic facts each, all traceable to a line in source text.

**Why this matters for judging:** this is what makes "evidence-grounded" possible later — if the profile builder is sloppy, every downstream agent inherits weak evidence.

### **Level 2 — Independent Agent Opinions (60–90 min, the "20 pts: are they really independent" section)**
Build the 4 personas. **Hard rules to satisfy the judging criterion literally:**
- Each agent = **its own function/module, its own system prompt file, its own LLM call.**
- No agent's prompt or code path includes another agent's output at this stage. Enforce this in code (e.g., assert `debate_state is None` when calling `get_independent_opinion()`).
- Each agent must output, per JSON schema:
  ```json
  {
    "agent": "technical",
    "candidate": "A",
    "verdict_axis_scores": { "...": 0 },
    "claims": [
      {
        "claim": "Candidate overstates depth in distributed systems",
        "evidence_type": "transcript_quote | resume_line | absence_of_evidence",
        "evidence": "\"I mostly read about Raft, never implemented it\" — Transcript A, Q7",
        "confidence": "high | medium | low"
      }
    ],
    "unresolved_unknowns": ["No evidence given about testing practices"],
    "overall_recommendation": "hire | lean_hire | lean_no_hire | no_hire | insufficient_data",
    "self_confidence": 0.0
  }
  ```
- **Different personas need genuinely different lenses, not just different names.** Give each agent:
  - a distinct **rubric** (what it's scoring),
  - a distinct **skepticism level**,
  - ideally a distinct **model** (per §4),
  - a system prompt that explicitly forbids commenting on things outside its lane (e.g., Technical Agent must not moralize about culture fit).

| Agent | Rubric focus | Must always check |
|---|---|---|
| **Technical Agent** | Depth vs. breadth, whether transcript answers match resume claims, problem-solving evidence | Ask: "does a specific technical claim in the resume get *substantiated* in the transcript, or just repeated?" |
| **HR/Culture Agent** | Communication clarity, teamwork examples, honesty/consistency in self-presentation | Look for hedge language, contradictions in tone/story between resume and transcript |
| **Hiring Manager Agent** | Role fit against the JD specifically, business impact, trajectory | Map every JD requirement to present/absent/partial evidence |
| **Skeptic Agent** | Contradictions, exaggeration, vague non-answers, red flags | Actively hunts for mismatches: dates that don't add up, buzzwords with no example, deflected follow-ups |

**Exit test:** for each candidate, you have 4 independent JSON opinions, each with ≥3 evidence-backed claims, and you can prove (e.g., via a log file with call timestamps + no shared payload) that none saw another's output.

### **Level 3 — The Debate Step (60–90 min, the "20 pts" section — do NOT rush this)**
This is where most teams lose points by faking it. A real debate needs:
1. **A shared debate transcript object** that accumulates turns.
2. **Sequential LLM calls**, each agent now *sees*:
   - its own independent opinion (memory of self),
   - the other 3 agents' independent opinions (from Level 2, verbatim),
   - the debate transcript so far (turns already taken this round).
3. **A turn-taking protocol.** Minimum viable version — 2 rounds:
   - **Round 1:** each agent, in a fixed order, reads the others' opinions and must produce a turn that does ONE of: `agree_and_reinforce`, `disagree_with_rebuttal`, `revise_own_opinion`. It must **name which agent** and **which specific claim** it's responding to, and cite evidence (new or the same, but explicit).
   - **Round 2:** same agents get the Round-1 debate turns and are asked explicitly: "Has anything said in Round 1 changed your recommendation? If yes, state your new recommendation and why. If no, say so explicitly."
4. **Log every opinion delta.** For each agent, store `opinion_before_debate` and `opinion_after_debate`. If they differ, that's your proof artifact for the rubric line *"You must be able to show the moment an agent's opinion changed."* Surface this explicitly in the report (§8).

Example debate-turn prompt skeleton (`prompts/debate_turn.md`):
```
You are the {AGENT_NAME}. Here is your own independent opinion from before the debate:
{OWN_OPINION_JSON}

Here are the independent opinions of the other panel members:
{OTHER_OPINIONS_JSON}

Debate so far this session:
{DEBATE_LOG}

Respond with ONE debate turn. You must:
1. Reference at least one specific claim from another named agent.
2. State whether you agree, disagree, or are revising your own view — and why, with evidence.
3. If revising, output your updated recommendation and confidence.
Return JSON matching schema: {DEBATE_TURN_SCHEMA}
```

**Exit test:** the debate transcript for at least one candidate shows a visible disagreement AND at least one agent's `overall_recommendation` or `confidence` changing between Level 2 and post-debate state, with a clear evidentiary reason logged.

### **Level 4 — Final Decision: Panel Chair / Arbiter (45–60 min, weight this heavily)**
**Explicitly do NOT average the 4 scores.** Build a 5th agent — the **Panel Chair** — whose job is reasoning, not arithmetic:
- Input: all 4 independent opinions + full debate transcript + post-debate opinions.
- Instructed to:
  1. Identify which claims are **corroborated by multiple agents from different angles** (weight these up — convergent independent evidence is stronger than one agent's opinion).
  2. Identify claims that were **contested in debate and never resolved** — these must be flagged, not silently dropped.
  3. Weight **evidence quality and confidence**, not agent identity — e.g., a `high confidence, direct transcript quote` claim from the Skeptic should outweigh a `low confidence, resume-inference` claim from the Hiring Manager, even though naively you might "trust" the Hiring Manager's verdict more.
  4. Explicitly reason in text (chain of justification) before emitting a final structured verdict — require the model to write out *why* in 3–6 sentences before the final JSON, and validate that the JSON isn't just `mean(scores)` by design (you are writing the prompt, so simply never expose raw scores as an averageable array to this step — expose only qualitative evidence bundles).
- Output schema:
  ```json
  {
    "candidate": "A",
    "final_recommendation": "hire | lean_hire | lean_no_hire | no_hire",
    "confidence": "high | medium | low",
    "reasoning_summary": "text explaining the weighing, not a score dump",
    "key_corroborated_strengths": [...],
    "key_corroborated_concerns": [...],
    "unresolved_disagreements": [
      { "topic": "...", "agent_positions": {...}, "why_unresolved": "..." }
    ],
    "insufficient_evidence_flags": [...]
  }
  ```

**Exit test:** you can point to the exact prompt/logic that makes this *not* an average — e.g., a written reasoning_summary that references corroboration and unresolved conflict, not `(a+b+c+d)/4`.

### **Level 5 — Final Report (30 min)**
Render, per candidate, a clean markdown (and matching JSON) report containing exactly what's asked:
- Final recommendation + confidence
- Strengths (evidence-linked)
- Concerns (evidence-linked)
- Unresolved agent disagreement (explicitly labeled "not fully resolved")
- Appendix: full independent opinions + debate transcript (for auditability — this is your evidence-traceability proof, worth 15 pts on its own)

### **Level 6 — Bonus (only after Levels 0–5 are solid)**
- [ ] **Voice debate**: pipe debate turns through free TTS (`edge-tts` is free and easy) with a distinct voice per agent; play/save as audio alongside the transcript. Even a simple "4 voices reading their debate turns in sequence" satisfies "integrating a voice debate session."
- [ ] **Candidate comparator**: a 6th LLM call or deterministic diff that takes both `final_decision.json` files and produces a head-to-head ranking with reasoning — explicitly framed as bonus, not required, so it can't hurt your core score if rushed.
- [ ] **Disagreement heatmap**: a small script/table showing per-topic agent alignment (nice, cheap, visually judge-friendly).
- [ ] **Confidence-aware UI**: color-code the markdown report by confidence level.

---

## 6. Shared Schemas (lock these before Level 2 — changing them mid-build wastes time)

Use `pydantic` (Python) so every agent call is validated on the way out — if a model returns an opinion without evidence, **reject and retry with a corrective prompt**, don't silently accept it. This single guardrail is what earns you both the "evidence traceability" points and the "handles unclear info sensibly" points, because your retry prompt can explicitly say: *"If you cannot find evidence for a claim, you MUST set evidence_type to 'absence_of_evidence' and lower confidence — do not fabricate a quote."*

Minimum schemas needed:
1. `CandidateProfile`
2. `AgentOpinion` (used both pre- and post-debate)
3. `DebateTurn`
4. `FinalDecision`

---

## 7. Handling Missing / Ambiguous Information (10 pts — cheap to secure, easy to forget)

Bake this into **every** agent's system prompt, not just as an afterthought:

> "If the resume, job description, or transcript does not contain enough information to judge a specific dimension, you MUST say so explicitly (`evidence_type: absence_of_evidence`, lower confidence). Never invent a quote, number, or fact. An honest 'insufficient evidence' is scored higher than a confident guess."

Then **enforce it structurally**: your schema should make `insufficient_data` a first-class value for `overall_recommendation`, and the Panel Chair should surface an explicit `insufficient_evidence_flags` list in the final report rather than quietly ignoring gaps.

---

## 8. Proving It's a Real Multi-Agent System (not one prompt pretending to be four)

Judges will look for proof. Make it trivially visible:
- Log a `run_manifest.json` per candidate showing: agent name → model used → timestamp → whether it had access to other agents' outputs (`false` for Level 2 calls, `true` for Level 3 calls) → token count.
- In the final report, include a small **"Opinion Change Log"** table:

  | Agent | Pre-debate recommendation | Post-debate recommendation | Changed? | Why |
  |---|---|---|---|---|
  | Technical | lean_hire | lean_hire | No | — |
  | HR/Culture | hire | lean_hire | **Yes** | Skeptic's quote about inconsistent team-conflict story lowered confidence |

  This single table is probably your highest points-per-minute addition — it directly and visibly satisfies the "show the moment an opinion changed" rule.

---

## 9. Suggested Hackathon Time Budget (adjust to your total window)

| Phase | Time | Cumulative |
|---|---|---|
| Setup (OpenCode + OpenRouter + repo scaffold) | 30 min | 0:30 |
| Level 0 — Foundations | 30–45 min | 1:15 |
| Level 1 — Profile Builder | 30–45 min | 2:00 |
| Level 2 — 4 Independent Agents | 60–90 min | 3:30 |
| Level 3 — Debate | 60–90 min | 5:00 |
| Level 4 — Panel Chair / Final Decision | 45–60 min | 6:00 |
| Level 5 — Report Rendering | 30 min | 6:30 |
| Buffer / bug-fixing / run both candidates | 45 min | 7:15 |
| Level 6 — Bonus (voice debate, comparator) | remaining time | — |
| Final polish: README, demo script, screenshots | 30 min | — |

If time runs short, **cut bonus features before cutting debate quality or evidence enforcement** — those two are 35 of the 100 points combined, plus they gate the "is this real multi-agent" perception that colors every other score.

---

## 10. Demo Script (for judging round)

1. `python src/main.py --candidate A` → show the CLI clearly printing: profile built → 4 independent calls firing (with model names) → debate rounds → chair decision → report path.
2. Open `outputs/candidate_A/report.md` — walk through strengths/concerns/unresolved disagreement.
3. Open `outputs/candidate_A/debate_transcript.json` (or a rendered view) and point to one concrete "opinion changed here" moment.
4. Repeat quickly for Candidate B.
5. If built, play the voice debate clip for one candidate.
6. If built, show the comparator's head-to-head verdict as a closing flourish.

---

## 11. Definition of Done (self-check against the rubric before submitting)

- [ ] 4 agents each have separate prompt files, separate LLM calls, provably no shared context before debate.
- [ ] Every single claim in every agent output has a quote or "absence_of_evidence" tag — no bare numbers.
- [ ] Debate transcript shows ≥1 named cross-reference and ≥1 logged opinion change, for at least one candidate.
- [ ] Final decision step's prompt/logic is demonstrably not `average(scores)` — reasoning text is present and referenced in code review.
- [ ] Both candidates fully processed end-to-end.
- [ ] Report shows final recommendation, confidence, strengths, concerns, unresolved disagreement — per candidate.
- [ ] Missing-info cases produce an explicit flag, never a fabricated score.
- [ ] One command runs the whole thing; README explains setup in under 2 minutes of reading.
- [ ] (Bonus) Voice debate and/or A-vs-B comparator included and clearly marked as bonus.
